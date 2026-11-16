import Link from "next/link";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * The month, in the iPhone Calendar's layout (her team knows it): a dot under
 * each day per form — green signed, orange in progress — today in orange, the
 * chosen day filled. Every day is a link (?m=YYYY-MM&d=YYYY-MM-DD).
 */
export function MonthCalendar({ month, day, today, loc, dots, todayLabel }: {
  month: string; day: string; today: string; loc: string; todayLabel: string;
  /** For each day with forms: true = signed, false = in progress. */
  dots: Record<string, boolean[]>;
}) {
  const [y, mo] = month.split("-").map(Number);
  const first = new Date(y, mo - 1, 1), last = new Date(y, mo, 0);
  const prev = ymd(new Date(y, mo - 2, 1)).slice(0, 7), next = ymd(new Date(y, mo, 1)).slice(0, 7);
  const cells: (Date | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: last.getDate() }, (_, i) => new Date(y, mo - 1, i + 1))];
  while (cells.length % 7) cells.push(null);
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2026, 10, 1 + i).toLocaleDateString(loc, { weekday: "narrow" }));
  const href = (mm: string, dd?: string) => `/forms?m=${mm}${dd ? `&d=${dd}` : ""}`;
  return (
    <div className="fld-cal">
      {/* Apple Calendar's header (her rule): the month big on the left, the
          year under it, and "‹ Today ›" joined on the right. */}
      <div className="fld-cal-h">
        <div className="fld-cal-title">
          <b>{first.toLocaleDateString(loc, { month: "long" })}</b>
          <span>{y}</span>
        </div>
        <div className="fld-cal-seg">
          <Link href={href(prev)} aria-label="‹">‹</Link>
          <Link href="/forms" className="fld-cal-segtoday">{todayLabel}</Link>
          <Link href={href(next)} aria-label="›">›</Link>
        </div>
      </div>
      <div className="fld-cal-grid">
        {weekdays.map((w, i) => <span key={i} className="fld-cal-wd">{w}</span>)}
        {cells.map((c, i) => {
          if (!c) return <span key={i} />;
          const k = ymd(c);
          const forms = dots[k] ?? [];
          return (
            <Link key={i} href={href(month, k)} scroll={false}
              className={`fld-cal-day${k === day ? " on" : ""}${k === today ? " today" : ""}`}>
              <span className="fld-cal-n">{c.getDate()}</span>
              <span className="fld-cal-dots">
                {forms.slice(0, 4).map((ok, j) => <i key={j} className={ok ? "ok" : "draft"} />)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>

  );
}
