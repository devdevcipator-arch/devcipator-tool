export interface PdfInfo {
  pageCount: number;
  encrypted: boolean;
}

export interface OrganizedPage {
  /** 0-based index in the source document. */
  index: number;
  /** Extra clockwise rotation in degrees (multiple of 90). */
  rotate: number;
}

/** A page made from an encoded raster image (JPEG or PNG). */
export interface RasterPage {
  bytes: Uint8Array;
  format: "jpg" | "png";
  pixelWidth: number;
  pixelHeight: number;
  /** Page box in points; the image is fitted inside (minus margin) and centred. */
  pageWidth: number;
  pageHeight: number;
  margin: number;
}

/** Rectangle on the page as displayed (rotation applied), normalised 0..1 from the top-left. */
export interface DisplayRect {
  pageIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export type TotalMode = "file" | "numbered" | "last";

export type NumberPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

export interface PageNumberOptions {
  /** Supports {n} (page number) and {total}. */
  format: string;
  position: NumberPosition;
  fontSize: number;
  /** Hex colour, e.g. #333333 */
  color: string;
  /** Distance from the page edge in points. */
  margin: number;
  /** 0-based index of the first page that gets a number. */
  fromPage: number;
  /** Number printed on that first numbered page. */
  startAt: number;
  /** What {total} prints: pages in the file, pages that get a number, or the last number printed. */
  totalMode: TotalMode;
}

/** Value of {total} for the chosen TotalMode. */
export function pageNumberTotal(pageCount: number, o: Pick<PageNumberOptions, "fromPage" | "startAt" | "totalMode">): number {
  if (o.totalMode === "numbered") return pageCount - o.fromPage;
  if (o.totalMode === "last") return o.startAt + pageCount - o.fromPage - 1;
  return pageCount;
}

export type FormFieldKind = "text" | "checkbox" | "dropdown" | "optionlist" | "radio" | "unsupported";

export type FormValue = string | boolean | string[];

/** An AcroForm field as Edit PDF shows it. Plain data, so it can cross the worker boundary. */
export interface FormFieldInfo {
  name: string;
  kind: FormFieldKind;
  /** Text for text fields, checked state for checkboxes, selected option(s) for choice fields. */
  value: FormValue;
  options: string[];
  readOnly: boolean;
  multiline: boolean;
  multiSelect: boolean;
  /** Dropdowns that also accept a typed value. */
  editable: boolean;
  maxLength?: number;
  /** 0-based page of the field's first widget, if it could be found. */
  page: number | null;
}

export interface FormInspection {
  fields: FormFieldInfo[];
  /** XFA data is dropped before filling; pdf-lib can only fill the AcroForm part. */
  hasXfa: boolean;
}

export type FormFont = "Helvetica" | "TimesRoman" | "Courier";

export interface FillFormOptions {
  font: FormFont;
  /** In points; 0 lets text shrink to fit the field. */
  fontSize: number;
  flatten: boolean;
}

/** Operations implemented by pdf.worker.ts. */
export type PdfApi = {
  info(data: ArrayBuffer): PdfInfo;
  merge(files: ArrayBuffer[]): Uint8Array;
  split(data: ArrayBuffer, groups: number[][]): Uint8Array[];
  organize(data: ArrayBuffer, pages: OrganizedPage[]): Uint8Array;
  images(pages: RasterPage[], title?: string): Uint8Array;
  pageNumbers(data: ArrayBuffer, options: PageNumberOptions): Uint8Array;
  sign(data: ArrayBuffer, png: Uint8Array, placements: DisplayRect[]): Uint8Array;
  inspectForm(data: ArrayBuffer): FormInspection;
  /** Sets only the fields named in `values`, so untouched fields keep their original appearance. */
  fillForm(data: ArrayBuffer, values: Record<string, FormValue>, options: FillFormOptions): Uint8Array;
};
