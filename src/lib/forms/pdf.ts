import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Answers, FormDef, Item } from "./types";

/**
 * A SIGNED DAILY FORM AS A PDF — the paper form's sections and questions in
 * order, each answer beside its question, and the CSM's sign-off at the end.
 * Filed to the job's Drive folder (0268). Liberation Sans, so every
 * character prints as typed.
 */
export type FormPdf = {
  def: FormDef; answers: Answers; project: string; date: string; filledBy: string;
  sigPng: string; sigName: string; signedAt: string; formId: string;
};

const when = (iso: string) => new Date(iso).toLocaleString("en-US", {
  timeZone: "America/New_York", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
});
const s = (v: unknown) => (v == null ? "" : String(v).trim());
const YNA: Record<string, string> = { yes: "YES", no: "NO", na: "N/A" };

export async function formPdf(c: FormPdf, fonts: { regular: Uint8Array; bold: Uint8Array }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fonts.regular, { subset: false });
  const bold = await pdf.embedFont(fonts.bold, { subset: false });
  pdf.setTitle(`${c.def.title} — ${c.project} — ${c.date}`);
  pdf.setProducer("PourSafe");
  pdf.setCreationDate(new Date(c.signedAt));

  const W = 612, H = 792, M = 46, CW = W - M * 2, ANS = 92;   // answer column on the right
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;
  const ink = rgb(0.11, 0.14, 0.19), mut = rgb(0.42, 0.45, 0.5), line = rgb(0.86, 0.87, 0.9), band = rgb(0.93, 0.93, 0.92);
  const red = rgb(0.62, 0.07, 0.22);
  const newPage = () => { page = pdf.addPage([W, H]); y = H - M; };
  const need = (h: number) => { if (y - h < M + 24) newPage(); };
  const wrap = (text: string, f: PDFFont, size: number, width: number) => {
    const out: string[] = [];
    for (const para of text.replace(/\r\n?/g, "\n").split("\n")) {
      if (!para) { out.push(""); continue; }
      let cur = "";
      for (const word of para.split(/(\s+)/)) {
        const next = cur + word;
        if (f.widthOfTextAtSize(next, size) <= width || !cur) cur = next;
        else { out.push(cur.trimEnd()); cur = word.trimStart(); }
      }
      out.push(cur.trimEnd());
    }
    return out;
  };
  const para = (t: string, o: { f?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; x?: number; w?: number; gap?: number } = {}) => {
    const f = o.f ?? font, size = o.size ?? 9.5, lh = size * 1.35;
    for (const l of wrap(t, f, size, o.w ?? CW)) { need(lh); page.drawText(l, { x: o.x ?? M, y: y - size, size, font: f, color: o.color ?? ink }); y -= lh; }
    y -= o.gap ?? 0;
  };
  /** A question on the left, its answer in the right-hand column. */
  const row = (no: string | undefined, q: string, a: string, opts: { code?: string; flag?: boolean } = {}) => {
    // Every question sits in the same column, numbered or not, so a
    // follow-on ("If not typical…") lines up under its question.
    const qx = M + 34, qw = CW - ANS - 34 - 8;
    const ql = wrap(q, font, 9, qw), al = wrap(a || "—", bold, 9, ANS);
    const h = Math.max(ql.length, al.length) * 12.2 + (opts.code ? 10 : 0) + 6;
    need(h);
    if (no) page.drawText(no, { x: M, y: y - 9, size: 8.5, font: bold, color: mut });
    ql.forEach((l, i) => page.drawText(l, { x: qx, y: y - 9 - i * 12.2, size: 9, font, color: ink }));
    if (opts.code) page.drawText(`Code ${opts.code}`, { x: qx, y: y - 9 - ql.length * 12.2, size: 7, font, color: mut });
    al.forEach((l, i) => page.drawText(l, { x: W - M - ANS, y: y - 9 - i * 12.2, size: 9, font: bold, color: opts.flag ? red : ink }));
    y -= h;
    page.drawLine({ start: { x: M, y: y + 2 }, end: { x: W - M, y: y + 2 }, thickness: 0.5, color: line });
  };
  const netText = (v: unknown) => {
    const n = (v ?? {}) as { v?: string; time?: string; comment?: string; corrected?: boolean };
    return [n.v ? (n.v === "yes" ? "YES" : "NO") : "", n.time, n.comment, n.corrected ? "CORRECTED" /* spelled out: Liberation Sans has no check mark */ : ""].filter(Boolean).join(" · ");
  };
  const item = (it: Item, a: Answers) => {
    const v = a[it.id];
    switch (it.kind) {
      // Red only for a NO on a safety check (Yes / No / N/A); a plain Yes / No
      // question ("Was DOB on site?") has no right answer.
      case "yna": return row(it.no, it.label, YNA[s(v)] ?? "", { code: it.code, flag: s(v) === "no" });
      case "yn": return row(it.no, it.label, YNA[s(v)] ?? "");
      case "text": case "number": case "date": case "time":
        return row(it.no, it.label, s(v) + (it.kind === "number" && s(v) && it.unit ? ` ${it.unit}` : ""));
      case "long":
        need(28);
        para(`${it.no ? it.no + "  " : ""}${it.label}`, { size: 9, color: mut });
        para(s(v) || "—", { size: 9.5, gap: 4 });
        return;
      case "checks": {
        const list = Array.isArray(v) ? (v as string[]) : [];
        const other = s(a[`${it.id}__other`]);
        return row(it.no, it.label, [...list, other ? `Other: ${other}` : ""].filter(Boolean).join("\n") || "None");
      }
      case "info": return row(it.no, it.label, it.note ?? "");
      case "net": return row(undefined, it.label, netText(v));
      case "person": return row(undefined, it.label, [s(v), s(a[`${it.id}__phone`])].filter(Boolean).join(" · "));
      case "rows": {
        const rows = Array.isArray(v) ? (v as Answers[]) : [];
        if (!rows.length) return row(undefined, it.label, "None");
        rows.forEach((r, i) => {
          need(20);
          para(`${it.rowLabel} ${i + 1}`, { f: bold, size: 9, color: mut, gap: 1 });
          it.fields.forEach((f) => item(f, r));
        });
      }
    }
  };

  // Heading
  para(c.def.title, { f: bold, size: 14, gap: 2 });
  para(`Project: ${c.project}     Date: ${c.date}     Completed by: ${c.filledBy}`, { size: 9.5, color: mut, gap: 8 });

  for (const sec of c.def.sections) {
    need(40);
    page.drawRectangle({ x: M, y: y - 16, width: CW, height: 16, color: band });
    page.drawText(sec.title, { x: M + 6, y: y - 12, size: 10, font: bold, color: ink });
    y -= 22;
    if (sec.note) para(sec.note, { size: 8.5, color: mut, gap: 3 });
    for (const it of sec.items) item(it, c.answers);
    y -= 6;
  }

  // The sign-off
  need(130);
  y -= 6;
  para("Signature of Concrete Safety Manager", { f: bold, size: 11, gap: 3 });
  para(c.def.attest, { size: 9, gap: 6 });
  const img = await pdf.embedPng(Uint8Array.from(Buffer.from(c.sigPng.replace(/^data:image\/png;base64,/, ""), "base64")));
  const sc = Math.min(220 / img.width, 66 / img.height, 1);
  page.drawRectangle({ x: M, y: y - 76, width: 240, height: 76, borderColor: line, borderWidth: 1 });
  page.drawImage(img, { x: M + 10, y: y - 70, width: img.width * sc, height: img.height * sc });
  page.drawText(c.sigName, { x: M + 256, y: y - 28, size: 11, font: bold, color: ink });
  page.drawText(when(c.signedAt), { x: M + 256, y: y - 44, size: 8.5, font, color: mut });
  y -= 90;
  para(`Signed in PourSafe. Form record: ${c.formId}`, { size: 7.5, color: mut });

  const pages = pdf.getPages();
  pages.forEach((p, i) => p.drawText(`${c.def.short}  ·  ${c.project}  ·  ${c.date}  ·  page ${i + 1} of ${pages.length}`,
    { x: M, y: 22, size: 7.5, font, color: mut }));
  return pdf.save();
}
