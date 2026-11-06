import { GUIDES, getGuide } from "@/config/guides";
import { SITE } from "@/config/tools.config";
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

// Used instead of a static `alt` export so the alt text can name the guide.
export function generateImageMetadata({ params }: { params: { slug: string } }) {
  const guide = getGuide(params.slug);
  return [{ id: "card", alt: `${guide?.title ?? "Guide"} – ${SITE.name}`, size: OG_SIZE, contentType: OG_CONTENT_TYPE }];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return new Response(null, { status: 404 });
  return ogImage({ eyebrow: "Guide", title: guide.title, description: guide.description });
}
