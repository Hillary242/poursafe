"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formDef, progress, type Answers, type Item } from "@/lib/forms";
import { saveForm, submitForm } from "../actions";
import { SignPad } from "@/app/SignPad";
import { LOCALE, useT } from "@/app/I18n";
import type { FieldDict } from "@/lib/fieldI18n";

type Form = {
  id: string; form_key: string; form_date: string; status: string; answers: Answers; filled_name: string | null;
  sig_png: string | null; sig_name: string | null; sig_at: string | null; drive_status: string | null; drive_url: string | null;
};

/**
 * A DAILY FORM on the phone (0268). The paper form's sections as cards — tap
 * one open, answer, move on. Everything saves as it goes ("Saved ✓"); at the
 * end the CSM prints their name and signs, and the form becomes a PDF in the
 * job's Drive folder. A signed form is read-only.
 */
export function FormEditor({ form, mine, site, autoTicks, pdfUrl }: {
  form: Form; mine: boolean; site: string; autoTicks: string[]; pdfUrl: string | null;
}) {
  const def = formDef(form.form_key)!;
  const router = useRouter();
  const { t, lang } = useT();
  const editable = mine && form.status === "draft";
  const [a, setA] = useState<Answers>(() => {
    // Section 9 of the Daily Log: today's filed inspections, ticked already.
    if (form.form_key !== "daily_log" || !autoTicks.length) return form.answers;
    const cur = new Set(Array.isArray(form.answers["9"]) ? (form.answers["9"] as string[]) : []);
    autoTicks.forEach((x) => cur.add(x));
    return { ...form.answers, "9": [...cur] };
  });
  const [date, setDate] = useState(form.form_date);
  const [open, setOpen] = useState<string | null>(def.sections[0]?.id ?? null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [png, setPng] = useState<string | null>(null);
  const [name, setName] = useState(String(form.answers.csm_name ?? form.filled_name ?? ""));
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ a, date });
  latest.current = { a, date };

  // Saved as they go: a beat after the last change.
  const queue = () => {
    if (!editable) return;
    if (timer.current) clearTimeout(timer.current);
    setState("saving");
    timer.current = setTimeout(async () => {
      const r = await saveForm({ id: form.id, answers: latest.current.a, date: latest.current.date });
      setState(r.ok ? "saved" : "error");
      if (!r.ok) setErr(r.error ?? null); else setErr(null);
    }, 700);
  };
  useEffect(() => { if (state === "saved") { const h = setTimeout(() => setState("idle"), 1600); return () => clearTimeout(h); } }, [state]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const set = (id: string, v: unknown) => { setA((x) => ({ ...x, [id]: v })); queue(); };

  const submit = async () => {
    if (!png) return;
    if (timer.current) clearTimeout(timer.current);
    setBusy(true); setErr(null);
    const r = await submitForm({ id: form.id, answers: { ...a, csm_name: a.csm_name ?? name }, png, name });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "That didn't submit."); return; }
    setSigning(false);
    router.refresh();
  };

  const p = progress(def, a);
  const loc = LOCALE[lang];
  return (
    <>
      <div className="fld-head">
        <Link href="/forms" className="fld-back" aria-label={t.back}>‹</Link>
        <h1 className="fld-h1">{def.short}</h1>
        <span className={`fld-st ${form.status === "submitted" ? "reviewed" : "draft"}`}>{form.status === "submitted" ? t.formSubmitted : t.formDraft}</span>
      </div>
      <p className="fld-mut fld-form-title">{def.title}</p>
      <div className="fld-form-meta">
        <label className="fld-f">
          <span>{t.formDate}</span>
          {editable ? <input type="date" value={date} onChange={(e) => { setDate(e.target.value); queue(); }} /> : <b>{form.form_date}</b>}
        </label>
        <div className="fld-f fld-ro"><span>{t.formProject}</span><b>{site}</b></div>
      </div>
      {editable && p.total > 0 && <p className="fld-mut fld-progress">{t.formProgress(p.done, p.total)}</p>}

      {form.status === "submitted" && (
        <div className="fld-ok">
          {t.formSignedBy(form.sig_name ?? "", form.sig_at ? new Date(form.sig_at).toLocaleString(loc, { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "")}
          {pdfUrl && <> · <a href={pdfUrl} target="_blank" rel="noreferrer">{t.formOpenPdf}</a></>}
          <br /><small>{form.drive_status === "filed" ? t.inDrive : form.drive_status === "no_folder" ? t.formNoFolder : form.drive_status === "failed" ? t.formDriveFailed : t.sending}</small>
        </div>
      )}

      {def.sections.map((s) => {
        const sp = progress({ ...def, sections: [s] }, a);
        const isOpen = open === s.id;
        return (
          <section key={s.id} className={`fld-fsec${isOpen ? " open" : ""}`}>
            <button type="button" className="fld-fsec-h" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}>
              <b>{s.title}</b>
              {sp.total > 0 && <span className={`fld-fsec-n${sp.done === sp.total ? " done" : ""}`}>{sp.done}/{sp.total}</span>}
              <i aria-hidden>{isOpen ? "▴" : "▾"}</i>
            </button>
            {isOpen && (
              <div className="fld-fsec-b">
                {s.note && <p className="fld-mut fld-help">{s.note}</p>}
                {s.items.map((it) => <Field key={it.id} it={it} a={a} set={set} ro={!editable} t={t} />)}
              </div>
            )}
          </section>
        );
      })}

      {err && <div className="fld-alert">{err}</div>}
      {editable && !signing && (
        <div className="fld-foot">
          <button className="fld-big" onClick={() => setSigning(true)}>{t.formSignSubmit}</button>
        </div>
      )}
      {editable && signing && (
        <div className="fld-card fld-formsign">
          <h2>{t.formSignTitle}</h2>
          {p.done < p.total && <p className="fld-info">{t.formUnanswered(p.total - p.done)}</p>}
          <label className="fld-f"><span>{t.yourName}</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
          <div className="fld-attest"><p>{def.attest}</p></div>
          <SignPad onChange={setPng} hint={t.signHere} clearLabel={t.clear} />
          <button className="fld-big" disabled={!png || !name.trim() || busy} onClick={submit}>{busy ? t.saving : t.formSubmit}</button>
          <button className="fld-link" disabled={busy} onClick={() => setSigning(false)}>{t.back}</button>
        </div>
      )}
      {(state === "saving" || state === "saved") && <div className={`fld-toast${state === "saving" ? " busy" : ""}`} role="status">{state === "saving" ? t.savingDots : t.saved}</div>}
    </>
  );
}

/* ---------------------------------------------------------------------- */

function Field({ it, a, set, ro, t }: { it: Item; a: Answers; set: (id: string, v: unknown) => void; ro: boolean; t: FieldDict }) {
  const v = a[it.id];
  const label = (
    <span className="fld-q">
      {"no" in it && it.no && <em>{it.no}</em>}
      {it.label}
      {"help" in it && it.help && <small>{it.help}</small>}
    </span>
  );
  switch (it.kind) {
    case "info":
      return <div className="fld-qrow fld-qinfo">{label}{it.note && <b>{it.note}</b>}</div>;
    case "yna": case "yn": {
      const opts: [string, string][] = it.kind === "yna" ? [["yes", t.yes], ["no", t.no], ["na", "N/A"]] : [["yes", t.yes], ["no", t.no]];
      return (
        <div className="fld-qrow">
          {label}
          <div className={`fld-yna${it.kind === "yn" ? " two" : ""}`}>
            {opts.map(([k, l]) => (
              <button key={k} type="button" disabled={ro} className={`${v === k ? "on" : ""} ${k}`}
                onClick={() => set(it.id, v === k ? null : k)}>{l}</button>
            ))}
          </div>
        </div>
      );
    }
    case "text": case "number": case "date": case "time":
      return (
        <label className="fld-f fld-qrow">
          {label}
          <input type={it.kind === "text" ? "text" : it.kind} inputMode={it.kind === "number" ? "decimal" : undefined}
            value={String(v ?? "")} disabled={ro} placeholder={it.kind === "text" ? it.placeholder : undefined}
            onChange={(e) => set(it.id, e.target.value)} />
        </label>
      );
    case "long":
      return <label className="fld-f fld-qrow">{label}<textarea rows={3} value={String(v ?? "")} disabled={ro} onChange={(e) => set(it.id, e.target.value)} /></label>;
    case "checks": {
      const list = Array.isArray(v) ? (v as string[]) : [];
      const toggle = (o: string) => set(it.id, list.includes(o) ? list.filter((x) => x !== o) : [...list, o]);
      return (
        <div className="fld-qrow">
          {label}
          <div className="fld-chips">
            {it.options.map((o) => <button key={o} type="button" disabled={ro} className={list.includes(o) ? "on" : ""} onClick={() => toggle(o)}>{o}</button>)}
          </div>
          {it.other && (
            <input className="fld-other" placeholder={t.formOther} value={String(a[`${it.id}__other`] ?? "")} disabled={ro}
              onChange={(e) => set(`${it.id}__other`, e.target.value)} />
          )}
        </div>
      );
    }
    case "net": {
      const n = (v ?? {}) as { v?: string; time?: string; comment?: string; corrected?: boolean };
      const put = (patch: Partial<typeof n>) => set(it.id, { ...n, ...patch });
      return (
        <div className="fld-qrow fld-net">
          {label}
          <div className="fld-yna two">
            {([["yes", t.yes], ["no", t.no]] as const).map(([k, l]) => (
              <button key={k} type="button" disabled={ro} className={`${n.v === k ? "on" : ""} ${k}`} onClick={() => put({ v: n.v === k ? undefined : k })}>{l}</button>
            ))}
          </div>
          <div className="fld-net-more">
            <input type="time" value={n.time ?? ""} disabled={ro} aria-label={t.formTime} onChange={(e) => put({ time: e.target.value })} />
            <input value={n.comment ?? ""} placeholder={t.formComments} disabled={ro} onChange={(e) => put({ comment: e.target.value })} />
            <label className="fld-net-fix"><input type="checkbox" checked={!!n.corrected} disabled={ro} onChange={(e) => put({ corrected: e.target.checked })} />{t.formCorrected}</label>
          </div>
        </div>
      );
    }
    case "person":
      return (
        <label className="fld-f fld-qrow">{label}
          <input value={String(v ?? "")} disabled={ro} onChange={(e) => set(it.id, e.target.value)} />
        </label>
      );
    case "rows": {
      const rows = Array.isArray(v) ? (v as Answers[]) : [];
      const put = (i: number, id: string, val: unknown) => set(it.id, rows.map((r, j) => (j === i ? { ...r, [id]: val } : r)));
      return (
        <div className="fld-qrows">
          {rows.map((r, i) => (
            <div key={i} className="fld-qrows-row">
              <div className="fld-qrows-h"><b>{it.rowLabel} {i + 1}</b>
                {!ro && <button type="button" className="fld-link danger" onClick={() => set(it.id, rows.filter((_, j) => j !== i))}>{t.formRemoveRow}</button>}
              </div>
              {it.fields.map((f) => <Field key={f.id} it={f} a={r} set={(id, val) => put(i, id, val)} ro={ro} t={t} />)}
            </div>
          ))}
          {!ro && <button type="button" className="fld-big ghost" onClick={() => set(it.id, [...rows, {}])}>+ {it.addLabel}</button>}
          {ro && rows.length === 0 && <p className="fld-mut">—</p>}
        </div>
      );
    }
  }
}
