"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/app/I18n";

/**
 * THE SITE, in the header on every screen (her ask, 15 Nov: "really visible
 * at the top"). The whole name shows — it wraps, and a long one is set a size
 * smaller. Tapping it opens PourSafe's own list (the browser's dropdown, in
 * system blue and system type, was "incongruous"), styled like the language
 * list. Remembered on the phone for a year; everything in PourSafe follows it.
 */
export function SitePicker({ sites, current }: { sites: { id: string; name: string }[]; current: string | null }) {
  const router = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", out);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", out); document.removeEventListener("keydown", esc); };
  }, [open]);
  if (!sites.length) return null;
  const name = sites.find((s) => s.id === current)?.name ?? t.pickSite;
  const size = name.length > 34 ? " xlong" : name.length > 22 ? " long" : "";
  const pick = (id: string) => {
    setOpen(false);
    if (id === current) return;
    document.cookie = `ps_site=${id}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <div className="fld-siteband-wrap" ref={box}>
      <button type="button" className={`fld-siteband${current ? "" : " none"}`} aria-haspopup="listbox" aria-expanded={open}
        onClick={() => setOpen((o) => !o)}>
        <span>{t.site}</span>
        <b className={`fld-sitename-big${size}`}>{name}</b>
        <i aria-hidden>{open ? "▴" : "▾"}</i>
      </button>
      {open && (
        <div className="fld-sitelist" role="listbox" aria-label={t.site}>
          {sites.map((s) => (
            <button key={s.id} type="button" role="option" aria-selected={s.id === current}
              className={s.id === current ? "on" : ""} onClick={() => pick(s.id)}>
              <span>{s.name}</span>{s.id === current && <b aria-hidden>✓</b>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
