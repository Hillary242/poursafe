import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fieldDict } from "@/lib/fieldLang";
import { LOCALE_OF } from "@/lib/locale";
import { PdfPages } from "@/app/PdfPages";

/**
 * ONE SAFETY DRAWING, shown inside PourSafe (18 Nov: drawings weren't opening
 * on Android). A plain link to a PDF does nothing useful there — Chrome on
 * Android won't show a PDF in the browser, least of all in the home-screen
 * app — so the pages are drawn here, the same way a signed form is. The link
 * is made fresh on every open, so a page left open all day still works, and
 * the download link underneath is there for anyone who wants the file itself.
 * Which drawings a person can see is the database's call (0267).
 */
export default async function DrawingView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ t, lang }, { data: d }] = await Promise.all([
    fieldDict(),
    supabase.from("poursafe_drawings").select("id, title, file_path, file_name, mime, uploaded_at").eq("id", id).maybeSingle(),
  ]);
  if (!d) notFound();
  const bucket = supabase.storage.from("poursafe-drawings");
  const [{ data: view }, { data: dl }] = await Promise.all([
    bucket.createSignedUrl(d.file_path, 60 * 60),
    bucket.createSignedUrl(d.file_path, 60 * 60, { download: d.file_name || true }),
  ]);
  const isImage = d.mime?.startsWith("image/") ?? /\.(png|jpe?g|gif|webp)$/i.test(d.file_name ?? "");
  const isPdf = !isImage && (d.mime === "application/pdf" || /\.pdf$/i.test(d.file_name ?? d.file_path));
  const updated = new Date(d.uploaded_at).toLocaleDateString(LOCALE_OF[lang], { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <div className="fld-head">
        <Link href="/drawings" className="fld-back" aria-label={t.back}>‹</Link>
        <h1 className="fld-h1 fld-drawview-h">{d.title}</h1>
      </div>
      <p className="fld-mut fld-drawview-meta">{t.drawUpdated(updated)}{isPdf || isImage ? ` · ${t.drawZoom}` : ""}</p>

      {view?.signedUrl && isPdf && <PdfPages url={view.signedUrl} sharp loadingText={t.drawLoading} failText={t.drawFailed} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {view?.signedUrl && isImage && <img src={view.signedUrl} alt={d.title} className="fld-drawview-img" />}
      {!view?.signedUrl && <p className="fld-alert">{t.drawFailed}</p>}

      {dl?.signedUrl && <a href={dl.signedUrl} className="fld-link fld-drawview-dl">{t.drawDownload}</a>}
    </>
  );
}
