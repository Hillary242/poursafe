import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { session } from "@/lib/session";
import { fieldJobs } from "@/lib/fieldJobs";
import { INSPECTION_TICK, formDef, type Answers } from "@/lib/forms";
import { FormEditor } from "./FormEditor";

/** One daily form: filled in here while it's a draft; read-only, with its PDF, once signed. */
export default async function FormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await session();
  const supabase = await createClient();
  const { data: f } = await supabase.from("poursafe_forms").select("*").eq("id", id).maybeSingle();
  if (!f) notFound();
  const def = formDef(f.form_key);
  if (!def) notFound();
  const jobs = await fieldJobs(supabase, user!.id);

  // The Daily Log's section 9: today's forms on this site, filed or started (her choice).
  let autoTicks: string[] = [];
  if (f.form_key === "daily_log") {
    const { data: others } = await supabase.from("poursafe_forms").select("form_key, status")
      .eq("project_id", f.project_id).eq("form_date", f.form_date).neq("id", f.id).eq("status", "submitted");
    autoTicks = [...new Set((others ?? []).map((o) => INSPECTION_TICK[o.form_key]).filter(Boolean))];
  }
  const pdf = f.status === "submitted" && f.pdf_path
    ? (await supabase.storage.from("poursafe-forms").createSignedUrl(f.pdf_path, 3600)).data?.signedUrl ?? null
    : null;

  return (
    <FormEditor
      form={{
        id: f.id, form_key: f.form_key, form_date: f.form_date, status: f.status, answers: (f.answers ?? {}) as Answers,
        filled_name: f.filled_name, sig_png: f.sig_png, sig_name: f.sig_name, sig_at: f.sig_at,
        drive_status: f.drive_status, drive_url: f.drive_url,
      }}
      mine={f.filled_by === user!.id}
      site={jobs.find((j) => j.id === f.project_id)?.name ?? ""}
      autoTicks={autoTicks}
      pdfUrl={pdf}
    />
  );
}
