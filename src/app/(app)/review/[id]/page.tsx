import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FieldAccident, FieldFile, FieldSignature, FieldStatement } from "@/lib/field";
import { Review } from "./Review";
import { inSafety } from "@/lib/field";
import { fieldJobs } from "@/lib/fieldJobs";
import { session } from "@/lib/session";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: director } = await supabase.rpc("is_safety_director");
  if (director !== true) notFound();
  const { data: a } = await supabase.from("accidents").select("*").eq("id", id).maybeSingle();
  if (!a || !a.field_status) notFound();

  const [{ data: st }, { data: files }, jobs, { data: cos }, { data: sigs }] = await Promise.all([
    supabase.from("accident_witnesses").select("*").eq("accident_id", id).order("sort_no").order("created_at"),
    supabase.from("accident_files")
      .select("id, name, kind, drive_status, drive_file_id, drive_url, drive_source_url, uploaded_at")
      .eq("accident_id", id).in("kind", ["photo", "statement", "report"]).order("uploaded_at"),
    (async () => { const { user } = await session(); return fieldJobs(supabase, user!.id); })(),
    // The companies the Safety Director picks the injured person's from (0261).
    supabase.from("payroll_companies").select("*").order("sort_order").order("name"),
    // The signing log (0260): every signature, with its filed PDF copy.
    supabase.from("accident_signatures")
      .select("id, accident_id, statement_id, kind, signer_name, signed_at, text_sha256, pdf_file_id")
      .eq("accident_id", id).order("signed_at"),
  ]);

  return (
    <Review
      a={a as FieldAccident}
      statements={(st ?? []) as FieldStatement[]}
      files={(files ?? []) as FieldFile[]}
      jobName={jobs.find((j) => j.id === a.project_id)?.name ?? ""}
      companies={inSafety((cos ?? []) as any[], [a.company_id]).map((c: any) => ({ id: c.id, name: c.legal_name || c.name }))}
      signatures={(sigs ?? []) as FieldSignature[]}
    />
  );
}
