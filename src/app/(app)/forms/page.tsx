import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { session } from "@/lib/session";
import { fieldDict } from "@/lib/fieldLang";
import { fieldJobs } from "@/lib/fieldJobs";
import { currentSite } from "@/lib/site";
import { FORMS, formDef, progress, type Answers } from "@/lib/forms";
import { StartButtons } from "./StartButtons";

/**
 * DAILY FORMS for the site in the header (0268): start one of the CSM's
 * forms, and this site's forms from the last two weeks — the CSM's own, or
 * everyone's for a Safety Director (her rule: they see all).
 */
export default async function DailyForms() {
  const { user } = await session();
  const supabase = await createClient();
  const [{ t }, jobs, { data: director }] = await Promise.all([
    fieldDict(), fieldJobs(supabase, user!.id), supabase.rpc("is_safety_director"),
  ]);
  const site = await currentSite(jobs);
  if (!site) redirect("/");
  const since = new Date(Date.now() - 14 * 864e5).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  let q = supabase.from("poursafe_forms")
    .select("id, form_key, form_date, status, answers, filled_by, filled_name, submitted_at, drive_status")
    .eq("project_id", site.id).gte("form_date", since)
    .order("form_date", { ascending: false }).order("created_at", { ascending: false });
  if (director !== true) q = q.eq("filled_by", user!.id);
  const { data: rows } = await q;
  const list = rows ?? [];
  const todaysLog = list.find((r) => r.form_key === "daily_log" && r.form_date === today && r.filled_by === user!.id);

  return (
    <>
      <div className="fld-head">
        <Link href="/" className="fld-back" aria-label={t.back}>‹</Link>
        <h1 className="fld-h1">{t.secForms}</h1>
      </div>
      <StartButtons forms={FORMS.map((f) => ({ key: f.key, short: f.short }))}
        todaysLog={todaysLog ? { id: todaysLog.id, submitted: todaysLog.status === "submitted" } : null} />

      <h2 className="fld-h2">{t.formsRecent}</h2>
      {list.length === 0 && <p className="fld-mut">{t.formsNone}</p>}
      {list.map((r) => {
        const def = formDef(r.form_key);
        if (!def) return null;
        const p = progress(def, (r.answers ?? {}) as Answers);
        return (
          <Link key={r.id} href={`/forms/${r.id}`} className="fld-row">
            <span className={`fld-st ${r.status === "submitted" ? "reviewed" : "draft"}`}>
              {r.status === "submitted" ? t.formSubmitted : t.formDraft}
            </span>
            <b>{def.short}</b>
            <span className="fld-mut">
              {r.form_date}
              {r.status === "draft" ? ` · ${t.formProgress(p.done, p.total)}` : ""}
              {r.filled_by !== user!.id && r.filled_name ? ` · ${r.filled_name}` : ""}
              {r.status === "submitted" ? ` · ${r.drive_status === "filed" ? t.inDrive : r.drive_status === "no_folder" ? t.formNoFolder : r.drive_status === "failed" ? t.formDriveFailed : t.sending}` : ""}
            </span>
          </Link>
        );
      })}
    </>
  );
}
