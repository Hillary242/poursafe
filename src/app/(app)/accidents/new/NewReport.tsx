"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setEmployee, startReport } from "@/app/actions";
import { EmployeePicker, type Employee } from "@/app/EmployeePicker";
import { useT } from "@/app/I18n";

const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/** The things a report can't start without. The rest is the case file. */
export function NewReport({ jobs, site }: { jobs: { id: string; name: string }[]; site: { id: string; name: string } | null }) {
  const router = useRouter();
  const { t } = useT();
  const [job, setJob] = useState(site?.id ?? (jobs.length === 1 ? jobs[0].id : ""));
  const [kind, setKind] = useState<"injury" | "illness" | "near_miss">("injury");
  // Filled in on the phone after it loads, so the server's date (UTC) and the
  // phone's never disagree about which day it is.
  const [on, setOn] = useState("");
  useEffect(() => setOn(today()), []);
  const [who, setWho] = useState("");
  const [pick, setPick] = useState<Employee | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const go = async () => {
    setBusy(true); setErr(null);
    const r = await startReport({ projectId: job, kind, occurredOn: on || today(), person: who });
    if (!r.ok || !r.id) { setBusy(false); setErr(r.error ?? "That didn't start."); return; }
    // Picked from the list: link the report to that employee (0266).
    if (pick) await setEmployee({ id: r.id, employeeId: pick.id });
    router.push(`/accidents/${r.id}`);
  };

  return (
    <div className="fld-form">
      <div className="fld-seg">
        {([["injury", t.injury], ["near_miss", t.kindNearMiss]] as const).map(([v, l]) => (
          <button key={v} type="button" className={kind === v ? "on" : ""} onClick={() => setKind(v)}>{l}</button>
        ))}
      </div>
      {site ? (
        <div className="fld-f fld-ro"><span>{t.site}</span><b>{site.name}</b></div>
      ) : (
        <label className="fld-f"><span>{t.job}</span>
          <select value={job} onChange={(e) => setJob(e.target.value)}>
            <option value="">{t.pickJob}</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        </label>
      )}
      <label className="fld-f"><span>{t.when}</span>
        <input type="date" value={on} max={on ? today() : undefined} onChange={(e) => setOn(e.target.value)} />
      </label>
      <EmployeePicker projectId={job || null} name={who} pickedNo={pick?.employee_no ?? (pick ? "—" : null)}
        label={kind === "near_miss" ? t.personInvolved : t.whoHurt}
        onType={setWho} onPick={(e) => { setPick(e); if (e) setWho(e.name); }} />
      {err && <div className="fld-alert">{err}</div>}
      <button className="fld-big" disabled={busy || !job || !who.trim()} onClick={go}>
        {busy ? t.starting : t.startReport}
      </button>
    </div>
  );
}
