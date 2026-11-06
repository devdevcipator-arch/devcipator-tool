import Link from "next/link";
import { Fragment } from "react";

/** Renders `[text](/path)` links inside a plain string as internal links; the rest stays text. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\(\/[^)]*\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[([^\]]+)\]\((\/[^)]*)\)$/);
        if (!m) return <Fragment key={i}>{part}</Fragment>;
        return (
          <Link key={i} href={m[2]} className="font-medium text-fg underline">
            {m[1]}
          </Link>
        );
      })}
    </>
  );
}

/** The same text without link markup, for meta tags and structured data. */
export function plainText(text: string): string {
  return text.replace(/\[([^\]]+)\]\((\/[^)]*)\)/g, "$1");
}
