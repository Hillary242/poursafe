import type { Answers, FormDef, Item } from "./types";
import { DAILY_LOG } from "./dailyLog";
import { HIGH_WIND, HORIZONTAL_NETTING, PRE_POUR, VERTICAL_NETTING } from "./others";

export type { Answers, FormDef, Item, Section } from "./types";

/** The daily forms, in the order the CSM sees them (her first round, 15 Nov). */
export const FORMS: FormDef[] = [DAILY_LOG, PRE_POUR, HIGH_WIND, VERTICAL_NETTING, HORIZONTAL_NETTING];
export const formDef = (key: string) => FORMS.find((f) => f.key === key) ?? null;

/**
 * Section 9 of the Daily Log, "Select the inspections which were completed
 * today", ticks itself for the forms filed today on the site (her choice).
 */
export const INSPECTION_TICK: Record<string, string> = {
  vertical_netting: "Vertical Netting",
  horizontal_netting: "Horizontal Netting",
  pre_pour: "Pre-Pour/Formwork",
  high_wind: "High Wind Action Plan/Site Shut Down Preparedness",
};

/** Carried from the last Daily Log on this site (her choice). */
export const CARRY_FROM_SITE = ["stories", "floors_gc", "floors_rcs", "competent"];
/** Carried from this CSM's last Daily Log anywhere. */
export const CARRY_FROM_ME = ["csm_name", "csm_reg"];

/** How many questions are answered — "12 of 140" on the list. */
export function progress(def: FormDef, a: Answers) {
  let total = 0, done = 0;
  const count = (it: Item, a: Answers) => {
    if (it.kind === "info" || it.kind === "person") return;
    // A list of rows (floors on the netting log) counts each row's answers.
    if (it.kind === "rows") {
      const rows = Array.isArray(a[it.id]) ? (a[it.id] as Answers[]) : [];
      rows.forEach((r) => it.fields.forEach((f) => count(f, r)));
      return;
    }
    total++;
    const v = a[it.id];
    if (it.kind === "net") { if (v && typeof v === "object" && (v as { v?: string }).v) done++; return; }
    if (Array.isArray(v) ? v.length : v != null && String(v).trim() !== "") done++;
  };
  def.sections.forEach((s) => s.items.forEach((it) => count(it, a)));
  return { done, total };
}

/**
 * STARTING TODAY'S LOG FROM THE LAST ONE (her ask, 15 Nov: "reuse the previous
 * day but make it easy to edit certain sections"). Everything carries over
 * except what is about today itself — left blank to be answered fresh.
 */
export const DAY_FRESH = new Set([
  "weather", "wind", "9",
  "10.1", "10.1_when", "10.1_topic", "10.2", "10.3",
  "11.1", "11.2", "11.2_desc", "11.3", "11.3_what", "11.3_comply",
  "12.1", "12.1_what", "12.1_fix", "12.2", "12.2_where", "12.2_waiver",
  "14", "15",
]);
/** The Daily Log's concrete section: set by "Are you pouring concrete today?". */
export const POUR_SECTION = "s5";
