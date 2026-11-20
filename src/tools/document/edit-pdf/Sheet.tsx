import type { CSSProperties } from "react";
import { FONTS } from "./fonts";
import { PX_PER_PT, pageDims, runs, type Block, type CharStyle, type DocSettings, type Part, type Selection, type StyledText } from "./model";

/** Ink colour for body text; headings and labels use the accent. */
export const INK = "#111827";

/** Passed only to the on-screen preview: highlights the selection and lets letters be clicked. */
export interface Interaction {
  selection: Selection | null;
  /** Renders one span per letter so each can be picked in Per-Letter Styler mode. */
  perLetter: boolean;
}

function charCss(m: CharStyle | null): CSSProperties | undefined {
  if (!m) return undefined;
  return {
    color: m.color,
    fontWeight: m.weight,
    fontStyle: m.italic ? "italic" : undefined,
    textDecoration: m.underline ? "underline" : undefined,
    textDecorationThickness: m.underline ? "0.07em" : undefined,
    textUnderlineOffset: m.underline ? "0.15em" : undefined,
    fontFamily: m.font ? FONTS[m.font].family : undefined,
    letterSpacing: m.spacing ? `${m.spacing}em` : undefined,
  };
}

function Text({ st, block, part, ix }: { st: StyledText; block: string; part: Part; ix?: Interaction }) {
  // A zero-width space keeps an emptied line at its normal height.
  if (!st.text) return <span>{"​"}</span>;
  const sel = ix?.selection && ix.selection.block === block && ix.selection.part === part && ix.selection.end > ix.selection.start ? ix.selection : null;
  if (ix?.perLetter || sel) {
    return (
      <>
        {Array.from(st.text, (ch, i) => {
          const picked = sel && i >= sel.start && i < sel.end;
          return (
            <span
              key={i}
              data-block={block}
              data-part={part}
              data-i={i}
              style={{ ...charCss(st.marks[i]), ...(picked ? { backgroundColor: "rgba(37, 99, 235, 0.22)", borderRadius: 2 } : null) }}
              className={ix?.perLetter ? "cursor-pointer hover:outline hover:outline-1 hover:outline-[#2563eb]" : undefined}
            >
              {ch}
            </span>
          );
        })}
      </>
    );
  }
  return (
    <>
      {runs(st).map((r) => (
        <span key={r.start} style={charCss(r.style)}>
          {r.text}
        </span>
      ))}
    </>
  );
}

export function BlockView({ block, settings, ix }: { block: Block; settings: DocSettings; ix?: Interaction }) {
  if (block.type === "keyvalue") {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1.5em", borderBottom: `1px solid ${settings.accent}40`, paddingBottom: "0.35em", whiteSpace: "pre-wrap" }}>
        <span style={{ color: settings.accent, fontWeight: 600, minWidth: 0 }}>
          <Text st={block.key} block={block.id} part="key" ix={ix} />
        </span>
        <span style={{ textAlign: "right", minWidth: 0 }}>
          <Text st={block.value} block={block.id} part="value" ix={ix} />
        </span>
      </div>
    );
  }
  const heading = block.type === "heading";
  return (
    <div
      style={{
        textAlign: block.align,
        whiteSpace: "pre-wrap",
        overflowWrap: "break-word",
        ...(heading && { color: settings.accent, fontWeight: 700, lineHeight: 1.2, fontSize: block.level === 1 ? "2.1em" : "1.35em" }),
      }}
    >
      <Text st={block.text} block={block.id} part="text" ix={ix} />
    </div>
  );
}

/** The typography every page shares; also used by the off-screen measuring column. */
export function bodyStyle(s: DocSettings): CSSProperties {
  return { fontFamily: FONTS[s.font].family, fontSize: s.fontSize * PX_PER_PT, lineHeight: s.lineHeight, color: INK };
}

/** One sheet of paper at its real size in CSS pixels (96 per inch). */
export function Sheet({ blocks, settings, ix }: { blocks: Block[]; settings: DocSettings; ix?: Interaction }) {
  const { width, height } = pageDims(settings);
  const margin = settings.margin * 96;
  const frameInset = Math.max(12, margin * 0.4);
  return (
    <div
      className="edit-pdf-sheet"
      style={{ ...bodyStyle(settings), position: "relative", width, height, padding: margin, boxSizing: "border-box", overflow: "hidden", backgroundColor: "#ffffff" }}
    >
      {settings.frame && (
        <>
          <div aria-hidden style={{ position: "absolute", inset: frameInset, border: `3px solid ${settings.accent}` }} />
          <div aria-hidden style={{ position: "absolute", inset: frameInset + 7, border: `1px solid ${settings.accent}` }} />
        </>
      )}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: settings.spacing * PX_PER_PT, height: "100%", justifyContent: settings.frame ? "center" : undefined }}>
        {blocks.map((b) => (
          <BlockView key={b.id} block={b} settings={settings} ix={ix} />
        ))}
      </div>
    </div>
  );
}
