/**
 * HEIC/HEIF support (iPhone photos). Most browsers can't decode HEIC themselves, so files are first decoded with
 * libheif (the heic-to package, compiled to WebAssembly). It is about 3 MB, so it is only loaded when a HEIC file is
 * actually converted, and it runs on this device like everything else.
 */
export function isHeicFile(file: File): boolean {
  return /\.(heic|heif)$/i.test(file.name) || /^image\/hei[cf]/i.test(file.type);
}

/**
 * Decodes a HEIC file to a bitmap (libheif runs in its own worker). Going straight to a bitmap avoids encoding and
 * re-decoding an intermediate PNG, which took most of the time on large photos.
 */
export async function decodeHeic(file: File): Promise<ImageBitmap> {
  const { heicTo } = await import("heic-to/next");
  return heicTo({ blob: file, type: "bitmap" });
}
