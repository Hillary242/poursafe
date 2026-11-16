import { cookies } from "next/headers";
import type { FieldJob } from "@/lib/fieldJobs";

/**
 * THE SITE the CSM is working on (her design, 15 Nov): picked at the top of
 * the home screen, remembered on the phone, and it filters everything —
 * incident reports, daily forms, safety drawings — and a new report starts on
 * it. Only a site this person may report on counts; anything else is ignored.
 */
export const SITE_COOKIE = "ps_site";

export async function currentSite(jobs: FieldJob[]): Promise<FieldJob | null> {
  const mine = jobs.filter((j) => j.canReport && (!j.status || !/closed|complete|archiv/i.test(j.status)));
  const id = (await cookies()).get(SITE_COOKIE)?.value;
  return mine.find((j) => j.id === id) ?? (mine.length === 1 ? mine[0] : null);
}

/** The sites this person can pick from: the jobs they may report on, open ones. */
export const pickableSites = (jobs: FieldJob[]) =>
  jobs.filter((j) => j.canReport && (!j.status || !/closed|complete|archiv/i.test(j.status)));
