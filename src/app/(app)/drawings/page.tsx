import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { session } from "@/lib/session";
import { fieldDict } from "@/lib/fieldLang";
import { fieldJobs } from "@/lib/fieldJobs";
import { currentSite } from "@/lib/site";
import { Drawings, type Drawing } from "./Drawings";

/**
 * SAFETY DRAWINGS for the site picked on the home screen (0267, 15 Nov): the
 * current set; each opens in PourSafe's own viewer (drawings/[id]). View only —
 * drawings are added on the desktop, in the office app (her rule, 15 Nov).
 */
export default async function SafetyDrawings() {
  const { user } = await session();
  const supabase = await createClient();
  const [{ t }, jobs] = await Promise.all([fieldDict(), fieldJobs(supabase, user!.id)]);
  const site = await currentSite(jobs);
  if (!site) redirect("/");
  const { data: rows } = await supabase.from("poursafe_drawings")
    .select("id, title, file_path, file_name, mime, uploaded_at")
    .eq("project_id", site.id).is("replaced_by", null).is("retired_at", null)
    .order("title");
  const list = (rows ?? []) as Drawing[];

  return (
    <>
      <div className="fld-head">
        <Link href="/" className="fld-back" aria-label={t.back}>‹</Link>
        <h1 className="fld-h1">{t.secDrawings}</h1>
      </div>
      <Drawings list={list} />
    </>
  );
}
