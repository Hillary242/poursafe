/**
 * The field app's accident reports (0260): shapes and the case-file rules,
 * shared by the foreman's phone, the Safety Director's review and the office.
 *
 * A field report IS an accidents row with a field_status; its statements are
 * accident_witnesses rows (role 'injured' or 'witness'). Nothing here is a
 * second copy of anything.
 */
import { FIELD_DICT, type FieldDict } from "@/lib/fieldI18n";

export type FieldStatus = "draft" | "submitted" | "returned" | "reviewed";
export const FIELD_STATUS: Record<FieldStatus, string> = {
  draft: "Collecting", submitted: "Waiting for review", returned: "Sent back", reviewed: "Reviewed",
};

export const LANGS = ["English", "Spanish", "Portuguese", "Polish", "Other"] as const;

/**
 * WHAT A SIGNER AGREES TO, in the language they gave the statement in — with
 * the English underneath, so the office and a court can read what was shown.
 * The exact text shown is stored with the signature (accident_signatures).
 *
 * The last sentence is the e-signature consent: that the drawn mark counts as
 * their handwritten signature. These translations should be checked by a
 * native speaker before they are relied on.
 */
const ATTEST: Record<string, { own: string; back: (reader: string) => string; consent: string }> = {
  English: {
    own: "This is my statement, in my own words. It is true to the best of my knowledge.",
    back: (r) => `This statement was read back to me by ${r}, and it is what I said. It is true to the best of my knowledge.`,
    consent: "I agree that my electronic signature is the same as my handwritten signature.",
  },
  Spanish: {
    own: "Esta es mi declaración, con mis propias palabras. Es verdadera según mi leal saber y entender.",
    back: (r) => `Esta declaración me fue leída en español por ${r}, y es lo que dije. Es verdadera según mi leal saber y entender.`,
    consent: "Acepto que mi firma electrónica tiene el mismo valor que mi firma escrita a mano.",
  },
  Portuguese: {
    own: "Esta é a minha declaração, com as minhas próprias palavras. É verdadeira, tanto quanto sei.",
    back: (r) => `Esta declaração foi lida para mim em português por ${r}, e é o que eu disse. É verdadeira, tanto quanto sei.`,
    consent: "Concordo que a minha assinatura eletrônica tem o mesmo valor que a minha assinatura à mão.",
  },
  Polish: {
    own: "To jest moje oświadczenie, moimi własnymi słowami. Według mojej najlepszej wiedzy jest ono prawdziwe.",
    back: (r) => `To oświadczenie zostało mi odczytane po polsku przez: ${r}, i jest zgodne z moimi słowami. Według mojej najlepszej wiedzy jest ono prawdziwe.`,
    consent: "Zgadzam się, że mój podpis elektroniczny ma taką samą moc jak mój podpis odręczny.",
  },
};

/** The agreement for a statement: in their language, then English when that differs. */
export function attestFor(lang: string | null, how: "own_hand" | "read_back", reader: string) {
  const r = reader.trim() || "—";
  const en = ATTEST.English;
  const line = (t: typeof en) => `${how === "read_back" ? t.back(r) : t.own} ${t.consent}`;
  const native = ATTEST[lang ?? ""];
  return native && lang !== "English"
    ? { native: line(native), english: line(en), text: `${line(native)}\n\n${line(en)}` }
    : { native: null, english: line(en), text: line(en) };
}
export const PART2_ATTEST = "This is my investigation of the accident, true to the best of my knowledge. I agree that my electronic signature is the same as my handwritten signature.";
export const REVIEW_ATTEST = "I have reviewed this report and every statement in it. I agree that my electronic signature is the same as my handwritten signature.";

export const NO_SIGN: Record<string, string> = {
  refused: "Refused to sign",
  left_site: "Left the site before signing",
  hospital: "Taken to hospital / care",
  other: "Other",
};

export type FieldAccident = {
  id: string;
  case_no: string | null;
  field_status: FieldStatus;
  project_id: string | null;
  /** Empty until the Safety Director sets the injured person's company (0261). */
  company_id: string | null;
  kind: "injury" | "illness" | "near_miss";
  occurred_on: string | null;
  occurred_at: string | null;
  location: string | null;
  person_name: string | null;
  person_kind: string;
  person_employer: string | null;
  what_doing: string | null;
  body_parts: string | null;
  // Part One, the rest of the R4 (0106 columns, asked in PourSafe since 15 Nov)
  person_title: string | null;
  told_supervisor: boolean | null;
  witness_names: string | null;
  saw_doctor: boolean | null;
  care_type: string | null;
  care_provider: string | null;
  care_phone: string | null;
  care_on: string | null;
  care_at: string | null;
  prior_injury: boolean | null;
  prior_injury_when: string | null;
  private_entered: boolean;
  severity: string | null;
  sup_body_part: string | null;
  sup_nature: string | null;
  sup_medical_required: boolean | null;
  sup_account: string | null;
  sup_cause: string | null;
  sup_regs: string | null;
  sup_sig_png: string | null;
  sup_sig_text: string | null;
  sup_sig_at: string | null;
  sup_name: string | null;
  field_checks: Record<string, { v: "ok" | "back"; note?: string }>;
  submitted_at: string | null;
  reviewed_name: string | null;
  reviewed_at: string | null;
  review_sig_png: string | null;
  reported_by: string | null;
  supervisor_name: string | null;
  created_at: string;
};

export type FieldStatement = {
  id: string;
  accident_id: string;
  role: "injured" | "witness";
  name: string | null;
  phone: string | null;
  employer: string | null;
  statement: string | null;
  language: string | null;
  paper: boolean;
  paper_file_id: string | null;
  sig_png: string | null;
  sig_name: string | null;
  sig_text: string | null;
  sig_at: string | null;
  sig_how: "own_hand" | "read_back" | null;
  sig_read_by: string | null;
  nosign_reason: string | null;
  nosign_note: string | null;
  sort_no: number;
};

export type FieldFile = {
  id: string; name: string; kind: string; drive_status: string | null;
  drive_file_id: string | null; drive_source_url: string | null; uploaded_at: string;
  /** Where the script filed it (0138) — the link once it is in Drive. */
  drive_url?: string | null;
};

/** What a statement's signature is measured against. */
/** One row of the append-only signing log (0260). */
export type FieldSignature = {
  id: string; accident_id: string; statement_id: string | null; kind: "statement" | "part2" | "review";
  signer_name: string; signed_at: string; text_sha256: string; pdf_file_id: string | null;
};

/** Mirrors field_statement_text() in the database — the words a signature is measured against. */
export const signedText = (s: Pick<FieldStatement, "paper" | "paper_file_id" | "statement">) =>
  s.paper ? `[paper:${s.paper_file_id ?? ""}]` : (s.statement ?? "").trim();

type Part2Fields = Pick<FieldAccident, "sup_account" | "sup_cause" | "sup_regs" | "sup_body_part" | "sup_nature" | "sup_medical_required">;

/**
 * Mirrors field_part2_text() (0265): every Part Two answer, in the form's
 * order, each after its question; an unanswered one is left out.
 */
export const part2Text = (a: Part2Fields) => {
  const q = (label: string, v: string | null | undefined) => ((v ?? "").trim() ? `${label}${(v ?? "").trim()}` : null);
  return [
    q("What part of the body was injured? ", a.sup_body_part),
    q("What was the nature of the injury? ", a.sup_nature),
    q("How the accident happened: ", a.sup_account),
    q("What caused the event: ", a.sup_cause),
    q("Were safety regulations in place and used? ", a.sup_regs),
    a.sup_medical_required == null ? null : `Did the employee require medical attention? ${a.sup_medical_required ? "Yes" : "No"}`,
  ].filter(Boolean).join("\n");
};
/** What 0260 signed, before 0265 — a signature made then still counts. */
const part2TextV1 = (a: Part2Fields) => [a.sup_account, a.sup_cause, a.sup_regs].map((x) => (x ?? "").trim()).join("\n");

/** Signed, and still matching what is on file now. */
export const sigValid = (s: FieldStatement) => !!s.sig_png && s.sig_text === signedText(s);
export const part2Valid = (a: FieldAccident) =>
  !!a.sup_sig_png && (a.sup_sig_text === part2Text(a)
    || (a.sup_sig_text === part2TextV1(a) && !a.sup_body_part && !a.sup_nature && a.sup_medical_required == null));

/** Given and signed — or a recorded reason it can't be, which stands on its own. */
export const statementDone = (s: FieldStatement) =>
  !!s.nosign_reason || (!!signedText(s) && signedText(s) !== "[paper:]" && sigValid(s));

/** The case file, in order. The foreman's checklist and the reviewer's list are the same list. */
export function caseItems(a: FieldAccident, statements: FieldStatement[], photos: number, t: FieldDict = FIELD_DICT.en) {
  const injured = statements.find((s) => s.role === "injured");
  const witnesses = statements.filter((s) => s.role === "witness");
  return [
    { key: "basics", label: t.itemBasics, done: !!(a.occurred_on && (a.location ?? "").trim() && (a.person_name ?? "").trim()) },
    ...(a.kind === "near_miss" ? [] : [{ key: "private", label: t.itemPrivate, done: a.private_entered }]),
    ...(injured ? [{ key: `s:${injured.id}`, label: a.kind === "near_miss" ? t.itemInvolved : t.itemInjured, done: statementDone(injured) }] : []),
    ...witnesses.map((w, i) => ({ key: `s:${w.id}`, label: `${t.itemWitness(i + 1)}${w.name ? ` — ${w.name}` : ""}`, done: statementDone(w) })),
    { key: "photos", label: t.itemPhotos, done: photos > 0 },
    { key: "part2", label: t.itemPart2, done: !!(a.sup_cause ?? "").trim() && part2Valid(a) },
  ];
}

/** Part Three (0265), as field_part3() returns it — the Safety Director's. */
export type Part3 = Record<string, string | number | boolean | null>;

export const fmtWhen = (iso: string | null, locale = "en-US") =>
  iso ? new Date(iso).toLocaleString(locale, {
    timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }) : "";

/**
 * The companies the Safety Director may pick (0264): those switched on for
 * Safety in the Ops Tracker's Admin → Companies — plus any the report already
 * names. Before 0264 every company counts as on.
 */
export function inSafety<T extends { id: string }>(companies: T[], alsoKeep: (string | null | undefined)[] = []): T[] {
  const keep = new Set(alsoKeep.filter(Boolean) as string[]);
  return companies.filter((c) => (c as { in_safety?: boolean | null }).in_safety !== false || keep.has(c.id));
}
