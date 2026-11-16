"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startForm } from "./actions";
import { useT } from "@/app/I18n";

/** One button per form; the Daily Log's says whether today's is started or done. */
export function StartButtons({ forms, todaysLog }: {
  forms: { key: string; short: string }[]; todaysLog: { id: string; submitted: boolean } | null;
}) {
  const router = useRouter();
  const { t } = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const start = async (key: string) => {
    setBusy(key); setErr(null);
    const r = await startForm(key);
    if (!r.ok || !r.id) { setBusy(null); setErr(r.error ?? "That didn't start."); return; }
    router.push(`/forms/${r.id}`);
  };
  return (
    <div className="fld-formstart">
      {forms.map((f) => {
        const isLog = f.key === "daily_log";
        const sub = isLog ? (todaysLog ? (todaysLog.submitted ? t.formLogDone : t.formLogContinue) : t.formLogStart) : t.formStartNew;
        return (
          <button key={f.key} type="button" className={`fld-tile${isLog && !todaysLog?.submitted ? " fld-tile-urgent" : ""}`}
            disabled={!!busy} onClick={() => (isLog && todaysLog ? router.push(`/forms/${todaysLog.id}`) : start(f.key))}>
            <span className="fld-tile-ic" aria-hidden>{isLog ? "📋" : "＋"}</span>
            <b>{f.short}</b>
            <small>{busy === f.key ? t.starting : sub}</small>
          </button>
        );
      })}
      {err && <div className="fld-alert">{err}</div>}
    </div>
  );
}
