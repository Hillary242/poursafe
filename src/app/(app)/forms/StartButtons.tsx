"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startForm } from "./actions";
import { useT } from "@/app/I18n";

/**
 * One button per form. Today's Daily Log says whether it's started or done —
 * and when there is an earlier log on this site, starting it asks: from that
 * log, or blank (her ask, 15 Nov: "reuse the previous day").
 */
export function StartButtons({ forms, todaysLog, lastLog }: {
  forms: { key: string; short: string }[]; todaysLog: { id: string; submitted: boolean } | null;
  /** The date of the last signed Daily Log here, e.g. "Nov 14" — or null. */
  lastLog: string | null;
}) {
  const router = useRouter();
  const { t } = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const start = async (key: string, fromLast = false) => {
    setBusy(key); setErr(null);
    const r = await startForm(key, { fromLast });
    if (!r.ok || !r.id) { setBusy(null); setErr(r.error ?? "That didn't start."); return; }
    router.push(`/forms/${r.id}`);
  };
  return (
    <div className="fld-formstart">
      {forms.map((f) => {
        const isLog = f.key === "daily_log";
        const sub = isLog ? (todaysLog ? (todaysLog.submitted ? t.formLogDone : t.formLogContinue) : t.formLogStart) : t.formStartNew;
        const click = () => {
          if (isLog && todaysLog) return router.push(`/forms/${todaysLog.id}`);
          if (isLog && lastLog) return setChoosing((c) => !c);
          start(f.key);
        };
        return (
          <div key={f.key}>
            <button type="button" className={`fld-tile${isLog && !todaysLog?.submitted ? " fld-tile-urgent" : ""}`}
              disabled={!!busy} onClick={click} aria-expanded={isLog && lastLog ? choosing : undefined}>
              <span className="fld-tile-ic" aria-hidden>{isLog ? "📋" : "＋"}</span>
              <b>{f.short}</b>
              <small>{busy === f.key ? t.starting : sub}</small>
            </button>
            {isLog && choosing && !todaysLog && lastLog && (
              <div className="fld-startfrom">
                <button type="button" className="fld-big" disabled={!!busy} onClick={() => start("daily_log", true)}>{t.formFromLast(lastLog)}</button>
                <small className="fld-mut">{t.formFromLastHelp}</small>
                <button type="button" className="fld-big ghost" disabled={!!busy} onClick={() => start("daily_log", false)}>{t.formBlank}</button>
              </div>
            )}
          </div>
        );
      })}
      {err && <div className="fld-alert">{err}</div>}
    </div>
  );
}
