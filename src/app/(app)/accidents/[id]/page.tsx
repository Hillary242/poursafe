import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { session } from "@/lib/session";
import type { FieldAccident, FieldFile, FieldStatement } from "@/lib/field";
import { CaseFile } from "./CaseFile";
import { fieldJobs } from "@/lib/fieldJobs";
import { withHeldLinks } from "@/lib/heldPhotos";

/**
 * One field report's case file. RLS decides whether it comes back at all:
 * the foreman who filed it, or a Safety Director. No company is read or
 * shown here — the field app names none (14 Nov).
 */
export default async function FieldAccidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await session();
  const supabase = await createClient();
  const { data: a } = await supabase.from("accidents").select("*").eq("id", id).maybeSingle();
  if (!a || !a.field_status) notFound();

  const [{ data: st }, { data: files }, jobs] = await Promise.all([
    supabase.from("accident_witnesses").select("*").eq("accident_id", id).order("sort_no").order("created_at"),
    supabase.from("accident_files")
      .select("id, name, kind, drive_status, drive_file_id, drive_url, drive_source_url, held_path, uploaded_at")
      .eq("accident_id", id).in("kind", ["photo", "statement"]).order("uploaded_at"),
    fieldJobs(supabase, user!.id),
  ]);

  return (
    <CaseFile
      a={a as FieldAccident}
      statements={(st ?? []) as FieldStatement[]}
      files={await withHeldLinks(supabase, (files ?? []) as FieldFile[])}
      jobName={jobs.find((j) => j.id === a.project_id)?.name ?? ""}
      mine={a.reported_by === user!.id}
    />
  );
}
