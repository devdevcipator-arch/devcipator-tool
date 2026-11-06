"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useFileList } from "@/hooks/useFileList";
import { useProcessor, throwIfAborted } from "@/hooks/useProcessor";
import { transformBitmap, transformImage } from "@/lib/image/client";
import { decodeHeic, isHeicFile } from "@/lib/image/heic";
import { EXT, type OutputFormat } from "@/lib/image/ops";
import { errorMessage, withExtension, type OutputFile } from "@/lib/files";
import { Panel, ToolLayout } from "@/components/tool/ToolLayout";
import { ImageGrid } from "@/components/image/ImageGrid";
import { ColorInput, Notice, Segmented, Slider, Toggle } from "@/components/ui/controls";

/** Also mounted by the conversion pages (e.g. /tools/png-to-jpg) with their own slug and target format. */
export default function ImageConverter({ slug = "image-converter", initialFormat = "image/jpeg" }: { slug?: string; initialFormat?: OutputFormat }) {
  const list = useFileList(true);
  const processor = useProcessor();
  const [format, setFormat] = useState<OutputFormat>(initialFormat);
  const [quality, setQuality] = useState(90);
  const [fill, setFill] = useState(false);
  const [background, setBackground] = useState("#ffffff");
  const lossy = format === "image/jpeg" || format === "image/webp";
  const opaque = format === "image/jpeg" || format === "image/bmp";

  async function convert() {
    const items = list.items;
    await processor.run(async ({ report, signal }) => {
      const out: OutputFile[] = [];
      const failed: string[] = [];
      for (let i = 0; i < items.length; i++) {
        throwIfAborted(signal);
        const file = items[i].file;
        report(i / items.length, `Converting ${file.name}`);
        try {
          const ops = { format, quality: quality / 100, background: opaque || fill ? background : undefined };
          // Browsers can't decode HEIC themselves, so it is decoded to a bitmap first.
          const res = isHeicFile(file) ? await transformBitmap(await decodeHeic(file), ops) : await transformImage(file, ops, { signal });
          out.push({ name: withExtension(file.name, EXT[format]), blob: res.blob, note: EXT[format].toUpperCase() });
        } catch (err) {
          if (signal.aborted) throw err;
          failed.push(`${file.name} (${errorMessage(err)})`);
        }
      }
      if (out.length === 0) throw new Error(`Nothing converted: ${failed.join(", ")}`);
      return { files: out, message: failed.length ? `Could not convert: ${failed.join(", ")}` : undefined };
    });
  }

  return (
    <ToolLayout
      slug={slug}
      fileCount={list.items.length}
      onFiles={list.add}
      onReset={list.clear}
      processor={processor}
      zipName="converted-images.zip"
      action={{ label: `Convert to ${EXT[format].toUpperCase()}`, icon: <RefreshCw className="size-5" />, onClick: convert }}
      options={
        <>
          <Segmented
            label="Convert to"
            value={format}
            onChange={setFormat}
            options={[
              { value: "image/jpeg", label: "JPG" },
              { value: "image/png", label: "PNG" },
              { value: "image/webp", label: "WebP" },
              { value: "image/bmp", label: "BMP" },
            ]}
          />
          {lossy && <Slider label="Quality" value={quality} onChange={setQuality} min={10} max={100} format={(v) => `${v}%`} />}
          {!opaque && <Toggle label="Fill transparent areas" checked={fill} onChange={setFill} />}
          {(opaque || fill) && <ColorInput label="Background colour" value={background} onChange={setBackground} />}
          {list.items.some((i) => isHeicFile(i.file)) && (
            <Notice tone="info">HEIC photos are decoded on your device, which takes a few seconds per photo (longer for very large ones).</Notice>
          )}
          <p className="text-xs text-fg-subtle">Animated GIFs are converted using their first frame.</p>
        </>
      }
    >
      <Panel title={`${list.items.length} image${list.items.length === 1 ? "" : "s"}`}>
        <ImageGrid items={list.items} onRemove={list.remove} />
      </Panel>
    </ToolLayout>
  );
}
