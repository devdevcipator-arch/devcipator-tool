"use client";

import { useState } from "react";
import { ImageDown } from "lucide-react";
import { useFileList } from "@/hooks/useFileList";
import { useProcessor, throwIfAborted } from "@/hooks/useProcessor";
import { useObjectUrl } from "@/hooks/useObjectUrl";
import { compressToTarget, useImageCompressor, type CompressSettings } from "@/hooks/useImageCompressor";
import { formatBytes, withExtension, type OutputFile } from "@/lib/files";
import { Panel, ToolLayout } from "@/components/tool/ToolLayout";
import { ImageGrid } from "@/components/image/ImageGrid";
import { BeforeAfter } from "@/components/image/BeforeAfter";
import { TargetSizePicker, formatKb } from "@/components/tool/TargetSizePicker";
import { Field, Notice, NumberInput, Select, Slider, Toggle } from "@/components/ui/controls";

type FormatChoice = "same" | "image/jpeg" | "image/png" | "image/webp";
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };


/** Also mounted by the target-size pages (e.g. /tools/compress-image-to-100kb) with their own slug and size. */
export default function CompressImage({ slug = "compress-image", initialTargetKb = 100 }: { slug?: string; initialTargetKb?: number }) {
  const list = useFileList(true);
  const processor = useProcessor();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quality, setQuality] = useState(75);
  const [limitSize, setLimitSize] = useState(true);
  const [targetKb, setTargetKb] = useState(initialTargetKb);
  const [format, setFormat] = useState<FormatChoice>("same");
  const [limitDim, setLimitDim] = useState(false);
  const [maxDim, setMaxDim] = useState(1920);

  const selected = list.items.find((i) => i.id === selectedId) ?? list.items[0];

  const settingsFor = (file: File): CompressSettings => {
    const same = file.type === "image/png" || file.type === "image/webp" ? file.type : "image/jpeg";
    return {
      fileType: format === "same" ? same : format,
      quality: quality / 100,
      maxSizeMB: limitSize ? targetKb / 1024 : undefined,
      maxWidthOrHeight: limitDim && maxDim > 0 ? maxDim : undefined,
    };
  };

  const previewSettings = selected ? settingsFor(selected.file) : { fileType: "image/jpeg", quality: quality / 100 };
  const preview = useImageCompressor(selected?.file ?? null, previewSettings);
  const beforeUrl = useObjectUrl(selected?.file);
  const afterUrl = useObjectUrl(preview.result);
  const isPng = previewSettings.fileType === "image/png";

  async function compressAll() {
    const items = list.items;
    await processor.run(async ({ report, signal }) => {
      const out: OutputFile[] = [];
      let before = 0;
      let after = 0;
      let scaled = 0;
      for (let i = 0; i < items.length; i++) {
        throwIfAborted(signal);
        const file = items[i].file;
        const settings = settingsFor(file);
        const { file: result, scaledTo } = await compressToTarget(file, settings, signal, (p) => report((i + p / 100) / items.length, `Compressing ${file.name}`));
        if (scaledTo) scaled++;
        // Never hand back something bigger than the original in the same format.
        const keepOriginal = result.size >= file.size && settings.fileType === file.type && !settings.maxWidthOrHeight && !scaledTo;
        const blob = keepOriginal ? file : result;
        before += file.size;
        after += blob.size;
        const saved = Math.round((1 - blob.size / file.size) * 100);
        out.push({
          name: withExtension(file.name, EXT[settings.fileType], keepOriginal ? "" : "-compressed"),
          blob,
          note: (keepOriginal ? "Already optimal" : saved >= 0 ? `−${saved}%` : `+${-saved}%`) + (scaledTo ? ` · max ${scaledTo}px` : ""),
        });
      }
      const missed = limitSize ? out.filter((o) => o.blob.size > targetKb * 1024).length : 0;
      return {
        files: out,
        message:
          `${formatBytes(before)} → ${formatBytes(after)} (−${Math.max(0, Math.round((1 - after / before) * 100))}% total).` +
          (scaled ? ` ${scaled} image${scaled === 1 ? " was" : "s were"} also scaled down to reach ${formatKb(targetKb)}.` : "") +
          (missed ? ` ${missed} image${missed === 1 ? "" : "s"} could not reach ${formatKb(targetKb)} — try lowering the dimensions.` : ""),
      };
    });
  }

  const delta = preview.result && selected ? Math.round((1 - preview.result.size / selected.file.size) * 100) : null;

  return (
    <ToolLayout
      slug={slug}
      fileCount={list.items.length}
      onFiles={list.add}
      onReset={list.clear}
      processor={processor}
      zipName="compressed-images.zip"
      action={{ label: `Compress ${list.items.length > 1 ? `${list.items.length} images` : "image"}`, icon: <ImageDown className="size-5" />, onClick: compressAll }}
      options={
        <>
          <Toggle label="Limit file size" hint="Quality is lowered automatically until each image fits." checked={limitSize} onChange={setLimitSize} />
          {limitSize && <TargetSizePicker value={targetKb} onChange={setTargetKb} />}
          <Slider
            label={limitSize ? "Starting quality" : "Quality"}
            value={quality}
            onChange={setQuality}
            min={5}
            max={100}
            format={(v) => `${v}%`}
            disabled={isPng}
            hint={isPng ? "PNG is lossless — choose WebP or JPG for quality control." : "70–80% is visually lossless for most photos."}
          />
          <Select
            label="Output format"
            value={format}
            onChange={setFormat}
            options={[
              { value: "same", label: "Same as input" },
              { value: "image/webp", label: "WebP (smallest)" },
              { value: "image/jpeg", label: "JPG" },
              { value: "image/png", label: "PNG (lossless)" },
            ]}
          />
          <Toggle label="Limit dimensions" hint="Downscaling large photos is the biggest size saver." checked={limitDim} onChange={setLimitDim} />
          {limitDim && (
            <Field label="Longest side">
              <NumberInput value={maxDim} onChange={setMaxDim} min={64} max={10000} suffix="px" label="Longest side" />
            </Field>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Panel
          title="Before / after"
          actions={
            selected && (
              <span className="text-xs text-fg-muted tabular-nums">
                {formatBytes(selected.file.size)} → {preview.busy ? "…" : preview.result ? formatBytes(preview.result.size) : "—"}
                {delta != null && !preview.busy && (
                  <span className={delta >= 0 ? "ml-1.5 font-semibold text-success-strong" : "ml-1.5 font-semibold text-danger"}>{delta >= 0 ? `−${delta}%` : `+${-delta}%`}</span>
                )}
              </span>
            )
          }
        >
          {preview.error && <Notice tone="danger" className="mb-3">{preview.error}</Notice>}
          {beforeUrl && <BeforeAfter before={beforeUrl} after={afterUrl} afterLabel={preview.busy ? "Updating…" : "Compressed"} />}
          <p className="mt-2 text-xs text-fg-subtle">Drag across the image to compare.{list.items.length > 1 && " Click a thumbnail below to preview another image."}</p>
        </Panel>
        {list.items.length > 1 && (
          <Panel title={`${list.items.length} images`}>
            <ImageGrid items={list.items} selectedId={selected?.id} onSelect={setSelectedId} onRemove={list.remove} />
          </Panel>
        )}
      </div>
    </ToolLayout>
  );
}
