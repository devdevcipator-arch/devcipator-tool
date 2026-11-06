import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/layout/Prose";
import { JsonLd } from "@/components/seo/JsonLd";
import { CATEGORIES, PAGE_SEO, SITE, TOOLS, toolsInCategory } from "@/config/tools.config";
import { ORGANIZATION_ID, WEBSITE_ID, absoluteUrl, breadcrumbList, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: { absolute: `${PAGE_SEO.about.title} | ${SITE.name}` },
  description: PAGE_SEO.about.description,
  path: "/about",
  siteImage: true,
});

const ENGINES = [
  ["pdf-lib", "merges, splits, rotates, numbers and signs PDFs by copying pages instead of re-rendering them"],
  ["PDF.js (Mozilla)", "draws PDF page thumbnails and exports pages as images"],
  ["Canvas API", "resizes, crops, rotates, converts and watermarks images"],
  ["browser-image-compression", "compresses JPG, PNG and WebP images to a target size"],
  ["Web Audio API and LAME", "decode, edit and re-encode audio as WAV or MP3"],
  ["Web Workers", "run heavy work in background threads so the page stays responsive"],
] as const;

export default function AboutPage() {
  const url = absoluteUrl("/about");
  const graph = [
    {
      "@type": "AboutPage",
      "@id": url,
      url,
      name: PAGE_SEO.about.title,
      description: PAGE_SEO.about.description,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
    },
    breadcrumbList([
      { name: "Home", path: "/" },
      { name: "About", path: "/about" },
    ]),
  ];

  return (
    <ProsePage title={PAGE_SEO.about.title}>
      <JsonLd graph={graph} />
      <p>
        {SITE.name} is a free collection of {TOOLS.length} online tools for PDFs, images, audio and everyday tasks. It is made by{" "}
        <a href={SITE.organizationUrl} className="font-medium text-fg underline">
          {SITE.organization}
        </a>
        . <strong>Every tool runs inside your web browser</strong>, so the files you work on are never uploaded to a server.
      </p>

      <h2>What you can do</h2>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        {CATEGORIES.map((cat) => (
          <li key={cat.id}>
            <Link href={`/category/${cat.id}`} className="font-medium text-fg underline">
              {cat.title}
            </Link>
            : {toolsInCategory(cat.id).map((t) => t.title).join(", ")}.
          </li>
        ))}
      </ul>

      <h2>How the tools keep your files private</h2>
      <p>
        Most online file tools upload your document, process it on their server and send the result back. {SITE.name} does the work on
        your own device instead, using standard browser technology and open-source libraries:
      </p>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        {ENGINES.map(([name, text]) => (
          <li key={name}>
            <strong>{name}</strong> {text}.
          </li>
        ))}
      </ul>
      <p>
        These libraries are served from this website rather than a third-party CDN. There are no accounts, and the only things stored
        are your theme choice and recently used tools, kept in your own browser. The{" "}
        <Link href="/privacy" className="font-medium text-fg underline">
          privacy policy
        </Link>{" "}
        has the details.
      </p>

      <h2>Free, with no sign-up</h2>
      <p>
        Every tool is free to use with no sign-up, no watermark and no limit on how often you use it.
      </p>

      <h2>Contact</h2>
      <p>
        {SITE.name} is a {SITE.organization} project. To get in touch, report a problem or suggest a tool, visit{" "}
        <a href={SITE.organizationUrl} className="font-medium text-fg underline">
          devcipator.com
        </a>
        .
      </p>
    </ProsePage>
  );
}
