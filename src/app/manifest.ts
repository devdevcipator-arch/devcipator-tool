import type { MetadataRoute } from "next";
import { SITE } from "@/config/tools.config";

/** Web app manifest: lets phones add the site to the home screen with its own name, icon and colours. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f8f9fc",
    theme_color: "#f8f9fc",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
