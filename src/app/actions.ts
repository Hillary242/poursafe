"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queueAccidentFile, releaseHeldAccidentFiles } from "@/lib/filing";
import { PART2_ATTEST, REVIEW_ATTEST, attestFor, type FieldStatement } from "@/lib/field";
import { signedCopyPdf } from "@/lib/signedStatementPdf";
import { reviewReportPdf } from "@/lib/reviewPdf";
import { reviewCopyData } from "@/lib/reviewData";
import { notify, pushReady, sendTo } from "@/lib/push";
import { fieldDict } from "@/lib/fieldLang";

/**
 * The field app's writes (0260).
 *
 * The database decides who may do what — the policies and the field_*
 * functions — and these say so legibly when it refuses: an update RLS turns
 * away comes back as NO ROWS, not an error, which on a phone looks like the
 * save worked. So every write reads its row back.
 *
 * SIGNATURES are never written from here. The signing functions in the
 * database read the words on file, fingerprint them, stamp the time and log
 * the signature; this file only hands over the drawn mark and what the signer
 * was shown — and then files the signed PDF copy.
 */

type Result = { ok: boolean; error?: string; id?: string; note?: string };
type Supa = Awaited<ReturnType<typeof createClient>>;
const refused = "That didn't save — the report may have been submitted, or it isn't yours.";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const bump = (_id?: string) => {
  revalidatePath("/", "layout");
};
const okPng = (png: string) => /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(png) && png.length < 600_000;
const userAgent = async () => (await headers()).get("user-agent")?.slice(0, 400) ?? null;

/** No company: the Safety Director sets the injured person's at review (0261). */
export async function startReport(input: {
  projectId: string; kind: string; occurredOn: string; person: string;
}): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("field_start_report", {
    p_project: input.projectId, p_kind: input.kind,
    p_occurred_on: input.occurredOn || null, p_person: input.person,
  });
  if (error) return { ok: false, error: error.message };
  after(() => notify(supabase, data as string, "started"));
  bump();
  return { ok: true, id: data as string };
}

const BASIC_KEYS = ["kind", "occurred_on", "occurred_at", "location", "person_name", "person_kind",
  "person_employer", "what_doing", "body_parts",
  // the rest of Part One (0106 columns; asked since 15 Nov)
  "supervisor_name",   // person_title: HR's only, set by field_set_employee (0266) "told_supervisor", "witness_names", "saw_doctor", "care_type",
  "care_provider", "care_phone", "care_on", "care_at", "prior_injury", "prior_injury_when",
] as const;  // never company_id — the Safety Director's (0261)
const PART2_KEYS = ["sup_body_part", "sup_nature", "sup_account", "sup_cause", "sup_regs", "sup_medical_required"] as const;

/** Part One's facts, or Part Two's text. Only those columns, whatever is sent. */
export async function saveReport(input: { id: string; patch: Record<string, unknown> }): Promise<Result> {
  const allowed = new Set<string>([...BASIC_KEYS, ...PART2_KEYS]);
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input.patch)) {
    if (!allowed.has(k)) continue;
    patch[k] = typeof v === "string" && v.trim() === "" ? null : v;
  }
  if (!Object.keys(patch).length) return { ok: true };
  const supabase = await createClient();
  const { data, error } = await supabase.from("accidents").update(patch).eq("id", input.id).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: refused };
  // The injured worker's name rides on his statement too.
  if ("person_name" in patch) {
    await supabase.from("accident_witnesses").update({ name: patch.person_name as string | null })
      .eq("accident_id", input.id).eq("role", "injured");
  }
  bump(input.id);
  return { ok: true };
}

export async function setPrivate(input: {
  id: string; dob: string; phone: string; address: string; employeeNo: string; sex?: "male" | "female" | "";
}): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("field_set_private", {
    p_accident: input.id, p_dob: input.dob || null, p_phone: input.phone, p_address: input.address, p_employee_no: input.employeeNo,
    // 0265/0266's six-argument version: keeps an ID picked from the list
    // when the box is left empty.
    p_sex: input.sex || null,
  });
  if (error) return { ok: false, error: error.message };
  bump(input.id);
  return { ok: true };
}

export async function addWitness(accidentId: string): Promise<Result> {
  const supabase = await createClient();
  const { count } = await supabase.from("accident_witnesses").select("id", { count: "exact", head: true }).eq("accident_id", accidentId);
  const { data, error } = await supabase.from("accident_witnesses")
    .insert({ accident_id: accidentId, role: "witness", sort_no: (count ?? 0) + 1 }).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: refused };
  bump(accidentId);
  return { ok: true, id: data.id as string };
}

export async function removeWitness(input: { accidentId: string; id: string }): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("accident_witnesses").delete()
    .eq("id", input.id).eq("role", "witness").select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: refused };
  bump(input.accidentId);
  return { ok: true };
}

/** Name, phone, employer, language, the statement itself. */
export async function saveStatement(input: {
  accidentId: string; id: string;
  patch: Partial<Pick<FieldStatement, "name" | "phone" | "employer" | "language" | "statement" | "paper">>;
}): Promise<Result> {
  const keep = ["name", "phone", "employer", "language", "statement", "paper"];
  const patch = Object.fromEntries(Object.entries(input.patch).filter(([k]) => keep.includes(k)));
  const supabase = await createClient();
  const { data, error } = await supabase.from("accident_witnesses").update(patch)
    .eq("id", input.id).eq("accident_id", input.accidentId).select("role, statement").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: refused };
  // The injured worker's own account is Part One of the report the office
  // prints — keep that one in step rather than holding the words twice apart.
  if (data.role === "injured" && "statement" in patch) {
    await supabase.from("accidents").update({ account: data.statement }).eq("id", input.accidentId);
  }
  bump(input.accidentId);
  return { ok: true };
}

/**
 * SIGN A STATEMENT. The database signs what is on file; the phone supplies the
 * mark, the name the signer typed, how it was given, who read it back, and the
 * sentence they were shown — rebuilt here from the same wording, so the stored
 * agreement is the one the screen showed.
 */
export async function signStatement(input: {
  accidentId: string; id: string; png: string; how: "own_hand" | "read_back"; signer: string; readBy: string; language: string | null;
}): Promise<Result> {
  if (!okPng(input.png)) return { ok: false, error: "That signature didn't come through — try again." };
  const supabase = await createClient();
  const attest = attestFor(input.language, input.how, input.readBy).text;
  const { data: sigId, error } = await supabase.rpc("field_sign_statement", {
    p_statement: input.id, p_png: input.png, p_signer: input.signer, p_how: input.how,
    p_read_by: input.how === "read_back" ? input.readBy : null, p_attest: attest, p_user_agent: await userAgent(),
  });
  if (error) return { ok: false, error: error.message };
  const filed = await fileSignedCopy(supabase, sigId as string);
  bump(input.accidentId);
  return { ok: true, note: filed };
}

export async function recordNoSign(input: { accidentId: string; id: string; reason: string; note: string }): Promise<Result> {
  if (!["refused", "left_site", "hospital", "other"].includes(input.reason)) return { ok: false, error: "Pick a reason." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("accident_witnesses").update({
    nosign_reason: input.reason, nosign_note: input.note.trim() || null, nosign_at: new Date().toISOString(),
  }).eq("id", input.id).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: refused };
  bump(input.accidentId);
  return { ok: true };
}

/** The foreman signs Part Two — again the database signs what is on file. */
export async function signPart2(input: { id: string; png: string }): Promise<Result> {
  if (!okPng(input.png)) return { ok: false, error: "That signature didn't come through — try again." };
  const supabase = await createClient();
  const { data: sigId, error } = await supabase.rpc("field_sign_part2", {
    p_accident: input.id, p_png: input.png, p_attest: PART2_ATTEST, p_user_agent: await userAgent(),
  });
  if (error) return { ok: false, error: error.message };
  const filed = await fileSignedCopy(supabase, sigId as string);
  bump(input.id);
  return { ok: true, note: filed };
}

/**
 * A photo — of the scene, or of a hand-written statement. The phone has
 * already put the bytes in private storage; this queues them for the
 * accident's Drive folder exactly as the office's uploads are.
 */
export async function queuePhoto(input: {
  accidentId: string; path: string; name: string; mime: string | null; size: number | null;
  kind: "photo" | "statement"; statementId?: string;
}): Promise<Result> {
  const supabase = await createClient();
  const r = await queueOrHold(supabase, input);
  if (!r.ok) return { ok: false, error: r.error };
  if (input.statementId) {
    await supabase.from("accident_witnesses").update({ paper: true, paper_file_id: r.id ?? null }).eq("id", input.statementId);
  }
  bump(input.accidentId);
  return { ok: true };
}

/**
 * File it to Drive — or, while the report has no company yet (0261), HOLD it
 * in private storage until the Safety Director sets one. Drive filing goes to
 * the company's safety folder, so before then there is nowhere to put it.
 * Returns the accident_files row's id either way.
 */
async function queueOrHold(supabase: Supa, input: {
  accidentId: string; path: string; name: string; mime: string | null; size: number | null; kind: string;
}): Promise<Result> {
  const { data: acc } = await supabase.from("accidents").select("company_id").eq("id", input.accidentId).maybeSingle();
  if (!acc) return { ok: false, error: refused };
  if (!acc.company_id) {
    const { data, error } = await supabase.rpc("field_hold_file", {
      p_accident: input.accidentId, p_path: input.path, p_name: input.name, p_mime: input.mime, p_size: input.size, p_kind: input.kind,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data as string };
  }
  const q = await queueAccidentFile(supabase, input);
  if (!q.ok) return { ok: false, error: q.error };
  return { ok: true, id: q.id };
}

/**
 * The Safety Director sets the injured person's company (0261) — the only
 * company the report will name — and everything held for want of one goes to
 * that company's Drive folder.
 */
export async function setCompany(input: { id: string; companyId: string }): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("field_set_company", { p_accident: input.id, p_company: input.companyId });
  if (error) return { ok: false, error: error.message };
  // The company is saved; the held files go to its Drive folder after the
  // reply — that step signs and queues each file and took seconds, which is
  // why the company "didn't register right away" (first field test, 15 Nov).
  // The review page shows each file's state, and live updates bring it in.
  after(() => releaseHeldAccidentFiles(supabase, input.id));
  bump(input.id);
  return { ok: true };
}

export async function submitReport(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("field_submit", { p_accident: id });
  if (error) return { ok: false, error: error.message };
  after(() => notify(supabase, id, "submitted"));
  bump(id);
  return { ok: true };
}

/* ---------- The Safety Director ---------- */

type Checks = Record<string, { v: "ok" | "back"; note?: string }>;

export async function saveMarks(input: { id: string; checks: Checks }): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("field_review_marks", { p_accident: input.id, p_checks: input.checks });
  if (error) return { ok: false, error: error.message };
  bump(input.id);
  return { ok: true };
}

export async function sendBack(input: { id: string; checks: Checks }): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("field_send_back", { p_accident: input.id, p_checks: input.checks });
  if (error) return { ok: false, error: error.message };
  after(() => notify(supabase, input.id, "sent_back"));
  bump(input.id);
  return { ok: true };
}

export async function signOff(input: { id: string; checks: Checks; png: string }): Promise<Result> {
  if (!okPng(input.png)) return { ok: false, error: "That signature didn't come through — try again." };
  const supabase = await createClient();
  const { data: sigId, error } = await supabase.rpc("field_sign_off", {
    p_accident: input.id, p_checks: input.checks, p_png: input.png, p_attest: REVIEW_ATTEST, p_user_agent: await userAgent(),
  });
  if (error) return { ok: false, error: error.message };
  // Anything still held goes now — the company is set by definition (0261).
  await releaseHeldAccidentFiles(supabase, input.id);
  const filed = await fileSignedCopy(supabase, sigId as string);
  after(() => notify(supabase, input.id, "signed_off"));
  bump(input.id);
  return { ok: true, note: filed };
}

/* ---------- Picking the injured employee (0266) ---------- */

/** Names, six-digit IDs and titles — that job's crew first. Nothing else from HR. */
export async function employeeList(projectId: string): Promise<{ ok: boolean; error?: string; rows?: { id: string; name: string; employee_no: string | null; title: string | null; on_job: boolean }[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("field_employee_list", { p_project: projectId || null });
  if (error) return { ok: false, error: error.message, rows: [] };
  return { ok: true, rows: data ?? [] };
}

/** Link the report to an employee (or clear the link with null). */
export async function setEmployee(input: { id: string; employeeId: string | null }): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("field_set_employee", { p_accident: input.id, p_employee: input.employeeId });
  if (error) return { ok: false, error: error.message };
  bump(input.id);
  return { ok: true };
}

/* ---------- Part Three (0265) ---------- */

const PART3_KEYS = ["severity", "made_by_role", "sex", "age", "department", "job_title", "body_parts", "nature",
  "nature_detail", "employment_type", "months_employed", "months_in_job", "exact_location", "exact_time",
  "workday_part", "n_statements", "n_photos", "n_maps", "ppe", "medical_required", "care_type", "visit_details",
  "doctor_name", "facility_name", "written_by", "written_title", "written_dept", "written_on", "team_members",
  "reviewed_by", "reviewed_title", "reviewed_on"];

/** The Safety Director's Part Three — the whole step at once, through field_save_part3. */
export async function savePart3(input: { id: string; p: Record<string, unknown> }): Promise<Result> {
  const p: Record<string, unknown> = {};
  for (const k of PART3_KEYS) {
    if (!(k in input.p)) continue;
    const v = input.p[k];
    p[k] = v == null ? "" : typeof v === "boolean" ? v : String(v);
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("field_save_part3", { p_accident: input.id, p });
  if (error) return { ok: false, error: error.message };
  bump(input.id);
  return { ok: true };
}

/* ---------- Phone notifications (0265) ---------- */

/** This phone's push subscription, kept against the signed-in person. */
export async function savePushSubscription(input: { endpoint: string; p256dh: string; auth: string }): Promise<Result> {
  if (!pushReady()) return { ok: false, error: "not-set-up" };
  if (!input.endpoint.startsWith("https://") || !input.p256dh || !input.auth) return { ok: false, error: "That subscription didn't come through." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Signed out." };
  const { lang } = await fieldDict();
  // The same phone, signed in as someone else before, is taken over.
  await supabase.rpc("field_push_forget", { p_endpoint: input.endpoint });
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id, endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth,
    user_agent: await userAgent(), lang,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deletePushSubscription(endpoint: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** A test notification to this person's own phones. */
export async function sendTestPush(): Promise<Result> {
  if (!pushReady()) return { ok: false, error: "not-set-up" };
  const supabase = await createClient();
  const { data: subs, error } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth, lang");
  if (error) return { ok: false, error: error.message };
  await sendTo(supabase, (subs ?? []) as { endpoint: string; p256dh: string; auth: string; lang: string | null }[],
    (t) => ({ title: "PourSafe", body: t.pushTest, url: "/" }));
  return { ok: true };
}

/* ---------- The signed PDF copy ---------- */

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

const TITLE: Record<string, string> = {
  injured: "Injured worker's statement",
  witness: "Witness statement",
  part2: "Supervisor's investigation (Part Two)",
  review: "Safety Director's review sign-off",
};

/**
 * Build the signed copy from the signing LOG row and file it to the accident's
 * Drive folder. A failure here never undoes the signature — it is already on
 * record — so it comes back as a note to show, not as an error.
 */
async function fileSignedCopy(supabase: Supa, sigId: string): Promise<string | undefined> {
  try {
    const { data: s } = await supabase.from("accident_signatures").select("*").eq("id", sigId).maybeSingle();
    if (!s) return "Signed. The PDF copy couldn't be made — the signing record wasn't readable.";
    const [{ data: a }, { data: w }] = await Promise.all([
      supabase.from("accidents").select("case_no, project_id, company_id, occurred_on, person_name").eq("id", s.accident_id).maybeSingle(),
      s.statement_id
        ? supabase.from("accident_witnesses").select("employer, phone, paper").eq("id", s.statement_id).maybeSingle()
        : Promise.resolve({ data: null as { employer: string | null; phone: string | null; paper: boolean } | null }),
    ]);
    const [{ data: proj }, { data: co }] = await Promise.all([
      a?.project_id ? supabase.from("projects").select("name").eq("id", a.project_id).maybeSingle() : Promise.resolve({ data: null as { name: string } | null }),
      a?.company_id ? supabase.from("payroll_companies").select("name, legal_name").eq("id", a.company_id).maybeSingle() : Promise.resolve({ data: null as any }),
    ]);
    const title = TITLE[s.kind === "statement" ? s.role ?? "witness" : s.kind] ?? "Signed statement";
    const company = co?.legal_name || co?.name || "";
    // The sign-off copy is the whole report — every statement in full, the
    // photos, the fingerprints at the back (her fix, 15 Nov).
    const bytes = s.kind === "review"
      ? await reviewReportPdf(await reviewCopyData(supabase, s.accident_id, s, { company, job: proj?.name ?? "" }), await fonts())
      : await signedCopyPdf({
      title, company, caseNo: a?.case_no ?? null, job: proj?.name ?? "",
      occurredOn: a?.occurred_on ?? null, person: a?.person_name ?? null,
      signerName: s.signer_name, listedName: s.listed_name, role: s.kind === "statement" ? s.role : s.kind === "part2" ? "Supervisor" : "Safety Director",
      employer: w?.employer ?? null, phone: w?.phone ?? null, language: s.language, how: s.how, readBy: s.read_by,
      signedText: s.signed_text, attestText: s.attest_text, sigPng: s.sig_png, signedAt: s.signed_at,
      collectedBy: s.collected_by_name, userAgent: s.user_agent, textSha256: s.text_sha256, signatureId: s.id,
      paper: !!w?.paper,
    }, await fonts());

    const path = `${s.accident_id}/${randomUUID()}.pdf`;
    const { error: ue } = await supabase.storage.from("safety-uploads").upload(path, bytes, { contentType: "application/pdf" });
    if (ue) return `Signed. The PDF copy didn't upload: ${ue.message}`;
    const name = `${title} - ${s.signer_name}.pdf`;
    const q = await queueOrHold(supabase, {
      accidentId: s.accident_id, path, name, mime: "application/pdf", size: bytes.length,
      kind: s.kind === "review" ? "report" : "statement",
    });
    if (!q.ok) return `Signed. The PDF copy didn't go to Drive: ${q.error}`;
    if (q.id) {
      await supabase.rpc("field_note_signature_pdf", {
        p_signature: s.id, p_file: q.id, p_sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
    return undefined;
  } catch (e) {
    return `Signed. The PDF copy couldn't be made: ${(e as Error).message}`;
  }
}
