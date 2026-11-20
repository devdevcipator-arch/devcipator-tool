/// <reference lib="webworker" />
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFOptionList, PDFPage, PDFRadioGroup, PDFTextField, StandardFonts, degrees, rgb, type PDFField, type PDFFont } from "pdf-lib";
import { exposeWorker, type WorkerContext } from "@/lib/worker-rpc";
import { pageNumberTotal, type DisplayRect, type FillFormOptions, type FormFieldInfo, type FormValue, type OrganizedPage, type PageNumberOptions, type PdfApi, type RasterPage } from "@/lib/pdf/api";

function friendlyLoadError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (/encrypted/i.test(msg)) return new Error("This PDF is password-protected. Remove the password in your PDF reader first.");
  return new Error(`Could not read the PDF: ${msg}`);
}

async function load(data: ArrayBuffer): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(data, { updateMetadata: false });
  } catch (err) {
    throw friendlyLoadError(err);
  }
}

function stamp(doc: PDFDocument) {
  doc.setProducer("Devcipator Tools");
  doc.setModificationDate(new Date());
}

/**
 * Maps a point on the page *as displayed* (rotation applied, origin top-left,
 * in points) to PDF user space. Lets stamps land where the user placed them on
 * pages that carry a /Rotate attribute.
 */
function displayToUser(page: PDFPage, X: number, Y: number): { x: number; y: number; rotation: number } {
  const box = page.getCropBox();
  const W = box.width;
  const H = box.height;
  const rotation = ((page.getRotation().angle % 360) + 360) % 360;
  let p: number;
  let q: number;
  // (p, q) are top-left coordinates on the unrotated page.
  if (rotation === 90) [p, q] = [Y, H - X];
  else if (rotation === 180) [p, q] = [W - X, H - Y];
  else if (rotation === 270) [p, q] = [W - Y, X];
  else [p, q] = [X, Y];
  return { x: box.x + p, y: box.y + (H - q), rotation };
}

function displaySize(page: PDFPage): { width: number; height: number } {
  const { width, height } = page.getCropBox();
  const r = ((page.getRotation().angle % 360) + 360) % 360;
  return r === 90 || r === 270 ? { width: height, height: width } : { width, height };
}

function hexToRgb(hex: string) {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return rgb(0.2, 0.2, 0.2);
  return rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255);
}

async function drawRaster(doc: PDFDocument, p: RasterPage) {
  const img = p.format === "png" ? await doc.embedPng(p.bytes) : await doc.embedJpg(p.bytes);
  const page = doc.addPage([p.pageWidth, p.pageHeight]);
  const scale = Math.min((p.pageWidth - p.margin * 2) / p.pixelWidth, (p.pageHeight - p.margin * 2) / p.pixelHeight);
  const w = p.pixelWidth * scale;
  const h = p.pixelHeight * scale;
  page.drawImage(img, { x: (p.pageWidth - w) / 2, y: (p.pageHeight - h) / 2, width: w, height: h });
}

/** 0-based page of a field's first widget; widgets don't always carry a /P entry, so page /Annots are checked too. */
function fieldPage(doc: PDFDocument, field: PDFField, pageOfAnnot: Map<string, number>, pageOfRef: Map<string, number>): number | null {
  for (const widget of field.acroField.getWidgets()) {
    const p = widget.P();
    if (p && pageOfRef.has(p.toString())) return pageOfRef.get(p.toString())!;
    const ref = doc.context.getObjectRef(widget.dict);
    if (ref && pageOfAnnot.has(ref.toString())) return pageOfAnnot.get(ref.toString())!;
  }
  return null;
}

function describeField(field: PDFField): Omit<FormFieldInfo, "page"> {
  const base = { name: field.getName(), readOnly: field.isReadOnly(), options: [] as string[], multiline: false, multiSelect: false, editable: false };
  if (field instanceof PDFTextField) {
    return { ...base, kind: "text", value: field.getText() ?? "", multiline: field.isMultiline(), maxLength: field.getMaxLength() };
  }
  if (field instanceof PDFCheckBox) return { ...base, kind: "checkbox", value: field.isChecked() };
  if (field instanceof PDFDropdown) {
    return { ...base, kind: "dropdown", value: field.getSelected(), options: field.getOptions(), multiSelect: field.isMultiselect(), editable: field.isEditable() };
  }
  if (field instanceof PDFOptionList) {
    return { ...base, kind: "optionlist", value: field.getSelected(), options: field.getOptions(), multiSelect: field.isMultiselect() };
  }
  if (field instanceof PDFRadioGroup) return { ...base, kind: "radio", value: field.getSelected() ?? "", options: field.getOptions() };
  // Buttons and signature fields have nothing to type into.
  return { ...base, kind: "unsupported", value: "" };
}

/** Writes one value and redraws the field's appearance; returns false when the field rejected it. */
function setField(field: PDFField, value: FormValue, font: PDFFont, fontSize: number): boolean {
  try {
    if (field instanceof PDFTextField) {
      const max = field.getMaxLength();
      field.setText(typeof value === "string" ? (max ? value.slice(0, max) : value) : "");
      if (fontSize > 0) field.setFontSize(fontSize);
      field.updateAppearances(font);
    } else if (field instanceof PDFCheckBox || field instanceof PDFRadioGroup) {
      if (field instanceof PDFCheckBox) {
        if (value === true) field.check();
        else field.uncheck();
      } else if (typeof value === "string" && value) field.select(value);
      else field.clear();
      // Keep the form's own check marks; only draw default ones where a widget has none.
      if (field.acroField.getWidgets().some((w) => !w.getAppearances())) field.updateAppearances();
    } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
      const picked = (Array.isArray(value) ? value : [value]).filter((v): v is string => typeof v === "string" && v !== "");
      if (picked.length) field.select(picked);
      else field.clear();
      if (fontSize > 0) field.setFontSize(fontSize);
      field.updateAppearances(font);
    }
    return true;
  } catch {
    return false;
  }
}

exposeWorker<PdfApi>({
  async info(data: ArrayBuffer) {
    try {
      const doc = await PDFDocument.load(data, { updateMetadata: false });
      return { pageCount: doc.getPageCount(), encrypted: doc.isEncrypted };
    } catch {
      const doc = await PDFDocument.load(data, { ignoreEncryption: true, updateMetadata: false });
      return { pageCount: doc.getPageCount(), encrypted: true };
    }
  },

  async merge(files: ArrayBuffer[], ctx: WorkerContext) {
    const out = await PDFDocument.create();
    for (let i = 0; i < files.length; i++) {
      ctx.progress(i / files.length, `Merging file ${i + 1} of ${files.length}`);
      const src = await load(files[i]);
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }
    stamp(out);
    ctx.progress(0.95, "Saving");
    return out.save({ useObjectStreams: true });
  },

  async split(data: ArrayBuffer, groups: number[][], ctx: WorkerContext) {
    const src = await load(data);
    const results: Uint8Array[] = [];
    for (let i = 0; i < groups.length; i++) {
      ctx.progress(i / groups.length, `Creating part ${i + 1} of ${groups.length}`);
      const part = await PDFDocument.create();
      const pages = await part.copyPages(src, groups[i]);
      pages.forEach((p) => part.addPage(p));
      stamp(part);
      results.push(await part.save({ useObjectStreams: true }));
    }
    return results;
  },

  async organize(data: ArrayBuffer, pages: OrganizedPage[], ctx: WorkerContext) {
    ctx.progress(null, "Rebuilding document");
    const src = await load(data);
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, pages.map((p) => p.index));
    copied.forEach((page, i) => {
      const extra = pages[i].rotate;
      if (extra) page.setRotation(degrees((((page.getRotation().angle + extra) % 360) + 360) % 360));
      out.addPage(page);
    });
    stamp(out);
    return out.save({ useObjectStreams: true });
  },

  async images(pages: RasterPage[], title: string | undefined, ctx: WorkerContext) {
    const doc = await PDFDocument.create();
    if (title) doc.setTitle(title);
    for (let i = 0; i < pages.length; i++) {
      ctx.progress(i / pages.length, `Adding page ${i + 1} of ${pages.length}`);
      await drawRaster(doc, pages[i]);
    }
    stamp(doc);
    ctx.progress(0.98, "Saving");
    return doc.save({ useObjectStreams: true });
  },

  async pageNumbers(data: ArrayBuffer, o: PageNumberOptions, ctx: WorkerContext) {
    const doc = await load(data);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const color = hexToRgb(o.color);
    const pages = doc.getPages();
    const total = pageNumberTotal(pages.length, o);
    pages.forEach((page, i) => {
      if (i < o.fromPage) return;
      ctx.progress(i / pages.length, `Numbering page ${i + 1}`);
      const n = o.startAt + (i - o.fromPage);
      // Standard fonts only cover WinAnsi; strip anything else from the template.
      const text = o.format.replaceAll("{n}", String(n)).replaceAll("{total}", String(total)).replace(/[^\x20-\x7E -ÿ]/g, "");
      const tw = font.widthOfTextAtSize(text, o.fontSize);
      const { width, height } = displaySize(page);
      const [vertical, horizontal] = o.position.split("-");
      const X = horizontal === "left" ? o.margin : horizontal === "right" ? width - o.margin - tw : (width - tw) / 2;
      const baseline = vertical === "top" ? o.margin + o.fontSize : height - o.margin;
      const pt = displayToUser(page, X, baseline);
      page.drawText(text, { x: pt.x, y: pt.y, size: o.fontSize, font, color, rotate: degrees(pt.rotation) });
    });
    stamp(doc);
    return doc.save({ useObjectStreams: true });
  },

  async sign(data: ArrayBuffer, png: Uint8Array, placements: DisplayRect[], ctx: WorkerContext) {
    ctx.progress(null, "Applying signature");
    const doc = await load(data);
    const image = await doc.embedPng(png);
    for (const pl of placements) {
      const page = doc.getPage(pl.pageIndex);
      const { width, height } = displaySize(page);
      const w = pl.width * width;
      const h = pl.height * height;
      // Anchor is the image's bottom-left corner as seen on screen.
      const pt = displayToUser(page, pl.left * width, (pl.top + pl.height) * height);
      page.drawImage(image, { x: pt.x, y: pt.y, width: w, height: h, rotate: degrees(pt.rotation) });
    }
    stamp(doc);
    return doc.save({ useObjectStreams: true });
  },

  async inspectForm(data: ArrayBuffer, ctx: WorkerContext) {
    ctx.progress(null, "Reading form fields");
    const doc = await load(data);
    const form = doc.getForm();
    const pageOfRef = new Map<string, number>();
    const pageOfAnnot = new Map<string, number>();
    doc.getPages().forEach((page, i) => {
      pageOfRef.set(page.ref.toString(), i);
      const annots = page.node.Annots();
      if (!annots) return;
      for (let j = 0; j < annots.size(); j++) pageOfAnnot.set(annots.get(j).toString(), i);
    });
    const fields = form.getFields().map((f) => ({ ...describeField(f), page: fieldPage(doc, f, pageOfAnnot, pageOfRef) }));
    return { fields, hasXfa: form.hasXFA() };
  },

  async fillForm(data: ArrayBuffer, values: Record<string, FormValue>, o: FillFormOptions, ctx: WorkerContext) {
    ctx.progress(null, "Filling the form");
    const doc = await load(data);
    const form = doc.getForm();
    // Viewers that understand XFA would show its (unfilled) copy of the form instead of ours.
    if (form.hasXFA()) form.deleteXFA();
    const font = await doc.embedFont(StandardFonts[o.font]);
    const failed: string[] = [];
    for (const [name, value] of Object.entries(values)) {
      const field = form.getFieldMaybe(name);
      if (field && !setField(field, value, font, o.fontSize)) failed.push(name);
    }
    if (o.flatten) {
      ctx.progress(null, "Flattening");
      try {
        form.flatten({ updateFieldAppearances: false });
      } catch (err) {
        throw new Error(`This form could not be flattened (${err instanceof Error ? err.message : String(err)}). Turn off “Flatten form” and try again.`);
      }
    }
    if (failed.length) console.warn("Edit PDF: fields that rejected their value:", failed);
    stamp(doc);
    ctx.progress(0.98, "Saving");
    return doc.save({ useObjectStreams: true, updateFieldAppearances: false });
  },
});
