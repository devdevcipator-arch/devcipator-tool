"use client";

import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/files";

export interface CompressSettings {
  /** Output MIME type. */
  fileType: string;
  /** 0..1 */
  quality: number;
  /** Upper bound for the output size, in MB. */
  maxSizeMB?: number;
  /** Longest side in pixels. */
  maxWidthOrHeight?: number;
}

/**
 * Compresses one image with browser-image-compression in its Web Worker.
 * The worker library is self-hosted (copied by scripts/copy-vendor.mjs), so
 * nothing is fetched from a CDN.
 */
export async function compressImage(file: File, s: CompressSettings, signal?: AbortSignal, onProgress?: (p: number) => void): Promise<File> {
  const { default: imageCompression } = await import("browser-image-compression");
  return imageCompression(file, {
    fileType: s.fileType,
    initialQuality: s.quality,
    maxSizeMB: s.maxSizeMB,
    maxWidthOrHeight: s.maxWidthOrHeight,
    alwaysKeepResolution: !s.maxWidthOrHeight,
    maxIteration: 12,
    useWebWorker: true,
    libURL: `${window.location.origin}/vendor/browser-image-compression.js`,
    signal,
    onProgress,
  });
}

/**
 * Like compressImage, but also meets the size limit when lowering quality alone can't: if the result is still over
 * `maxSizeMB` and the user set no maximum dimensions, the image is scaled down step by step until it fits.
 * `scaledTo` is the longest side in pixels when that happened.
 */
export async function compressToTarget(
  file: File,
  s: CompressSettings,
  signal?: AbortSignal,
  onProgress?: (p: number) => void,
): Promise<{ file: File; scaledTo?: number }> {
  let out = await compressImage(file, s, signal, onProgress);
  const limit = s.maxSizeMB ? s.maxSizeMB * 1024 * 1024 : 0;
  if (!limit || s.maxWidthOrHeight || out.size <= limit) return { file: out };

  const bitmap = await createImageBitmap(file);
  let side = Math.max(bitmap.width, bitmap.height);
  bitmap.close();
  // File size scales roughly with pixel count, so the first jump uses the square root of the overshoot.
  let factor = Math.min(0.9, Math.sqrt(limit / out.size) * 0.9);
  while (out.size > limit && side > 160) {
    signal?.throwIfAborted();
    side = Math.max(160, Math.round(side * factor));
    out = await compressImage(file, { ...s, maxWidthOrHeight: side }, signal);
    factor = 0.8;
  }
  // The library shrinks further on its own while it searches for the size, so report what the output really is.
  const result = await createImageBitmap(out);
  const scaledTo = Math.max(result.width, result.height);
  result.close();
  return { file: out, scaledTo };
}

/** Debounced live compression of one image for the before/after preview. */
export function useImageCompressor(file: File | null, settings: CompressSettings, delay = 300) {
  const [state, setState] = useState<{ file: File; key: string; result: File | null; error: string | null } | null>(null);
  const key = JSON.stringify(settings);

  useEffect(() => {
    if (!file) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      compressToTarget(file, JSON.parse(key) as CompressSettings, controller.signal).then(
        ({ file: result }) => !controller.signal.aborted && setState({ file, key, result, error: null }),
        (err) => !controller.signal.aborted && setState({ file, key, result: null, error: errorMessage(err) }),
      );
    }, delay);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [file, key, delay]);

  // Keep showing the last result for this file while a new setting is being applied.
  const sameFile = !!file && state?.file === file;
  return {
    result: sameFile ? state!.result : null,
    error: sameFile ? state!.error : null,
    busy: !!file && !(sameFile && state!.key === key),
  };
}
