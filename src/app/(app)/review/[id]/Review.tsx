"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  REVIEW_ATTEST, caseItems, fmtWhen, part2Valid, sigValid,
  type FieldAccident, type FieldFile, type FieldSignature, type FieldStatement,
} from "@/lib/field";
import type { FieldDict } from "@/lib/fieldI18n";
import { saveMarks, sendBack, setCompany, signOff } from "@/app/actions";
import { SignPad } from "@/app/SignPad";
import { LOCALE, useT } from "@/app/I18n";
import { SigView } from "../../accidents/[id]/CaseFile";

type Checks = Record<string, { v: "ok" | "back"; note?: string }>;

/**
 * THE SAFETY DIRECTOR'S REVIEW: the case file item by item — Good, or Send
 * back with what to fix. Every item Good, and the injured person's company
 * set (only the Safety Director sets it — 0261), and it can be signed off;
 * from there it is an ordinary accident in the Safety log.
 *
 * Marks save as they are made, so a review can be put down and picked up.
 */
export function Review({ a, statements, files, jobName, companies, signatures = [] }: {
  a: FieldAccident; statements: FieldStatement[]; files: FieldFile[]; jobName: string;
  companies: { id: string; name: string }[];
  /** The signing log (0260), for the signed PDF copies and earlier signatures. */
  signatures?: FieldSignature[];
}) {
  const router = useRouter();
  const { t, lang } = useT();
  const loc = LOCALE[lang];
  const photos = files.filter((f) => f.kind === "photo");
  const items = caseItems(a, statements, photos.length, t);
  const [checks, setChecks] = useState<Checks>(a.field_checks ?? {});
  const [signing, setSigning] = useState(false);
  const [png, setPng] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const open = a.field_status === "submitted";
  const editable = a.field_status !== "reviewed";

  // The latest marks, so two quick taps can't each start from the same old copy.
  const latest = useRef<Checks>(checks);
  const put = (next: Checks) => { latest.current = next; setChecks(next); };
  const save = () => saveMarks({ id: a.id, checks: latest.current }).then((r) => setErr(r.ok ? null : r.error ?? null));
  // Saved as she goes; a note is saved when its box loses focus.
  const mark = (key: string, v: "ok" | "back") => {
    put({ ...latest.current, [key]: { v, note: latest.current[key]?.note ?? "" } });
    save();
  };
  const act = async (fn: () => Promise<{ ok: boolean; error?: string; note?: string }>) => {
    setBusy(true); setErr(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "That didn't save."); return; }
    if (r.note) setErr(r.note);
    router.refresh();
  };
  // Only the items on the list count: a mark left over from a removed witness doesn't block.
  const current: Checks = Object.fromEntries(items.map((i) => [i.key, checks[i.key]]).filter(([, c]) => c)) as Checks;
  const backs = items.filter((i) => checks[i.key]?.v === "back");
  const allOk = items.every((i) => checks[i.key]?.v === "ok");
  const company = companies.find((c) => c.id === a.company_id);

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
      <div className={`fld-ritem${a.company_id ? " ok" : ""}`}>
        <label className="fld-f" style={{ marginBottom: 4 }}>
          <span>{t.company}</span>
          {editable ? (
            <select value={a.company_id ?? ""} disabled={busy}
              onChange={(e) => e.target.value && act(() => setCompany({ id: a.id, companyId: e.target.value }))}>
              <option value="">{t.pickCompany}</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : <b>{company?.name ?? "—"}</b>}
        </label>
        {editable && <p className="fld-mut" style={{ margin: 0 }}>{t.companyHelp}</p>}
      </div>

      {items.map((i) => {
        const c = checks[i.key];
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
            <Body a={a} k={i.key} statements={statements} photos={photos} files={files} t={t} />
            <Copies list={signatures.filter((g) => i.key === "part2" ? g.kind === "part2" : i.key.startsWith("s:") && g.statement_id === i.key.slice(2))} files={files} t={t} loc={loc} />
            {c?.v === "back" && (open
              ? <input className="fld-note" placeholder={t.whatToFix} value={c.note ?? ""}
                  onChange={(e) => put({ ...latest.current, [i.key]: { v: "back", note: e.target.value } })}
                  onBlur={save} />
              : <div className="fld-alert">↩ {c.note}</div>)}
          </div>
        );
      })}

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
          {allOk && !a.company_id && <p className="fld-mut">{t.setCompanyFirst}</p>}
          {allOk && a.company_id && !signing && <button className="fld-big" onClick={() => setSigning(true)}>{t.signOff}</button>}
          {allOk && a.company_id && signing && (
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
      {a.review_sig_png && <SigView png={a.review_sig_png} name={a.reviewed_name} at={a.reviewed_at} how="own_hand" lang="English" />}
      <Copies list={signatures.filter((g) => g.kind === "review")} files={files} t={t} loc={loc} />
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

function Body({ a, k, statements, photos, files, t }: {
  a: FieldAccident; k: string; statements: FieldStatement[]; photos: FieldFile[]; files: FieldFile[]; t: FieldDict;
}) {
  const kind = Object.fromEntries(t.personKinds)[a.person_kind] ?? a.person_kind;
  if (k === "basics") return (
    <div className="fld-mut">
      {a.location} · {a.person_kind === "rc_employee" ? t.ourEmployee : `${kind}${a.person_employer ? ` — ${a.person_employer}` : ""}`}
      {a.what_doing && <><br />{t.doing} {a.what_doing}</>}
      {a.body_parts && <><br />{t.hurt} {a.body_parts}</>}
    </div>
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
      <blockquote className="fld-quote">
        {a.sup_account}{a.sup_cause && <><br /><b>{t.cause}</b> {a.sup_cause}</>}{a.sup_regs && <><br /><b>{t.safetyInPlace}</b> {a.sup_regs}</>}
      </blockquote>
      {part2Valid(a) ? <SigView png={a.sup_sig_png!} name={a.sup_name} at={a.sup_sig_at} how="own_hand" lang="English" />
        : <div className="fld-alert">{t.notSignedBox}</div>}
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
        {sigValid(s) ? <SigView png={s.sig_png!} name={s.sig_name} at={s.sig_at} how={s.sig_how} lang={s.language} readBy={s.sig_read_by} />
          : s.nosign_reason ? <div className="fld-info">{t.notSignedReason} {t.noSign[s.nosign_reason] ?? s.nosign_reason}{s.nosign_note ? `: ${s.nosign_note}` : ""}</div>
          : <div className="fld-alert">{t.notSignedBox}</div>}
      </>
    );
  }
  return null;
}
