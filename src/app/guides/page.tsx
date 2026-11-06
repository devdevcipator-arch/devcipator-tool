import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { GUIDES } from "@/config/guides";
import { PAGE_SEO } from "@/config/tools.config";
import { plainText } from "@/components/layout/RichText";
import { JsonLd } from "@/components/seo/JsonLd";
import { WEBSITE_ID, absoluteUrl, breadcrumbList, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({ title: PAGE_SEO.guides.title, description: PAGE_SEO.guides.description, path: "/guides", siteImage: true }),
  keywords: GUIDES.flatMap((g) => g.keywords.slice(0, 1)),
};

export default function GuidesPage() {
  const url = absoluteUrl("/guides");
  const graph = [
    {
      "@type": "CollectionPage",
      "@id": url,
      url,
      name: PAGE_SEO.guides.title,
      description: PAGE_SEO.guides.description,
      isPartOf: { "@id": WEBSITE_ID },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: GUIDES.length,
        itemListElement: GUIDES.map((g, i) => ({ "@type": "ListItem", position: i + 1, name: g.title, url: absoluteUrl(`/guides/${g.slug}`) })),
      },
    },
    breadcrumbList([
      { name: "Home", path: "/" },
      { name: "Guides", path: "/guides" },
    ]),
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <JsonLd graph={graph} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-fg-subtle">
        <Link href="/" className="-my-3 py-3 hover:text-fg">Home</Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="text-fg-muted" aria-current="page">Guides</span>
      </nav>
      <header className="mt-6 flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight text-fg">Guides</h1>
        <p className="max-w-2xl text-lg text-fg-muted">Short, practical answers to common PDF and image questions, with the free tool that does each job in your browser.</p>
      </header>
      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-surface p-6 hover:border-border-strong">
              <h2 className="text-lg font-semibold text-fg">{g.title}</h2>
              <p className="text-sm text-fg-muted">{plainText(g.answer)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
