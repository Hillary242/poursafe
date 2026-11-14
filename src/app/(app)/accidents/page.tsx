import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { session } from "@/lib/session";
import { fieldDict } from "@/lib/fieldLang";
import { fieldJobs } from "@/lib/fieldJobs";

/** The foreman's own field reports: open ones first, reviewed ones kept read-only. */
export default async function MyAccidents() {
  const { user } = await session();
  const supabase = await createClient();
  const [{ t }, { data: rows }, projects] = await Promise.all([
    fieldDict(),
    supabase.from("accidents")
      .select("id, case_no, field_status, person_name, occurred_on, project_id, kind")
      .eq("reported_by", user!.id).not("field_status", "is", null)
      .order("created_at", { ascending: false }),
    // Job NAMES only (0263): a crew member on PourSafe job access can read nothing else about a job.
    fieldJobs(supabase, user!.id),
  ]);
  const job = new Map(projects.map((p) => [p.id, p.name]));
  const order: Record<string, number> = { returned: 0, draft: 1, submitted: 2, reviewed: 3 };
  const list = [...(rows ?? [])].sort((a, b) => (order[a.field_status] ?? 9) - (order[b.field_status] ?? 9));

  return (
    <>
      <div className="fld-head">
        <Link href="/" className="fld-back" aria-label={t.back}>‹</Link>
        <h1 className="fld-h1">{t.myReports}</h1>
      </div>
      <Link href="/accidents/new" className="fld-big">+ {t.reportAccident}</Link>
      {list.length === 0 && <p className="fld-mut">{t.noneStarted}</p>}
      {list.map((r) => (
        <Link key={r.id} href={`/accidents/${r.id}`} className="fld-row">
          <span className={`fld-st ${r.field_status}`}>{t.status[r.field_status]}</span>
          <b>{r.person_name || t.unnamed}{r.kind === "near_miss" ? ` · ${t.nearMiss}` : ""}</b>
          <span className="fld-mut">{r.case_no} · {job.get(r.project_id ?? "") ?? t.noJob} · {r.occurred_on ?? t.noDate}</span>
        </Link>
      ))}
    </>
  );
}
