import type { Viewport } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { session } from "@/lib/session";
import { FIELD_BRAND } from "@/lib/fieldBrand";
import { fieldDict } from "@/lib/fieldLang";
import { FieldI18n, LangSwitch } from "../I18n";
import { BrandFonts, Wordmark } from "../Logo";

export const dynamic = "force-dynamic";
/* Phone-first: the width of the device, and no zoom-on-focus jump — every
   input in here is 16px for the same reason. */
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: FIELD_BRAND.charcoal };

/**
 * POURSAFE — its own app (her call, 14 Nov), sharing the Ops Tracker's
 * database for now so reports land in the office Safety log.
 *
 * Who is let in: the Field app grant, the Safety Director grant, or the owner —
 * has_field_access() in the database, which is also what every write asks.
 * Signing in at all still needs an approved account (auth/callback).
 */
export default async function PourSafeLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await session();
  if (!user) redirect("/sign-in");
  const supabase = await createClient();
  const [{ data: allowed }, { lang, t }] = await Promise.all([supabase.rpc("has_field_access"), fieldDict()]);
  const who = profile?.full_name || profile?.email || user.email || "";

  return (
    <FieldI18n lang={lang}>
      <BrandFonts />
      <div className="fld">
        <header className="fld-top">
          <Link href="/" className="fld-brand" aria-label={FIELD_BRAND.name}><Wordmark width={128} reversed /></Link>
          <LangSwitch lang={lang} />
          <span className="fld-who">{who.split(" ")[0]}</span>
          <form action="/auth/signout" method="post"><button className="fld-out" type="submit">{t.signOut}</button></form>
        </header>
        <main className="fld-main">
          {allowed === true ? children : (
            <div className="fld-card">
              <h2>{t.noAccessTitle}</h2>
              <p className="fld-mut">{t.noAccessBody}</p>
            </div>
          )}
        </main>
      </div>
    </FieldI18n>
  );
}
