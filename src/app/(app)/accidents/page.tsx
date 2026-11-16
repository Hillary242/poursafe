import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { session } from "@/lib/session";
import { fieldDict } from "@/lib/fieldLang";
import { fieldJobs } from "@/lib/fieldJobs";
import { currentSite } from "@/lib/site";

/**
 * INCIDENT REPORTING for the site picked on the home screen (15 Nov): start a
 * report there, and this person's reports from that site — open ones first,
 * reviewed ones kept read-only.
 */
export default async function Incidents() {
  const { user } = await session();
  const supabase = await createClient();
  const [{ t }, jobs] = await Promise.all([fieldDict(), fieldJobs(supabase, user!.id)]);
  const site = await currentSite(jobs);
  if (!site) redirect("/");
  const { data: rows } = await supabase.from("accidents")
    .select("id, case_no, field_status, person_name, occurred_on, project_id, kind")
    .eq("reported_by", user!.id).eq("project_id", site.id).not("field_status", "is", null)
    .order("created_at", { ascending: false });
  const order: Record<string, number> = { returned: 0, draft: 1, submitted: 2, reviewed: 3 };
  const list = [...(rows ?? [])].sort((a, b) => (order[a.field_status] ?? 9) - (order[b.field_status] ?? 9));

  return (
    <>
      <div className="fld-head">
        <Link href="/" className="fld-back" aria-label={t.back}>‹</Link>
        <h1 className="fld-h1">{t.secIncidents}</h1>
      </div>
      <Link href="/accidents/new" className="fld-big">+ {t.reportAccident}</Link>
      <h2 className="fld-h2">{t.myReports}</h2>
      {list.length === 0 && <p className="fld-mut">{t.noneStarted}</p>}
      {list.map((r) => (
        <Link key={r.id} href={`/accidents/${r.id}`} className="fld-row">
          <span className={`fld-st ${r.field_status}`}>{t.status[r.field_status]}</span>
          <b>{r.person_name || t.unnamed}{r.kind === "near_miss" ? ` · ${t.nearMiss}` : ""}</b>
          <span className="fld-mut">{r.case_no} · {r.occurred_on ?? t.noDate}</span>
        </Link>
      ))}
    </>
  );
}
