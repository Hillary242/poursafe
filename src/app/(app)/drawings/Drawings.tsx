"use client";

import { LOCALE, useT } from "@/app/I18n";

export type Drawing = { id: string; title: string; file_path: string; file_name: string; mime: string | null; uploaded_at: string; url: string | null };

/**
 * The site's current safety drawings — tap to open. View only: adding,
 * replacing and removing drawings is a desktop job in the office app (her
 * rule, 15 Nov), never on the phone.
 */
export function Drawings({ list }: { list: Drawing[] }) {
  const { t, lang } = useT();
  return (
    <>
      {list.length === 0 && <p className="fld-mut">{t.drawingsNone}</p>}
      {list.map((d) => (
        <a key={d.id} href={d.url ?? undefined} target="_blank" rel="noreferrer" className="fld-row fld-drawing">
          <span className="fld-drawing-ic" aria-hidden>{d.mime?.startsWith("image/") ? "🖼" : "📄"}</span>
          <span className="fld-drawing-txt">
            <b>{d.title}</b>
            <span className="fld-mut">{t.drawUpdated(new Date(d.uploaded_at).toLocaleDateString(LOCALE[lang], { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" }))}</span>
          </span>
          <span className="fld-chev" aria-hidden>›</span>
        </a>
      ))}
    </>
  );
}
