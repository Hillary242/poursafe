import type { Viewport } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { session } from "@/lib/session";
import { FIELD_BRAND } from "@/lib/fieldBrand";
import { fieldDict, fieldLangChosen } from "@/lib/fieldLang";
import { FieldI18n } from "../I18n";
import { Menu } from "../Menu";
import { LangButton, LangChooser } from "../LangButton";
import { BrandFonts, Wordmark } from "../Logo";
import { SitePicker } from "../SitePicker";
import { fieldJobs } from "@/lib/fieldJobs";
import { currentSite, pickableSites } from "@/lib/site";

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
  const [{ data: allowed }, { data: director }, { lang, t }, chosen, jobs] = await Promise.all([
    supabase.rpc("has_field_access"), supabase.rpc("is_safety_director"), fieldDict(), fieldLangChosen(),
    fieldJobs(supabase, user.id),
  ]);
  const who = profile?.full_name || profile?.email || user.email || "";
  const sites = pickableSites(jobs);
  const site = await currentSite(jobs);

  return (
    <FieldI18n lang={lang}>
      <BrandFonts />
      <div className="fld">
        <header className="fld-top">
          <Link href="/" className="fld-brand" aria-label={FIELD_BRAND.name}><Wordmark width={128} reversed /></Link>
          {/* The language is always in sight; notifications and sign out live behind ☰ (her asks, 15 Nov). */}
          <LangButton lang={lang} />
          <Menu lang={lang} who={who} director={director === true} publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
          {/* The site, big and on every screen (15 Nov). */}
          {allowed === true && chosen && (
            <SitePicker sites={sites.map((s) => ({ id: s.id, name: s.name }))} current={site?.id ?? null} />
          )}
        </header>
        <main className="fld-main">
          {allowed === true ? (chosen ? children : <LangChooser />) : (
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
