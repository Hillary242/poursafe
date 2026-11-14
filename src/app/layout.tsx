import "./globals.css";
import type { Metadata } from "next";
import { FIELD_BRAND } from "@/lib/fieldBrand";
import { fieldLang } from "@/lib/fieldLang";

export const metadata: Metadata = {
  title: FIELD_BRAND.name,
  description: "Field safety & compliance",
  applicationName: FIELD_BRAND.name,
  appleWebApp: { title: FIELD_BRAND.name, capable: true, statusBarStyle: "black" },
};

/** The page's language follows the EN / ES / PT switch, for screen readers and spell-check. */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await fieldLang();
  return (
    <html lang={lang}>
      <body>{children}</body>
    </html>
  );
}
