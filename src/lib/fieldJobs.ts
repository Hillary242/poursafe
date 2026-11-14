import type { createClient } from "@/lib/supabase/server";

type Supa = Awaited<ReturnType<typeof createClient>>;
export type FieldJob = { id: string; name: string; status: string | null; canReport: boolean };

/**
 * The jobs PourSafe shows this person (0263): the ones they may report on —
 * as a job member OR on PourSafe job access, which is NOT job membership —
 * plus the jobs of reports they filed, so an old report keeps its job name.
 * A Safety Director, the Safety grant and the owner get every job.
 *
 * Names only. A crew member on PourSafe job access can read nothing else
 * about the job, and this is how the app learns what to call it.
 *
 * Before 0263 has run the function isn't there; fall back to what the person
 * can already see (their memberships), so nothing breaks in between.
 */
export async function fieldJobs(supabase: Supa, userId: string): Promise<FieldJob[]> {
  const { data, error } = await supabase.rpc("field_job_names");
  if (!error && data) {
    return (data as { id: string; name: string; status: string | null; can_report: boolean }[])
      .map((r) => ({ id: r.id, name: r.name, status: r.status, canReport: r.can_report }));
  }
  const [{ data: mine }, { data: all }, { data: safety }] = await Promise.all([
    supabase.from("project_members").select("project_id").eq("user_id", userId),
    supabase.from("projects").select("id, name, status").order("name"),
    supabase.rpc("has_safety_access"),
  ]);
  const member = new Set((mine ?? []).map((m) => m.project_id as string));
  return (all ?? []).map((p: any) => ({ id: p.id, name: p.name, status: p.status ?? null, canReport: safety === true || member.has(p.id) }));
}
