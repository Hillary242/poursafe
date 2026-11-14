import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fmtWhen, type FieldStatus } from "@/lib/field";
import { fieldDict } from "@/lib/fieldLang";
import { fieldJobs } from "@/lib/fieldJobs";
import { session } from "@/lib/session";

const LOC = { en: "en-US", es: "es-US", pt: "pt-BR" } as const;

/**
 * The Safety Director's queue: every job's field reports waiting for review,
 * then the ones sent back and the recently signed off, for reference.
 */
export default async function ReviewQueue() {
  const supabase = await createClient();
  const { data: director } = await supabase.rpc("is_safety_director");
  if (director !== true) notFound();

  const { user } = await session();
  const [{ t, lang }, { data: rows }, projects] = await Promise.all([
    fieldDict(),
    supabase.from("accidents")
      .select("id, case_no, field_status, person_name, occurred_on, project_id, kind, supervisor_name, submitted_at, reviewed_at")
      .in("field_status", ["submitted", "returned", "reviewed", "draft"])
      .order("submitted_at", { ascending: false, nullsFirst: false }).limit(200),
    // A Safety Director need not be a member of the job — names come through 0263.
    fieldJobs(supabase, user!.id),
  ]);
  const job = new Map(projects.map((p) => [p.id, p.name]));
  const groups: { status: FieldStatus; title: string }[] = [
    { status: "submitted", title: t.groupWaiting },
    { status: "returned", title: t.groupReturned },
    { status: "draft", title: t.groupDraft },
    { status: "reviewed", title: t.groupReviewed },
  ];

  return (
    <>
      <div className="fld-head">
        <Link href="/" className="fld-back" aria-label={t.back}>‹</Link>
        <h1 className="fld-h1">{t.reviewTitle}</h1>
      </div>
      {groups.map((g) => {
        const list = (rows ?? []).filter((r) => r.field_status === g.status).slice(0, g.status === "reviewed" ? 20 : 200);
        if (!list.length && g.status !== "submitted") return null;
        return (
          <section key={g.status}>
            <h2 className="fld-h2">{g.title} ({list.length})</h2>
            {list.length === 0 && <p className="fld-mut">{t.nothingWaiting}</p>}
            {list.map((r) => (
              <Link key={r.id} href={g.status === "draft" ? `/accidents/${r.id}` : `/review/${r.id}`} className="fld-row">
                <span className={`fld-st ${r.field_status}`}>{t.status[r.field_status]}</span>
                <b>{r.person_name || t.unnamed}{r.kind === "near_miss" ? ` · ${t.nearMiss}` : ""}</b>
                <span className="fld-mut">
                  {r.case_no} · {job.get(r.project_id ?? "") ?? t.noJob} · {t.by} {r.supervisor_name ?? "—"}
                  {r.submitted_at ? ` · ${t.sent} ${fmtWhen(r.submitted_at, LOC[lang])}` : ""}
                </span>
              </Link>
            ))}
          </section>
        );
      })}
    </>
  );
}
