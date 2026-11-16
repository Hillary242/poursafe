"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FIELD_LANG_COOKIE, type FieldLang } from "@/lib/fieldI18n";
import { useT } from "@/app/I18n";

/** Each language in its own words, so a crew member finds theirs whatever the screen is in. */
export const LANG_NAMES: { code: FieldLang; name: string }[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
];

/** Remember the choice on this phone for a year (a cookie, so the server draws the next page right). */
export function useSetLang() {
  const router = useRouter();
  return (code: FieldLang) => {
    document.cookie = `${FIELD_LANG_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
}

/** Two speech bubbles, "Hi" and "Olá" — her pick (15 Nov): a conversation between languages. */
export function LangIcon() {
  return (
    <svg className="fld-langicon" width="26" height="21" viewBox="0 0 32 26" aria-hidden="true">
      {/* "Hi": orange, tail bottom-left */}
      <path d="M3 1h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8l-4 3v-3H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z"
        fill="none" stroke="#F26B1D" strokeWidth="1.6" strokeLinejoin="round" />
      <text x="4.6" y="9.4" fontSize="7" fontWeight="700" fill="#F26B1D" fontFamily="Inter, sans-serif">Hi</text>
      {/* "Olá": in front, tail bottom-right; filled with the background so it overlaps cleanly */}
      <path d="M15 10h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2v3l-4-3h-8a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"
        fill="var(--langicon-bg, #1F2124)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <text x="16.4" y="18.4" fontSize="7" fontWeight="700" fill="currentColor" fontFamily="Inter, sans-serif">Olá</text>
    </svg>
  );
}

/**
 * THE LANGUAGE BUTTON in the top bar: the bubbles and the current code; tap
 * for the three languages. Always in sight, so nobody has to know the menu
 * holds it (her ask, 15 Nov).
 */
export function LangButton({ lang }: { lang: FieldLang }) {
  const { t } = useT();
  const setLang = useSetLang();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", out);
    return () => document.removeEventListener("pointerdown", out);
  }, [open]);
  return (
    <div className="fld-langbtn-wrap" ref={box}>
      <button type="button" className="fld-langbtn" aria-label={t.language} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <LangIcon />
        <span>{lang.toUpperCase()}</span>
      </button>
      {open && (
        <div className="fld-langlist" role="listbox" aria-label={t.language}>
          {LANG_NAMES.map((l) => (
            <button key={l.code} type="button" role="option" aria-selected={l.code === lang} className={l.code === lang ? "on" : ""}
              onClick={() => { setOpen(false); if (l.code !== lang) setLang(l.code); }}>
              {l.name}{l.code === lang ? " ✓" : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * FIRST OPEN: the language, asked once in all three languages, before anything
 * else — so every crew member starts in their own. Remembered on the phone.
 */
export function LangChooser() {
  const setLang = useSetLang();
  return (
    <div className="fld-card fld-chooser">
      <LangIcon />
      <h2>Choose your language<br /><span>Elija su idioma · Escolha seu idioma</span></h2>
      {LANG_NAMES.map((l) => (
        <button key={l.code} type="button" className="fld-big ghost" onClick={() => setLang(l.code)}>{l.name}</button>
      ))}
    </div>
  );
}
