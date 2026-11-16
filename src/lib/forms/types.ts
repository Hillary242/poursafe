/**
 * THE DAILY FORMS ENGINE (0268, her design 15 Nov): each paper form written
 * ONCE as data — its sections and questions in its own order and wording —
 * and PourSafe draws, saves and prints every form the same way. A new form
 * is a new definition, not a new screen.
 *
 * An answer is stored under the question's id in the form's `answers`.
 */

export type Item =
  /** Yes / No / N/A — the form's three circles. */
  | { kind: "yna"; id: string; no?: string; label: string; help?: string; code?: string }
  /** Yes / No only. */
  | { kind: "yn"; id: string; no?: string; label: string; help?: string }
  | { kind: "text"; id: string; no?: string; label: string; help?: string; placeholder?: string }
  | { kind: "long"; id: string; no?: string; label: string; help?: string }
  | { kind: "number"; id: string; no?: string; label: string; unit?: string }
  | { kind: "date"; id: string; no?: string; label: string }
  | { kind: "time"; id: string; no?: string; label: string }
  /** Tick all that apply. */
  | { kind: "checks"; id: string; no?: string; label: string; options: string[]; other?: boolean }
  /** Words only — an instruction, or "N/A to RCS Scope". */
  | { kind: "info"; id: string; no?: string; label: string; note?: string }
  /** A netting check: Yes / No, the time, comments, and Corrected. */
  | { kind: "net"; id: string; label: string; group?: string }
  /** A list the CSM adds rows to — e.g. one per floor on the vertical netting log. */
  | { kind: "rows"; id: string; label: string; rowLabel: string; fields: Item[]; addLabel: string }
  /** An extra signature box (formwork inspector, response team…). */
  | { kind: "person"; id: string; label: string; phone?: boolean };

export type Section = { id: string; title: string; note?: string; items: Item[] };

export type FormDef = {
  key: string;
  /** As on the paper form. */
  title: string;
  /** Short name for lists and the Drive subfolder. */
  short: string;
  /** One per CSM per site per day (the Daily Log), or as many as needed. */
  oncePerDay?: boolean;
  /** What the CSM confirms by signing. */
  attest: string;
  sections: Section[];
};

export type Answers = Record<string, unknown>;
