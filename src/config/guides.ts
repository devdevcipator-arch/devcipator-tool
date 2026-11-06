/**
 * How-to guides under /guides. Each answers one question people search for and links to the tool that does the job.
 * Paragraphs may contain Markdown-style links, `[text](/path)`, which render as internal links.
 * Keep every claim to what the tools actually do; they are published as Article structured data.
 */
export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  /** Rendered as a numbered list when `ordered`, otherwise bullets. */
  list?: string[];
  ordered?: boolean;
}

export interface GuideConfig {
  slug: string;
  /** H1, and the <title> before the site name. At most 45 characters, so the full title with " | Devcipator Tools" stays near 60. */
  title: string;
  /** Meta and Open Graph description, 140–160 characters. */
  description: string;
  /** Direct answer shown first, in two or three sentences. */
  answer: string;
  /** ISO dates. */
  published: string;
  updated: string;
  /** Tools this guide uses; it is listed on their pages too. The first one gets the call to action. */
  tools: string[];
  sections: GuideSection[];
}

export const GUIDES: GuideConfig[] = [
  {
    slug: "how-to-compress-a-pdf",
    title: "How to Compress a PDF and Reduce Its Size",
    description: "Make a PDF smaller for email or an upload limit: when compression works, which level to choose, and what to do when a PDF won't shrink. Free, no upload.",
    answer: "To compress a PDF, open it in [Compress PDF](/tools/compress-pdf), pick Balanced compression and download the smaller file. Scanned and image-heavy PDFs shrink the most. Text-only PDFs are already small and may not get smaller.",
    published: "2026-11-06",
    updated: "2026-11-06",
    tools: ["compress-pdf", "split-pdf", "compress-image"],
    sections: [
      {
        heading: "Compress a PDF in three steps",
        ordered: true,
        list: [
          "Open [Compress PDF](/tools/compress-pdf) and drop your file onto the page. It is read by your browser, not uploaded.",
          "Choose a level: Strong for the smallest file, Balanced for most documents, or Light to keep more detail.",
          "Press Compress PDF. The result shows the original and new size, so you can check it fits your limit before downloading.",
        ],
      },
      {
        heading: "Why some PDFs shrink more than others",
        paragraphs: [
          "Most of a PDF's size usually comes from images. A scanned contract is really a stack of photos, so lowering their resolution and compressing them as JPG can cut the size dramatically.",
          "A PDF exported from a word processor is mostly text and fonts, which are already compact. Redrawing those pages as images can make the file bigger, and the tool tells you when that happens so you can keep the original.",
        ],
      },
      {
        heading: "Which compression level to choose",
        list: [
          "Strong (72 DPI): email attachments and upload forms with a strict limit, read on screen.",
          "Balanced (110 DPI): the right choice for most documents.",
          "Light (150 DPI): documents you will print or zoom into.",
        ],
      },
      {
        heading: "Things to know before you compress",
        paragraphs: [
          "Compressed pages are saved as images, so their text can't be selected, copied or searched afterwards. Keep the original if you need that.",
          "If only part of a document is needed, [Split PDF](/tools/split-pdf) can remove the pages you don't need first, which often saves more space than compression. For photos you will add to a PDF later, [Compress Image](/tools/compress-image) shrinks them before they go in.",
        ],
      },
    ],
  },
  {
    slug: "how-to-merge-pdf-files",
    title: "How to Merge PDF Files Without Uploading",
    description: "Combine several PDFs into one file in the order you want, for free and without uploading them. Step-by-step guide, plus tips for scans and large files.",
    answer: "To merge PDFs, add them to [Merge PDF](/tools/merge-pdf), drag them into the order you want and press Merge. The combined file downloads straight away. The pages are copied exactly, so nothing loses quality.",
    published: "2026-11-06",
    updated: "2026-11-06",
    tools: ["merge-pdf", "organize-pdf", "images-to-pdf"],
    sections: [
      {
        heading: "Merge PDFs step by step",
        ordered: true,
        list: [
          "Open [Merge PDF](/tools/merge-pdf) and add two or more PDF files. You can drop them all at once.",
          "Drag the files into the order they should appear. Each file shows its page count.",
          "Press Merge and download the single combined PDF.",
        ],
      },
      {
        heading: "Why merging in the browser is safer",
        paragraphs: [
          "Many online PDF tools upload your files to a server, process them there and send them back. Merge PDF runs entirely in your browser with the pdf-lib library, so bank statements, contracts and ID scans never leave your device.",
          "Pages are copied into the new file rather than re-rendered, so text stays sharp and searchable and the file isn't recompressed.",
        ],
      },
      {
        heading: "Fixing the result",
        paragraphs: [
          "If pages are in the wrong order after merging, or you want to drop a blank page, open the merged file in [Organize PDF](/tools/organize-pdf) to drag and delete pages on a thumbnail grid.",
          "To add photos or scanned images to the document, turn them into a PDF with [Images to PDF](/tools/images-to-pdf) first, then merge that file with the others.",
        ],
      },
      {
        heading: "Password-protected PDFs",
        paragraphs: [
          "Encrypted PDFs can't be merged until the password is removed. Open them in your PDF reader, save a copy without the password, and add that copy instead.",
        ],
      },
    ],
  },
  {
    slug: "how-to-reduce-image-size",
    title: "Reduce Image Size Without Losing Quality",
    description: "Shrink photos for email, websites and upload forms: compress, resize or switch format. Which method saves the most, and how to keep images looking sharp.",
    answer: "The quickest way to reduce an image's file size is to compress it in [Compress Image](/tools/compress-image) at about 80% quality. If it is still too big, lower its pixel dimensions with [Resize Image](/tools/resize-image), or convert it to WebP.",
    published: "2026-11-06",
    updated: "2026-11-06",
    tools: ["compress-image", "resize-image", "image-converter"],
    sections: [
      {
        heading: "Three ways to make an image smaller",
        list: [
          "Compress it: keep the same dimensions but store the pixels more efficiently. Best first step for photos.",
          "Resize it: fewer pixels means a smaller file. A 4000-pixel-wide phone photo is far larger than any screen needs.",
          "Change format: WebP is usually smaller than JPG at similar quality, and JPG is much smaller than PNG for photos.",
        ],
      },
      {
        heading: "Compress an image to a target size",
        ordered: true,
        list: [
          "Open [Compress Image](/tools/compress-image) and add one or more JPG, PNG or WebP images.",
          "Set the quality, or a target file size if an upload form has a limit.",
          "Compare the before-and-after slider, then download the smaller images.",
        ],
      },
      {
        heading: "When to resize instead",
        paragraphs: [
          "If an image will only be shown on a website or sent in a chat, it rarely needs to be wider than 1600–2000 pixels. [Resize Image](/tools/resize-image) sets exact dimensions or a percentage while keeping the aspect ratio, and halving the width roughly quarters the number of pixels.",
        ],
      },
      {
        heading: "Pick the right format",
        paragraphs: [
          "Use JPG or WebP for photos, and PNG for screenshots, logos and anything with transparency. [Image Converter](/tools/image-converter) switches between them in bulk; for a single pair use a page such as [PNG to JPG](/tools/png-to-jpg) or [JPG to WebP](/tools/jpg-to-webp).",
        ],
      },
    ],
  },
  {
    slug: "png-vs-jpg-vs-webp",
    title: "PNG vs JPG vs WebP: Which Image Format to Use",
    description: "PNG, JPG or WebP? A plain comparison of quality, file size, transparency and support, with which format to pick for photos, logos, screenshots and websites.",
    answer: "Use JPG for photos you want to share, PNG for screenshots, logos and anything transparent, and WebP for the smallest files on websites. WebP works in all current browsers, but some older apps still expect JPG or PNG.",
    published: "2026-11-06",
    updated: "2026-11-06",
    tools: ["image-converter", "compress-image"],
    sections: [
      {
        heading: "The short comparison",
        list: [
          "JPG: lossy, small files for photos, no transparency, opens everywhere.",
          "PNG: lossless, keeps sharp edges and text, supports transparency, large files for photos.",
          "WebP: lossy or lossless, usually smaller than JPG at similar quality, supports transparency, supported by all current browsers.",
        ],
      },
      {
        heading: "Photos",
        paragraphs: [
          "JPG is the safe choice for sharing photos, because every phone, computer and upload form accepts it. For a website, WebP gives a noticeably smaller file for the same look. Converting a photo to PNG makes it much larger without making it look better.",
        ],
      },
      {
        heading: "Screenshots, logos and graphics",
        paragraphs: [
          "PNG keeps text and flat colours crisp, and its transparency makes logos sit cleanly on any background. JPG compression blurs sharp edges into visible artefacts, so avoid it for screenshots with text.",
        ],
      },
      {
        heading: "Converting between formats",
        paragraphs: [
          "Converting can't add back detail that a JPG has already lost, but it can make a file fit where it needs to go. Use [Image Converter](/tools/image-converter) for any format, or a dedicated page such as [WebP to JPG](/tools/webp-to-jpg), [PNG to WebP](/tools/png-to-webp) or [SVG to PNG](/tools/svg-to-png). Converting to JPG fills transparent areas with a background colour you choose.",
        ],
      },
    ],
  },
  {
    slug: "are-online-pdf-tools-safe",
    title: "Are Online PDF Tools Safe? What to Check",
    description: "What happens to your files on an online PDF or image tool, the questions to ask before uploading a document, and how browser-based tools avoid uploads.",
    answer: "Online PDF tools that upload your file put a copy on someone else's server, where it is stored at least briefly. Tools that run in your browser, like Devcipator Tools, process the file on your own device, so it is never sent anywhere.",
    published: "2026-11-06",
    updated: "2026-11-06",
    tools: ["merge-pdf", "sign-pdf", "compress-pdf"],
    sections: [
      {
        heading: "What happens when you upload a file",
        paragraphs: [
          "A typical online converter sends your document to its server, processes it there and gives you a download link. Your file then sits on that server until it is deleted, and you have to trust the service's word on when that happens and who can access it.",
          "That is a real risk for contracts, payslips, medical letters, ID scans and anything else you wouldn't email to a stranger.",
        ],
      },
      {
        heading: "Questions to ask before using a tool",
        list: [
          "Does the file leave my device, or is it processed in the browser?",
          "If it is uploaded, how long is it kept, and is that stated in the privacy policy?",
          "Do I need an account, and what else is collected?",
          "Does the result carry a watermark or the service's branding?",
        ],
      },
      {
        heading: "How browser-based tools avoid uploads",
        paragraphs: [
          "Modern browsers can do the work themselves. Devcipator Tools uses pdf-lib and Mozilla's PDF.js for PDFs, the Canvas API for images and the Web Audio API for sound, running in background Web Workers on your device.",
          "You can check this yourself: once a tool page has loaded, the processing keeps working without sending your file anywhere, and the browser's network panel shows no upload. Our [privacy policy](/privacy) explains what is stored, which is only your theme and recently used tools.",
        ],
      },
      {
        heading: "Sensitive documents",
        paragraphs: [
          "For sensitive files, prefer tools that process locally, such as [Sign PDF](/tools/sign-pdf), [Merge PDF](/tools/merge-pdf) and [Compress PDF](/tools/compress-pdf), and keep the downloaded result somewhere safe.",
        ],
      },
    ],
  },
  {
    slug: "how-to-sign-a-pdf",
    title: "How to Sign a PDF Online Without Printing It",
    description: "Add your signature to a PDF without printing or scanning: draw it or upload an image, place it on any page and download. Free and without uploading the PDF.",
    answer: "To sign a PDF without printing it, open it in [Sign PDF](/tools/sign-pdf), draw your signature or upload a picture of it, drag it to the right spot and download the signed copy. The document stays on your device the whole time.",
    published: "2026-11-06",
    updated: "2026-11-06",
    tools: ["sign-pdf", "add-page-numbers", "merge-pdf"],
    sections: [
      {
        heading: "Sign a PDF step by step",
        ordered: true,
        list: [
          "Open [Sign PDF](/tools/sign-pdf) and drop the PDF you need to sign.",
          "Draw your signature with a mouse, finger or stylus, or upload an image of your handwritten signature.",
          "Place it on the page, resize it, and add it to every page that needs it.",
          "Download the signed PDF.",
        ],
      },
      {
        heading: "Tips for a clean signature",
        list: [
          "On a phone or tablet, drawing with a finger usually looks more natural than with a mouse.",
          "For an uploaded signature, sign on plain white paper and photograph it in good light, so the background is clean.",
          "A transparent PNG of your signature sits cleanly over the signature line without a white box around it.",
        ],
      },
      {
        heading: "Is a drawn signature legally valid?",
        paragraphs: [
          "Many everyday documents accept a simple electronic signature like this, but rules differ by country and by type of document. Some contracts require a certified digital signature or a handwritten original. Check with the person or organisation that asked for the signature if you are unsure.",
        ],
      },
      {
        heading: "Before you send it",
        paragraphs: [
          "If the signed document has several parts, combine them with [Merge PDF](/tools/merge-pdf). [Add Page Numbers](/tools/add-page-numbers) helps the reader check that no page is missing.",
        ],
      },
    ],
  },
];

export function getGuide(slug: string): GuideConfig | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

/** Guides that use a tool, for the "Guides" list on its page. */
export function guidesForTool(slug: string): GuideConfig[] {
  return GUIDES.filter((g) => g.tools.includes(slug));
}
