import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * FILING TO DRIVE — PourSafe's own copy of the Ops Tracker's safety filing
 * (safety/importActions + lib/safety), so the two apps can be pulled apart
 * later without untangling shared code.
 *
 * Nothing here talks to Drive. A file's bytes are in private storage
 * (safety-uploads); this works out WHERE it belongs — the company's safety
 * folder, the accident's own folder inside it, the subfolder for its kind —
 * and what to call it, and records that as an accident_files row the
 * submittals@ Apps Script picks up and copies. Same rows, same names, same
 * folders as the office app, because it is the same script.
 *
 * Plain server functions, not server actions: they take a database client and
 * are only called from actions.ts.
 */

type Supa = Awaited<ReturnType<typeof createClient>>;
export type Result = { ok: boolean; error?: string; id?: string; note?: string };

const ROOT = () => process.env.SAFETY_DRIVE_FOLDER_ID || "";

/** A Drive folder id from a pasted link or a bare id; null if neither. */
export function driveFolderId(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  const m = s.match(/\/folders\/([A-Za-z0-9_-]{10,})/)
    ?? s.match(/[?&]id=([A-Za-z0-9_-]{10,})/)
    ?? s.match(/\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]{10,})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{10,}$/.test(s) ? s : null;
}

const KIND_WORD: Record<string, string> = {
  report: "Report", photo: "Photo", statement: "Statement",
  medical: "Medical", carrier: "Carrier", map: "Map", other: "File",
};

/** CASE # - NAME - KIND.ext — her convention, as the office app names them. */
export const accidentFileName = (
  a: { occurred_on: string | null; case_no: string | null; person_name: string | null },
  kind: string, original: string, seq = 1,
) => {
  const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  const dot = original.lastIndexOf(".");
  const ext = dot > 0 && original.length - dot <= 6 ? original.slice(dot).toLowerCase() : "";
  const stem = [
    a.case_no ?? ((a.occurred_on ?? "").slice(0, 10) || "undated"),
    safe(a.person_name ?? "Unnamed"),
    KIND_WORD[kind] ?? "File",
  ].join(" - ");
  return `${stem}${seq > 1 ? ` ${seq}` : ""}${ext}`;
};

/** CASE - NAME - JOB: an accident's folder name, for its FIRST file only. */
export const folderName = (a: { occurred_on: string | null; case_no: string | null; person_name: string | null }, project: string | null) => {
  const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, "-").trim();
  return [
    a.case_no ?? ((a.occurred_on ?? "").slice(0, 10) || "undated"),
    safe(a.person_name ?? "Unnamed"),
    safe(project ?? "No job"),
  ].join(" - ");
};

/** The folder an accident's earlier files went to, so one accident never splits across two. */
export function accidentFolder(
  had: { drive_folder_url: string | null; drive_path: string | null; drive_status: string | null; uploaded_at: string | null }[],
  companyFolder: string, legacyFolderId: string | null, fresh: string,
): { root: string; folder: string } {
  const sameRoot = (u: string | null) => driveFolderId(u) !== null && driveFolderId(u) === driveFolderId(companyFolder);
  const earlier = had
    .filter((f) => sameRoot(f.drive_folder_url) && (f.drive_path ?? "").trim())
    .sort((x, y) =>
      Number(y.drive_status === "filed") - Number(x.drive_status === "filed")
      || String(x.uploaded_at ?? "").localeCompare(String(y.uploaded_at ?? "")));
  const first = earlier[0]?.drive_path?.split(" / ")[0]?.trim();
  if (first) return { root: companyFolder, folder: first };
  const legacy = (legacyFolderId ?? "").trim();
  if (legacy) return { root: `https://drive.google.com/drive/folders/${legacy}`, folder: "" };
  return { root: companyFolder, folder: fresh };
}

/** Where a file goes and what it is called. */
async function planFiling(
  supabase: Supa, accidentId: string, kind: string, rawName: string, excludeFileId?: string,
): Promise<{ ok: false; error: string } | { ok: true; acc: { id: string }; name: string; root: string; path: string }> {
  const { data: acc } = await supabase.from("accidents")
    .select("id, case_no, occurred_on, person_name, project_id, company_id, drive_folder_id")
    .eq("id", accidentId).maybeSingle();
  if (!acc) return { ok: false, error: "That report isn't yours to add to." };

  const [{ data: co }, jobName] = await Promise.all([
    acc.company_id
      ? supabase.from("payroll_companies").select("safety_folder_id, name, legal_name").eq("id", acc.company_id).maybeSingle()
      : Promise.resolve({ data: null as { safety_folder_id: string | null; name: string; legal_name: string | null } | null }),
    // Names only (0263): a crew member can't read the projects table itself.
    acc.project_id
      ? supabase.rpc("field_job_names").then(({ data }) =>
          ((data ?? []) as { id: string; name: string }[]).find((j) => j.id === acc.project_id)?.name ?? null)
      : Promise.resolve(null),
  ]);

  const folder = (co?.safety_folder_id as string | null) || ROOT();
  if (!driveFolderId(folder)) {
    return { ok: false, error:
      `No Drive folder for ${co?.legal_name || co?.name || "that company"} yet — the office sets one under Safety → Drive filing.` };
  }
  const { data: kindPath } = await supabase.from("safety_filing_paths").select("path").eq("kind", kind).maybeSingle();
  const { data: hadAll } = await supabase.from("accident_files")
    .select("id, drive_name, drive_folder_url, drive_path, drive_status, uploaded_at").eq("accident_id", acc.id);
  const had = (hadAll ?? []).filter((r: any) => r.id !== excludeFileId && r.drive_status !== "held");
  const taken = new Set(had.map((r: any) => r.drive_name).filter(Boolean));
  let name = accidentFileName(acc as any, kind, rawName);
  if (taken.has(name)) {
    let n = 2;
    while (n < 200 && taken.has(accidentFileName(acc as any, kind, rawName, n))) n++;
    name = accidentFileName(acc as any, kind, rawName, n);
  }
  const where = accidentFolder(had as any[], folder, (acc as any).drive_folder_id ?? null, folderName(acc as any, jobName));
  return {
    ok: true, acc: { id: acc.id as string }, name, root: where.root,
    path: [where.folder, (kindPath?.path ?? "").trim()].filter(Boolean).join(" / "),
  };
}

/** Queue a file in private storage for the script to copy to Drive. */
export async function queueAccidentFile(supabase: Supa, input: {
  accidentId: string; path: string; name: string; mime: string | null; size: number | null; kind: string;
}): Promise<Result> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const plan = await planFiling(supabase, input.accidentId, input.kind, input.name);
  if (!plan.ok) return { ok: false, error: plan.error };
  const { data: signed, error: se } = await supabase.storage
    .from("safety-uploads").createSignedUrl(input.path, 7 * 24 * 3600);
  if (se || !signed?.signedUrl) return { ok: false, error: se?.message ?? "Couldn't prepare the file for filing." };
  const { data, error } = await supabase.from("accident_files").insert({
    accident_id: plan.acc.id, name: plan.name, mime: input.mime, size_bytes: input.size, kind: input.kind,
    uploaded_by: user.id, drive_status: "waiting", drive_source_url: signed.signedUrl,
    drive_folder_url: plan.root, drive_path: plan.path, drive_name: plan.name,
  }).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id as string | undefined, note: plan.name };
}

/** Send a report's held files to Drive, once the company is set (0261). */
export async function releaseHeldAccidentFiles(supabase: Supa, accidentId: string): Promise<Result> {
  const { data: held } = await supabase.from("accident_files")
    .select("id, name, kind, held_path").eq("accident_id", accidentId).eq("drive_status", "held").order("uploaded_at");
  const failed: string[] = [];
  for (const f of (held ?? []) as { id: string; name: string; kind: string; held_path: string | null }[]) {
    if (!f.held_path) { failed.push(f.name); continue; }
    const plan = await planFiling(supabase, accidentId, f.kind, f.name, f.id);
    if (!plan.ok) return { ok: false, error: plan.error };
    const { data: signed } = await supabase.storage.from("safety-uploads").createSignedUrl(f.held_path, 7 * 24 * 3600);
    if (!signed?.signedUrl) { failed.push(f.name); continue; }
    const { error } = await supabase.rpc("field_release_file", {
      p_file: f.id, p_name: plan.name, p_folder_url: plan.root, p_path: plan.path, p_source_url: signed.signedUrl,
    });
    if (error) failed.push(`${f.name} (${error.message})`);
  }
  return failed.length ? { ok: false, error: `Couldn't send to Drive: ${failed.join(", ")}` } : { ok: true };
}
