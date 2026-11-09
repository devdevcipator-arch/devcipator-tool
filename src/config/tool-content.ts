/**
 * Longer copy for each tool page, shown under "Features": what people use the tool for, practical tips and how it
 * works. It is written for readers first: it uses the phrases people search for where they fit naturally, never as a
 * keyword list. Paragraphs may contain `[text](/path)` internal links (see RichText). Keep every claim to what the
 * tool actually does.
 */
export interface ToolDetails {
  heading: string;
  paragraphs: string[];
}

/** "What is a … file?" explainers shown on the conversion pages, keyed by the names used in ToolConfig.formats. */
export const FORMAT_INFO: Record<string, string> = {
  JPG: "JPG (or JPEG) is the most common format for photos. It uses lossy compression, discarding detail the eye barely notices, so photos become small files that open in every app, browser and phone. It has no transparency, and repeated editing and re-saving gradually lowers quality, so it suits finished photos rather than graphics with sharp text.",
  PNG: "PNG is a lossless image format: it stores every pixel exactly, so text, logos, screenshots and line art stay crisp. It supports transparent backgrounds, which makes it the usual choice for logos and icons. The trade-off is size: photos saved as PNG are often several times larger than the same photo as JPG.",
  WebP: "WebP is a modern image format developed by Google for the web. It supports both lossy and lossless compression as well as transparency, and its files are usually noticeably smaller than JPG or PNG at similar quality. All current browsers display WebP, but some older desktop apps and upload forms still don't accept it.",
  SVG: "SVG is a vector format: instead of pixels, it describes shapes, lines and text with code, so it stays perfectly sharp at any size. It is ideal for logos, icons and illustrations on websites, but many documents, slide tools and apps can't insert SVG files, which is when a PNG copy is needed.",
  HEIC: "HEIC (High Efficiency Image Container) is the photo format iPhones and iPads use by default. It stores photos at about half the size of JPG with similar quality, and can hold extras such as Live Photo frames and depth data. Apple devices and macOS open it natively, but Windows, many Android apps and most websites and upload forms still don't, which is why HEIC photos often need converting to JPG.",
  AVIF: "AVIF is a newer image format based on the AV1 video codec. It compresses photos even more efficiently than WebP and supports transparency and high dynamic range, so more and more websites use it. Support outside browsers is still limited, which is why AVIF images often need converting before you can edit or upload them.",
};

/** "Common size limits" table on the compressor pages. `slug` is the page that compresses to that size. */
export const SIZE_LIMITS: Array<{ use: string; limit: string; slug: string }> = [
  { use: "Scanned signature on an application form", limit: "10–20 KB", slug: "compress-image-to-20kb" },
  { use: "Passport-size photo for exam and job forms", limit: "20–50 KB", slug: "compress-image-to-50kb" },
  { use: "Photo or ID upload on job portals", limit: "100 KB", slug: "compress-image-to-100kb" },
  { use: "Certificates and documents as PDF", limit: "100–200 KB", slug: "compress-pdf-to-200kb" },
  { use: "Government and university portals", limit: "500 KB", slug: "compress-pdf-to-500kb" },
  { use: "Upload forms with a 1 MB cap", limit: "1 MB", slug: "compress-pdf-to-1mb" },
];

/**
 * Results measured on this site (Chrome on a laptop, November 2026) with test files, shown on the compressor pages.
 * Re-measure before changing them; real files compress more or less depending on their content.
 */
export const MEASURED_RESULTS: Array<{ file: string; before: string; target: string; after: string; saved: string }> = [
  { file: "3-page PDF of photos", before: "6.2 MB", target: "100 KB", after: "39 KB", saved: "99%" },
  { file: "10-page PDF of photos", before: "1.9 MB", target: "200 KB", after: "166 KB", saved: "91%" },
  { file: "10-page PDF of photos", before: "1.9 MB", target: "1 MB", after: "607 KB", saved: "69%" },
  { file: "3000 × 2000 photo (JPG)", before: "1.9 MB", target: "100 KB", after: "91 KB", saved: "95%" },
  { file: "3000 × 2000 photo (JPG)", before: "1.9 MB", target: "50 KB", after: "47 KB", saved: "98%" },
  { file: "3000 × 2000 photo (JPG)", before: "1.9 MB", target: "20 KB", after: "20 KB", saved: "99%" },
];

export const TOOL_DETAILS: Record<string, ToolDetails> = {
  "file-compressor": {
    heading: "Compress any file to 100 KB, 200 KB or 1 MB",
    paragraphs: [
      "Schools, offices, job portals and government websites all set upload limits, and the files people need to send, such as scanned certificates, ID cards, mark sheets, application forms and phone photos, are usually far too big. The File Compressor shrinks PDFs and images from several MB down to the exact limit you need: pick 20 KB, 50 KB, 100 KB, 200 KB, 500 KB or 1 MB, or type any size from 5 KB upwards. Each file can be up to 200 MB. Results are kept under the limit even on sites that count 1 KB as 1,000 bytes.",
      "Each file is compressed only as much as it needs. PDFs start at a sharp 150 DPI and the resolution is lowered step by step until the file fits; photos keep their dimensions where possible and are scaled down only when quality alone isn't enough. Files that are already under the limit are returned unchanged, and iPhone HEIC photos are converted to JPG so every form accepts them. 100 KB is the most common limit on online forms, so it is selected by default.",
      "To send a Word or Excel document, save it as PDF first and then compress the PDF. If a long PDF can't reach a very small target, remove pages you don't need with [Split PDF](/tools/split-pdf), or use [Compress PDF](/tools/compress-pdf) for a quick size reduction without a fixed target. Our guide on [compressing an image to 100 KB](/guides/how-to-compress-image-to-100kb) covers photos, signatures and passport pictures step by step.",
    ],
  },
  // ───────────────────────────── PDF ─────────────────────────────
  "merge-pdf": {
    heading: "When to combine PDF files",
    paragraphs: [
      "Merging PDFs is the quickest way to send one tidy document instead of a string of attachments: a job application with your CV, cover letter and certificates, a set of scanned receipts for an expense claim, or the chapters of a report exported separately. Add the files, drag them into order and the PDF merger joins them into one file, with each original page copied exactly.",
      "Because nothing is re-rendered, text stays selectable and searchable and images keep their full resolution. There is no fixed limit on the number of files you can combine, and each PDF can be up to 200 MB.",
      "Need to tidy the result? Use [Organize PDF](/tools/organize-pdf) to delete a blank page or move one, [Add Page Numbers](/tools/add-page-numbers) to number the combined document, and [Compress PDF](/tools/compress-pdf) if the merged file is too large to email. Our guide on [how to merge PDF files](/guides/how-to-merge-pdf-files) walks through it step by step.",
    ],
  },
  "compress-pdf": {
    heading: "Reduce PDF size for email and upload forms",
    paragraphs: [
      "Email services and online forms often cap attachments at a few megabytes, and scanned documents easily go over. Compress PDF makes the file smaller by redrawing each page as a compressed image at a lower resolution, which is why scans, photo-heavy brochures and PDFs made from phone pictures shrink the most, often by well over half.",
      "Pick Strong when you simply need the smallest PDF for an upload limit, Balanced for everyday documents, and Light when the PDF will be printed. The tool shows the original and new size side by side, and warns you if a text-only PDF wouldn't get any smaller, so you never send a worse file by mistake.",
      "If only a few pages are needed, removing the rest with [Split PDF](/tools/split-pdf) saves even more space and keeps text selectable. Read [how to compress a PDF](/guides/how-to-compress-a-pdf) for more ways to make a PDF smaller.",
    ],
  },
  "split-pdf": {
    heading: "Ways to split a PDF",
    paragraphs: [
      "Split PDF covers the common jobs in one place: extract one page from a PDF, pull out a chapter, separate a scanned stack into individual documents, or break a long file into equal parts small enough to email. Type ranges such as “1-3, 5, 8-” and each range becomes its own PDF; choose a chunk size to cut the file every N pages; or save every page as a separate PDF.",
      "Live thumbnails show exactly which pages land in each part before you split, so there is no guesswork. When there are many parts, they download together as a ZIP. Pages are copied without re-rendering, so the extracted pages look exactly like the original.",
      "To remove pages from a PDF and keep the rest as a single file, [Organize PDF](/tools/organize-pdf) is the quicker choice. To put parts back together in a new order, use [Merge PDF](/tools/merge-pdf).",
    ],
  },
  "organize-pdf": {
    heading: "Rearrange, delete and tidy PDF pages",
    paragraphs: [
      "Scanned documents often come out in the wrong order or with blank pages in between. Organize PDF shows every page as a thumbnail so you can rearrange PDF pages by dragging them, delete pages you don't need, and restore any page you removed by mistake before saving.",
      "It is also the easiest way to change the page order of a PDF after merging several files, or to remove pages from a PDF before sharing it, such as an internal appendix or a page with personal details. The new PDF is built from copies of the original pages, so quality and selectable text stay intact.",
      "For pages that are sideways or upside down, use [Rotate PDF](/tools/rotate-pdf). To keep only certain pages as a separate file, use [Split PDF](/tools/split-pdf).",
    ],
  },
  "images-to-pdf": {
    heading: "Turn photos and scans into one PDF",
    paragraphs: [
      "Many forms and offices ask for a single PDF rather than a handful of photos. Images to PDF converts JPG to PDF, PNG to PDF, or a mix of both, putting each picture on its own page in the order you choose. It is ideal for photographed receipts, ID documents, handwritten notes and phone scans of paperwork.",
      "Choose Fit to image for pages the same size as each picture, or A4 or Letter for a document that prints cleanly, with portrait, landscape or automatic orientation and adjustable margins. JPG and PNG files are embedded without re-encoding, so photos keep their quality, and the camera's rotation is respected so pictures don't come out sideways.",
      "If the finished PDF is too big to send, run it through [Compress PDF](/tools/compress-pdf), or shrink the photos first with [Compress Image](/tools/compress-image). To add the result to an existing document, use [Merge PDF](/tools/merge-pdf).",
    ],
  },
  "pdf-to-images": {
    heading: "Convert PDF pages to JPG or PNG",
    paragraphs: [
      "Converting a PDF to JPG is handy when you need a page as a picture: to post it on social media, add it to a slide, attach a single page to a chat message, or upload it to a site that only accepts images. PDF to Images renders each page with Mozilla's PDF.js and saves it as a PNG or JPG.",
      "Choose 150 DPI for screens and 300 DPI for print-quality images. JPG gives smaller files for scans and photos, while PNG keeps text and line drawings crisp. You can convert every page or only a range, such as a single page from a long report, and multiple pages download together as a ZIP.",
      "Going the other way? [Images to PDF](/tools/images-to-pdf) turns pictures back into a PDF. To change the format or size of the exported images, use [Image Converter](/tools/image-converter) or [Resize Image](/tools/resize-image).",
    ],
  },
  "sign-pdf": {
    heading: "Sign documents without printing or scanning",
    paragraphs: [
      "Printing a document just to sign it, then scanning it back in, takes time and usually lowers the quality. Sign PDF lets you add a signature to a PDF directly: draw it with a mouse, trackpad or your finger on a phone, or upload a photo of your handwritten signature, then drag it into place and resize it.",
      "You can place the signature on several pages, which suits contracts that need initials on every page. Your signature image and the document stay in your browser, which matters for leases, employment contracts and forms with personal details.",
      "A drawn signature is a simple electronic signature, which is accepted for many everyday documents, but some agreements need a certified digital signature. Our guide on [how to sign a PDF](/guides/how-to-sign-a-pdf) covers this and some tips for a cleaner signature.",
    ],
  },
  "rotate-pdf": {
    heading: "Fix sideways and upside-down pages",
    paragraphs: [
      "Scanners and phone scanning apps often save some pages sideways or upside down. Rotate PDF lets you turn individual pages from the thumbnail grid, or rotate every page at once by 90 or 180 degrees, then save the rotated PDF permanently.",
      "Rotation is stored as a page setting rather than by redrawing the page, so it is lossless: text stays sharp and selectable and the file size barely changes. That makes it the right tool for a landscape table in the middle of a portrait report, or a scanned form that came out upside down.",
      "To change the order of pages as well, use [Organize PDF](/tools/organize-pdf), which can also rotate and delete pages in one go.",
    ],
  },
  "add-page-numbers": {
    heading: "Number pages the way you need",
    paragraphs: [
      "Page numbers make long documents easier to navigate, print and discuss. Add Page Numbers stamps numbers onto any PDF using a format you choose, such as “Page 1 of 10” or just “1”, in one of six positions at the top or bottom of the page.",
      "You can skip the cover page, start counting from a number other than 1, and set the font size, colour and distance from the edge. That covers theses and reports with front matter, documents that continue another file's numbering, and contracts where each page must show its place in the whole.",
      "Combining several files first? Use [Merge PDF](/tools/merge-pdf) before numbering, so the numbers run through the whole document.",
    ],
  },
  // ───────────────────────────── Image ─────────────────────────────
  "compress-image": {
    heading: "Reduce image size in KB: from MB to 100 KB, 50 KB or 20 KB",
    paragraphs: [
      "Photos from modern phones are often 2–5 MB, but online forms, job portals and exam registrations usually accept 100 KB, 50 KB or even 20 KB. Compress Image reduces JPG, PNG and WebP images to the exact size you pick: choose a preset from 20 KB to 1 MB, or type any size in KB. Images up to 50 MB are accepted, and you can compress a whole batch at once and download them as a ZIP.",
      "To reach the target, quality is lowered step by step; if that is not enough for a very large photo, the image is also scaled down, and the result tells you so. The before-and-after slider lets you check that faces and text are still clear before you download. 100 KB is the most common limit on online forms; passport-size photos are often 50 KB and scanned signatures 20 KB.",
      "For the clearest result at small sizes, crop the photo to the shape the form wants with [Crop Image](/tools/crop-image) first, and save as JPG, which is accepted everywhere. To compress PDFs and photos together, use the [File Compressor](/tools/file-compressor). Read [how to compress an image to 100 KB](/guides/how-to-compress-image-to-100kb) for a step-by-step guide.",
    ],
  },
  "resize-image": {
    heading: "Resize images to exact sizes",
    paragraphs: [
      "Resize Image changes the pixel dimensions of a photo: to fit a profile picture or banner, meet an upload form's maximum width, or make huge camera photos easier to share. Enter an exact width and height, or scale by percentage, and keep the aspect ratio locked so the picture isn't stretched.",
      "Presets cover common social media sizes, which makes it quick to resize an image for Instagram and other platforms. You can resize many images at once, and downscaling uses several smaller steps for sharper results than a single jump.",
      "Making an image smaller in pixels also makes the file much smaller; for a precise file size, follow up with [Compress Image](/tools/compress-image). To cut the picture to a different shape instead, use [Crop Image](/tools/crop-image).",
    ],
  },
  "image-converter": {
    heading: "Change image format in bulk",
    paragraphs: [
      "Different places expect different image formats: some upload forms only accept JPG, design tools prefer PNG, and websites load faster with WebP. Image Converter changes the format of a single image or a whole batch, converting PNG to JPG, WebP to JPG, JPG to PNG, SVG to PNG and more.",
      "Lossy formats come with a quality slider, so you can balance file size against detail. When you convert an image with transparency to JPG or BMP, transparent areas are filled with a background colour you pick instead of turning black.",
      "Not sure which format to use? Read [PNG vs JPG vs WebP](/guides/png-vs-jpg-vs-webp). For a smaller file in the same format, use [Compress Image](/tools/compress-image).",
    ],
  },
  "crop-image": {
    heading: "Crop photos to the right shape",
    paragraphs: [
      "Cropping removes distracting edges and fits a picture to the shape a platform expects. Crop Image lets you drag and resize a crop box, or lock it to a preset: 1:1 to crop an image to a square for profile pictures, 16:9 for video thumbnails and slides, 4:3 for classic photos, or 9:16 for stories.",
      "Rule-of-thirds guides help you frame the subject, and you can type exact pixel values when a size must be precise. The crop is applied to the original full-resolution image, not a scaled-down preview, so no quality is lost.",
      "After cropping, [Resize Image](/tools/resize-image) sets the final pixel size and [Compress Image](/tools/compress-image) makes the file smaller.",
    ],
  },
  "rotate-flip-image": {
    heading: "Straighten and mirror photos",
    paragraphs: [
      "Photos sometimes open sideways on other devices, and selfies come out mirrored. Rotate & Flip Image turns pictures 90 degrees clockwise or counter-clockwise and flips them horizontally or vertically, for one image or a whole batch at once.",
      "Mirroring is useful for selfies with backwards text, product shots that should face the other way, and preparing images for iron-on transfers. Saving as PNG keeps the result lossless; JPG gives a smaller file.",
      "For a different shape or size, continue with [Crop Image](/tools/crop-image) or [Resize Image](/tools/resize-image).",
    ],
  },
  "watermark-image": {
    heading: "Protect and brand your images",
    paragraphs: [
      "A watermark discourages people from reusing your photos without credit and keeps your name on images that get shared. Watermark Image adds a text watermark, such as your name or website, or your logo, to one photo or a whole batch.",
      "Place the watermark in one of nine positions or tile it across the entire image, and adjust opacity, size and rotation. A semi-transparent watermark protects the photo while keeping it pleasant to look at; a tiled pattern is harder to crop out. Upload a transparent PNG logo for the cleanest result.",
      "Photographers, online sellers and designers can watermark photos before posting previews, then use [Compress Image](/tools/compress-image) to make them load faster online.",
    ],
  },
  "meme-generator": {
    heading: "Make a meme in seconds",
    paragraphs: [
      "Meme Generator adds the classic bold white Impact captions with a black outline to the top and bottom of any picture, so you can make a meme from your own photo or a screenshot. Long captions wrap onto extra lines automatically.",
      "Adjust the font size, fill and outline colours, or turn off uppercase for a different style. The finished meme has no watermark, so it is ready to share in chats and on social media.",
      "To fit a meme to a particular shape first, use [Crop Image](/tools/crop-image). For text that should protect an image rather than caption it, use [Watermark Image](/tools/watermark-image).",
    ],
  },
  // ───────────────────────────── Audio ─────────────────────────────
  "audio-cutter": {
    heading: "Trim songs, recordings and ringtones",
    paragraphs: [
      "Audio Cutter trims any song or recording on a visual waveform: drag the start and end handles to keep the part you want, or remove a section from the middle. It works as an MP3 cutter and also handles WAV, OGG, M4A and other formats your browser can play.",
      "Common uses include cutting the silence from the start of a voice memo, pulling a clip from an interview or lecture, and making a ringtone from a favourite part of a song. Add a fade in and fade out for smooth edges, preview the selection, then export as MP3 or WAV. MP3 ringtones work on most Android phones; iPhone ringtones need Apple's own format.",
      "To combine several clips afterwards, use [Audio Joiner](/tools/audio-joiner). If the clip is too quiet, [Volume Booster](/tools/volume-booster) makes it louder.",
    ],
  },
  "audio-joiner": {
    heading: "Combine tracks into one file",
    paragraphs: [
      "Audio Joiner merges MP3 files and other audio into a single track: combine songs into one mix, join parts of a podcast recorded separately, or stitch voice notes together. Drag the tracks into order, then add a short gap or a crossfade between them.",
      "Files don't need to match: you can join an MP3 with a WAV or M4A, even with different sample rates, and the result is exported as one MP3 or WAV file.",
      "Trim each clip first with [Audio Cutter](/tools/audio-cutter), and even out quiet tracks with [Volume Booster](/tools/volume-booster) before joining.",
    ],
  },
  "audio-speed": {
    heading: "Change tempo without changing pitch",
    paragraphs: [
      "Audio Speed Changer speeds up or slows down audio anywhere from 0.5x to 2x in small steps. Slow down a song to learn a guitar part or dance routine, or speed up a podcast, lecture or audiobook to get through it faster.",
      "With pitch lock on, the tempo changes without changing the pitch, so voices don't sound like chipmunks when sped up or turn deep when slowed down. Turn it off for the classic tape-speed effect. Preview the setting before exporting the result as MP3 or WAV.",
      "To keep only part of a track, trim it with [Audio Cutter](/tools/audio-cutter) first.",
    ],
  },
  "volume-booster": {
    heading: "Make quiet audio louder",
    paragraphs: [
      "Volume Booster increases the volume of an audio file that is too quiet: a phone recording of a meeting, a lecture recorded from the back of the room, or a song that is softer than the rest of a playlist. Boost the gain by up to 300%, with a limiter that stops loud peaks from clipping and distorting.",
      "Alternatively, normalize audio so the loudest peak reaches a target level. That is the cleanest way to make several files match in loudness. Preview the change before exporting to MP3 or WAV.",
      "Boosting also raises background noise, so very hissy recordings get louder hiss too. To join several levelled clips, use [Audio Joiner](/tools/audio-joiner).",
    ],
  },
  "reverse-audio": {
    heading: "Play any sound backwards",
    paragraphs: [
      "Reverse Audio plays a song, sound effect or voice recording backwards, sample by sample. Musicians and video editors use reversed sounds for swells, transitions and eerie effects, and it is a fun way to check for hidden backmasked messages or make a riddle out of a voice note.",
      "Reversing doesn't change quality; export the result as WAV for a lossless copy or MP3 for a smaller file. To reverse only part of a file, cut that section with [Audio Cutter](/tools/audio-cutter) first.",
    ],
  },
  // ───────────────────────────── Utility ─────────────────────────────
  "qr-code": {
    heading: "QR codes for links, Wi-Fi and contact details",
    paragraphs: [
      "This free QR code generator makes codes for a website link, plain text, an email address, a phone number or a Wi-Fi network, so guests can join without typing the password. Set the colours, margin and error correction, then download the code as PNG for documents or SVG for sharp printing at any size.",
      "The codes contain your data directly rather than a redirect through someone else's server, so they don't expire and keep working for as long as the link or details behind them are valid. Higher error correction keeps a code readable if it is printed small or slightly damaged.",
      "The same page also works as a QR code scanner from an image: upload a screenshot or photo of a QR code to read what it contains without opening it on your phone first.",
    ],
  },
  "barcode-generator": {
    heading: "Create barcodes for products and labels",
    paragraphs: [
      "Barcode Generator creates printable barcodes in the most common formats: EAN-13 and UPC-A for retail products, EAN-8 for small packages, Code 128 and Code 39 for labels and inventory, and ITF-14 for shipping cartons. The value is checked as you type, including EAN and UPC check digits, so you don't print a barcode that won't scan.",
      "Adjust bar width, height and the text under the code, then download it as SVG for crisp printing at any size or as PNG for documents. Code 128 is a good default for internal labels because it encodes letters and numbers compactly.",
      "Retail EAN and UPC numbers have to be issued to your company by GS1; this tool draws the barcode for a number you already have. For links and contact details, use the [QR Code Generator](/tools/qr-code).",
    ],
  },
  "word-counter": {
    heading: "Count words and characters for any limit",
    paragraphs: [
      "Word Counter shows the word count, character count with and without spaces, and the number of sentences and paragraphs as you type or paste. That makes it easy to stay within essay and assignment word limits, social media character limits, and the length of meta descriptions and ad copy.",
      "It also estimates reading time and speaking time, which helps when preparing a speech or a presentation script, and lists the most frequent words so you can check keyword density and spot words you repeat too often.",
      "Need to fix capitalisation as well? [Case Converter](/tools/case-converter) changes text to uppercase, lowercase, Title Case and more.",
    ],
  },
  "case-converter": {
    heading: "Fix capitalisation in one click",
    paragraphs: [
      "Case Converter changes text case instantly: turn accidental caps lock text from uppercase to lowercase, make a heading Title Case, or tidy a paragraph into Sentence case. It is quicker than retyping and works on any length of text.",
      "Developers can convert names to camelCase, PascalCase, snake_case, kebab-case or CONSTANT_CASE, and the converter understands words already joined in another style, so “userAccountId” becomes “user_account_id”. Copy the result with one click, or undo back to the original.",
      "To check length as well, use [Word Counter](/tools/word-counter).",
    ],
  },
  "color-picker": {
    heading: "Find the exact colour in any image",
    paragraphs: [
      "Color Picker works like an eyedropper for images: upload a photo, logo or screenshot and click any pixel to get its HEX code, RGB and HSL values. A magnifier helps you hit exactly the right pixel, even on thin lines and small text.",
      "It also extracts a colour palette from the image automatically, which is a quick way to match brand colours from a logo, build a website colour scheme from a photo, or find the exact shade used in a design you like. Picked colours are kept in a history list and copy with one click.",
      "To work with part of an image only, crop it first with [Crop Image](/tools/crop-image).",
    ],
  },
};
