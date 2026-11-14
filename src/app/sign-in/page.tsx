import type { Metadata, Viewport } from "next";
import { FIELD_BRAND } from "@/lib/fieldBrand";
import { fieldDict } from "@/lib/fieldLang";
import { FieldI18n, LangSwitch } from "../I18n";
import { BrandFonts, Wordmark } from "../Logo";
import { SignInButton } from "./SignInButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: FIELD_BRAND.name };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: FIELD_BRAND.charcoal };

/**
 * PourSafe's own sign-in page (her call, 14 Nov): its name and logo, in the
 * worker's language — no office branding. The account is still a Google
 * account on the allow-list, exactly as for the office app; only the door
 * looks different, and sign-in comes back to /field.
 */
export default async function FieldSignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { lang, t } = await fieldDict();
  const err = error === "not-authorized" ? t.signInNotAuthorized : error ? t.signInFailed : null;
  return (
    <FieldI18n lang={lang}>
      <BrandFonts />
      <div className="fld fld-signin">
        <div className="fld-signin-lang"><LangSwitch lang={lang} /></div>
        <div className="fld-signin-card">
          <div className="fld-signin-mark"><Wordmark width={230} /></div>
          {/* The hazard stripe on both sides, so the tagline sits centred under the logo. */}
          <div className="fld-tagline fld-tagline-c">
            <i aria-hidden className="fld-stripe" />{FIELD_BRAND.tagline}<i aria-hidden className="fld-stripe fld-stripe-r" />
          </div>
          <SignInButton label={t.signInGoogle} busyLabel={t.signInRedirecting} />
          {err && <p className="fld-alert">{err}</p>}
          <p className="fld-mut fld-signin-foot">{t.signInFoot}</p>
        </div>
      </div>
    </FieldI18n>
  );
}
