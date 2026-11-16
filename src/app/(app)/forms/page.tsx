import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { session } from "@/lib/session";
import { fieldDict } from "@/lib/fieldLang";
import { fieldJobs } from "@/lib/fieldJobs";
import { currentSite } from "@/lib/site";
import { FORMS, formDef, progress, type Answers } from "@/lib/forms";
import { LOCALE_OF } from "@/lib/locale";
import { StartButtons } from "./StartButtons";
import { MonthCalendar } from "./MonthCalendar";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * DAILY FORMS as a calendar (her ask, 15 Nov: "like a calendar page with
 * clickable links") — the month in the iPhone Calendar's own layout, which her
 * crews know: a dot under each day per form (green signed, orange in
 * progress), tap a day for its forms, and today's day starts new ones.
 * Everything for the site in the header; the CSM's own forms, or everyone's
 * for a Safety Director.
 */
export default async function DailyForms({ searchParams }: { searchParams: Promise<{ m?: string; d?: string }> }) {
  const { m, d } = await searchParams;
  const { user } = await session();
  const supabase = await createClient();
  const [{ t, lang }, jobs, { data: director }] = await Promise.all([
    fieldDict(), fieldJobs(supabase, user!.id), supabase.rpc("is_safety_director"),
  ]);
  const site = await currentSite(jobs);
  if (!site) redirect("/");

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const day = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : day.slice(0, 7);
  const [y, mo] = month.split("-").map(Number);
  const first = new Date(y, mo - 1, 1), last = new Date(y, mo, 0);

  let q = supabase.from("poursafe_forms")
    .select("id, form_key, form_date, status, answers, filled_by, filled_name, drive_status")
    .eq("project_id", site.id).gte("form_date", ymd(first)).lte("form_date", ymd(last))
    .order("created_at", { ascending: true });
  if (director !== true) q = q.eq("filled_by", user!.id);
  const { data: rows } = await q;
  const byDay = new Map<string, NonNullable<typeof rows>>();
  for (const r of rows ?? []) byDay.set(r.form_date, [...(byDay.get(r.form_date) ?? []), r]);
  const list = byDay.get(day) ?? [];
  const todaysLog = (byDay.get(today) ?? []).find((r) => r.form_key === "daily_log" && r.filled_by === user!.id);

  // The last signed Daily Log on this site before today: today's can start from it.
  const { data: prevLog } = await supabase.from("poursafe_forms").select("form_date")
    .eq("project_id", site.id).eq("form_key", "daily_log").eq("status", "submitted").lt("form_date", today)
    .order("form_date", { ascending: false }).limit(1).maybeSingle();
  const loc = LOCALE_OF[lang];
  const lastLog = prevLog ? new Date(`${prevLog.form_date}T12:00:00`).toLocaleDateString(loc, { month: "short", day: "numeric" }) : null;

  return (
    <>
      <div className="fld-head">
        <Link href="/" className="fld-back" aria-label={t.back}>‹</Link>
        <h1 className="fld-h1">{t.secForms}</h1>
      </div>

      <MonthCalendar month={month} day={day} today={today} loc={loc} todayLabel={t.calToday}
        dots={Object.fromEntries([...byDay].map(([k, v]) => [k, v.map((f) => f.status === "submitted")]))} />

      {/* The chosen day, as the office calendar's day card (her ask, 15 Nov):
          the weekday over the date, then a row per form — its dot, its name,
          where it stands, and Open. */}
      <div className="fld-daycard">
        <div className="fld-daycard-h">
          <span className="fld-daycard-dow">{new Date(`${day}T12:00:00`).toLocaleDateString(loc, { weekday: "long" })}</span>
          <span className="fld-daycard-date">{new Date(`${day}T12:00:00`).toLocaleDateString(loc, { month: "long", day: "numeric", year: "numeric" })}</span>
        </div>
        {list.length === 0 && <p className="fld-daycard-empty">{t.calNoForms}</p>}
        {list.map((r) => {
          const def = formDef(r.form_key);
          if (!def) return null;
          const p = progress(def, (r.answers ?? {}) as Answers);
          const signed = r.status === "submitted";
          return (
            <Link key={r.id} href={`/forms/${r.id}`} className="fld-daycard-row">
              <i className={`fld-daycard-dot${signed ? " ok" : " draft"}`} />
              <span className="fld-daycard-main">
                <b>{def.short}</b>
                <span>
                  {signed ? t.formSubmitted : `${t.formDraft} · ${t.formProgress(p.done, p.total)}`}
                  {signed ? ` · ${r.drive_status === "filed" ? t.inDrive : r.drive_status === "no_folder" ? t.formNoFolder : r.drive_status === "failed" ? t.formDriveFailed : t.sending}` : ""}
                  {r.filled_by !== user!.id && r.filled_name ? ` · ${r.filled_name}` : ""}
                </span>
              </span>
              <span className="fld-daycard-open">{t.calOpen} ›</span>
            </Link>
          );
        })}
      </div>

      {/* Starting a form is its own section, not part of the day (her note, 15 Nov). */}
      <h2 className="fld-h2 fld-start-h">{t.calStart}</h2>
      <StartButtons forms={FORMS.map((f) => ({ key: f.key, short: f.short }))} lastLog={lastLog}
        todaysLog={todaysLog ? { id: todaysLog.id, submitted: todaysLog.status === "submitted" } : null} />
    </>
  );
}
