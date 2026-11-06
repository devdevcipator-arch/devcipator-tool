"use client";

import { useState } from "react";
import { FileImage, FileText, Shrink, X } from "lucide-react";
import { useFileList } from "@/hooks/useFileList";
import { useProcessor, throwIfAborted } from "@/hooks/useProcessor";
import { compressToTarget } from "@/hooks/useImageCompressor";
import { compressPdfToTarget } from "@/lib/pdf/compress";
import { closePdf, openPdf } from "@/lib/pdf/pdfjs";
import { transformBitmap } from "@/lib/image/client";
import { decodeHeic, isHeicFile } from "@/lib/image/heic";
import { errorMessage, formatBytes, withExtension, type OutputFile } from "@/lib/files";
import { Panel, ToolLayout } from "@/components/tool/ToolLayout";
import { TargetSizePicker, formatKb } from "@/components/tool/TargetSizePicker";
import { Notice, Segmented } from "@/components/ui/controls";
import { IconButton } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type ImageFormat = "image/jpeg" | "image/webp";
const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);

/** Turns a decoded HEIC photo into a high-quality JPEG the image compressor can read. */
async function heicAsJpeg(file: File): Promise<File> {
  const { blob } = await transformBitmap(await decodeHeic(file), { format: "image/jpeg", quality: 0.92 });
  return new File([blob], withExtension(file.name, "jpg"), { type: "image/jpeg" });
}

/**
 * One tool for the files schools and offices upload most: PDFs and photos. Each file is compressed to the target
 * size with the matching engine; files already under the target are returned unchanged.
 */
export default function FileCompressor({ slug = "file-compressor", initialTargetKb = 100 }: { slug?: string; initialTargetKb?: number }) {
  const list = useFileList(true);
  const processor = useProcessor();
  const [targetKb, setTargetKb] = useState(initialTargetKb);
  const [imageFormat, setImageFormat] = useState<ImageFormat>("image/jpeg");
  const target = targetKb * 1024;
  const hasPdf = list.items.some((i) => isPdf(i.file));
  const hasHeic = list.items.some((i) => isHeicFile(i.file));
  const alreadySmall = list.items.filter((i) => i.file.size <= target && !isHeicFile(i.file)).length;

  async function compressAll() {
    const items = list.items;
    await processor.run(async ({ report, signal }) => {
      const out: OutputFile[] = [];
      const missed: string[] = [];
      const failed: string[] = [];
      let before = 0;
      let after = 0;
      for (let i = 0; i < items.length; i++) {
        throwIfAborted(signal);
        const file = items[i].file;
        const step = (f: number, msg: string) => report((i + f) / items.length, items.length > 1 ? `${file.name}: ${msg}` : msg);
        before += file.size;
        try {
          // HEIC is always converted: forms and most apps can't open it, whatever its size.
          if (file.size <= target && !isHeicFile(file)) {
            out.push({ name: file.name, blob: file, note: `Already under ${formatKb(targetKb)}` });
            after += file.size;
            continue;
          }
          let blob: Blob;
          let name: string;
          if (isPdf(file)) {
            const doc = await openPdf(await file.arrayBuffer());
            try {
              const res = await compressPdfToTarget(doc, target, { signal, onProgress: step });
              blob = res.blob;
              if (!res.reached) missed.push(file.name);
            } finally {
              closePdf(doc);
            }
            name = withExtension(file.name, "pdf", "-compressed");
          } else {
            step(0, "Compressing");
            const input = isHeicFile(file) ? await heicAsJpeg(file) : file;
            const res = await compressToTarget(input, { fileType: imageFormat, quality: 0.85, maxSizeMB: targetKb / 1024 }, signal, (p) => step(p / 100, "Compressing"));
            blob = res.file;
            if (blob.size > target) missed.push(file.name);
            name = withExtension(file.name, imageFormat === "image/webp" ? "webp" : "jpg", "-compressed");
          }
          after += blob.size;
          const saved = Math.round((1 - blob.size / file.size) * 100);
          out.push({ name, blob, note: `${formatBytes(file.size)} → ${formatBytes(blob.size)} (−${Math.max(0, saved)}%)` });
        } catch (err) {
          if (signal.aborted) throw err;
          failed.push(`${file.name} (${errorMessage(err)})`);
          before -= file.size;
        }
      }
      if (out.length === 0) throw new Error(`Nothing compressed: ${failed.join(", ")}`);
      const total = before > 0 ? Math.max(0, Math.round((1 - after / before) * 100)) : 0;
      return {
        files: out,
        message:
          `${formatBytes(before)} → ${formatBytes(after)} in total (−${total}%).` +
          (missed.length ? ` ${missed.join(", ")} could not reach ${formatKb(targetKb)}; this is the smallest readable version.` : "") +
          (failed.length ? ` Could not compress: ${failed.join(", ")}.` : ""),
      };
    });
  }

  return (
    <ToolLayout
      slug={slug}
      fileCount={list.items.length}
      onFiles={list.add}
      onReset={list.clear}
      processor={processor}
      zipName="compressed-files.zip"
      action={{
        label: `Compress to ${formatKb(targetKb)}`,
        icon: <Shrink className="size-5" />,
        onClick: compressAll,
      }}
      options={
        <>
          <TargetSizePicker value={targetKb} onChange={setTargetKb} />
          <Segmented
            label="Save photos as"
            value={imageFormat}
            onChange={setImageFormat}
            hint="JPG is accepted everywhere; WebP is smaller but some forms reject it."
            options={[
              { value: "image/jpeg", label: "JPG" },
              { value: "image/webp", label: "WebP" },
            ]}
          />
          {hasPdf && <Notice tone="warning">PDF pages are saved as images to reach small sizes, so their text can&apos;t be selected afterwards.</Notice>}
          {hasHeic && <Notice tone="info">iPhone HEIC photos are decoded on your device first, which takes a few seconds each.</Notice>}
          {alreadySmall > 0 && (
            <p className="text-sm text-fg-muted">
              {alreadySmall} file{alreadySmall === 1 ? " is" : "s are"} already under {formatKb(targetKb)} and will be kept as {alreadySmall === 1 ? "it is" : "they are"}.
            </p>
          )}
        </>
      }
    >
      <Panel title={`${list.items.length} file${list.items.length === 1 ? "" : "s"}`} actions={<span className="text-xs text-fg-subtle">Target {formatKb(targetKb)}</span>}>
        <ul className="flex flex-col gap-2">
          {list.items.map(({ id, file }) => {
            const under = file.size <= target && !isHeicFile(file);
            const Icon = isPdf(file) ? FileText : FileImage;
            return (
              <li key={id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg-muted">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg" title={file.name}>{file.name}</p>
                  <p className="text-xs text-fg-muted tabular-nums">
                    {formatBytes(file.size)}
                    <span className={cn("ml-1.5 font-medium", under ? "text-success-strong" : "text-fg-subtle")}>
                      {under ? `already under ${formatKb(targetKb)}` : `→ under ${formatKb(targetKb)}`}
                    </span>
                  </p>
                </div>
                <IconButton label={`Remove ${file.name}`} onClick={() => list.remove(id)} size="sm">
                  <X className="size-4" />
                </IconButton>
              </li>
            );
          })}
        </ul>
      </Panel>
    </ToolLayout>
  );
}
