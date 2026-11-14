"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startReport } from "@/app/actions";
import { useT } from "@/app/I18n";

const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/** The things a report can't start without. The rest is the case file. */
export function NewReport({ jobs }: { jobs: { id: string; name: string }[] }) {
  const router = useRouter();
  const { t } = useT();
  const [job, setJob] = useState(jobs.length === 1 ? jobs[0].id : "");
  const [kind, setKind] = useState<"injury" | "illness" | "near_miss">("injury");
  // Filled in on the phone after it loads, so the server's date (UTC) and the
  // phone's never disagree about which day it is.
  const [on, setOn] = useState("");
  useEffect(() => setOn(today()), []);
  const [who, setWho] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const go = async () => {
    setBusy(true); setErr(null);
    const r = await startReport({ projectId: job, kind, occurredOn: on || today(), person: who });
    if (!r.ok || !r.id) { setBusy(false); setErr(r.error ?? "That didn't start."); return; }
    router.push(`/accidents/${r.id}`);
  };

  return (
    <div className="fld-form">
      <div className="fld-seg">
        {([["injury", t.injury], ["near_miss", t.kindNearMiss]] as const).map(([v, l]) => (
          <button key={v} type="button" className={kind === v ? "on" : ""} onClick={() => setKind(v)}>{l}</button>
        ))}
      </div>
      <label className="fld-f"><span>{t.job}</span>
        <select value={job} onChange={(e) => setJob(e.target.value)}>
          <option value="">{t.pickJob}</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
        </select>
      </label>
      <label className="fld-f"><span>{t.when}</span>
        <input type="date" value={on} max={on ? today() : undefined} onChange={(e) => setOn(e.target.value)} />
      </label>
      <label className="fld-f"><span>{kind === "near_miss" ? t.personInvolved : t.whoHurt}</span>
        <input value={who} placeholder={t.fullName} autoComplete="off" onChange={(e) => setWho(e.target.value)} />
      </label>
      {err && <div className="fld-alert">{err}</div>}
      <button className="fld-big" disabled={busy || !job || !who.trim()} onClick={go}>
        {busy ? t.starting : t.startReport}
      </button>
    </div>
  );
}
