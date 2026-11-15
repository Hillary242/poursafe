"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  REVIEW_ATTEST, caseItems, fmtWhen, part2Text, part2Valid, sigValid,
  type FieldAccident, type FieldFile, type FieldSignature, type FieldStatement, type Part3,
} from "@/lib/field";
import type { FieldDict } from "@/lib/fieldI18n";
import { saveMarks, savePart3, sendBack, setCompany, signOff } from "@/app/actions";
import { SignPad } from "@/app/SignPad";
import { LOCALE, useT } from "@/app/I18n";
import { useLiveReport } from "@/app/Live";
import { SigView, YesNo } from "../../accidents/[id]/CaseFile";

type Checks = Record<string, { v: "ok" | "back"; note?: string }>;
type Res = { ok: boolean; error?: string; note?: string };

/**
 * THE SAFETY DIRECTOR'S REVIEW: the case file item by item — Good, or Send
 * back with what to fix. Every item Good, and the injured person's company
 * set (only the Safety Director sets it — 0261), and it can be signed off;
 * from there it is an ordinary accident in the Safety log.
 *
 * Part Three — the R4's Incident Investigation Report — is the Safety
 * Director's own, filled in here (0265, her answer 15 Nov). Not required to
 * sign off: the form itself calls it optional for a minor injury.
 *
 * Marks save as they are made, so a review can be put down and picked up.
 * The page is live: what the foreman adds shows up without reopening it.
 */
export function Review({ a, statements, files, jobName, companies, signatures = [], part3, me }: {
  a: FieldAccident; statements: FieldStatement[]; files: FieldFile[]; jobName: string;
  companies: { id: string; name: string }[];
  /** The signing log (0260), for the signed PDF copies and earlier signatures. */
  signatures?: FieldSignature[];
  /** null: 0265 not run yet. */
  part3: Part3 | null;
  me: string;
}) {
  const { t, lang } = useT();
  const loc = LOCALE[lang];
  useLiveReport(a.id);
  const photos = files.filter((f) => f.kind === "photo");
  const items = caseItems(a, statements, photos.length, t);
  const [checks, setChecks] = useState<Checks>(a.field_checks ?? {});
  const [signing, setSigning] = useState(false);
  const [png, setPng] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(0);
  const [p3Open, setP3Open] = useState(false);
  // The company shows the moment it's picked; the server catches up.
  const [companyId, setCompanyId] = useState(a.company_id ?? "");
  useEffect(() => { setCompanyId(a.company_id ?? ""); }, [a.company_id]);
  const open = a.field_status === "submitted";
  const editable = a.field_status !== "reviewed";

  useEffect(() => {
    if (!saved) return;
    const h = setTimeout(() => setSaved(0), 1800);
    return () => clearTimeout(h);
  }, [saved]);

  // The latest marks, so two quick taps can't each start from the same old copy.
  const latest = useRef<Checks>(checks);
  const put = (next: Checks) => { latest.current = next; setChecks(next); };
  const save = () => saveMarks({ id: a.id, checks: latest.current })
    .then((r) => { setErr(r.ok ? null : r.error ?? null); if (r.ok) setSaved(Date.now()); });
  // Saved as she goes; a note is saved when its box loses focus.
  const mark = (key: string, v: "ok" | "back") => {
    put({ ...latest.current, [key]: { v, note: latest.current[key]?.note ?? "" } });
    save();
  };
  const act = async (fn: () => Promise<Res>) => {
    setBusy(true); setErr(null);
    let r: Res;
    try { r = await fn(); } catch (e) { r = { ok: false, error: (e as Error).message || "That didn't save." }; }
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "That didn't save."); return false; }
    if (r.note) setErr(r.note);
    setSaved(Date.now());
    return true;
  };
  const pickCompany = async (id: string) => {
    if (!id) return;
    const before = companyId;
    setCompanyId(id);
    if (!(await act(() => setCompany({ id: a.id, companyId: id })))) setCompanyId(before);
  };
  // Only the items on the list count: a mark left over from a removed witness doesn't block.
  const current: Checks = Object.fromEntries(items.map((i) => [i.key, checks[i.key]]).filter(([, c]) => c)) as Checks;
  const backs = items.filter((i) => checks[i.key]?.v === "back");
  const allOk = items.every((i) => checks[i.key]?.v === "ok");
  const company = companies.find((c) => c.id === companyId);
  // Filled in once the Safety Director has saved it — sex alone may have come from the foreman.
  const p3Filled = !!part3 && (!!part3.accident_id || !!part3.severity);

  if (p3Open && part3) {
    return (
      <>
        <Part3Form a={a} p={part3} statements={statements} photos={photos.length} me={me} t={t}
          close={() => setP3Open(false)} onSaved={() => setSaved(Date.now())} />
        {saved > 0 && <div className="fld-toast" role="status">{t.saved}</div>}
      </>
    );
  }

  return (
    <>
      <div className="fld-head">
        <Link href="/review" className="fld-back" aria-label={t.back}>‹</Link>
        <h1 className="fld-h1">{a.case_no}</h1>
        <span className={`fld-st ${a.field_status}`}>{t.status[a.field_status]}</span>
      </div>
      <div className="fld-sub">
        <b>{a.person_name}</b>
        <span className="fld-mut">
          {a.occurred_on} {a.occurred_at?.slice(0, 5) ?? ""}{jobName ? ` · ${jobName}` : ""}
          <br />{t.filedBy} {a.supervisor_name}{a.submitted_at ? ` · ${t.sent} ${fmtWhen(a.submitted_at, loc)}` : ""}
        </span>
      </div>
      {a.field_status === "reviewed" && <div className="fld-ok">{t.inSafetyLog(a.reviewed_name ?? "", fmtWhen(a.reviewed_at, loc))}</div>}
      {a.field_status === "returned" && <div className="fld-info">{t.returnedNote}</div>}

      {/* The injured person's company — the Safety Director's to set, and the
          only company this report will ever name. */}
      <div className={`fld-ritem${companyId ? " ok" : ""}`}>
        <label className="fld-f" style={{ marginBottom: 4 }}>
          <span>{t.company}</span>
          {editable ? (
            <select value={companyId} disabled={busy} onChange={(e) => pickCompany(e.target.value)}>
              <option value="">{t.pickCompany}</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : <b>{company?.name ?? "—"}</b>}
        </label>
        {editable && <p className="fld-mut" style={{ margin: 0 }}>{t.companyHelp}</p>}
      </div>

      {items.map((i) => {
        const c = checks[i.key];
        const copies = signatures.filter((g) => i.key === "part2" ? g.kind === "part2" : i.key.startsWith("s:") && g.statement_id === i.key.slice(2));
        return (
          <div key={i.key} className={`fld-ritem${c ? ` ${c.v}` : ""}`}>
            <div className="fld-ritem-h">
              <b>{i.label}</b>
              {open ? (
                <span className="fld-rbtns">
                  <button className={c?.v === "ok" ? "on ok" : ""} onClick={() => mark(i.key, "ok")}>{t.good}</button>
                  <button className={c?.v === "back" ? "on back" : ""} onClick={() => mark(i.key, "back")}>{t.fix}</button>
                </span>
              ) : c && <span className={`fld-pill ${c.v}`}>{c.v === "ok" ? t.pillGood : t.pillBack}</span>}
            </div>
            <Body a={a} k={i.key} statements={statements} photos={photos} files={files} t={t}
              copies={<Copies list={copies} files={files} t={t} loc={loc} />} />
            {c?.v === "back" && (open
              ? <input className="fld-note" placeholder={t.whatToFix} value={c.note ?? ""}
                  onChange={(e) => put({ ...latest.current, [i.key]: { v: "back", note: e.target.value } })}
                  onBlur={save} />
              : <div className="fld-alert">↩ {c.note}</div>)}
          </div>
        );
      })}

      {/* Part Three: the Safety Director's own investigation. */}
      {part3 && (
        <div className={`fld-ritem${p3Filled ? " ok" : ""}`}>
          <div className="fld-ritem-h">
            <b>{t.itemPart3}</b>
            <span className={`fld-pill${p3Filled ? " ok" : ""}`}>{p3Filled ? t.p3Filled : t.p3NotYet}</span>
          </div>
          <p className="fld-mut" style={{ margin: "0 0 8px" }}>{t.p3Optional}</p>
          {editable
            ? <button className="fld-big ghost" onClick={() => setP3Open(true)}>{t.p3Open}</button>
            : <Part3Summary p={part3} t={t} />}
        </div>
      )}

      {err && <div className="fld-alert">{err}</div>}
      {open && (
        <div className="fld-foot">
          {backs.length > 0 && (
            <button className="fld-big warn" disabled={busy || backs.some((b) => !(checks[b.key].note ?? "").trim())}
              onClick={() => act(() => sendBack({ id: a.id, checks: current }))}>
              {t.sendBack(a.supervisor_name ?? t.theForeman, backs.length)}
            </button>
          )}
          {backs.some((b) => !(checks[b.key].note ?? "").trim()) && <p className="fld-mut">{t.sayWhatToFix}</p>}
          {!allOk && backs.length === 0 && <p className="fld-mut">{t.markAll}</p>}
          {allOk && !companyId && <p className="fld-mut">{t.setCompanyFirst}</p>}
          {allOk && companyId && !signing && <button className="fld-big" onClick={() => setSigning(true)}>{t.signOff}</button>}
          {allOk && companyId && signing && (
            <>
              <div className="fld-attest"><p>{REVIEW_ATTEST}</p></div>
              <SignPad onChange={setPng} hint={t.signHere} clearLabel={t.clear} />
              <button className="fld-big" disabled={!png || busy} onClick={() => png && act(() => signOff({ id: a.id, checks: current, png }))}>
                {busy ? t.saving : t.sign}
              </button>
            </>
          )}
        </div>
      )}
      {a.review_sig_png && (
        <SigView png={a.review_sig_png} name={a.reviewed_name} at={a.reviewed_at} how="own_hand" lang="English">
          <Copies list={signatures.filter((g) => g.kind === "review")} files={files} t={t} loc={loc} />
        </SigView>
      )}
      {(busy || saved > 0) && <div className={`fld-toast${busy ? " busy" : ""}`} role="status">{busy ? t.savingDots : t.saved}</div>}
    </>
  );
}

// Filed by the script: drive_url (0138). Older rows: drive_file_id. Not yet filed: the storage link.
const fileHref = (f: FieldFile | undefined) =>
  f?.drive_url ? f.drive_url : f?.drive_file_id ? `https://drive.google.com/file/d/${f.drive_file_id}/view` : f?.drive_source_url ?? undefined;

/**
 * The signed PDF copies for one item, newest first — and, when it has been
 * signed more than once, the earlier ones too, because the log keeps them.
 */
function Copies({ list, files, t, loc }: { list: FieldSignature[]; files: FieldFile[]; t: FieldDict; loc: string }) {
  if (!list.length) return null;
  const sorted = [...list].sort((x, y) => y.signed_at.localeCompare(x.signed_at));
  return (
    <div className="fld-copies">
      {sorted.map((g, i) => {
        const f = files.find((x) => x.id === g.pdf_file_id);
        const href = fileHref(f);
        return (
          <span key={g.id}>
            📄 {href ? <a href={href} target="_blank" rel="noreferrer">{t.signedCopy}</a> : t.notFiledYet}
            {" "}· {g.signer_name}, {fmtWhen(g.signed_at, loc)}{i > 0 ? ` · ${t.earlier}` : ""}
          </span>
        );
      })}
    </div>
  );
}

/** Question and answer, in the form's order; unanswered ones are left out. */
function QA({ rows }: { rows: [string, string | null | undefined][] }) {
  const shown = rows.filter(([, v]) => v != null && String(v).trim() !== "");
  if (!shown.length) return null;
  return (
    <dl className="fld-qa">
      {shown.map(([q, v]) => <div key={q}><dt>{q}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}
const yn = (v: boolean | null | undefined, t: FieldDict) => (v == null ? null : v ? t.yes : t.no);
const pick = (list: [string, string][], v: unknown) => (v == null || v === "" ? null : list.find(([k]) => k === v)?.[1] ?? String(v));

function Body({ a, k, statements, photos, files, t, copies }: {
  a: FieldAccident; k: string; statements: FieldStatement[]; photos: FieldFile[]; files: FieldFile[]; t: FieldDict;
  copies: React.ReactNode;
}) {
  const kind = Object.fromEntries(t.personKinds)[a.person_kind] ?? a.person_kind;
  if (k === "basics") return (
    <QA rows={[
      [t.qReporting, a.kind === "near_miss" ? t.kindNearMiss : t.injury],
      [t.qName, a.person_name],
      [t.qTitle, a.person_title],
      [t.theyAre, a.person_kind === "rc_employee" ? t.ourEmployee : `${kind}${a.person_employer ? ` — ${a.person_employer}` : ""}`],
      [t.qSupervisor, a.supervisor_name],
      [t.qTold, yn(a.told_supervisor, t)],
      [t.qDate, a.occurred_on],
      [t.qTime, a.occurred_at?.slice(0, 5)],
      [t.qWitnesses, a.witness_names],
      [t.qWhere, a.location],
      [t.qDoing, a.what_doing],
      [t.qBody, a.body_parts],
      [t.qDoctor, yn(a.saw_doctor, t)],
      [t.qCareType, pick(t.careTypes, a.care_type)],
      [t.qWhom, a.care_provider],
      [t.qDocPhone, a.care_phone],
      [`${t.qCareDate} / ${t.qCareTime}`, [a.care_on, a.care_at?.slice(0, 5)].filter(Boolean).join(" ")],
      [t.qPrior, yn(a.prior_injury, t)],
      [t.qPriorWhen, a.prior_injury_when],
    ]} />
  );
  if (k === "private") return <div className="fld-mut">{a.private_entered ? t.privateReview : t.notEntered}</div>;
  if (k === "photos") return (
    <div className="fld-photos sm">
      {photos.map((p) => (
        <a key={p.id} className="fld-photo" target="_blank" rel="noreferrer" href={fileHref(p)}>
          {p.drive_source_url ? <img src={p.drive_source_url} alt={p.name} /> : <i>📷</i>}
        </a>
      ))}
    </div>
  );
  if (k === "part2") return (
    <>
      <blockquote className="fld-quote">{part2Text(a) || "—"}</blockquote>
      {part2Valid(a) ? <SigView png={a.sup_sig_png!} name={a.sup_name} at={a.sup_sig_at} how="own_hand" lang="English">{copies}</SigView>
        : <><div className="fld-alert">{t.notSignedBox}</div>{copies}</>}
    </>
  );
  if (k.startsWith("s:")) {
    const s = statements.find((x) => x.id === k.slice(2));
    if (!s) return null;
    const paper = files.find((f) => f.id === s.paper_file_id);
    return (
      <>
        {s.role === "witness" && <div className="fld-mut">{s.employer || "—"}{s.phone ? ` · ${s.phone}` : ""}</div>}
        {s.paper
          ? <div className="fld-paper sm">📄 {paper ? (
              <a target="_blank" rel="noreferrer" href={fileHref(paper)}>{t.handwritten}</a>) : t.handwritten} ({t.langNames[s.language || "English"] ?? s.language})</div>
          : <blockquote className="fld-quote">{s.statement || <i>{t.noStatement}</i>}
              {s.language && s.language !== "English" && <small>{t.translationPending(t.langNames[s.language] ?? s.language)}</small>}</blockquote>}
        {sigValid(s) ? <SigView png={s.sig_png!} name={s.sig_name} at={s.sig_at} how={s.sig_how} lang={s.language} readBy={s.sig_read_by}>{copies}</SigView>
          : s.nosign_reason ? <><div className="fld-info">{t.notSignedReason} {t.noSign[s.nosign_reason] ?? s.nosign_reason}{s.nosign_note ? `: ${s.nosign_note}` : ""}</div>{copies}</>
          : <><div className="fld-alert">{t.notSignedBox}</div>{copies}</>}
      </>
    );
  }
  return null;
}

/* ---------------------------------------------------------------------- */

const s = (v: unknown) => (v == null ? "" : String(v));

function Part3Summary({ p, t }: { p: Part3; t: FieldDict }) {
  return (
    <QA rows={[
      [t.p3Severity, pick(t.severities, p.severity)],
      [t.p3MadeBy, pick(t.madeBy, p.made_by_role)],
      [t.p3Sex, pick([["male", t.male], ["female", t.female]], p.sex)],
      [t.p3Age, s(p.age)],
      [t.p3Dept, s(p.department)],
      [t.p3JobTitle, s(p.job_title)],
      [t.p3Body, s(p.body_parts)],
      [t.p3Nature, [pick(t.natures, p.nature), s(p.nature_detail)].filter(Boolean).join(" — ")],
      [t.p3Works, pick(t.employment, p.employment_type)],
      [t.p3MonthsEmp, s(p.months_employed)],
      [t.p3MonthsJob, s(p.months_in_job)],
      [t.p3Workday, pick(t.workday, p.workday_part)],
      [t.p3Ppe, s(p.ppe)],
      [t.p3Care, pick(t.careInv, p.care_type)],
      [t.p3WrittenBy, s(p.written_by)],
      [t.p3ReviewedBy, s(p.reviewed_by)],
    ]} />
  );
}

/**
 * PART THREE — the R4's Incident Investigation Report, in its order and
 * wording. What the form asks twice is not asked again (her call): the date,
 * the witnesses with their phones, and how many statements and photos come
 * from the report; location, time and the care received start from the
 * foreman's answers and can be corrected.
 */
function Part3Form({ a, p, statements, photos, me, t, close, onSaved }: {
  a: FieldAccident; p: Part3; statements: FieldStatement[]; photos: number; me: string; t: FieldDict;
  close: () => void; onSaved: () => void;
}) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const witnesses = statements.filter((x) => x.role === "witness");
  const nStatements = statements.filter((x) => x.sig_png || x.paper_file_id).length;
  const careFromP1 = a.saw_doctor === false ? "none" : a.care_type && a.care_type !== "other" ? a.care_type : "";
  const [f, setF] = useState<Record<string, string | boolean | null>>({
    severity: s(p.severity) || (a.kind === "near_miss" ? "near_miss" : ""),
    made_by_role: s(p.made_by_role),
    sex: s(p.sex), age: s(p.age), department: s(p.department), job_title: s(p.job_title) || (a.person_title ?? ""),
    body_parts: s(p.body_parts) || (a.sup_body_part ?? a.body_parts ?? ""),
    nature: s(p.nature), nature_detail: s(p.nature_detail), employment_type: s(p.employment_type),
    months_employed: s(p.months_employed), months_in_job: s(p.months_in_job),
    exact_location: s(p.exact_location) || (a.location ?? ""), exact_time: s(p.exact_time).slice(0, 5) || (a.occurred_at?.slice(0, 5) ?? ""),
    workday_part: s(p.workday_part), n_maps: s(p.n_maps), ppe: s(p.ppe),
    medical_required: p.medical_required == null ? a.sup_medical_required : (p.medical_required as boolean),
    care_type: s(p.care_type) || careFromP1, visit_details: s(p.visit_details),
    doctor_name: s(p.doctor_name) || (a.care_provider ?? ""), facility_name: s(p.facility_name),
    written_by: s(p.written_by) || me, written_title: s(p.written_title), written_dept: s(p.written_dept),
    written_on: s(p.written_on) || today, team_members: s(p.team_members),
    reviewed_by: s(p.reviewed_by), reviewed_title: s(p.reviewed_title), reviewed_on: s(p.reviewed_on),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string | boolean | null) => setF((x) => ({ ...x, [k]: v }));
  const txt = (k: string) => ({ value: (f[k] as string) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value) });
  const radios = (k: string, list: [string, string][]) => (
    <div className="fld-chips">
      {list.map(([v, l]) => (
        <button key={v} type="button" className={f[k] === v ? "on" : ""} onClick={() => set(k, f[k] === v ? "" : v)}>{l}</button>
      ))}
    </div>
  );
  const save = async () => {
    setBusy(true); setErr(null);
    const r = await savePart3({ id: a.id, p: { ...f, n_statements: String(nStatements), n_photos: String(photos) } });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "That didn't save."); return; }
    onSaved();
    close();
  };
  return (
    <>
      <div className="fld-head">
        <button className="fld-back" onClick={close} aria-label={t.back}>‹</button>
        <h1 className="fld-h1">{t.itemPart3}</h1>
      </div>
      <div className="fld-form">
        <p className="fld-mut fld-help">{t.p3Help}</p>
        <div className="fld-f"><span>{t.p3Severity}</span>{radios("severity", t.severities)}</div>
        <div className="fld-f fld-ro"><span>{t.p3DateIncident}</span><b>{a.occurred_on || "—"}</b></div>
        <div className="fld-f"><span>{t.p3MadeBy}</span>{radios("made_by_role", t.madeBy)}</div>

        <h2 className="fld-h2">{t.p3Step1}</h2>
        <div className="fld-f fld-ro"><span>{t.p3Name}</span><b>{a.person_name || "—"}</b></div>
        <div className="fld-2">
          <div className="fld-f"><span>{t.p3Sex}</span>{radios("sex", [["male", t.male], ["female", t.female]])}</div>
          <label className="fld-f"><span>{t.p3Age}</span><input inputMode="numeric" {...txt("age")} /></label>
        </div>
        <div className="fld-2">
          <label className="fld-f"><span>{t.p3Dept}</span><input {...txt("department")} /></label>
          <label className="fld-f"><span>{t.p3JobTitle}</span><input {...txt("job_title")} /></label>
        </div>
        <label className="fld-f"><span>{t.p3Body}</span><textarea rows={2} {...txt("body_parts")} /></label>
        <div className="fld-f"><span>{t.p3Nature}</span>{radios("nature", t.natures)}</div>
        {(f.nature === "body_system" || f.nature === "other") && (
          <label className="fld-f"><span>{t.p3NatureDetail}</span><input {...txt("nature_detail")} /></label>
        )}
        <div className="fld-f"><span>{t.p3Works}</span>{radios("employment_type", t.employment)}</div>
        <div className="fld-2">
          <label className="fld-f"><span>{t.p3MonthsEmp}</span><input inputMode="numeric" {...txt("months_employed")} /></label>
          <label className="fld-f"><span>{t.p3MonthsJob}</span><input inputMode="numeric" {...txt("months_in_job")} /></label>
        </div>

        <h2 className="fld-h2">{t.p3Step2}</h2>
        <div className="fld-2">
          <label className="fld-f"><span>{t.p3Loc}</span><input {...txt("exact_location")} /></label>
          <label className="fld-f"><span>{t.p3Time}</span><input type="time" {...txt("exact_time")} /></label>
        </div>
        <div className="fld-f"><span>{t.p3Workday}</span>{radios("workday_part", t.workday)}</div>
        <div className="fld-f fld-ro"><span>{t.p3Witnesses}</span>
          {witnesses.length ? (
            <table className="fld-wtable">
              <thead><tr><th>{t.p3WName}</th><th>{t.p3WPhone}</th><th>{t.p3WStatement}</th></tr></thead>
              <tbody>{witnesses.map((w) => (
                <tr key={w.id}><td>{w.name || "—"}</td><td>{w.phone || "—"}</td><td>{w.sig_png || w.paper_file_id ? t.yes : t.no}</td></tr>
              ))}</tbody>
            </table>
          ) : <b>{t.p3NoWitnesses}</b>}
        </div>
        <div className="fld-f"><span>{t.p3Attach}</span>
          <div className="fld-3">
            <div className="fld-ro"><small>{t.p3AttStatements}</small><b>{nStatements}</b></div>
            <div className="fld-ro"><small>{t.p3AttPhotos}</small><b>{photos}</b></div>
            <label><small>{t.p3AttMaps}</small><input inputMode="numeric" {...txt("n_maps")} /></label>
          </div>
        </div>
        <label className="fld-f"><span>{t.p3Ppe}</span><textarea rows={2} {...txt("ppe")} /></label>
        <div className="fld-f"><span>{t.p3Medical}</span>
          <YesNo value={f.medical_required as boolean | null} onChange={(v) => set("medical_required", v)} t={t} /></div>
        <div className="fld-f"><span>{t.p3Care}</span>{radios("care_type", t.careInv)}</div>
        <label className="fld-f"><span>{t.p3Visit}</span><textarea rows={2} {...txt("visit_details")} /></label>
        <div className="fld-2">
          <label className="fld-f"><span>{t.p3Doctor}</span><input {...txt("doctor_name")} /></label>
          <label className="fld-f"><span>{t.p3Facility}</span><input {...txt("facility_name")} /></label>
        </div>

        <h2 className="fld-h2">{t.p3Step3}</h2>
        <div className="fld-2">
          <label className="fld-f"><span>{t.p3WrittenBy}</span><input {...txt("written_by")} /></label>
          <label className="fld-f"><span>{t.p3TitleF}</span><input {...txt("written_title")} /></label>
        </div>
        <div className="fld-2">
          <label className="fld-f"><span>{t.p3DeptF}</span><input {...txt("written_dept")} /></label>
          <label className="fld-f"><span>{t.p3Date}</span><input type="date" {...txt("written_on")} /></label>
        </div>
        <label className="fld-f"><span>{t.p3Team}</span><textarea rows={2} {...txt("team_members")} /></label>
        <div className="fld-2">
          <label className="fld-f"><span>{t.p3ReviewedBy}</span><input {...txt("reviewed_by")} /></label>
          <label className="fld-f"><span>{t.p3TitleF}</span><input {...txt("reviewed_title")} /></label>
        </div>
        <label className="fld-f"><span>{t.p3Date}</span><input type="date" {...txt("reviewed_on")} /></label>
      </div>
      {err && <div className="fld-alert">{err}</div>}
      <div className="fld-foot">
        <button className="fld-big" disabled={busy} onClick={save}>{busy ? t.savingDots : t.p3Save}</button>
      </div>
    </>
  );
}
