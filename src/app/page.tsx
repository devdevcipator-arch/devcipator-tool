import type { Metadata } from "next";
import Link from "next/link";
import { Cpu, ShieldCheck, Zap } from "lucide-react";
import { CATEGORIES, HOME_FAQS, PAGE_SEO, TOOLS, toolsInCategory } from "@/config/tools.config";
import { CATEGORY_STYLE } from "@/lib/category-style";
import { cn } from "@/lib/cn";
import { ToolExplorer } from "@/components/home/ToolExplorer";
import { JsonLd } from "@/components/seo/JsonLd";
import { RichText } from "@/components/layout/RichText";
import { WEBSITE_ID, absoluteUrl, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: { absolute: PAGE_SEO.home.title }, description: PAGE_SEO.home.description, path: "/" });

const HOME_INTRO = [
  "Devcipator Tools brings everyday PDF, image and audio jobs together in one place, free and without sign-up. [Merge PDF](/tools/merge-pdf) files into one, [compress a PDF](/tools/compress-pdf) for email, [split a PDF](/tools/split-pdf) into separate pages or [sign a PDF](/tools/sign-pdf) without printing it. Turn photos into a PDF with [JPG to PDF](/tools/images-to-pdf), or save PDF pages as pictures with [PDF to JPG](/tools/pdf-to-images).",
  "For images, [compress images](/tools/compress-image) to a target size such as 100 KB, [resize](/tools/resize-image) and [crop photos](/tools/crop-image), and convert formats like [PNG to JPG](/tools/png-to-jpg) and [WebP to JPG](/tools/webp-to-jpg). For audio, the [MP3 cutter](/tools/audio-cutter) trims songs and makes ringtones, while [Audio Joiner](/tools/audio-joiner) merges tracks into one. Everyday helpers include a [QR code generator](/tools/qr-code), a [barcode generator](/tools/barcode-generator) and a [word counter](/tools/word-counter).",
  "Unlike most online converters, nothing is uploaded: each tool runs inside your web browser, on your computer or phone, so private documents, photos and recordings never leave your device. There are no watermarks, no daily limits and no account to create. New to a task? Our [guides](/guides) explain how to do it step by step.",
];

const PILLARS = [
  { icon: ShieldCheck, title: "Private by default", text: "Files are processed locally with Web APIs and WebAssembly. Nothing is uploaded." },
  { icon: Zap, title: "Fast, no queues", text: "No server round-trips. Heavy work runs in background threads so the page stays responsive." },
  { icon: Cpu, title: "Pro-grade engines", text: "pdf-lib, PDF.js, the Canvas API and the Web Audio API — the same engines used by desktop apps." },
];

const HOME_GRAPH = [
  {
    "@type": "WebPage",
    "@id": absoluteUrl("/"),
    url: absoluteUrl("/"),
    name: PAGE_SEO.home.title,
    description: PAGE_SEO.home.description,
    isPartOf: { "@id": WEBSITE_ID },
    inLanguage: "en",
    mainEntity: {
      "@type": "ItemList",
      name: "All tools",
      numberOfItems: TOOLS.length,
      itemListElement: TOOLS.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.title, url: absoluteUrl(`/tools/${t.slug}`) })),
    },
  },
  {
    "@type": "FAQPage",
    "@id": `${absoluteUrl("/")}#faq`,
    mainEntity: HOME_FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function Home() {
  return (
    <>
      <JsonLd graph={HOME_GRAPH} />
      <ToolExplorer />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <section aria-label="Categories" className="mt-20 hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.id}`}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 hover:border-border-strong"
            >
              <span className={cn("h-1 w-10 rounded-full", CATEGORY_STYLE[cat.id].solid)} aria-hidden />
              <h2 className="text-lg font-semibold text-fg">{cat.title}</h2>
              <p className="text-sm text-fg-muted">{cat.tagline}</p>
              <p className={cn("mt-auto text-sm font-medium", CATEGORY_STYLE[cat.id].text)}>
                {toolsInCategory(cat.id).length} tools →
              </p>
            </Link>
          ))}
        </section>

        <section aria-labelledby="why" className="mt-12 sm:mt-6 grid gap-4 rounded-2xl border border-border bg-surface-2 p-6 md:grid-cols-3 md:p-8">
          <h2 id="why" className="sr-only">Why Devcipator Tools</h2>
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary ring-1 ring-border">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-semibold text-fg">{title}</h3>
                <p className="mt-1 text-sm text-fg-muted">{text}</p>
              </div>
            </div>
          ))}
        </section>

        <section aria-labelledby="about-tools" className="mt-16 max-w-3xl">
          <h2 id="about-tools" className="text-2xl font-semibold tracking-tight text-fg">Free online file tools that don&apos;t upload your files</h2>
          <div className="mt-5 flex flex-col gap-4 text-base leading-relaxed text-fg-muted">
            {HOME_INTRO.map((p) => (
              <p key={p}><RichText text={p} /></p>
            ))}
          </div>
        </section>

        <section aria-labelledby="faq" className="mt-16 max-w-3xl">
          <h2 id="faq" className="text-2xl font-semibold tracking-tight text-fg">Frequently asked questions</h2>
          <div className="mt-5 flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
            {HOME_FAQS.map((f) => (
              <div key={f.q} className="p-4 md:p-5">
                <h3 className="font-medium text-fg">{f.q}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
