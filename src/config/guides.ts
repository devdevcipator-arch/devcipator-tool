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
  /** Search phrases this guide answers; used for the keywords meta tag. */
  keywords: string[];
  /** Tools this guide uses; it is listed on their pages too. The first one gets the call to action. */
  tools: string[];
  sections: GuideSection[];
}

export const GUIDES: GuideConfig[] = [
  {
    slug: "how-to-compress-a-pdf",
    keywords: ["how to compress a pdf","reduce pdf file size","make pdf smaller for email","compress scanned pdf","pdf too large to email"],
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
    keywords: ["how to merge pdf files","combine pdf files into one","merge pdf without uploading","join pdf documents"],
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
    keywords: ["how to reduce image size","reduce image file size without losing quality","make photo smaller","shrink image for email"],
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
    keywords: ["png vs jpg","jpg vs webp","png vs webp","best image format for web","which image format to use"],
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
    keywords: ["are online pdf tools safe","is it safe to upload pdf online","private pdf tools","pdf tools without upload"],
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
    keywords: ["how to sign a pdf","sign pdf without printing","add signature to pdf online","electronic signature pdf"],
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
  {
    slug: "do-qr-codes-expire",
    keywords: ["do qr codes expire","static vs dynamic qr code","qr code that never expires","why did my qr code stop working"],
    title: "Do QR Codes Expire? Static vs Dynamic Codes",
    description: "Why some QR codes stop working, the difference between static and dynamic QR codes, and how to make a free QR code that never expires. Plain-English guide.",
    answer: "A static QR code never expires: the link or text is stored inside the code itself, so it works as long as that link does. Dynamic QR codes point to a redirect on a company's server and can stop working when a trial or subscription ends. The [QR Code Generator](/tools/qr-code) here makes static codes.",
    published: "2026-11-06",
    updated: "2026-11-06",
    tools: ["qr-code", "barcode-generator"],
    sections: [
      {
        heading: "Static vs dynamic QR codes",
        list: [
          "Static: the data, such as your website address, Wi-Fi details or text, is encoded directly in the black-and-white pattern. No server is involved, so there is nothing to expire or switch off.",
          "Dynamic: the code contains a short link to the provider's server, which forwards people to your real address. That lets you change the destination later and count scans, but it only works while the provider keeps the redirect running.",
        ],
      },
      {
        heading: "Why QR codes stop working",
        paragraphs: [
          "When a printed QR code suddenly fails, it is usually a dynamic code whose free trial or paid plan has ended, so the provider's redirect no longer forwards to your page. The code on your menus, flyers or packaging is still readable; it just leads nowhere useful.",
          "A static code can only stop working if the thing it points to changes, for example if the web page is deleted or the Wi-Fi password is changed.",
        ],
      },
      {
        heading: "Make a QR code that never expires",
        ordered: true,
        list: [
          "Open the [QR Code Generator](/tools/qr-code) and choose the type: link, text, Wi-Fi, email or phone.",
          "Enter the details and adjust the colours, margin and error correction if you like.",
          "Download it as PNG for documents or SVG for print, and scan it with your phone to test before printing.",
        ],
      },
      {
        heading: "How to keep the option to change it later",
        paragraphs: [
          "If you may need to change the destination after printing, point the static code at a page you control, such as a page on your own website, and update that page instead. You get the flexibility of a dynamic code without depending on a QR provider.",
          "For products and stock labels rather than links, a [barcode](/tools/barcode-generator) may be the better fit.",
        ],
      },
    ],
  },
  {
    slug: "how-to-compress-image-to-100kb",
    keywords: ["how to compress image to 100kb","reduce photo size for online form","passport photo 50kb","signature 20kb"],
    title: "How to Compress an Image to 100 KB for Forms",
    description: "Get a photo, passport picture or signature under 100 KB, 50 KB or 20 KB for job portals and online forms: crop, resize, then compress. Free and without uploading.",
    answer: "To get an image under 100 KB, open [Compress Image to 100 KB](/tools/compress-image-to-100kb), add the photo and press Compress. If the result is still too big or blurry, crop it to the required shape and lower its pixel size first; fewer pixels reach small sizes with better quality.",
    published: "2026-11-06",
    updated: "2026-11-06",
    tools: ["compress-image-to-100kb", "crop-image", "resize-image"],
    sections: [
      {
        heading: "Check what the form asks for",
        paragraphs: [
          "Application forms usually set two limits: a maximum file size, such as 20 KB, 50 KB or 100 KB, and sometimes exact pixel dimensions or a format such as JPG. Note both before you start, because meeting the pixel size first makes the file size much easier to reach.",
        ],
      },
      {
        heading: "Compress the image step by step",
        ordered: true,
        list: [
          "Crop the photo to the shape the form wants, for example a passport-style portrait, with [Crop Image](/tools/crop-image).",
          "If dimensions are given, set them with [Resize Image](/tools/resize-image). A 5 MB phone photo rarely needs to be wider than 1200 pixels.",
          "Open the page for your limit, such as [100 KB](/tools/compress-image-to-100kb), [50 KB](/tools/compress-image-to-50kb) or [20 KB](/tools/compress-image-to-20kb), and press Compress.",
          "Check the before-and-after slider, then download the image and upload it to the form.",
        ],
      },
      {
        heading: "If the image won't get small enough",
        list: [
          "Lower the maximum width and height on the compressor; this is the biggest saving.",
          "Save as JPG instead of PNG. PNG photos are much larger and rarely reach 50 KB.",
          "For signatures, crop tightly around the ink so there is little empty paper left.",
        ],
      },
      {
        heading: "Keeping ID photos private",
        paragraphs: [
          "Passport photos, signatures and ID scans are exactly the files you shouldn't upload to unknown websites. These tools compress images inside your browser, so the files stay on your device. Read more in [are online tools safe?](/guides/are-online-pdf-tools-safe)",
        ],
      },
    ],
  },
  {
    slug: "how-to-combine-pdf-and-jpg",
    keywords: ["combine pdf and jpg","merge pdf and jpg into one pdf","add image to pdf","combine photos and pdf"],
    title: "How to Combine PDF and JPG Files Into One PDF",
    description: "Put PDFs and photos or scans into a single PDF in the right order: convert the images, merge everything, then shrink the file if needed. Free and without uploading.",
    answer: "To combine PDF and JPG files, first turn the images into a PDF with [Images to PDF](/tools/images-to-pdf), then add that file and your other PDFs to [Merge PDF](/tools/merge-pdf) and put them in order. If the result is too large to send, shrink it with [Compress PDF](/tools/compress-pdf).",
    published: "2026-11-06",
    updated: "2026-11-06",
    tools: ["images-to-pdf", "merge-pdf", "compress-pdf"],
    sections: [
      {
        heading: "Combine images and PDFs step by step",
        ordered: true,
        list: [
          "Open [Images to PDF](/tools/images-to-pdf) and add your JPG or PNG photos, such as receipts or scanned pages. Choose A4 or Letter if the result will be printed.",
          "Download the new PDF.",
          "Open [Merge PDF](/tools/merge-pdf), add that PDF together with your other PDF files, and drag them into the order you want.",
          "Merge and download a single PDF containing everything.",
        ],
      },
      {
        heading: "Fix the order or remove pages",
        paragraphs: [
          "If a page ends up in the wrong place, or a blank page sneaks in, open the merged file in [Organize PDF](/tools/organize-pdf) to drag pages around or delete them. Sideways photos can be fixed with [Rotate PDF](/tools/rotate-pdf).",
        ],
      },
      {
        heading: "Keep the file small enough to send",
        paragraphs: [
          "Photos from a phone make large pages. If the combined PDF is over an email or upload limit, run it through [Compress PDF](/tools/compress-pdf), or compress the photos with [Compress Image](/tools/compress-image) before converting them.",
        ],
      },
    ],
  },
];

export function getGuide(slug: string): GuideConfig | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

/** Guides that use any of these tools, for the "Guides" list on a tool page. */
export function guidesForTool(...slugs: string[]): GuideConfig[] {
  return GUIDES.filter((g) => g.tools.some((t) => slugs.includes(t)));
}
