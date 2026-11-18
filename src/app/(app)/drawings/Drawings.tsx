"use client";

import Link from "next/link";
import { LOCALE, useT } from "@/app/I18n";

export type Drawing = { id: string; title: string; file_path: string; file_name: string; mime: string | null; uploaded_at: string };

/**
 * The site's current safety drawings — tap to open. View only: adding,
 * replacing and removing drawings is a desktop job in the office app (her
 * rule, 15 Nov), never on the phone. Each opens in PourSafe's own viewer:
 * Android doesn't show a PDF link in the browser (18 Nov).
 */
export function Drawings({ list }: { list: Drawing[] }) {
  const { t, lang } = useT();
  return (
    <>
      {list.length === 0 && <p className="fld-mut">{t.drawingsNone}</p>}
      {list.map((d) => (
        <Link key={d.id} href={`/drawings/${d.id}`} className="fld-row fld-drawing">
          <span className="fld-drawing-ic" aria-hidden>{d.mime?.startsWith("image/") ? "🖼" : "📄"}</span>
          <span className="fld-drawing-txt">
            <b>{d.title}</b>
            <span className="fld-mut">{t.drawUpdated(new Date(d.uploaded_at).toLocaleDateString(LOCALE[lang], { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" }))}</span>
          </span>
          <span className="fld-chev" aria-hidden>›</span>
        </Link>
      ))}
    </>
  );
}
