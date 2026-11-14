import { FIELD_BRAND } from "@/lib/fieldBrand";

/*
 * The approved PourSafe files, used exactly as handed over (public/poursafe,
 * BRAND-HANDOFF.md): never redrawn, recoloured or split. The wordmark is never
 * shown narrower than 120px — below that it is the app icon.
 */

/** The app icon: orange hard hat over white "PS" on charcoal. */
export function Logo({ size = 32 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={FIELD_BRAND.icon} width={size} height={size} alt={FIELD_BRAND.name} className="fld-logo" />;
}

/** The wordmark. `reversed` on charcoal; the standard one on light backgrounds. */
export function Wordmark({ width = 140, reversed = false }: { width?: number; reversed?: boolean }) {
  const w = Math.max(width, 120);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={reversed ? FIELD_BRAND.wordmarkReversed : FIELD_BRAND.wordmark} width={w} height={Math.round(w * 1278 / 4898)}
      alt={FIELD_BRAND.name} className="fld-wordmark" />
  );
}

/** The fonts the brand calls for, loaded from Google Fonts (allowed by the site's CSP). */
export function BrandFonts() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={FIELD_BRAND.fonts} />
    </>
  );
}
