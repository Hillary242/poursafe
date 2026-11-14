"use client";

import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { FIELD_DICT, FIELD_LANGS, FIELD_LANG_COOKIE, type FieldDict, type FieldLang } from "@/lib/fieldI18n";

const Ctx = createContext<{ lang: FieldLang; t: FieldDict }>({ lang: "en", t: FIELD_DICT.en });

/** The field app's language, handed to every client screen inside it. */
export function FieldI18n({ lang, children }: { lang: FieldLang; children: React.ReactNode }) {
  return <Ctx.Provider value={{ lang, t: FIELD_DICT[lang] }}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);

/** Locale for dates and times in each language. */
export const LOCALE: Record<FieldLang, string> = { en: "en-US", es: "es-US", pt: "pt-BR" };

/**
 * EN / ES / PT. Remembered on the phone for a year (a cookie, so the server
 * draws the next page in the right language), and the page redrawn now.
 */
export function LangSwitch({ lang }: { lang: FieldLang }) {
  const router = useRouter();
  const { t } = useT();
  const pick = (code: FieldLang) => {
    document.cookie = `${FIELD_LANG_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <div className="fld-lang" role="group" aria-label={t.language}>
      {FIELD_LANGS.map((l) => (
        <button key={l.code} type="button" className={l.code === lang ? "on" : ""} aria-pressed={l.code === lang}
          onClick={() => pick(l.code)}>{l.label}</button>
      ))}
    </div>
  );
}
