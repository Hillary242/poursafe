"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/app/I18n";
import { Notifications } from "@/app/Notifications";
import type { FieldLang } from "@/lib/fieldI18n";

/**
 * THE MENU (her ask, 15 Nov): the top bar keeps just the wordmark and ☰.
 * Language, phone notifications and sign out live in here, out of the way
 * of the work. Closes on a tap outside, on Escape, and when the page changes.
 */
export function Menu({ lang, who, director, publicKey }: {
  lang: FieldLang; who: string; director: boolean; publicKey: string;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const path = usePathname();

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const out = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", out);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", out); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="fld-menu" ref={box}>
      <button type="button" className="fld-menu-btn" aria-label={t.menu} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div className="fld-menu-panel" role="dialog" aria-label={t.menu}>
          {who && <div className="fld-menu-who">{who}</div>}
          <Notifications director={director} publicKey={publicKey} />
          <form action="/auth/signout" method="post">
            <button className="fld-big ghost fld-menu-out" type="submit">{t.signOut}</button>
          </form>
        </div>
      )}
    </div>
  );
}
