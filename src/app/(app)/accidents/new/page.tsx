import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { session } from "@/lib/session";
import { fieldDict } from "@/lib/fieldLang";
import { fieldJobs } from "@/lib/fieldJobs";
import { NewReport } from "./NewReport";

/**
 * Start a report: which job, what kind, when, who.
 *
 * No company: the field app names none (her rule, 14 Nov). The Safety
 * Director sets the injured person's company at review (0261).
 *
 * The jobs offered are the ones this person may report on — as a job member,
 * or on PourSafe job access, which is not job membership (0263). The same
 * test field_start_report makes.
 */
export default async function NewAccident() {
  const { user } = await session();
  const supabase = await createClient();
  const [{ t }, all] = await Promise.all([fieldDict(), fieldJobs(supabase, user!.id)]);
  const jobs = all.filter((j) => j.canReport && (!j.status || !/closed|complete|archiv/i.test(j.status)))
    .map((j) => ({ id: j.id, name: j.name }));

  return (
    <>
      <div className="fld-head">
        <Link href="/" className="fld-back" aria-label={t.back}>‹</Link>
        <h1 className="fld-h1">{t.reportAccident}</h1>
      </div>
      {jobs.length === 0 ? (
        <div className="fld-card">
          <h2>{t.notOnJobsTitle}</h2>
          <p className="fld-mut">{t.notOnJobsBody}</p>
        </div>
      ) : <NewReport jobs={jobs} />}
    </>
  );
}
