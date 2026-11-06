import { CATEGORIES, CONVERSIONS, HOME_FAQS, SIZE_PAGES, SITE, toolsInCategory } from "@/config/tools.config";
import { GUIDES } from "@/config/guides";
import { plainText } from "@/components/layout/RichText";
import { absoluteUrl } from "@/lib/seo";

// llms.txt (https://llmstxt.org): a plain Markdown map of the site for AI assistants and answer engines.
// Built from the same config as the pages, and prerendered because it reads no request data.
export function GET() {
  const lines = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    `${SITE.name} is made by ${SITE.organization} (${SITE.organizationUrl}). Every tool runs in the browser with Web APIs, Web Workers and WebAssembly: files are not uploaded, there is no account and no watermark.`,
    "",
    ...CATEGORIES.flatMap((cat) => [
      `## ${cat.title}`,
      "",
      ...toolsInCategory(cat.id).map((t) => `- [${t.title}](${absoluteUrl(`/tools/${t.slug}`)}): ${t.description}`),
      "",
    ]),
    "## Image format conversions",
    "",
    ...CONVERSIONS.map((c) => `- [${c.title}](${absoluteUrl(`/tools/${c.slug}`)}): ${c.description}`),
    "",
    "## Guides",
    "",
    ...GUIDES.map((g) => `- [${g.title}](${absoluteUrl(`/guides/${g.slug}`)}): ${plainText(g.answer)}`),
    "",
    "## Compress images to a specific size",
    "",
    ...SIZE_PAGES.map((p) => `- [${p.title}](${absoluteUrl(`/tools/${p.slug}`)}): ${p.description}`),
    "",
    "## Common questions",
    "",
    ...HOME_FAQS.flatMap((f) => [`### ${f.q}`, "", f.a, ""]),
    "## Site",
    "",
    `- [About](${absoluteUrl("/about")}): who makes ${SITE.name} and how the tools keep files private`,
    `- [Privacy policy](${absoluteUrl("/privacy")})`,
    `- [Terms of use](${absoluteUrl("/terms")})`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
