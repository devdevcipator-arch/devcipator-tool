"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { ChevronLeft, ChevronRight, Download, LayoutTemplate } from "lucide-react";
import { useProcessor } from "@/hooks/useProcessor";
import { pdfBlob, pdfWorker } from "@/lib/pdf/client";
import { closePdf, openPdf } from "@/lib/pdf/pdfjs";
import type { FormFieldInfo, FormFont, FormInspection, FormValue } from "@/lib/pdf/api";
import { downloadBlob, errorMessage, withExtension } from "@/lib/files";
import { cn } from "@/lib/cn";
import { Panel, ToolLayout } from "@/components/tool/ToolLayout";
import { PdfPageCanvas } from "@/components/pdf/PdfPageCanvas";
import { Button, IconButton } from "@/components/ui/Button";
import { INPUT_CLASS, Notice, Segmented, Select, TextInput, Toggle } from "@/components/ui/controls";

const VIEW_WIDTH = 600;

const FONT_SIZES = [0, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24];

/** "topmostSubform[0].Page1[0].FirstName[0]" → "FirstName". */
function fieldLabel(name: string): string {
  const last = name.split(".").pop() ?? name;
  return last.replace(/\[\d+\]$/, "").replace(/_/g, " ").trim() || name;
}

const sameValue = (a: FormValue | undefined, b: FormValue | undefined) => JSON.stringify(a) === JSON.stringify(b);

export default function FormFiller({ onOpenBuilder }: { onOpenBuilder: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ArrayBuffer | null>(null);
  const [form, setForm] = useState<FormInspection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, FormValue>>({});
  const [font, setFont] = useState<FormFont>("Helvetica");
  const [fontSize, setFontSize] = useState(0);
  const [flatten, setFlatten] = useState(false);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<PDFDocumentProxy | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const processor = useProcessor();

  // Inspect the form whenever a new file arrives.
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    (async () => {
      try {
        const buf = await file.arrayBuffer();
        const copy = buf.slice(0);
        const result = await pdfWorker().call("inspectForm", [copy], { transfer: [copy] });
        if (cancelled) return;
        setData(buf);
        setForm(result);
        setValues(Object.fromEntries(result.fields.map((f) => [f.name, f.value])));
      } catch (err) {
        if (!cancelled) setLoadError(errorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  const editable = useMemo(() => form?.fields.filter((f) => f.kind !== "unsupported") ?? [], [form]);
  const unsupported = (form?.fields.length ?? 0) - editable.length;

  // Only fields the user changed are written, so the rest keep the form's own fonts and appearance.
  const changed = useMemo(() => {
    const out: Record<string, FormValue> = {};
    for (const f of editable) if (!f.readOnly && !sameValue(values[f.name], f.value)) out[f.name] = values[f.name];
    return out;
  }, [editable, values]);
  const changedCount = Object.keys(changed).length;
  const changedKey = JSON.stringify(changed);

  // Live preview: re-fill a fresh copy shortly after each change. Older renders that finish late are dropped.
  const seq = useRef(0);
  const current = useRef<PDFDocumentProxy | null>(null);
  useEffect(() => {
    if (!data) return;
    const id = ++seq.current;
    const timer = setTimeout(async () => {
      try {
        let bytes: Uint8Array | ArrayBuffer = data;
        if (changedCount > 0) {
          const copy = data.slice(0);
          bytes = await pdfWorker().call("fillForm", [copy, JSON.parse(changedKey), { font, fontSize, flatten: false }], { transfer: [copy] });
        }
        if (id !== seq.current) return;
        const doc = await openPdf(bytes);
        if (id !== seq.current) return closePdf(doc);
        if (current.current) closePdf(current.current);
        current.current = doc;
        setPreview(doc);
        setPreviewError(null);
      } catch (err) {
        if (id === seq.current) setPreviewError(`The preview could not be updated (${errorMessage(err)}).`);
      }
    }, changedCount > 0 ? 250 : 0);
    return () => clearTimeout(timer);
  }, [data, changedKey, changedCount, font, fontSize]);

  useEffect(
    () => () => {
      seq.current++;
      if (current.current) closePdf(current.current);
    },
    [],
  );

  function clear() {
    seq.current++;
    if (current.current) closePdf(current.current);
    current.current = null;
    setPreview(null);
    setFile(null);
    setData(null);
    setForm(null);
    setLoadError(null);
    setValues({});
    setPreviewError(null);
    setFilter("");
    setPage(1);
  }

  async function exportPdf() {
    if (!file || !data) return;
    await processor.run(async ({ report, signal }) => {
      const copy = data.slice(0);
      const bytes = await pdfWorker().call("fillForm", [copy, changed, { font, fontSize, flatten }], { onProgress: report, signal, transfer: [copy] });
      const name = withExtension(file.name, "pdf", flatten ? "-flattened" : "-edited");
      const blob = pdfBlob(bytes);
      void downloadBlob(blob, name);
      const note = changedCount ? `${changedCount} field${changedCount === 1 ? "" : "s"} changed` : "Flattened";
      return [{ name, blob, note }];
    });
  }

  const numPages = preview?.numPages ?? 0;
  const shown = filter.trim() ? editable.filter((f) => f.name.toLowerCase().includes(filter.trim().toLowerCase())) : editable;
  const noFields = form !== null && editable.length === 0;

  return (
    <ToolLayout
      slug="edit-pdf"
      fileCount={file ? 1 : 0}
      onFiles={(f) => {
        clear();
        setFile(f[0]);
      }}
      onReset={clear}
      processor={processor}
      dropLabel="Drop a fillable PDF form"
      action={{
        label: "Download Edited PDF",
        icon: <Download className="size-5" />,
        disabled: !data || noFields || (changedCount === 0 && !flatten),
        hint: noFields ? "This PDF has no form fields to fill." : "Fill in a field, or turn on Flatten form.",
        onClick: exportPdf,
      }}
      options={
        <>
          <Segmented
            label="Font for filled fields"
            value={font}
            onChange={setFont}
            options={[
              { value: "Helvetica", label: <span style={{ fontFamily: "Helvetica, Arial, sans-serif" }}>Helvetica</span> },
              { value: "TimesRoman", label: <span style={{ fontFamily: "'Times New Roman', Times, serif" }}>Times</span> },
              { value: "Courier", label: <span style={{ fontFamily: "'Courier New', Courier, monospace" }}>Courier</span> },
            ]}
            hint="Applied to the text and choice fields you change. Other fields keep the form's own font."
          />
          <Select
            label="Font size"
            value={String(fontSize)}
            onChange={(v) => setFontSize(Number(v))}
            options={FONT_SIZES.map((s) => ({ value: String(s), label: s === 0 ? "Field default" : `${s} pt` }))}
            hint="A fixed size can overflow small boxes; Field default keeps the size the form sets, or fits the text."
          />
          <Toggle label="Flatten form (lock edits)" hint="Turns the fields into ordinary page content, so the values can't be changed again." checked={flatten} onChange={setFlatten} />
          {form && (
            <p className="text-sm text-fg-muted">
              {editable.length} fillable field{editable.length === 1 ? "" : "s"}
              {changedCount > 0 && `, ${changedCount} changed`}
              {unsupported > 0 && `. ${unsupported} signature or button field${unsupported === 1 ? "" : "s"} can't be filled here.`}
            </p>
          )}
        </>
      }
    >
      {loadError ? (
        <Notice tone="danger">{loadError}</Notice>
      ) : !form ? (
        <Panel title="Reading form fields…">
          <div className="h-64" />
        </Panel>
      ) : noFields ? (
        <Panel title="No editable form fields found">
          <div className="flex flex-col items-start gap-4 py-2">
            <div className="flex flex-col gap-2 text-sm leading-relaxed text-fg-muted">
              <p>
                <strong className="text-fg">{file?.name}</strong> has no interactive form fields (AcroForm text boxes, checkboxes, dropdowns or radio buttons), so there is nothing here to fill in.
                {form.hasXfa && " It contains an XFA form, an older Adobe format that only Adobe Reader can fill."}
              </p>
              <p>
                Most PDFs are “flattened”: their text is drawn on the page with embedded fonts that usually include only the characters the document uses. Changing a word, its font or a single letter&apos;s style would mean rebuilding the page layout, which is why a PDF can&apos;t be retyped like a Word file.
              </p>
              <p>To make a new document with full control over fonts and per-letter styling, use the Custom PDF Builder.</p>
            </div>
            <Button icon={<LayoutTemplate className="size-4" />} onClick={onOpenBuilder}>
              Open the Custom PDF Builder
            </Button>
          </div>
        </Panel>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <Panel
            title={`Form fields (${editable.length})`}
            actions={editable.length > 8 ? <TextInput value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a field" aria-label="Find a field" className="h-8 w-40" /> : undefined}
          >
            {form.hasXfa && (
              <Notice tone="warning" className="mb-4">
                This PDF also has an XFA form. The download keeps the standard form fields and drops the XFA copy, so every PDF viewer shows your values.
              </Notice>
            )}
            <ul className="flex flex-col gap-4">
              {shown.map((f) => (
                <li key={f.name}>
                  <FieldControl field={f} value={values[f.name]} changed={f.name in changed} onFocus={() => f.page != null && setPage(f.page + 1)} onChange={(v) => setValues((vs) => ({ ...vs, [f.name]: v }))} />
                </li>
              ))}
              {shown.length === 0 && <li className="text-sm text-fg-muted">No field matches “{filter}”.</li>}
            </ul>
          </Panel>

          <Panel
            className="xl:sticky xl:top-20"
            title={`Live preview · page ${page} of ${numPages || "…"}`}
            actions={
              <>
                <IconButton label="Previous page" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="size-4" />
                </IconButton>
                <IconButton label="Next page" onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={page >= numPages}>
                  <ChevronRight className="size-4" />
                </IconButton>
              </>
            }
          >
            {previewError && <Notice tone="warning" className="mb-3">{previewError}</Notice>}
            {preview && (
              <div className="flex justify-center">
                <div className="border border-border bg-white shadow-card" style={{ width: VIEW_WIDTH, maxWidth: "100%" }}>
                  <PdfPageCanvas doc={preview} pageNumber={Math.min(page, numPages)} width={VIEW_WIDTH} drawForms className="[&>canvas]:!w-full" />
                </div>
              </div>
            )}
            <p className="mt-3 text-center text-xs text-fg-subtle">Updates as you type. Click a field to jump to its page.</p>
          </Panel>
        </div>
      )}
    </ToolLayout>
  );
}

function FieldControl({ field: f, value, changed, onChange, onFocus }: { field: FormFieldInfo; value: FormValue; changed: boolean; onChange: (v: FormValue) => void; onFocus: () => void }) {
  const id = `field-${f.name}`;
  const label = (
    <span className="flex min-w-0 items-center gap-2">
      <span className="truncate text-sm font-medium text-fg" title={f.name}>
        {fieldLabel(f.name)}
      </span>
      {f.page != null && <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg-subtle">p. {f.page + 1}</span>}
      {f.readOnly && <span className="shrink-0 text-xs text-fg-subtle">read-only</span>}
      {changed && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="changed" />}
    </span>
  );
  const disabled = f.readOnly;
  const selected = Array.isArray(value) ? value : typeof value === "string" && value ? [value] : [];

  if (f.kind === "checkbox") {
    return (
      <label className={cn("flex items-center gap-2.5", disabled ? "opacity-60" : "cursor-pointer")}>
        <input type="checkbox" checked={value === true} disabled={disabled} onFocus={onFocus} onChange={(e) => onChange(e.target.checked)} className="size-4 shrink-0 cursor-pointer" />
        {label}
      </label>
    );
  }

  if (f.kind === "radio") {
    return (
      <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
        <legend className="mb-1.5">{label}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {f.options.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-fg cursor-pointer">
              <input type="radio" name={id} checked={value === o} onFocus={onFocus} onChange={() => onChange(o)} className="size-4 cursor-pointer" />
              {o}
            </label>
          ))}
          <button type="button" onClick={() => onChange("")} className="text-xs text-fg-muted underline hover:text-fg cursor-pointer">
            Clear
          </button>
        </div>
      </fieldset>
    );
  }

  if ((f.kind === "dropdown" || f.kind === "optionlist") && f.multiSelect) {
    return (
      <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
        <legend className="mb-1.5">{label}</legend>
        {f.options.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm text-fg cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(o)}
              onFocus={onFocus}
              onChange={(e) => onChange(e.target.checked ? [...selected, o] : selected.filter((s) => s !== o))}
              className="size-4 cursor-pointer"
            />
            {o}
          </label>
        ))}
      </fieldset>
    );
  }

  if (f.kind === "dropdown" || f.kind === "optionlist") {
    const current = selected[0] ?? "";
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id}>{label}</label>
        {f.editable ? (
          <>
            <TextInput id={id} list={`${id}-options`} value={current} disabled={disabled} onFocus={onFocus} onChange={(e) => onChange(e.target.value ? [e.target.value] : [])} />
            <datalist id={`${id}-options`}>
              {f.options.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </>
        ) : (
          <select id={id} value={current} disabled={disabled} onFocus={onFocus} onChange={(e) => onChange(e.target.value ? [e.target.value] : [])} className={cn(INPUT_CLASS, "cursor-pointer pr-8 disabled:opacity-60")}>
            <option value="">— None —</option>
            {/* A value set by another program may not be one of the listed options. */}
            {current && !f.options.includes(current) && <option value={current}>{current}</option>}
            {f.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }

  // Text field
  const text = typeof value === "string" ? value : "";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="min-w-0">
          {label}
        </label>
        {f.maxLength != null && (
          <span className="shrink-0 font-mono text-xs text-fg-subtle tabular-nums">
            {text.length}/{f.maxLength}
          </span>
        )}
      </div>
      {f.multiline ? (
        <textarea
          id={id}
          value={text}
          maxLength={f.maxLength}
          disabled={disabled}
          rows={3}
          onFocus={onFocus}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg hover:border-border-strong focus:border-primary focus:outline-none disabled:opacity-60 pointer-coarse:text-base"
        />
      ) : (
        <TextInput id={id} value={text} maxLength={f.maxLength} disabled={disabled} onFocus={onFocus} onChange={(e) => onChange(e.target.value)} className="disabled:opacity-60" />
      )}
    </div>
  );
}
