"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LANGS, PART2_ATTEST, attestFor, caseItems, fmtWhen, part2Text, part2Valid, sigValid, signedText,
  type FieldAccident, type FieldFile, type FieldStatement,
} from "@/lib/field";
import type { FieldDict } from "@/lib/fieldI18n";
import {
  addWitness, queuePhoto, recordNoSign, removeWitness, saveReport, saveStatement, setPrivate,
  signPart2, signStatement, submitReport,
} from "@/app/actions";
import { SignPad } from "@/app/SignPad";
import { LOCALE, useT } from "@/app/I18n";

type Sheet =
  | { k: "basics" } | { k: "private" } | { k: "photos" } | { k: "part2" } | { k: "sign2" }
  | { k: "statement"; id: string } | { k: "sign"; id: string } | { k: "nosign"; id: string };

/**
 * THE CASE FILE, on the foreman's phone.
 *
 * One checklist; each line opens a screen of its own. Everything saves as it
 * goes — there is no "save the report" step to forget on a job site — and the
 * list says what is still to do before it can go to the Safety Director.
 *
 * Every word comes from lib/fieldI18n in the language picked at the top. No
 * company is named anywhere here (her rule, 14 Nov).
 */
export function CaseFile({ a, statements, files, jobName, mine }: {
  a: FieldAccident; statements: FieldStatement[]; files: FieldFile[]; jobName: string; mine: boolean;
}) {
  const router = useRouter();
  const { t, lang } = useT();
  const loc = LOCALE[lang];
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = !mine || a.field_status === "submitted" || a.field_status === "reviewed";
  const photos = files.filter((f) => f.kind === "photo");
  const items = caseItems(a, statements, photos.length, t);
  const todo = items.filter((i) => !i.done);
  const st = (id: string) => statements.find((s) => s.id === id)!;
  const close = () => { setSheet(null); setErr(null); setNote(null); };
  // Every write ends the same way: say what went wrong, or fetch the new truth.
  // A note is for something that worked with a caveat — "signed, but the PDF
  // copy didn't reach Drive".
  const run = async (fn: () => Promise<{ ok: boolean; error?: string; id?: string; note?: string }>, after?: (id?: string) => void) => {
    setBusy(true); setErr(null); setNote(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "That didn't save."); return false; }
    if (r.note) setNote(r.note);
    router.refresh();
    after?.(r.id);
    return true;
  };

  if (sheet) {
    const common = { a, busy, err: err ?? note, close, run, t, loc };
    /* A statement just added (a new witness) exists on the server before the
       refreshed page brings it here. Wait for it rather than opening a screen
       for a row this page doesn't have yet — that crashed the app (14 Nov). */
    if ((sheet.k === "statement" || sheet.k === "sign" || sheet.k === "nosign") && !statements.some((s) => s.id === sheet.id)) {
      return <p className="fld-mut" style={{ padding: "24px 0", textAlign: "center" }}>{t.opening}</p>;
    }
    switch (sheet.k) {
      case "basics": return <Basics {...common} />;
      case "private": return <Private {...common} />;
      case "photos": return <Photos {...common} photos={photos} />;
      case "part2": return <Part2 {...common} sign={() => setSheet({ k: "sign2" })} />;
      case "sign2": return (
        <SignScreen self listed={a.supervisor_name ?? ""} lang="English" text={part2Text(a)} busy={busy} err={err}
          collector={a.supervisor_name ?? ""}
          back={() => setSheet({ k: "part2" })}
          done={({ png }) => run(() => signPart2({ id: a.id, png }), () => setSheet({ k: "part2" }))} />
      );
      case "statement": return (
        <Statement {...common} s={st(sheet.id)} files={files}
          sign={() => setSheet({ k: "sign", id: sheet.id })}
          cant={() => setSheet({ k: "nosign", id: sheet.id })} />
      );
      case "sign": {
        const s = st(sheet.id);
        return (
          <SignScreen listed={s.name ?? ""} lang={s.language || "English"} text={s.paper ? null : (s.statement ?? "")}
            collector={a.supervisor_name ?? ""}
            busy={busy} err={err} back={() => setSheet({ k: "statement", id: sheet.id })}
            done={({ png, how, signer, readBy }) => run(
              () => signStatement({ accidentId: a.id, id: s.id, png, how, signer, readBy, language: s.language }),
              () => setSheet({ k: "statement", id: sheet.id }))} />
        );
      }
      case "nosign": return <NoSign {...common} s={st(sheet.id)} back={() => setSheet({ k: "statement", id: sheet.id })} />;
    }
  }

  const back = (key: string) => (a.field_checks[key]?.v === "back" ? a.field_checks[key].note || t.needsFixing : null);

  return (
    <>
      <div className="fld-head">
        <Link href="/accidents" className="fld-back" aria-label={t.back}>‹</Link>
        <h1 className="fld-h1">{a.case_no ?? t.report}</h1>
        <span className={`fld-st ${a.field_status}`}>{t.status[a.field_status]}</span>
      </div>
      <div className="fld-sub">
        <b>{a.person_name || t.whoWasHurtQ}</b>
        {jobName && <span className="fld-mut">{jobName}</span>}
      </div>

      {a.field_status === "returned" && <div className="fld-alert">{t.sentBackBanner}</div>}
      {a.field_status === "submitted" && <div className="fld-info">{t.withReviewer}</div>}
      {a.field_status === "reviewed" && (
        <div className="fld-ok">{t.reviewedBy(a.reviewed_name ?? "", fmtWhen(a.reviewed_at, loc))}</div>
      )}

      <div className="fld-list">
        {items.map((i) => {
          const fix = back(i.key);
          const open = () => {
            if (locked) return;
            if (i.key.startsWith("s:")) setSheet({ k: "statement", id: i.key.slice(2) });
            else setSheet({ k: i.key as "basics" | "private" | "photos" | "part2" });
          };
          return (
            <button key={i.key} className={`fld-item${i.done ? " done" : ""}${fix ? " back" : ""}`} onClick={open} disabled={locked}>
              <span className="fld-tick" aria-hidden>{i.done ? "✓" : ""}</span>
              <span className="fld-item-t">
                {i.label}
                <small>{subline(a, statements, photos.length, i.key, t, loc)}</small>
                {fix && <em>↩ {fix}</em>}
              </span>
              {!locked && <span className="fld-chev" aria-hidden>›</span>}
            </button>
          );
        })}
        {!locked && (
          <button className="fld-add" disabled={busy}
            onClick={() => run(() => addWitness(a.id), (id) => id && setSheet({ k: "statement", id }))}>
            {t.addWitness}
          </button>
        )}
      </div>

      {err && <div className="fld-alert">{err}</div>}
      {!locked && (
        <div className="fld-foot">
          {todo.length > 0 && <p className="fld-mut">{t.stillToDo} {todo.map((x) => x.label).join(", ")}</p>}
          <button className="fld-big" disabled={busy || todo.length > 0}
            onClick={() => run(() => submitReport(a.id))}>
            {a.field_status === "returned" ? t.submitAgain : t.submit}
          </button>
        </div>
      )}
    </>
  );
}

function subline(a: FieldAccident, statements: FieldStatement[], photos: number, key: string, t: FieldDict, loc: string) {
  const s = (x: FieldStatement) =>
    x.nosign_reason ? t.noSign[x.nosign_reason] ?? x.nosign_reason
    : x.sig_png && !sigValid(x) ? t.subChanged
    : x.sig_png ? `${t.subSigned(fmtWhen(x.sig_at, loc))}${x.language && x.language !== "English" ? ` · ${t.langNames[x.language] ?? x.language}` : ""}`
    : signedText(x) && signedText(x) !== "[paper:]" ? t.subNotSigned : t.subNotTaken;
  if (key === "basics") return a.location ? `${a.occurred_on ?? ""} ${a.occurred_at?.slice(0, 5) ?? ""} · ${a.location}` : t.subBasics;
  if (key === "private") return a.private_entered ? t.subPrivateDone : t.subPrivate;
  if (key.startsWith("s:")) { const x = statements.find((y) => y.id === key.slice(2)); return x ? s(x) : ""; }
  if (key === "photos") return photos ? t.subPhotos(photos) : t.subNone;
  if (key === "part2") return part2Valid(a) ? t.subSigned(fmtWhen(a.sup_sig_at, loc))
    : a.sup_sig_png ? t.subChanged : t.subPart2;
  return "";
}

/* ---------------------------------------------------------------------- */

type Common = {
  a: FieldAccident; busy: boolean; err: string | null; close: () => void; t: FieldDict; loc: string;
  run: (fn: () => Promise<{ ok: boolean; error?: string; id?: string }>, after?: (id?: string) => void) => Promise<boolean>;
};

function Screen({ title, back, children, foot, err }: {
  title: string; back: () => void; children: React.ReactNode; foot?: React.ReactNode; err?: string | null;
}) {
  const { t } = useT();
  return (
    <>
      <div className="fld-head">
        <button className="fld-back" onClick={back} aria-label={t.back}>‹</button>
        <h1 className="fld-h1">{title}</h1>
      </div>
      <div className="fld-form">{children}</div>
      {err && <div className="fld-alert">{err}</div>}
      {foot && <div className="fld-foot">{foot}</div>}
    </>
  );
}

function Basics({ a, busy, err, close, run, t }: Common) {
  const [f, setF] = useState({
    kind: a.kind, occurred_on: a.occurred_on ?? "", occurred_at: a.occurred_at?.slice(0, 5) ?? "", location: a.location ?? "",
    person_name: a.person_name ?? "", person_kind: a.person_kind, person_employer: a.person_employer ?? "",
    what_doing: a.what_doing ?? "", body_parts: a.body_parts ?? "",
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Screen title={t.itemBasics} back={close} err={err}
      foot={<button className="fld-big" disabled={busy} onClick={() => run(() => saveReport({ id: a.id, patch: f }), close)}>{busy ? t.saving : t.save}</button>}>
      <div className="fld-seg">
        {([["injury", t.injury], ["near_miss", t.kindNearMiss]] as const).map(([v, l]) => (
          <button key={v} type="button" className={f.kind === v ? "on" : ""} onClick={() => set("kind", v)}>{l}</button>
        ))}
      </div>
      <div className="fld-2">
        <label className="fld-f"><span>{t.date}</span><input type="date" value={f.occurred_on} onChange={(e) => set("occurred_on", e.target.value)} /></label>
        <label className="fld-f"><span>{t.time}</span><input type="time" value={f.occurred_at} onChange={(e) => set("occurred_at", e.target.value)} /></label>
      </div>
      <label className="fld-f"><span>{t.where}</span><input value={f.location} placeholder={t.wherePh} onChange={(e) => set("location", e.target.value)} /></label>
      <label className="fld-f"><span>{f.kind === "near_miss" ? t.personInvolved : t.whoHurt}</span>
        <input value={f.person_name} onChange={(e) => set("person_name", e.target.value)} /></label>
      <label className="fld-f"><span>{t.theyAre}</span>
        <select value={f.person_kind} onChange={(e) => set("person_kind", e.target.value)}>
          {t.personKinds.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select></label>
      {f.person_kind === "subcontractor" && (
        <label className="fld-f"><span>{t.whichSub}</span><input value={f.person_employer} onChange={(e) => set("person_employer", e.target.value)} /></label>
      )}
      <label className="fld-f"><span>{t.whatDoing}</span><textarea rows={2} value={f.what_doing} onChange={(e) => set("what_doing", e.target.value)} /></label>
      {f.kind !== "near_miss" && (
        <label className="fld-f"><span>{t.bodyPart}</span><input value={f.body_parts} onChange={(e) => set("body_parts", e.target.value)} /></label>
      )}
    </Screen>
  );
}

function Private({ a, busy, err, close, run, t }: Common) {
  const [v, setV] = useState({ dob: "", phone: "", address: "", no: "" });
  if (a.private_entered) {
    return (
      <Screen title={t.privateTitle} back={close}>
        <div className="fld-info">{t.privateEntered}</div>
        <p className="fld-mut">{t.privateChange}</p>
      </Screen>
    );
  }
  return (
    <Screen title={t.privateTitle} back={close} err={err}
      foot={<button className="fld-big" disabled={busy || !v.dob || !v.phone}
        onClick={() => run(() => setPrivate({ id: a.id, dob: v.dob, phone: v.phone, address: v.address, employeeNo: v.no }), close)}>
        {busy ? t.saving : t.privateSave}</button>}>
      <div className="fld-info">{t.privateWarn}</div>
      <label className="fld-f"><span>{t.dob}</span><input type="date" value={v.dob} onChange={(e) => setV({ ...v, dob: e.target.value })} /></label>
      <label className="fld-f"><span>{t.phone}</span><input type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></label>
      <label className="fld-f"><span>{t.address}</span><input value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} /></label>
      <label className="fld-f"><span>{t.employeeId}</span><input value={v.no} inputMode="numeric" onChange={(e) => setV({ ...v, no: e.target.value })} /></label>
    </Screen>
  );
}

/** Upload one or more photos: straight to private storage, then queued (or held) for Drive. */
function usePhotoUpload(a: FieldAccident, run: Common["run"], t: FieldDict) {
  const [progress, setProgress] = useState<string | null>(null);
  const upload = async (list: FileList | null, kind: "photo" | "statement", statementId?: string) => {
    if (!list?.length) return;
    const files = Array.from(list);
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setProgress(files.length > 1 ? t.uploadingN(i + 1, files.length) : t.uploading);
      const path = `${a.id}/${crypto.randomUUID()}-${(f.name || "photo.jpg").replace(/[^\w.\- ]+/g, "_")}`;
      const { error } = await createClient().storage.from("safety-uploads").upload(path, f, { contentType: f.type || "image/jpeg" });
      if (error) { setProgress(null); await run(async () => ({ ok: false, error: error.message })); return; }
      const ok = await run(() => queuePhoto({ accidentId: a.id, path, name: f.name || "photo.jpg", mime: f.type || null, size: f.size, kind, statementId }));
      if (!ok) { setProgress(null); return; }
    }
    setProgress(null);
  };
  return { progress, upload };
}

const fileState = (f: FieldFile, t: FieldDict) =>
  f.drive_status === "filed" ? t.inDrive : f.drive_status === "held" ? t.heldTillReview : t.sending;

function Photos({ a, err, close, run, photos, t }: Common & { photos: FieldFile[] }) {
  const { progress, upload } = usePhotoUpload(a, run, t);
  const input = useRef<HTMLInputElement>(null);
  return (
    <Screen title={t.photosTitle} back={close} err={err}
      foot={<button className="fld-big" disabled={!!progress} onClick={() => input.current?.click()}>{progress ?? t.takePhotos}</button>}>
      <p className="fld-mut">{t.photosHelp}</p>
      <input ref={input} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { upload(e.target.files, "photo"); e.target.value = ""; }} />
      <div className="fld-photos">
        {photos.map((p) => (
          <span key={p.id} className="fld-photo">
            {p.drive_source_url ? <img src={p.drive_source_url} alt={p.name} /> : <i>📷</i>}
            <small>{fileState(p, t)}</small>
          </span>
        ))}
        {photos.length === 0 && <p className="fld-mut">{t.noneYet}</p>}
      </div>
    </Screen>
  );
}

function Statement({ a, s, files, busy, err, close, run, sign, cant, t, loc }: Common & {
  s: FieldStatement; files: FieldFile[]; sign: () => void; cant: () => void;
}) {
  const [f, setF] = useState({
    name: s.name ?? "", phone: s.phone ?? "", employer: s.employer ?? "", language: s.language || "English",
    statement: s.statement ?? "", paper: s.paper,
  });
  // Keep the form in step when the server's copy changes under it (after a save).
  useEffect(() => { setF((x) => ({ ...x, paper: s.paper })); }, [s.paper]);
  const { progress, upload } = usePhotoUpload(a, run, t);
  const paperInput = useRef<HTMLInputElement>(null);
  const valid = sigValid(s);
  const changed = f.statement.trim() !== (s.statement ?? "").trim() || f.name !== (s.name ?? "")
    || f.phone !== (s.phone ?? "") || f.employer !== (s.employer ?? "") || f.language !== (s.language || "English") || f.paper !== s.paper;
  const stale = !!s.sig_png && (!valid || (f.statement.trim() !== (s.sig_text ?? "") && !s.paper));
  const paperFile = files.find((x) => x.id === s.paper_file_id);
  const injured = s.role === "injured";
  const save = () => run(() => saveStatement({ accidentId: a.id, id: s.id, patch: f }));
  const hasText = f.paper ? !!s.paper_file_id : !!f.statement.trim();

  return (
    <Screen title={injured ? (a.kind === "near_miss" ? t.personInvolved : t.injuredWorker) : t.witness}
      back={async () => { if (changed) await save(); close(); }} err={err}
      foot={valid && !changed ? <button className="fld-big ghost" onClick={close}>{t.done}</button> : (
        <>
          <button className="fld-big" disabled={busy || !f.name.trim() || !hasText}
            onClick={async () => { if (changed && !(await save())) return; sign(); }}>
            {t.handPhone(f.name.trim())}
          </button>
          <button className="fld-link" disabled>{t.textLinkSoon}</button>
          <button className="fld-link" onClick={async () => { if (changed) await save(); cant(); }}>{t.cantSign}</button>
        </>
      )}>
      {!injured && (
        <>
          <label className="fld-f"><span>{t.name}</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <div className="fld-2">
            <label className="fld-f"><span>{t.phone}</span><input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
            <label className="fld-f"><span>{t.worksFor}</span><input value={f.employer} onChange={(e) => setF({ ...f, employer: e.target.value })} /></label>
          </div>
        </>
      )}
      {injured && <p className="fld-mut">{t.ownAccount(f.name)}</p>}
      <label className="fld-f"><span>{t.givenIn}</span>
        <select value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}>
          {LANGS.map((l) => <option key={l} value={l}>{t.langNames[l] ?? l}</option>)}
        </select></label>
      <div className="fld-seg sm">
        <button type="button" className={!f.paper ? "on" : ""} onClick={() => setF({ ...f, paper: false })}>{t.typeIt}</button>
        <button type="button" className={f.paper ? "on" : ""} onClick={() => setF({ ...f, paper: true })}>{t.photoOfPaper}</button>
      </div>
      {f.paper ? (
        <div className="fld-paper">
          {paperFile ? <>📄 {paperFile.name}<br /><small>{fileState(paperFile, t)}</small></>
            : <>{t.paperPrompt}<br /><small>{t.paperBoth}</small></>}
          <input ref={paperInput} type="file" accept="image/*,application/pdf" capture="environment" hidden
            onChange={async (e) => { const l = e.target.files; e.target.value = ""; if (changed) await save(); upload(l, "statement", s.id); }} />
          <button className="fld-link" disabled={!!progress} onClick={() => paperInput.current?.click()}>
            {progress ?? (paperFile ? t.retakePhoto : t.takePhoto)}
          </button>
        </div>
      ) : (
        <label className="fld-f"><span>{t.ownWords}</span>
          <textarea rows={7} value={f.statement} placeholder={t.ownWordsPh}
            onChange={(e) => setF({ ...f, statement: e.target.value })} />
        </label>
      )}
      {stale && <div className="fld-alert">{t.changedAfter(s.sig_name ?? "")}</div>}
      {valid && !stale && <SigView png={s.sig_png!} name={s.sig_name} at={s.sig_at} how={s.sig_how} lang={s.language} readBy={s.sig_read_by} />}
      {s.nosign_reason && !valid && (
        <div className="fld-info">{t.notSigned} <b>{t.noSign[s.nosign_reason] ?? s.nosign_reason}</b>{s.nosign_note ? ` — ${s.nosign_note}` : ""}</div>
      )}
      {!injured && (
        <button className="fld-link danger" disabled={busy}
          onClick={() => { if (confirm(t.removeWitnessQ)) run(() => removeWitness({ accidentId: a.id, id: s.id }), close); }}>
          {t.removeWitness}
        </button>
      )}
    </Screen>
  );
}

/**
 * The phone, handed over. Big type, the statement in front of them, one
 * sentence of what they are agreeing to — in the language the STATEMENT was
 * given in, with English under it — and the box.
 */
export function SignScreen({ self = false, listed, lang, text, back, done, busy, err, collector }: {
  /** The foreman signing his own Part Two. */
  self?: boolean;
  listed: string; lang: string; text: string | null; back: () => void; busy: boolean; err: string | null;
  /** The foreman whose phone this is — the usual reader of a read-back statement. */
  collector: string;
  done: (r: { png: string; how: "own_hand" | "read_back"; signer: string; readBy: string }) => void;
}) {
  const { t } = useT();
  const [png, setPng] = useState<string | null>(null);
  const [how, setHow] = useState<"own_hand" | "read_back">("own_hand");
  // The signer gives their own name — not the one the foreman typed.
  const [signer, setSigner] = useState(listed);
  const [readBy, setReadBy] = useState(collector);
  const att = self ? null : attestFor(lang, how, readBy);
  const ready = !!png && (self || (signer.trim() && (how === "own_hand" || readBy.trim())));
  return (
    <Screen title={t.signTitle} back={back} err={err}
      foot={<button className="fld-big" disabled={!ready || busy}
        onClick={() => png && done({ png, how, signer: signer.trim(), readBy: readBy.trim() })}>{busy ? t.saving : t.sign}</button>}>
      {!self && <p className="fld-mut">{t.handTo(listed)}</p>}
      <div className="fld-sign-who">{self ? t.yourSignature : signer || listed || t.signer}</div>
      {text !== null ? <div className="fld-sign-text">{text}</div> : <div className="fld-paper">{t.paperInPhoto}</div>}
      {!self && (
        <>
          <div className="fld-seg sm">
            <button type="button" className={how === "own_hand" ? "on" : ""} onClick={() => setHow("own_hand")}>{t.iWroteThis}</button>
            <button type="button" className={how === "read_back" ? "on" : ""} onClick={() => setHow("read_back")}>{t.readBack}</button>
          </div>
          {how === "read_back" && (
            <label className="fld-f"><span>{t.readBackBy}</span>
              <input value={readBy} onChange={(e) => setReadBy(e.target.value)} placeholder={t.readBackPh} /></label>
          )}
          <label className="fld-f"><span>{t.yourName}</span>
            <input value={signer} onChange={(e) => setSigner(e.target.value)} placeholder={t.yourNamePh} autoComplete="off" /></label>
        </>
      )}
      {att ? (
        <div className="fld-attest">
          {att.native && <p lang={lang === "Spanish" ? "es" : lang === "Portuguese" ? "pt" : lang === "Polish" ? "pl" : undefined}><b>{att.native}</b></p>}
          <p className={att.native ? "fld-attest-en" : ""}>{att.english}</p>
        </div>
      ) : <div className="fld-attest"><p>{PART2_ATTEST}</p></div>}
      <SignPad onChange={setPng} hint={t.signHere} clearLabel={t.clear} />
    </Screen>
  );
}

function NoSign({ a, s, busy, err, run, back, t }: Common & { s: FieldStatement; back: () => void }) {
  const [reason, setReason] = useState(s.nosign_reason ?? "refused");
  const [note, setNote] = useState(s.nosign_note ?? "");
  return (
    <Screen title={t.cantSignTitle} back={back} err={err}
      foot={<button className="fld-big" disabled={busy} onClick={() => run(() => recordNoSign({ accidentId: a.id, id: s.id, reason, note }), back)}>{t.recordIt}</button>}>
      <p className="fld-mut">{t.cantSignHelp(s.name ?? "")}</p>
      {Object.entries(t.noSign).map(([k, l]) => (
        <label key={k} className="fld-radio"><input type="radio" checked={reason === k} onChange={() => setReason(k)} />{l}</label>
      ))}
      <label className="fld-f"><span>{t.note}</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePh} /></label>
    </Screen>
  );
}

function Part2({ a, busy, err, close, run, sign, t }: Common & { sign: () => void }) {
  const [f, setF] = useState({ sup_account: a.sup_account ?? "", sup_cause: a.sup_cause ?? "", sup_regs: a.sup_regs ?? "" });
  const changed = f.sup_account !== (a.sup_account ?? "") || f.sup_cause !== (a.sup_cause ?? "") || f.sup_regs !== (a.sup_regs ?? "");
  const valid = part2Valid(a) && !changed;
  const save = () => run(() => saveReport({ id: a.id, patch: f }));
  return (
    <Screen title={t.part2Title} back={async () => { if (changed) await save(); close(); }} err={err}
      foot={valid ? <button className="fld-big ghost" onClick={close}>{t.done}</button>
        : <button className="fld-big" disabled={busy || !f.sup_cause.trim()} onClick={async () => { if (changed && !(await save())) return; sign(); }}>{t.signPart2}</button>}>
      <label className="fld-f"><span>{t.part2How}</span>
        <textarea rows={4} value={f.sup_account} onChange={(e) => setF({ ...f, sup_account: e.target.value })} /></label>
      <label className="fld-f"><span>{t.part2Cause}</span>
        <textarea rows={3} value={f.sup_cause} onChange={(e) => setF({ ...f, sup_cause: e.target.value })} /></label>
      <label className="fld-f"><span>{t.part2Regs}</span>
        <input value={f.sup_regs} onChange={(e) => setF({ ...f, sup_regs: e.target.value })} /></label>
      {a.sup_sig_png && (!part2Valid(a) || changed) && <div className="fld-alert">{t.part2Changed}</div>}
      {valid && <SigView png={a.sup_sig_png!} name={a.sup_name} at={a.sup_sig_at} how="own_hand" lang="English" />}
    </Screen>
  );
}

export function SigView({ png, name, at, how, lang, readBy }: {
  png: string; name: string | null; at: string | null; how: string | null; lang: string | null; readBy?: string | null;
}) {
  const { t, lang: ui } = useT();
  return (
    <div className="fld-sig">
      <img src={png} alt={name ?? ""} />
      <div>
        <b>{name}</b>
        <span>
          {fmtWhen(at, LOCALE[ui])} · {how === "read_back" ? t.readBackShort(readBy ?? null) : t.ownHand}
          {lang && lang !== "English" ? ` · ${t.langNames[lang] ?? lang}` : ""}
        </span>
      </div>
    </div>
  );
}
