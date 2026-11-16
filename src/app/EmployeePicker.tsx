"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { employeeList } from "@/app/actions";
import { useT } from "@/app/I18n";

export type Employee = { id: string; name: string; employee_no: string | null; title: string | null; on_job: boolean };

// One fetch per job per visit: the list is the same for every box on the page.
const cache = new Map<string, Promise<Employee[]>>();
const load = (projectId: string) => {
  if (!cache.has(projectId)) cache.set(projectId, employeeList(projectId).then((r) => r.rows ?? []));
  return cache.get(projectId)!;
};
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * WHO WAS HURT — typed, or picked from the company's employees (0266, her ask
 * 15 Nov): that job's crew first, then everyone else, searchable by name or
 * the six-digit ID. Picking links the report to the person's HR record; typing
 * over a pick unlinks it, so a sub or a visitor is still just typed in.
 */
export function EmployeePicker({ projectId, name, pickedNo, onType, onPick, label, placeholder }: {
  projectId: string | null; name: string; pickedNo: string | null;
  onType: (name: string) => void; onPick: (e: Employee | null) => void;
  label: string; placeholder?: string;
}) {
  const { t } = useT();
  const [list, setList] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    load(projectId ?? "").then((rows) => { if (live) setList(rows); }).catch(() => {});
    return () => { live = false; };
  }, [projectId]);

  // Close when tapping elsewhere.
  useEffect(() => {
    const out = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", out);
    return () => document.removeEventListener("pointerdown", out);
  }, []);

  const q = fold(name.trim());
  const matches = useMemo(() => {
    const hit = q ? list.filter((e) => fold(e.name).includes(q) || (e.employee_no ?? "").includes(q)) : list;
    return hit.slice(0, 40);
  }, [list, q]);
  const crew = matches.filter((e) => e.on_job);
  const rest = matches.filter((e) => !e.on_job);
  const row = (e: Employee) => (
    <button key={e.id} type="button" className="fld-emp" onClick={() => { onPick(e); setOpen(false); }}>
      <b>{e.name}</b>
      <span>{[e.employee_no, e.title].filter(Boolean).join(" · ")}</span>
    </button>
  );

  return (
    <div className="fld-f fld-picker" ref={box}>
      <span>{label}</span>
      <input value={name} placeholder={placeholder ?? t.empSearch} autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => { if (pickedNo) onPick(null); onType(e.target.value); setOpen(true); }} />
      {pickedNo && !open && (
        <div className="fld-picked">
          <span>✓ {t.empLinked(pickedNo)}</span>
          <button type="button" className="fld-link" onClick={() => onPick(null)}>{t.empClear}</button>
        </div>
      )}
      {open && list.length > 0 && (
        <div className="fld-emps" role="listbox">
          {crew.length > 0 && <small>{t.empOnJob}</small>}
          {crew.map(row)}
          {rest.length > 0 && crew.length > 0 && <small>{t.empEveryone}</small>}
          {rest.map(row)}
          {matches.length === 0 && <p className="fld-mut">{t.empNone}</p>}
        </div>
      )}
    </div>
  );
}
