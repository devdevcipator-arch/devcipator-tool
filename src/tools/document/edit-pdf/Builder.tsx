"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  Download,
  Eraser,
  Heading,
  Italic,
  ListPlus,
  MousePointerClick,
  Pilcrow,
  Printer,
  TextSelect,
  Trash2,
  Underline,
} from "lucide-react";
import { useProcessor, throwIfAborted } from "@/hooks/useProcessor";
import { pdfBlob, pdfWorker } from "@/lib/pdf/client";
import { canvasToBytes } from "@/lib/pdf/pdfjs";
import type { RasterPage } from "@/lib/pdf/api";
import { downloadBlob, outputName } from "@/lib/files";
import { cn } from "@/lib/cn";
import { Panel } from "@/components/tool/ToolLayout";
import { ProgressBar } from "@/components/tool/ProgressBar";
import { ResultList } from "@/components/tool/ResultList";
import { Button, IconButton } from "@/components/ui/Button";
import { ColorInput, INPUT_CLASS, Notice, Segmented, Select, Slider, TextInput, Toggle } from "@/components/ui/controls";
import { FONT_OPTIONS, type FontId } from "./fonts";
import {
  PX_PER_PT,
  TEMPLATES,
  applyStyle,
  editText,
  newBlock,
  pageDims,
  partOf,
  template,
  withPart,
  wordAt,
  type Align,
  type Block,
  type BlockType,
  type CharStyle,
  type DocSettings,
  type Part,
  type Selection,
  type TemplateId,
} from "./model";
import { BlockView, INK, Sheet, bodyStyle, type Piece } from "./Sheet";

/** html2canvas scale: 3 × 96 = 288 DPI, sharp in print without huge files. */
const EXPORT_SCALE = 3;

const WEIGHTS = [
  { value: "", label: "Default weight" },
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra bold" },
  { value: "900", label: "Black" },
];

const ALIGNS: Array<{ value: Align; label: string; icon: ReactNode }> = [
  { value: "left", label: "Align left", icon: <AlignLeft className="size-4" /> },
  { value: "center", label: "Centre", icon: <AlignCenter className="size-4" /> },
  { value: "right", label: "Align right", icon: <AlignRight className="size-4" /> },
  { value: "justify", label: "Justify", icon: <AlignJustify className="size-4" /> },
];

const BLOCK_LABEL: Record<BlockType, string> = { heading: "Heading", paragraph: "Paragraph", keyvalue: "Key–value row" };

/** A block's slot on a page, by index; `start`/`end` mark the characters of a paragraph split across pages. */
type Slot = { block: number; start?: number; end?: number; cont?: boolean };

/** A measured block: its height and, for paragraphs, where each line starts (character index and offset from the block's top). */
type Measured = { height: number; lines?: Array<{ start: number; y: number }> };

/** Finds where each rendered line of a block begins, from the positions of its characters. */
function measureLines(el: Element, fontPx: number): Array<{ start: number; y: number }> {
  const lines: Array<{ start: number; y: number }> = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let offset = 0;
  let firstTop = 0;
  let lineTop = -Infinity;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const len = node.textContent?.length ?? 0;
    for (let i = 0; i < len; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getClientRects()[0];
      // Same-size letters on one line differ in top by far less than half a line; the next line is at least one em lower.
      if (!r || r.top <= lineTop + fontPx * 0.5) continue;
      if (!lines.length) firstTop = r.top;
      lines.push({ start: offset + i, y: lines.length ? r.top - firstTop : 0 });
      lineTop = r.top;
    }
    offset += len;
  }
  return lines;
}

/**
 * Lays blocks out on pages from their measured heights. Paragraphs split between lines when they don't
 * fit; headings and key–value rows move to the next page whole.
 */
function paginate(blocks: Measured[], textLength: (i: number) => number, pageContent: number, gap: number): Slot[][] {
  const pages: Slot[][] = [[]];
  let used = 0;
  const limit = pageContent + 0.5;
  blocks.forEach((m, i) => {
    const lines = m.lines && m.lines.length > 1 ? m.lines : null;
    // Offset of line `k` from the block's top; one past the last line is the block's bottom.
    const yAt = (k: number) => (k === 0 ? 0 : lines && k < lines.length ? lines[k].y : m.height);
    let from = 0;
    for (;;) {
      const page = pages[pages.length - 1];
      const room = limit - (page.length ? used + gap : 0);
      const rest = m.height - yAt(from);
      const start = lines ? lines[from].start : undefined;
      if (rest <= room || (!page.length && !lines)) {
        page.push(lines && from > 0 ? { block: i, start } : { block: i });
        used = (page.length > 1 ? used + gap : 0) + rest;
        return;
      }
      if (lines) {
        let k = 0;
        while (from + k + 1 < lines.length && yAt(from + k + 1) - yAt(from) <= room) k++;
        // Not even one line fits an empty page: place the rest here (cut off) rather than loop forever.
        if (k === 0 && !page.length) {
          page.push(from > 0 ? { block: i, start } : { block: i });
          used = rest;
          return;
        }
        if (k > 0) {
          const end = from + k < lines.length ? lines[from + k].start : textLength(i);
          page.push({ block: i, start: from > 0 ? start : 0, end, cont: true });
          from += k;
        }
      }
      pages.push([]);
      used = 0;
    }
  });
  return pages;
}

export default function Builder({ active }: { active: boolean }) {
  const [initial] = useState(() => template("letter"));
  const [templateId, setTemplateId] = useState<TemplateId>("letter");
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks);
  const [settings, setSettings] = useState<DocSettings>(initial.settings);
  const [sel, setSel] = useState<Selection | null>(null);
  const [perLetter, setPerLetter] = useState(false);
  const [pages, setPages] = useState<Slot[][]>([blocks.map((_, i) => ({ block: i }))]);
  const [tooTall, setTooTall] = useState(false);
  const [fontTick, setFontTick] = useState(0);
  const [previewWidth, setPreviewWidth] = useState(560);
  const anchor = useRef<number | null>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const processor = useProcessor();

  const dims = pageDims(settings);
  const marginPx = settings.margin * 96;
  const set = <K extends keyof DocSettings>(key: K, value: DocSettings[K]) => setSettings((s) => ({ ...s, [key]: value }));

  // Web fonts change line heights when they finish loading, so measure again then.
  useEffect(() => {
    const bump = () => setFontTick((t) => t + 1);
    document.fonts.addEventListener("loadingdone", bump);
    return () => document.fonts.removeEventListener("loadingdone", bump);
  }, []);

  // Lay blocks out on pages from the off-screen measuring column; state only changes when the split does.
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const content = dims.height - marginPx * 2;
    const fontPx = settings.fontSize * PX_PER_PT;
    const measured: Measured[] = Array.from(el.children, (c, i) => ({
      height: c.getBoundingClientRect().height,
      lines: blocks[i]?.type === "paragraph" ? measureLines(c, fontPx) : undefined,
    }));
    const textLength = (i: number) => {
      const b = blocks[i];
      return b && b.type !== "keyvalue" ? b.text.text.length : 0;
    };
    const next = paginate(measured, textLength, content, settings.spacing * PX_PER_PT);
    setPages((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    // Only a heading/row taller than a page, or a single line that is, still gets cut off.
    setTooTall(measured.some((m) => (m.lines && m.lines.length > 1 ? m.lines.some((l, k) => (k + 1 < m.lines!.length ? m.lines![k + 1].y : m.height) - l.y > content + 0.5) : m.height > content + 0.5)));
  }, [blocks, settings, fontTick, dims.height, marginPx]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      // Zero while the tab is hidden; keep the last real width.
      if (entry.contentRect.width > 0) setPreviewWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = Math.min(1, previewWidth / dims.width);

  // ─── Selection ───
  const selBlock = sel ? blocks.find((b) => b.id === sel.block) : undefined;
  const selText = selBlock && sel ? partOf(selBlock, sel.part) : null;
  const activeSel = sel && selText && sel.end > sel.start && sel.end <= selText.text.length ? sel : null;
  const selStyle: CharStyle = (activeSel && selText?.marks[activeSel.start]) || {};
  const baseColor = selBlock && (selBlock.type === "heading" || (selBlock.type === "keyvalue" && sel?.part === "key")) ? settings.accent : INK;

  function track(block: string, part: Part) {
    return (e: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const t = e.currentTarget;
      anchor.current = null;
      setSel({ block, part, start: t.selectionStart ?? 0, end: t.selectionEnd ?? 0 });
    };
  }

  function style(patch: Partial<CharStyle> | null) {
    if (!activeSel) return;
    setBlocks((bs) => bs.map((b) => (b.id === activeSel.block ? withPart(b, activeSel.part, applyStyle(partOf(b, activeSel.part)!, activeSel.start, activeSel.end, patch)) : b)));
  }

  function pickLetter(e: React.MouseEvent, word: boolean) {
    if (!perLetter) return;
    const t = (e.target as Element).closest<HTMLElement>("[data-i]");
    if (!t) return;
    const block = t.dataset.block!;
    const part = t.dataset.part as Part;
    const i = Number(t.dataset.i);
    if (word) {
      const b = blocks.find((x) => x.id === block);
      const st = b && partOf(b, part);
      if (!st) return;
      const [start, end] = wordAt(st.text, i);
      anchor.current = start;
      setSel({ block, part, start, end });
    } else if (e.shiftKey && sel && sel.block === block && sel.part === part) {
      const a = anchor.current ?? sel.start;
      setSel({ block, part, start: Math.min(a, i), end: Math.max(a, i) + 1 });
    } else {
      anchor.current = i;
      setSel({ block, part, start: i, end: i + 1 });
    }
  }

  // ─── Blocks ───
  const update = (id: string, fn: (b: Block) => Block) => setBlocks((bs) => bs.map((b) => (b.id === id ? fn(b) : b)));
  const editPart = (id: string, part: Part, value: string) => update(id, (b) => withPart(b, part, editText(partOf(b, part)!, value)));
  function move(i: number, d: -1 | 1) {
    setBlocks((bs) => {
      const j = i + d;
      if (j < 0 || j >= bs.length) return bs;
      const next = bs.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function applyTemplate(id: TemplateId) {
    const t = template(id);
    setTemplateId(id);
    setBlocks(t.blocks);
    setSettings(t.settings);
    setSel(null);
    processor.reset();
  }

  // ─── Export ───
  const title = (blocks.find((b) => b.type === "heading") as Extract<Block, { type: "heading" }> | undefined)?.text.text.trim() || "Document";

  async function download() {
    await processor.run(async ({ report, signal }) => {
      report(null, "Loading fonts");
      await document.fonts.ready;
      const { default: html2canvas } = await import("html2canvas-pro");
      const sheets = Array.from(exportRef.current?.querySelectorAll<HTMLElement>(".edit-pdf-sheet") ?? []);
      const raster: RasterPage[] = [];
      for (let i = 0; i < sheets.length; i++) {
        throwIfAborted(signal);
        report((i / sheets.length) * 0.9, `Rendering page ${i + 1} of ${sheets.length}`);
        const canvas = await html2canvas(sheets[i], {
          scale: EXPORT_SCALE,
          backgroundColor: "#ffffff",
          logging: false,
          // The export copy sits off-screen; bring it on-screen in html2canvas's clone so nothing is cropped.
          onclone: (doc) => {
            const root = doc.querySelector<HTMLElement>(".edit-pdf-print");
            if (root) root.style.left = "0px";
          },
        });
        const bytes = await canvasToBytes(canvas, "image/png");
        raster.push({ bytes, format: "png", pixelWidth: canvas.width, pixelHeight: canvas.height, pageWidth: dims.widthPt, pageHeight: dims.heightPt, margin: 0 });
        canvas.width = canvas.height = 0;
      }
      const pdf = await pdfWorker().call("images", [raster, title], {
        onProgress: (v) => report(0.9 + (v ?? 0) * 0.1, "Building the PDF"),
        signal,
        transfer: raster.map((r) => r.bytes.buffer as ArrayBuffer),
      });
      const name = outputName(title, "document", "pdf");
      const blob = pdfBlob(pdf);
      void downloadBlob(blob, name);
      return [{ name, blob, note: `${raster.length} page${raster.length === 1 ? "" : "s"}` }];
    });
  }

  const running = processor.status === "running";

  // Slots point at blocks by index; drop any left stale for a frame after a block is removed.
  const pieces = (page: Slot[]): Piece[] => page.flatMap((s) => (blocks[s.block] ? [{ ...s, block: blocks[s.block] }] : []));

  const sheets = (ix?: { selection: Selection | null; perLetter: boolean }) =>
    pages.map((page, n) => <Sheet key={n} pieces={pieces(page)} settings={settings} ix={ix} />);

  return (
    <div className="grid items-start gap-6 md:grid-cols-2">
      {/* ─────────── Left: content and typography ─────────── */}
      <div className="flex min-w-0 flex-col gap-6">
        <Panel title="Start from a template">
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t.id)}
                aria-pressed={templateId === t.id}
                className={cn(
                  "flex flex-col items-start rounded-xl border px-3 py-2.5 text-left cursor-pointer",
                  templateId === t.id ? "border-primary bg-primary-soft" : "border-border hover:border-border-strong hover:bg-surface-2",
                )}
              >
                <span className="text-sm font-medium text-fg">{t.label}</span>
                <span className="text-xs text-fg-muted">{t.description}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-fg-subtle">Choosing a template replaces the current content.</p>
        </Panel>

        <Panel title={`Content (${blocks.length} field${blocks.length === 1 ? "" : "s"})`}>
          <ol className="flex flex-col gap-3">
            {blocks.map((b, i) => (
              <li key={b.id} className={cn("rounded-xl border bg-surface p-3", sel?.block === b.id ? "border-primary/60" : "border-border")}>
                <div className="mb-2 flex flex-wrap items-center gap-1">
                  <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-fg-subtle">{BLOCK_LABEL[b.type]}</span>
                  {b.type === "heading" && (
                    <select
                      aria-label="Heading size"
                      value={b.level}
                      onChange={(e) => update(b.id, (x) => (x.type === "heading" ? { ...x, level: Number(e.target.value) as 1 | 2 } : x))}
                      className={cn(INPUT_CLASS, "h-7 w-auto cursor-pointer px-2 text-xs pointer-coarse:h-9")}
                    >
                      <option value={1}>Title</option>
                      <option value={2}>Section</option>
                    </select>
                  )}
                  {b.type !== "keyvalue" &&
                    ALIGNS.map((a) => (
                      <IconButton key={a.value} size="sm" label={a.label} active={b.align === a.value} onClick={() => update(b.id, (x) => (x.type === "keyvalue" ? x : { ...x, align: a.value }))}>
                        {a.icon}
                      </IconButton>
                    ))}
                  <span className="ml-auto flex items-center gap-0.5">
                    <IconButton size="sm" label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp className="size-4" />
                    </IconButton>
                    <IconButton size="sm" label="Move down" disabled={i === blocks.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown className="size-4" />
                    </IconButton>
                    <IconButton size="sm" label="Remove" onClick={() => setBlocks((bs) => bs.filter((x) => x.id !== b.id))}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </span>
                </div>
                {b.type === "keyvalue" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <TextInput aria-label="Label" value={b.key.text} onChange={(e) => editPart(b.id, "key", e.target.value)} onSelect={track(b.id, "key")} />
                    <TextInput aria-label="Value" value={b.value.text} onChange={(e) => editPart(b.id, "value", e.target.value)} onSelect={track(b.id, "value")} />
                  </div>
                ) : b.type === "heading" ? (
                  <TextInput aria-label="Heading text" value={b.text.text} onChange={(e) => editPart(b.id, "text", e.target.value)} onSelect={track(b.id, "text")} />
                ) : (
                  <textarea
                    aria-label="Paragraph text"
                    value={b.text.text}
                    rows={Math.min(10, Math.max(2, b.text.text.split("\n").length + Math.floor(b.text.text.length / 60)))}
                    onChange={(e) => editPart(b.id, "text", e.target.value)}
                    onSelect={track(b.id, "text")}
                    className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-fg hover:border-border-strong focus:border-primary focus:outline-none pointer-coarse:text-base"
                  />
                )}
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={<Heading className="size-4" />} onClick={() => setBlocks((bs) => [...bs, newBlock("heading")])}>
              Heading
            </Button>
            <Button size="sm" variant="secondary" icon={<Pilcrow className="size-4" />} onClick={() => setBlocks((bs) => [...bs, newBlock("paragraph")])}>
              Paragraph
            </Button>
            <Button size="sm" variant="secondary" icon={<ListPlus className="size-4" />} onClick={() => setBlocks((bs) => [...bs, newBlock("keyvalue")])}>
              Key–value row
            </Button>
          </div>
        </Panel>

        <Panel title="Typography & layout">
          <div className="flex flex-col gap-5">
            <Select label="Font family" value={settings.font} onChange={(v) => set("font", v)} options={FONT_OPTIONS} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Slider label="Font size" value={settings.fontSize} onChange={(v) => set("fontSize", v)} min={8} max={24} step={0.5} format={(v) => `${v} pt`} />
              <Slider label="Line height" value={settings.lineHeight} onChange={(v) => set("lineHeight", v)} min={1} max={2.4} step={0.05} format={(v) => v.toFixed(2)} />
              <Slider label="Paragraph spacing" value={settings.spacing} onChange={(v) => set("spacing", v)} min={0} max={40} format={(v) => `${v} pt`} />
              <Slider label="Page margin" value={settings.margin} onChange={(v) => set("margin", v)} min={0.4} max={1.5} step={0.05} format={(v) => `${v.toFixed(2)} in`} />
            </div>
            <ColorInput label="Accent colour" value={settings.accent} onChange={(v) => set("accent", v)} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Segmented label="Page size" value={settings.pageSize} onChange={(v) => set("pageSize", v)} options={[{ value: "a4", label: "A4" }, { value: "letter", label: "US Letter" }]} />
              <Segmented
                label="Orientation"
                value={settings.landscape ? "landscape" : "portrait"}
                onChange={(v) => set("landscape", v === "landscape")}
                options={[{ value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }]}
              />
            </div>
            <Toggle label="Decorative border" hint="A double frame in the accent colour, with content centred on the page." checked={settings.frame} onChange={(v) => set("frame", v)} />
          </div>
        </Panel>
      </div>

      {/* ─────────── Right: styler, live preview, export ─────────── */}
      {/* Sticky beside the form; on short windows the column scrolls rather than squeezing the preview. */}
      <div className="flex min-w-0 flex-col gap-4 md:sticky md:top-20 md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto md:overscroll-contain md:p-1 md:-m-1">
        <Panel
          title="Letter styling"
          actions={
            <Button size="sm" variant={perLetter ? "primary" : "secondary"} icon={<MousePointerClick className="size-4" />} aria-pressed={perLetter} onClick={() => setPerLetter((v) => !v)}>
              Per-Letter Styler {perLetter ? "on" : "off"}
            </Button>
          }
        >
          <div className="mb-3 flex items-start justify-between gap-2">
          <p className="min-h-5 min-w-0 flex-1 line-clamp-2 text-sm text-fg-muted" aria-live="polite">
            {activeSel && selText ? (
              <>
                Styling <span className="font-medium text-fg">“{selText.text.slice(activeSel.start, activeSel.end).replace(/\n/g, " ")}”</span> ({activeSel.end - activeSel.start} character{activeSel.end - activeSel.start === 1 ? "" : "s"})
              </>
            ) : perLetter ? (
              "Click a letter in the preview; Shift-click to extend, double-click for a word."
            ) : (
              "Highlight text in a field, or turn on the Per-Letter Styler to pick letters in the preview."
            )}
          </p>
          {selText && sel && selText.text.length > 0 && (
            <Button size="sm" variant="ghost" icon={<TextSelect className="size-4" />} onClick={() => setSel({ ...sel, start: 0, end: selText.text.length })}>
              Whole field
            </Button>
          )}
          </div>
          <fieldset disabled={!activeSel} className="flex flex-col gap-3 disabled:opacity-50">
            <div className="flex flex-wrap items-center gap-1">
              <IconButton label="Bold" active={(selStyle.weight ?? 0) >= 700} onClick={() => style({ weight: (selStyle.weight ?? 0) >= 700 ? undefined : 700 })}>
                <Bold className="size-4" />
              </IconButton>
              <IconButton label="Italic" active={!!selStyle.italic} onClick={() => style({ italic: !selStyle.italic })}>
                <Italic className="size-4" />
              </IconButton>
              <IconButton label="Underline" active={!!selStyle.underline} onClick={() => style({ underline: !selStyle.underline })}>
                <Underline className="size-4" />
              </IconButton>
              <label className="ml-1 flex items-center gap-1.5 text-sm text-fg-muted">
                <span className="sr-only">Letter colour</span>
                <input type="color" value={selStyle.color ?? baseColor} onChange={(e) => style({ color: e.target.value })} className="h-8 w-10 cursor-pointer rounded-md border border-border bg-surface p-0.5 pointer-coarse:h-11" title="Letter colour" />
              </label>
              <span className="ml-auto flex items-center gap-1">
                <IconButton label="Clear letter styling" onClick={() => style(null)}>
                  <Eraser className="size-4" />
                </IconButton>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select aria-label="Font weight" value={selStyle.weight ? String(selStyle.weight) : ""} onChange={(e) => style({ weight: e.target.value ? Number(e.target.value) : undefined })} className={cn(INPUT_CLASS, "cursor-pointer")}>
                {WEIGHTS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
              <select aria-label="Letter font" value={selStyle.font ?? ""} onChange={(e) => style({ font: (e.target.value || undefined) as FontId | undefined })} className={cn(INPUT_CLASS, "cursor-pointer")}>
                <option value="">Document font</option>
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <Slider label="Letter spacing" value={selStyle.spacing ?? 0} onChange={(v) => style({ spacing: v === 0 ? undefined : v })} min={-0.05} max={0.6} step={0.01} format={(v) => `${v.toFixed(2)} em`} />
          </fieldset>
        </Panel>

        <section className="flex flex-col rounded-2xl border border-border bg-surface shadow-card md:min-h-[26rem] md:flex-1">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-fg">
              Live preview · {settings.pageSize === "a4" ? "A4" : "US Letter"} · {pages.length} page{pages.length === 1 ? "" : "s"}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" icon={<Printer className="size-4" />} onClick={() => window.print()} disabled={running}>
                Print
              </Button>
              <Button size="sm" icon={<Download className="size-4" />} onClick={download} loading={running}>
                Download PDF
              </Button>
            </div>
          </header>
          <div className="min-h-0 overflow-y-auto bg-surface-2 p-4 md:flex-1">
            {tooTall && <Notice tone="warning" className="mb-3">A field is taller than a page, so its end is cut off. Split it into shorter paragraphs.</Notice>}
            <div
              ref={previewRef}
              className={cn("flex flex-col items-center gap-4", perLetter && "select-none")}
              onClick={(e) => pickLetter(e, false)}
              onDoubleClick={(e) => pickLetter(e, true)}
            >
              {pages.map((page, n) => (
                <div key={n} className="shrink-0 overflow-hidden bg-white shadow-card ring-1 ring-border" style={{ width: dims.width * scale, height: dims.height * scale }}>
                  <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: dims.width }}>
                    <Sheet pieces={pieces(page)} settings={settings} ix={{ selection: activeSel, perLetter }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* Below the preview, not inside it, so a finished download never shrinks the pages. */}
        {(running || processor.status === "error" || processor.status === "done") && (
          <div className="flex shrink-0 flex-col gap-3">
            {running && <ProgressBar progress={processor.progress} />}
            {processor.status === "error" && processor.error && <Notice tone="danger">{processor.error}</Notice>}
            {processor.status === "done" && <ResultList results={processor.results} zipName="edit-pdf.zip" />}
          </div>
        )}
        <p className="text-xs text-fg-subtle">
          Download PDF renders each page as a sharp {EXPORT_SCALE * 96} DPI image. Print → “Save as PDF” keeps the text selectable.
        </p>
      </div>

      {createPortal(
        <>
          {/* Measures each block at the page's text width; drives pagination. */}
          <div ref={measureRef} aria-hidden style={{ ...bodyStyle(settings), position: "fixed", left: -100000, top: 0, width: dims.width - marginPx * 2, visibility: "hidden", pointerEvents: "none" }}>
            {blocks.map((b) => (
              <BlockView key={b.id} block={b} settings={settings} />
            ))}
          </div>
          {/* Full-size pages for html2canvas and for printing. */}
          <div ref={exportRef} aria-hidden className="edit-pdf-print" style={{ position: "fixed", left: -100000, top: 0, width: dims.width, pointerEvents: "none" }}>
            {sheets()}
          </div>
        </>,
        document.body,
      )}
      {active && (
        <style>{`@media print {
  @page { size: ${dims.widthPt}pt ${dims.heightPt}pt; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body > *:not(.edit-pdf-print) { display: none !important; }
  .edit-pdf-print { position: static !important; left: auto !important; width: auto !important; }
  .edit-pdf-print .edit-pdf-sheet { break-after: page; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .edit-pdf-print .edit-pdf-sheet:last-child { break-after: auto; }
}`}</style>
      )}
    </div>
  );
}
