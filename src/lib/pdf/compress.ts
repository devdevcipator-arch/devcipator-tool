import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { yieldToMain } from "@/hooks/useProcessor";
import { canvasToBytes, renderPage } from "./pdfjs";
import { pdfBlob, pdfWorker } from "./client";
import type { RasterPage } from "./api";

export interface RasterSettings {
  /** Render resolution; 72 points = 1 inch, so the scale is dpi / 72. */
  dpi: number;
  /** JPEG quality, 0..1. */
  quality: number;
}

interface RunOptions {
  signal?: AbortSignal;
  /** 0..1 within this pass. */
  onProgress?: (fraction: number, message: string) => void;
}

/**
 * Redraws every page as a JPEG at the given resolution and builds a new PDF from them. This is what makes scans and
 * image-heavy PDFs much smaller; text in the result is part of the page image and can't be selected.
 */
export async function rasterizePdf(doc: PDFDocumentProxy, { dpi, quality }: RasterSettings, { signal, onProgress }: RunOptions = {}): Promise<Blob> {
  const pages: RasterPage[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    signal?.throwIfAborted();
    onProgress?.(((n - 1) / doc.numPages) * 0.9, `Compressing page ${n} of ${doc.numPages}`);
    const page = await doc.getPage(n);
    const size = page.getViewport({ scale: 1 });
    const canvas = await renderPage(page, { scale: dpi / 72 });
    const bytes = await canvasToBytes(canvas, "image/jpeg", quality);
    pages.push({ bytes, format: "jpg", pixelWidth: canvas.width, pixelHeight: canvas.height, pageWidth: size.width, pageHeight: size.height, margin: 0 });
    canvas.width = canvas.height = 0;
    page.cleanup();
    await yieldToMain();
  }
  onProgress?.(0.92, "Building the compressed PDF");
  const out = await pdfWorker().call("images", [pages, undefined], { signal, transfer: pages.map((p) => p.bytes.buffer as ArrayBuffer) });
  return pdfBlob(out);
}

export interface TargetResult {
  blob: Blob;
  settings: RasterSettings;
  /** False when even the lowest setting stayed above the target. */
  reached: boolean;
}

const BEST: RasterSettings = { dpi: 150, quality: 0.8 };
const FLOOR: RasterSettings = { dpi: 40, quality: 0.35 };

/**
 * Compresses a PDF to at most `targetBytes`, starting at the best quality and lowering resolution and JPEG quality
 * only as far as needed. File size grows roughly with the square of the DPI, which sets each next step.
 */
export async function compressPdfToTarget(doc: PDFDocumentProxy, targetBytes: number, { signal, onProgress }: RunOptions = {}): Promise<TargetResult> {
  let settings = BEST;
  let smallest: TargetResult | null = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const label = attempt === 1 ? "Compressing" : `Trying a smaller size (step ${attempt})`;
    const blob = await rasterizePdf(doc, settings, {
      signal,
      onProgress: (f, msg) => onProgress?.(Math.min(0.98, (attempt - 1 + f) / 4), `${label}: ${msg.toLowerCase()}`),
    });
    if (!smallest || blob.size < smallest.blob.size) smallest = { blob, settings, reached: blob.size <= targetBytes };
    if (blob.size <= targetBytes) return { blob, settings, reached: true };
    if (settings.dpi <= FLOOR.dpi && settings.quality <= FLOOR.quality) break;
    const shrink = Math.sqrt(targetBytes / blob.size) * 0.92;
    settings = {
      dpi: Math.max(FLOOR.dpi, Math.min(settings.dpi * 0.85, Math.round(settings.dpi * shrink))),
      quality: Math.max(FLOOR.quality, +(settings.quality - 0.1).toFixed(2)),
    };
  }
  return smallest!;
}
