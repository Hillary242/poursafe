import "server-only";
import { createClient } from "@/lib/supabase/server";
import { FIELD_DICT } from "@/lib/fieldI18n";
import { part2Text, type FieldAccident, type FieldStatement } from "@/lib/field";
import type { ReviewCopy, ReviewStatement } from "@/lib/reviewPdf";

type Supa = Awaited<ReturnType<typeof createClient>>;
const t = FIELD_DICT.en;   // the PDF is the office's record: English, the R4's own wording
const pick = (list: [string, string][], v: unknown) => (v == null || v === "" ? null : list.find(([k]) => k === v)?.[1] ?? String(v));
const yn = (v: boolean | null | undefined) => (v == null ? null : v ? "Yes" : "No");

/**
 * Everything the Safety Director's sign-off copy prints, read as it stands at
 * the moment of signing. Photos are fetched as bytes: a held one from private
 * storage, a queued one from its storage link.
 */
export async function reviewCopyData(supabase: Supa, accidentId: string, sig: {
  signer_name: string; attest_text: string; sig_png: string; signed_at: string; collected_by_name: string | null;
  user_agent: string | null; signed_text: string; text_sha256: string; id: string;
}, header: { company: string; job: string }): Promise<ReviewCopy> {
  const [{ data: aRow }, { data: st }, { data: files }, { data: p3 }] = await Promise.all([
    supabase.from("accidents").select("*").eq("id", accidentId).maybeSingle(),
    supabase.from("accident_witnesses").select("*").eq("accident_id", accidentId).order("sort_no").order("created_at"),
    supabase.from("accident_files").select("id, name, kind, mime, held_path, drive_source_url")
      .eq("accident_id", accidentId).eq("kind", "photo").order("uploaded_at"),
    supabase.rpc("field_part3", { p_accident: accidentId }),
  ]);
  const a = aRow as FieldAccident & { case_no: string | null };
  const statements = (st ?? []) as (FieldStatement & { sig_print: string | null })[];
  const p = (p3 ?? {}) as Record<string, string | number | boolean | null>;
  const witnesses = statements.filter((s) => s.role === "witness");
  const near = a.kind === "near_miss";

  const sections: ReviewCopy["sections"] = [
    { title: t.p1Title, rows: [
      [t.qReporting, near ? "Near Miss" : a.kind === "illness" ? "Illness" : "Injury"],
      [t.qName, a.person_name],
      [t.qTitle, a.person_title],
      [t.qSupervisor, a.supervisor_name],
      [t.qTold, yn(a.told_supervisor)],
      [t.qDate, a.occurred_on],
      [t.qTime, a.occurred_at?.slice(0, 5)],
      [t.qWitnesses, a.witness_names],
      [t.qWhere, a.location],
      [t.qDoing, a.what_doing],
      [t.qBody, a.body_parts],
      [t.qDoctor, yn(a.saw_doctor)],
      [t.qCareType, pick(t.careTypes, a.care_type)],
      [t.qWhom, a.care_provider],
      [t.qDocPhone, a.care_phone],
      [`${t.qCareDate} / ${t.qCareTime}`, [a.care_on, a.care_at?.slice(0, 5)].filter(Boolean).join(" ") || null],
      [t.qPrior, yn(a.prior_injury)],
      [t.qPriorWhen, a.prior_injury_when],
    ] },
    { title: t.part2Title, rows: [
      [t.p2Injured, a.person_name],
      [t.p2Body, a.sup_body_part],
      [t.p2Nature, a.sup_nature],
      [t.p2How, a.sup_account],
      [`${t.p2Date} / ${t.p2Time}`, [a.occurred_on, a.occurred_at?.slice(0, 5)].filter(Boolean).join(" ") || null],
      [t.p2Loc, a.location],
      [t.p2Cause, a.sup_cause],
      [t.p2Regs, a.sup_regs],
      [t.p2Medical, yn(a.sup_medical_required)],
    ] },
    { title: t.itemPart3, rows: [
      [t.p3Severity, pick(t.severities, a.severity)],
      [t.p3MadeBy, pick(t.madeBy, p.made_by_role)],
      [t.p3Sex, pick([["male", "Male"], ["female", "Female"]], p.sex)],
      [t.p3Age, p.age == null ? null : String(p.age)],
      [t.p3Dept, p.department as string | null],
      [t.p3JobTitle, p.job_title as string | null],
      [t.p3Body, p.body_parts as string | null],
      [t.p3Nature, [pick(t.natures, p.nature), p.nature_detail].filter(Boolean).join(" — ") || null],
      [t.p3Works, pick(t.employment, p.employment_type)],
      [t.p3MonthsEmp, p.months_employed == null ? null : String(p.months_employed)],
      [t.p3MonthsJob, p.months_in_job == null ? null : String(p.months_in_job)],
      [t.p3Loc, (p.exact_location as string | null) || a.location],
      [t.p3Time, ((p.exact_time as string | null) || a.occurred_at)?.slice(0, 5)],
      [t.p3Workday, pick(t.workday, p.workday_part)],
      [t.p3Witnesses, witnesses.length ? witnesses.map((w) => `${w.name || "—"}${w.phone ? `, ${w.phone}` : ""} — statement ${w.sig_png || w.paper_file_id ? "attached" : "not attached"}`).join("\n") : null],
      [t.p3AttStatements, String(statements.filter((s) => s.sig_png || s.paper_file_id).length)],
      [t.p3AttPhotos, String((files ?? []).length)],
      [t.p3AttMaps, p.n_maps == null ? null : String(p.n_maps)],
      [t.p3Ppe, p.ppe as string | null],
      [t.p3Medical, yn(p.medical_required as boolean | null)],
      [t.p3Care, pick(t.careInv, p.care_type)],
      [t.p3Visit, p.visit_details as string | null],
      [t.p3Doctor, p.doctor_name as string | null],
      [t.p3Facility, p.facility_name as string | null],
      [t.p3WrittenBy, [p.written_by, p.written_title, p.written_dept, p.written_on].filter(Boolean).join(", ") || null],
      [t.p3Team, p.team_members as string | null],
      [t.p3ReviewedBy, [p.reviewed_by, p.reviewed_title, p.reviewed_on].filter(Boolean).join(", ") || null],
    ] },
  ];

  let wn = 0;
  const statementRows: ReviewStatement[] = statements.map((s) => {
    const title = s.role === "injured"
      ? (near ? "Statement of the person involved" : "Injured worker's statement")
      : `Witness ${++wn}${s.name ? ` — ${s.name}` : ""}`;
    return {
      title, name: s.name,
      meta: [
        s.role === "witness" && s.employer ? `Works for ${s.employer}` : null,
        s.role === "witness" && s.phone ? s.phone : null,
        s.language ? `Given in ${s.language}` : null,
        s.sig_how === "read_back" ? `Read back${s.sig_read_by ? ` by ${s.sig_read_by}` : ""}` : s.sig_how === "own_hand" ? "In the signer's own words" : null,
      ].filter(Boolean) as string[],
      text: s.paper ? null : (s.statement ?? "").trim() || "—",
      sigPng: s.sig_png, signedBy: s.sig_name, signedAt: s.sig_at,
      notSigned: s.nosign_reason ? `${s.nosign_reason.replace("_", " ")}${s.nosign_note ? ` — ${s.nosign_note}` : ""}` : null,
      sha256: s.sig_print ?? null,
    };
  });
  // Part Two is a signed statement too — the foreman's.
  statementRows.push({
    title: "Part Two — supervisor's investigation", name: a.sup_name, meta: [],
    text: part2Text(a) || "—", sigPng: a.sup_sig_png, signedBy: a.sup_name, signedAt: a.sup_sig_at, notSigned: null,
    sha256: (a as FieldAccident & { sup_sig_print?: string | null }).sup_sig_print ?? null,
  });

  const photos = await Promise.all(((files ?? []) as { name: string; mime: string | null; held_path: string | null; drive_source_url: string | null }[])
    .slice(0, 24).map(async (f) => {
      try {
        if (f.held_path) {
          const { data } = await supabase.storage.from("safety-uploads").download(f.held_path);
          return { name: f.name, mime: f.mime, bytes: data ? new Uint8Array(await data.arrayBuffer()) : null };
        }
        if (f.drive_source_url) {
          const r = await fetch(f.drive_source_url);
          return { name: f.name, mime: f.mime, bytes: r.ok ? new Uint8Array(await r.arrayBuffer()) : null };
        }
      } catch { /* printed as "filed in Drive" */ }
      return { name: f.name, mime: f.mime, bytes: null };
    }));

  return {
    company: header.company, caseNo: a.case_no, job: header.job, occurredOn: a.occurred_on, person: a.person_name,
    sections, statements: statementRows, photos,
    signerName: sig.signer_name, attestText: sig.attest_text, sigPng: sig.sig_png, signedAt: sig.signed_at,
    collectedBy: sig.collected_by_name, userAgent: sig.user_agent, signedText: sig.signed_text,
    textSha256: sig.text_sha256, signatureId: sig.id,
  };
}
