"use client";

import { useState } from "react";
import { Shrink } from "lucide-react";
import { useProcessor, throwIfAborted, yieldToMain } from "@/hooks/useProcessor";
import { usePdfDocument } from "@/hooks/usePdfDocument";
import { canvasToBytes, renderPage } from "@/lib/pdf/pdfjs";
import { pdfBlob, pdfWorker } from "@/lib/pdf/client";
import type { RasterPage } from "@/lib/pdf/api";
import { formatBytes, withExtension } from "@/lib/files";
import { Panel, ToolLayout } from "@/components/tool/ToolLayout";
import { PdfPageCanvas } from "@/components/pdf/PdfPageCanvas";
import { Notice, Segmented } from "@/components/ui/controls";

type Level = "strong" | "recommended" | "light";

/** Render resolution and JPEG quality per level. 72 points = 1 inch, so scale = DPI / 72. */
const LEVELS: Record<Level, { dpi: number; quality: number }> = {
  strong: { dpi: 72, quality: 0.5 },
  recommended: { dpi: 110, quality: 0.65 },
  light: { dpi: 150, quality: 0.8 },
};

export default function CompressPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<Level>("recommended");
  const processor = useProcessor();
  const { doc, numPages, error, needsPassword, loading } = usePdfDocument(file);

  async function compress() {
    if (!doc || !file) return;
    const { dpi, quality } = LEVELS[level];
    await processor.run(async ({ report, signal }) => {
      const pages: RasterPage[] = [];
      for (let n = 1; n <= numPages; n++) {
        throwIfAborted(signal);
        report(((n - 1) / numPages) * 0.85, `Compressing page ${n} of ${numPages}`);
        const page = await doc.getPage(n);
        const size = page.getViewport({ scale: 1 });
        const canvas = await renderPage(page, { scale: dpi / 72 });
        const bytes = await canvasToBytes(canvas, "image/jpeg", quality);
        pages.push({ bytes, format: "jpg", pixelWidth: canvas.width, pixelHeight: canvas.height, pageWidth: size.width, pageHeight: size.height, margin: 0 });
        canvas.width = canvas.height = 0;
        page.cleanup();
        await yieldToMain();
      }
      report(0.9, "Building the compressed PDF");
      const out = await pdfWorker().call("images", [pages, undefined], { signal, transfer: pages.map((p) => p.bytes.buffer as ArrayBuffer) });
      const blob = pdfBlob(out);
      const saved = 1 - blob.size / file.size;
      const note = `${formatBytes(file.size)} → ${formatBytes(blob.size)}`;
      if (saved <= 0.02) {
        return {
          files: [{ name: withExtension(file.name, "pdf", "-compressed"), blob, note }],
          message: "This PDF is already well compressed, so the result isn't smaller. Keep your original, or try the Strong level.",
        };
      }
      return [{ name: withExtension(file.name, "pdf", "-compressed"), blob, note: `${note} (−${Math.round(saved * 100)}%)` }];
    });
  }

  return (
    <ToolLayout
      slug="compress-pdf"
      fileCount={file ? 1 : 0}
      onFiles={(f) => setFile(f[0])}
      onReset={() => setFile(null)}
      processor={processor}
      action={{ label: "Compress PDF", icon: <Shrink className="size-5" />, disabled: !doc, onClick: compress }}
      options={
        <>
          <Segmented
            label="Compression"
            value={level}
            onChange={setLevel}
            options={[
              { value: "strong", label: "Strong" },
              { value: "recommended", label: "Balanced" },
              { value: "light", label: "Light" },
            ]}
          />
          <p className="text-sm text-fg-muted">
            {level === "strong" && "Smallest file, 72 DPI. Good for email and upload forms with a size limit."}
            {level === "recommended" && "Good balance of size and clarity, 110 DPI. Right for most documents."}
            {level === "light" && "Best quality, 150 DPI. Use when the PDF will be printed or zoomed."}
          </p>
          <Notice tone="warning">
            Pages are saved as images, so text in the compressed PDF can&apos;t be selected or searched. Keep the original if you need that.
          </Notice>
          {file && <p className="text-sm text-fg-muted">Original size: {formatBytes(file.size)}</p>}
        </>
      }
    >
      <Panel title={file ? `${file.name} · ${numPages || "…"} pages` : "Preview"}>
        {needsPassword && <Notice tone="warning">This PDF is password-protected. Remove the password in your PDF reader first.</Notice>}
        {error && <Notice tone="danger">{error}</Notice>}
        {loading && <p className="py-10 text-center text-sm text-fg-subtle">Loading pages…</p>}
        {doc && (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: numPages }, (_, i) => (
              <li key={i} className="flex flex-col items-center gap-1.5">
                <div className="w-full overflow-hidden rounded-lg border border-border bg-white p-1">
                  <PdfPageCanvas doc={doc} pageNumber={i + 1} width={110} />
                </div>
                <span className="text-xs text-fg-muted tabular-nums">{i + 1}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ToolLayout>
  );
}
