import type { MetadataRoute } from "next";
import { FIELD_BRAND } from "@/lib/fieldBrand";

/**
 * Makes PourSafe installable — "Add to Home Screen". On iPhone that is what
 * lets it receive notifications at all (iOS 16.4+ allows Web Push only to a
 * site added to the home screen).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: FIELD_BRAND.name,
    short_name: FIELD_BRAND.name,
    description: "Field safety & compliance",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: FIELD_BRAND.charcoal,
    theme_color: FIELD_BRAND.charcoal,
    icons: [
      { src: "/poursafe/poursafe-app-icon-1024.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
      { src: "/poursafe/poursafe-app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
