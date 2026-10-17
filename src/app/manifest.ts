import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

// Installable: the paper opens like an app from the home screen, straight to today's edition.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name}: ${BRAND.tagline}`,
    short_name: BRAND.name,
    description: "One morning paper, written for you. About ten stories, six minutes, and then it ends.",
    start_url: "/paper",
    scope: "/",
    display: "standalone",
    background_color: "#ece9e1",
    theme_color: "#ffd23f",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
