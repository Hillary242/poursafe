"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fieldJobs } from "@/lib/fieldJobs";
import { currentSite } from "@/lib/site";
import { CARRY_FROM_ME, CARRY_FROM_SITE, DAY_FRESH, INSPECTION_TICK, POUR_SECTION, formDef, type Answers } from "@/lib/forms";
import { formPdf } from "@/lib/forms/pdf";

type Result = { ok: boolean; error?: string; id?: string; note?: string };

/** Today in New York — the site's day, whatever the server's clock says. */
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

/**
 * START A FORM on the site picked in the header (0268). The Daily Log is one
 * per CSM per site per day — starting it again opens today's. What the app
 * already knows is filled in (her choices): stories, floors and the competent
 * person from the last Daily Log on this site; the CSM's name and
 * registration number from their own last log.
 */
export async function startForm(key: string, opts: { fromLast?: boolean } = {}): Promise<Result> {
  const def = formDef(key);
  if (!def) return { ok: false, error: "Unknown form." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Signed out." };
  const site = await currentSite(await fieldJobs(supabase, user.id));
  if (!site) return { ok: false, error: "Pick your site first." };
  const day = today();

  if (def.oncePerDay) {
    const { data: open } = await supabase.from("poursafe_forms").select("id")
      .eq("filled_by", user.id).eq("project_id", site.id).eq("form_key", key).eq("form_date", day).limit(1).maybeSingle();
    if (open) return { ok: true, id: open.id };
  }

  const answers: Answers = {};
  const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
  const name = profile?.full_name || profile?.email || "";
  if (key === "daily_log") {
    const [{ data: lastHere }, { data: lastMine }] = await Promise.all([
      supabase.from("poursafe_forms").select("answers, form_date").eq("form_key", "daily_log").eq("project_id", site.id)
        .eq("status", "submitted").order("form_date", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("poursafe_forms").select("answers").eq("form_key", "daily_log").eq("filled_by", user.id)
        .eq("status", "submitted").order("form_date", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const here = (lastHere?.answers ?? {}) as Answers, mine = (lastMine?.answers ?? {}) as Answers;
    // From the last log: the whole thing, less what is about today and the
    // concrete section, which "Are you pouring concrete today?" sets.
    if (opts.fromLast && lastHere) {
      const pour = new Set(def.sections.find((s) => s.id === POUR_SECTION)?.items.map((i) => i.id) ?? []);
      for (const [k, v] of Object.entries(here)) if (!DAY_FRESH.has(k) && !pour.has(k) && !k.startsWith("__") && k !== "pour_today") answers[k] = v;
      answers.__from = lastHere.form_date;
    }
    for (const k of CARRY_FROM_SITE) if (here[k] != null) answers[k] = here[k];
    for (const k of CARRY_FROM_ME) if (mine[k] != null) answers[k] = mine[k];
    answers.csm_name ??= name;
  }

  const { data, error } = await supabase.from("poursafe_forms")
    .insert({ project_id: site.id, form_key: key, form_date: day, answers, filled_by: user.id, filled_name: name })
    .select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/forms");
  return { ok: true, id: data!.id };
}

/** Saved as the CSM goes — a draft's answers (and date) only; RLS and 0268's lock hold the rest. */
export async function saveForm(input: { id: string; answers: Answers; date?: string }): Promise<Result> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { answers: input.answers };
  if (input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date)) patch.form_date = input.date;
  const { data, error } = await supabase.from("poursafe_forms").update(patch).eq("id", input.id).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "That didn't save — the form may already be submitted." };
  return { ok: true };
}

let fontCache: { regular: Uint8Array; bold: Uint8Array } | null = null;
async function fonts() {
  if (fontCache) return fontCache;
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const dir = join(process.cwd(), "public", "fonts");
  fontCache = {
    regular: new Uint8Array(await readFile(join(dir, "LiberationSans-Regular.ttf"))),
    bold: new Uint8Array(await readFile(join(dir, "LiberationSans-Bold.ttf"))),
  };
  return fontCache;
}

/**
 * SIGN AND SUBMIT: the final answers saved, the Daily Log's section 9 ticked
 * for today's filed forms, the signed PDF made and put in private storage,
 * and the form locked and queued for the job's Drive folder (0268).
 */
export async function submitForm(input: { id: string; answers: Answers; png: string; name: string }): Promise<Result> {
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(input.png) || input.png.length > 600_000) return { ok: false, error: "That signature didn't come through — try again." };
  if (!input.name.trim()) return { ok: false, error: "Print your name." };
  const supabase = await createClient();
  const { data: f } = await supabase.from("poursafe_forms").select("*").eq("id", input.id).maybeSingle();
  if (!f) return { ok: false, error: "Form not found." };
  if (f.status !== "draft") return { ok: false, error: "That form is already submitted." };
  const def = formDef(f.form_key);
  if (!def) return { ok: false, error: "Unknown form." };

  const answers: Answers = { ...input.answers };
  if (f.form_key === "daily_log") {
    const { data: filed } = await supabase.from("poursafe_forms").select("form_key")
      .eq("project_id", f.project_id).eq("form_date", f.form_date).eq("status", "submitted");
    const ticks = new Set<string>(Array.isArray(answers["9"]) ? (answers["9"] as string[]) : []);
    for (const r of filed ?? []) if (INSPECTION_TICK[r.form_key]) ticks.add(INSPECTION_TICK[r.form_key]);
    answers["9"] = [...ticks];
  }
  const saved = await saveForm({ id: f.id, answers });
  if (!saved.ok) return saved;

  const jobs = await fieldJobs(supabase, f.filled_by);
  const project = jobs.find((j) => j.id === f.project_id)?.name ?? "";
  const signedAt = new Date().toISOString();
  let bytes: Uint8Array;
  try {
    bytes = await formPdf({
      def, answers, project, date: f.form_date, filledBy: input.name.trim(),
      sigPng: input.png, sigName: input.name.trim(), signedAt, formId: f.id,
    }, await fonts());
  } catch (e) {
    return { ok: false, error: `The PDF couldn't be made: ${(e as Error).message}` };
  }
  const path = `${f.project_id}/${f.id}.pdf`;
  const { error: ue } = await supabase.storage.from("poursafe-forms").upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (ue && !/exists/i.test(ue.message)) return { ok: false, error: `The PDF didn't upload: ${ue.message}` };
  const { data: signed } = await supabase.storage.from("poursafe-forms").createSignedUrl(path, 7 * 24 * 3600);
  const fileName = `${f.form_date} ${def.short}${project ? ` - ${project}` : ""} - ${input.name.trim()}.pdf`.replace(/[\\/:*?"<>|]+/g, "-");

  const { data: status, error } = await supabase.rpc("poursafe_submit_form", {
    p_form: f.id, p_png: input.png, p_name: input.name.trim(), p_pdf_path: path,
    p_source_url: signed?.signedUrl ?? null, p_file_name: fileName, p_folder_name: def.short,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/forms"); revalidatePath(`/forms/${f.id}`);
  return { ok: true, note: status === "no_folder" ? "no_folder" : undefined };
}
