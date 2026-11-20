import { Inter, Lora, Merriweather, Playfair_Display, Roboto_Mono } from "next/font/google";

// Self-hosted by next/font, so the builder makes no request to Google. Variable fonts give every weight
// the per-letter styler offers. Not preloaded: only this workspace uses them.
const inter = Inter({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", preload: false });
const lora = Lora({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", preload: false });
const robotoMono = Roboto_Mono({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", preload: false });
const merriweather = Merriweather({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", preload: false });

export type FontId = "inter" | "lora" | "playfair" | "roboto-mono" | "merriweather";

export const FONTS: Record<FontId, { label: string; family: string }> = {
  inter: { label: "Inter", family: inter.style.fontFamily },
  lora: { label: "Lora", family: lora.style.fontFamily },
  playfair: { label: "Playfair Display", family: playfair.style.fontFamily },
  "roboto-mono": { label: "Roboto Mono", family: robotoMono.style.fontFamily },
  merriweather: { label: "Merriweather", family: merriweather.style.fontFamily },
};

export const FONT_OPTIONS = (Object.keys(FONTS) as FontId[]).map((id) => ({ value: id, label: FONTS[id].label }));
