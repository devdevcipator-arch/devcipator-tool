import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { GUIDES, getGuide } from "@/config/guides";
import { SITE, getTool, type ToolConfig } from "@/config/tools.config";
import { RichText } from "@/components/layout/RichText";
import { ToolCard } from "@/components/home/ToolCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { ORGANIZATION_ID, WEBSITE_ID, absoluteUrl, breadcrumbList, pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "Guide not found" };
  const meta = pageMetadata({ title: guide.title, description: guide.description, path: `/guides/${guide.slug}`, siteImage: true });
  return {
    ...meta,
    openGraph: { ...meta.openGraph, type: "article", publishedTime: guide.published, modifiedTime: guide.updated },
  };
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const url = absoluteUrl(`/guides/${guide.slug}`);
  const tools = guide.tools.map(getTool).filter((t): t is ToolConfig => Boolean(t));
  const main = tools[0];

  const graph = [
    {
      "@type": "Article",
      "@id": `${url}#article`,
      headline: guide.title,
      description: guide.description,
      url,
      mainEntityOfPage: url,
      datePublished: guide.published,
      dateModified: guide.updated,
      inLanguage: "en",
      author: { "@id": ORGANIZATION_ID },
      publisher: { "@id": ORGANIZATION_ID },
      isPartOf: { "@id": WEBSITE_ID },
      image: absoluteUrl("/opengraph-image"),
      mentions: tools.map((t) => ({ "@type": "WebApplication", name: t.title, url: absoluteUrl(`/tools/${t.slug}`) })),
    },
    breadcrumbList([
      { name: "Home", path: "/" },
      { name: "Guides", path: "/guides" },
      { name: guide.title, path: `/guides/${guide.slug}` },
    ]),
  ];

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <JsonLd graph={graph} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-fg-subtle">
        <Link href="/" className="-my-3 py-3 hover:text-fg">Home</Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href="/guides" className="-mx-2 -my-3 px-2 py-3 hover:text-fg">Guides</Link>
      </nav>
      <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-fg">{guide.title}</h1>
      <p className="mt-3 text-sm text-fg-subtle">
        By <a href={SITE.organizationUrl} className="hover:text-fg">{SITE.organization}</a> · Updated{" "}
        <time dateTime={guide.updated}>{formatDate(guide.updated)}</time>
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-surface-2 p-5 text-base leading-relaxed text-fg">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Quick answer</p>
        <p><RichText text={guide.answer} /></p>
      </div>

      <div className="mt-10 flex flex-col gap-5 text-base leading-relaxed text-fg-muted [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-fg">
        {guide.sections.map((section) => {
          const ListTag = section.ordered ? "ol" : "ul";
          return (
            <section key={section.heading} className="flex flex-col gap-4">
              <h2>{section.heading}</h2>
              {section.paragraphs?.map((p) => (
                <p key={p}><RichText text={p} /></p>
              ))}
              {section.list && (
                <ListTag className={`flex flex-col gap-2 pl-5 ${section.ordered ? "list-decimal" : "list-disc"}`}>
                  {section.list.map((item) => (
                    <li key={item}><RichText text={item} /></li>
                  ))}
                </ListTag>
              )}
            </section>
          );
        })}
      </div>

      {main && (
        <div className="mt-12 flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-6">
          <p className="text-lg font-semibold text-fg">Try {main.title}</p>
          <p className="text-sm text-fg-muted">{main.description} Free, with no sign-up, and your files stay on your device.</p>
          <Link href={`/tools/${main.slug}`} className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-fg hover:bg-primary-hover">
            Open {main.title}
          </Link>
        </div>
      )}

      <section aria-labelledby="tools-used" className="mt-12">
        <h2 id="tools-used" className="text-xl font-semibold tracking-tight text-fg">Tools in this guide</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {tools.map((t) => (
            <li key={t.slug}>
              <ToolCard tool={t} />
            </li>
          ))}
        </ul>
      </section>

      <nav aria-label="More guides" className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight text-fg">More guides</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {GUIDES.filter((g) => g.slug !== guide.slug).map((g) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="text-fg-muted underline hover:text-fg pointer-coarse:inline-block pointer-coarse:py-2">
                {g.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
