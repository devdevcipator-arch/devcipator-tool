import { uid } from "@/lib/files";
import type { FontId } from "./fonts";

/** Overrides for one character; anything left out follows the document's typography. */
export interface CharStyle {
  color?: string;
  weight?: number;
  italic?: boolean;
  underline?: boolean;
  font?: FontId;
  /** Letter spacing in em. */
  spacing?: number;
}

/** Text plus one style slot per character (`marks.length === text.length`). */
export interface StyledText {
  text: string;
  marks: Array<CharStyle | null>;
}

export type Align = "left" | "center" | "right" | "justify";

export type Block =
  | { id: string; type: "heading"; level: 1 | 2; text: StyledText; align: Align }
  | { id: string; type: "paragraph"; text: StyledText; align: Align }
  | { id: string; type: "keyvalue"; key: StyledText; value: StyledText };

export type BlockType = Block["type"];

/** Which editable string of a block: headings and paragraphs have `text`, key-value rows `key` and `value`. */
export type Part = "text" | "key" | "value";

export interface Selection {
  block: string;
  part: Part;
  start: number;
  end: number;
}

export type PageSize = "a4" | "letter";

export interface DocSettings {
  font: FontId;
  /** Body size in points. */
  fontSize: number;
  lineHeight: number;
  /** Space between blocks in points. */
  spacing: number;
  accent: string;
  pageSize: PageSize;
  landscape: boolean;
  /** Page margin in inches. */
  margin: number;
  frame: boolean;
}

/** CSS pixels at 96 per inch, the scale html2canvas and print both use. */
export const PX_PER_PT = 96 / 72;

const PAGE_PX: Record<PageSize, [number, number]> = { a4: [794, 1123], letter: [816, 1056] };
const PAGE_PT: Record<PageSize, [number, number]> = { a4: [595.28, 841.89], letter: [612, 792] };

export function pageDims(s: Pick<DocSettings, "pageSize" | "landscape">) {
  const [w, h] = PAGE_PX[s.pageSize];
  const [wPt, hPt] = PAGE_PT[s.pageSize];
  return s.landscape ? { width: h, height: w, widthPt: hPt, heightPt: wPt } : { width: w, height: h, widthPt: wPt, heightPt: hPt };
}

// ───────────────────────────── Styled text ─────────────────────────────

export function plain(text: string): StyledText {
  return { text, marks: Array(text.length).fill(null) };
}

/** A string with styles on given substrings, for templates: styled("Total due", [[0, 5, { weight: 700 }]]). */
export function styled(text: string, ranges: Array<[number, number, CharStyle]>): StyledText {
  const st = plain(text);
  for (const [start, end, style] of ranges) st.marks = applyStyle(st, start, end, style).marks;
  return st;
}

function cleanStyle(s: CharStyle): CharStyle | null {
  const out: CharStyle = {};
  for (const [k, v] of Object.entries(s) as Array<[keyof CharStyle, CharStyle[keyof CharStyle]]>) {
    if (v !== undefined && v !== false) (out as Record<string, unknown>)[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Keeps per-letter styles attached to the right characters after an edit in a plain text box.
 * The change is found as the span between the common prefix and suffix; typed characters take
 * the style of the text they replace, or of the character before the caret.
 */
export function editText(old: StyledText, next: string): StyledText {
  const a = old.text;
  let p = 0;
  while (p < a.length && p < next.length && a[p] === next[p]) p++;
  let s = 0;
  while (s < a.length - p && s < next.length - p && a[a.length - 1 - s] === next[next.length - 1 - s]) s++;
  const removed = a.length - p - s;
  const inserted = next.length - p - s;
  const inherit = (removed > 0 ? old.marks[p] : old.marks[p - 1]) ?? null;
  return {
    text: next,
    marks: [...old.marks.slice(0, p), ...Array(inserted).fill(inherit), ...old.marks.slice(a.length - s)],
  };
}

/** Merges `patch` into the styles of characters [start, end); `null` clears them. */
export function applyStyle(st: StyledText, start: number, end: number, patch: Partial<CharStyle> | null): StyledText {
  return {
    text: st.text,
    marks: st.marks.map((m, i) => (i < start || i >= end ? m : patch ? cleanStyle({ ...m, ...patch }) : null)),
  };
}

const styleKey = (m: CharStyle | null) => (m ? JSON.stringify(m) : "");

/** Consecutive characters that share a style, so the page renders a few spans instead of one per letter. */
export function runs(st: StyledText): Array<{ start: number; text: string; style: CharStyle | null }> {
  const out: Array<{ start: number; text: string; style: CharStyle | null }> = [];
  for (let i = 0; i < st.text.length; i++) {
    const last = out[out.length - 1];
    if (last && styleKey(last.style) === styleKey(st.marks[i])) last.text += st.text[i];
    else out.push({ start: i, text: st.text[i], style: st.marks[i] });
  }
  return out;
}

/** Start and end of the word around character `i`. */
export function wordAt(text: string, i: number): [number, number] {
  const isWord = (c: string | undefined) => !!c && /[\p{L}\p{N}'’-]/u.test(c);
  if (!isWord(text[i])) return [i, i + 1];
  let a = i;
  let b = i + 1;
  while (isWord(text[a - 1])) a--;
  while (isWord(text[b])) b++;
  return [a, b];
}

export function partOf(block: Block, part: Part): StyledText | null {
  if (block.type === "keyvalue") return part === "key" ? block.key : part === "value" ? block.value : null;
  return part === "text" ? block.text : null;
}

export function withPart(block: Block, part: Part, st: StyledText): Block {
  if (block.type === "keyvalue") return part === "key" ? { ...block, key: st } : part === "value" ? { ...block, value: st } : block;
  return part === "text" ? { ...block, text: st } : block;
}

// ───────────────────────────── Blocks & templates ─────────────────────────────

export function newBlock(type: BlockType): Block {
  if (type === "heading") return { id: uid(), type, level: 2, text: plain("New heading"), align: "left" };
  if (type === "paragraph") return { id: uid(), type, text: plain("Write your text here."), align: "left" };
  return { id: uid(), type, key: plain("Label"), value: plain("Value") };
}

const h = (text: StyledText | string, level: 1 | 2 = 1, align: Align = "left"): Block => ({ id: uid(), type: "heading", level, text: typeof text === "string" ? plain(text) : text, align });
const p = (text: StyledText | string, align: Align = "left"): Block => ({ id: uid(), type: "paragraph", text: typeof text === "string" ? plain(text) : text, align });
const kv = (key: StyledText | string, value: StyledText | string): Block => ({
  id: uid(),
  type: "keyvalue",
  key: typeof key === "string" ? plain(key) : key,
  value: typeof value === "string" ? plain(value) : value,
});

export const DEFAULT_SETTINGS: DocSettings = {
  font: "inter",
  fontSize: 11,
  lineHeight: 1.5,
  spacing: 10,
  accent: "#2563eb",
  pageSize: "a4",
  landscape: false,
  margin: 1,
  frame: false,
};

export type TemplateId = "blank" | "letter" | "invoice" | "certificate";

export const TEMPLATES: Array<{ id: TemplateId; label: string; description: string }> = [
  { id: "blank", label: "Blank document", description: "A title and one paragraph" },
  { id: "letter", label: "Formal letter", description: "Addresses, subject and sign-off" },
  { id: "invoice", label: "Invoice / receipt", description: "Line items and totals" },
  { id: "certificate", label: "Certificate", description: "Landscape, framed and centred" },
];

export function template(id: TemplateId): { blocks: Block[]; settings: DocSettings } {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  switch (id) {
    case "letter":
      return {
        settings: { ...DEFAULT_SETTINGS, font: "merriweather", fontSize: 11, lineHeight: 1.6, spacing: 12, accent: "#1f2937" },
        blocks: [
          p("Alex Morgan\n42 Elm Street\nSpringfield, IL 62701\nalex.morgan@example.com", "right"),
          p(today),
          p("Jordan Lee\nHiring Manager\nNorthwind Ltd.\n100 Market Avenue\nChicago, IL 60601"),
          h(styled("Re: Application for the Operations Coordinator role", [[0, 3, { weight: 800 }]]), 2),
          p("Dear Ms. Lee,"),
          p("I am writing to apply for the Operations Coordinator position advertised on your website. Over the past four years I have managed scheduling, supplier contracts and reporting for a team of thirty, and I would welcome the chance to bring that experience to Northwind.", "justify"),
          p("I have enclosed my résumé and would be glad to discuss how I can contribute. Thank you for your time and consideration.", "justify"),
          p(styled("Sincerely,\n\nAlex Morgan", [[12, 23, { weight: 700 }]])),
        ],
      };
    case "invoice":
      return {
        settings: { ...DEFAULT_SETTINGS, font: "inter", fontSize: 10.5, lineHeight: 1.45, spacing: 8, accent: "#0f766e" },
        blocks: [
          h(styled("INVOICE", [[0, 7, { spacing: 0.2 }]]), 1),
          kv("Invoice number", "INV-2026-0042"),
          kv("Issue date", today),
          kv("Due", "Within 14 days"),
          h("Bill to", 2),
          p("Northwind Ltd.\n100 Market Avenue, Chicago, IL 60601"),
          h("Items", 2),
          kv("Website design (1 × $1,200.00)", "$1,200.00"),
          kv("Hosting, 12 months (1 × $180.00)", "$180.00"),
          kv("Support hours (5 × $60.00)", "$300.00"),
          kv("Subtotal", "$1,680.00"),
          kv("Tax (10%)", "$168.00"),
          kv(styled("Total due", [[0, 9, { weight: 800 }]]), styled("$1,848.00", [[0, 9, { weight: 800, color: "#0f766e" }]])),
          p(styled("Thank you for your business. Please include the invoice number with your payment.", [[0, 28, { italic: true }]])),
        ],
      };
    case "certificate":
      return {
        settings: { ...DEFAULT_SETTINGS, font: "playfair", fontSize: 14, lineHeight: 1.5, spacing: 16, accent: "#a16207", landscape: true, margin: 0.9, frame: true },
        blocks: [
          h(styled("Certificate of Achievement", [[0, 11, { spacing: 0.08 }]]), 1, "center"),
          p("This certificate is proudly presented to", "center"),
          h(styled("Taylor Rivera", [[0, 1, { color: "#a16207", italic: true }], [7, 8, { color: "#a16207", italic: true }]]), 1, "center"),
          p("for outstanding dedication and excellence in completing the Advanced Data Analysis programme.", "center"),
          p(styled(`Awarded on ${today}`, [[11, 11 + today.length, { weight: 700 }]]), "center"),
        ],
      };
    default:
      return {
        settings: { ...DEFAULT_SETTINGS },
        blocks: [h("Untitled document", 1), p("Start writing here. Select any word or letter to give it its own colour, weight, font or spacing.")],
      };
  }
}
