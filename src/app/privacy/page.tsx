import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/layout/Prose";
import { PAGE_SEO, SITE } from "@/config/tools.config";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: PAGE_SEO.privacy.title, description: PAGE_SEO.privacy.description, path: "/privacy", siteImage: true });

export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy Policy">
      <p>
        {SITE.name} is built so that <strong>your files never leave your device</strong>. Every tool runs inside your browser using
        standard Web APIs and WebAssembly.
      </p>
      <h2>Files</h2>
      <p>
        Files you select are read into your browser&apos;s memory, processed locally and offered back to you as downloads. They are not
        uploaded, stored or logged by us. Closing the tab discards them.
      </p>
      <h2>Downloaded engines and models</h2>
      <p>
        Some tools load extra processing code on first use, such as the PDF.js engine that draws PDF pages and the image compression
        library. These files are served from this website, not a third-party CDN, and are cached by your browser. They contain no
        information about you.
      </p>
      <h2>Local storage</h2>
      <p>
        We store your theme preference and the list of tools you recently used in your browser&apos;s local storage so the site can show
        them to you. This data stays on your device and you can clear it at any time.
      </p>
      <h2>Contact</h2>
      <p>
        {SITE.name} is made by{" "}
        <a href={SITE.organizationUrl} className="font-medium text-fg underline">
          {SITE.organization}
        </a>
        . Questions about privacy can be sent to{" "}
        <a href={`mailto:${SITE.email}`} className="font-medium text-fg underline">
          {SITE.email}
        </a>
        . See also{" "}
        <Link href="/about" className="font-medium text-fg underline">
          About {SITE.name}
        </Link>
        .
      </p>
    </ProsePage>
  );
}
