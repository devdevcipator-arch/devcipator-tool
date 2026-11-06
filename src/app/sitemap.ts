import type { MetadataRoute } from "next";
import { CATEGORIES, SITE, TOOL_PAGES } from "@/config/tools.config";
import { GUIDES } from "@/config/guides";

// Fixed dates from the config rather than the build time, so lastmod only moves when the copy does.
const content = new Date(SITE.updated.content);
const legal = new Date(SITE.updated.legal);

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url, lastModified: content, changeFrequency: "weekly", priority: 1 },
    ...CATEGORIES.map((c) => ({ url: `${SITE.url}/category/${c.id}`, lastModified: content, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...TOOL_PAGES.map((t) => ({ url: `${SITE.url}/tools/${t.slug}`, lastModified: content, changeFrequency: "monthly" as const, priority: t.variantOf ? 0.7 : 0.9 })),
    { url: `${SITE.url}/guides`, lastModified: content, changeFrequency: "weekly", priority: 0.7 },
    ...GUIDES.map((g) => ({ url: `${SITE.url}/guides/${g.slug}`, lastModified: new Date(g.updated), changeFrequency: "monthly" as const, priority: 0.6 })),
    { url: `${SITE.url}/about`, lastModified: content, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE.url}/privacy`, lastModified: legal, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE.url}/terms`, lastModified: legal, changeFrequency: "yearly", priority: 0.2 },
  ];
}
