import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { FIELD_BRAND } from "@/lib/fieldBrand";

/**
 * THE SAFETY DIRECTOR'S SIGN-OFF COPY — the whole report as it was signed off.
 *
 * Her fix after the first field test (15 Nov): the first version listed each
 * statement as its SHA-256 fingerprint ("Mr Smiley: 3f9a…"). That is what the
 * database signs — and it still does, word for word — but a person reading the
 * PDF needs the statements themselves. So:
 *
 *   the report's answers (Parts One, Two and Three, as the R4 asks them),
 *   every statement IN FULL with its signature,
 *   the scene photos,
 *   the Safety Director's signature and what they agreed to,
 *   and only then the Record of signing — where the fingerprints now live,
 *   each statement's and the exact text the sign-off was measured against.
 *
 * Liberation Sans, as the signed statement copies: every character exactly as
 * written, Polish letters included.
 */

export type ReviewStatement = {
  title: string;                 // "Injured worker's statement", "Witness 1 — Mr Happy", "Part Two — supervisor's investigation"
  name: string | null;
  meta: string[];                // works for, phone, language, how it was given
  text: string | null;           // null: hand-written on paper (photo filed)
  sigPng: string | null;
  signedBy: string | null;
  signedAt: string | null;
  notSigned: string | null;      // a recorded reason it couldn't be signed
  sha256: string | null;
};

export type ReviewCopy = {
  company: string;
  caseNo: string | null;
  job: string;
  occurredOn: string | null;
  person: string | null;
  sections: { title: string; rows: [string, string | null | undefined][] }[];
  statements: ReviewStatement[];
  photos: { name: string; bytes: Uint8Array | null; mime: string | null }[];
  signerName: string;
  attestText: string;
  sigPng: string;
  signedAt: string;
  collectedBy: string | null;
  userAgent: string | null;
  signedText: string;            // the fingerprint list the database signed
  textSha256: string;
  signatureId: string;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short",
  });

export async function reviewReportPdf(c: ReviewCopy, fonts: { regular: Uint8Array; bold: Uint8Array }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fonts.regular, { subset: false });
  const bold = await pdf.embedFont(fonts.bold, { subset: false });
  pdf.setTitle(`Safety Director's review sign-off${c.caseNo ? ` — ${c.caseNo}` : ""}`);
  pdf.setSubject(`SHA-256 of the signed text: ${c.textSha256}`);
  pdf.setProducer(FIELD_BRAND.name);
  pdf.setCreationDate(new Date(c.signedAt));

  const W = 612, H = 792, M = 54, CW = W - M * 2;
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;
  const ink = rgb(0.11, 0.14, 0.19), mut = rgb(0.42, 0.45, 0.5), line = rgb(0.85, 0.87, 0.9);
  const newPage = () => { page = pdf.addPage([W, H]); y = H - M; };
  const need = (h: number) => { if (y - h < M + 30) newPage(); };

  const wrap = (text: string, f: PDFFont, size: number, width: number) => {
    const out: string[] = [];
    for (const para of text.replace(/\r\n?/g, "\n").split("\n")) {
      if (!para) { out.push(""); continue; }
      let cur = "";
      for (const word of para.split(/(\s+)/)) {
        const next = cur + word;
        if (f.widthOfTextAtSize(next, size) <= width || !cur) {
          if (f.widthOfTextAtSize(next, size) > width && !cur.trim()) {
            let chunk = "";
            for (const ch of word) {
              if (f.widthOfTextAtSize(chunk + ch, size) > width) { out.push(chunk); chunk = ch; } else chunk += ch;
            }
            cur = chunk;
          } else cur = next;
        } else { out.push(cur.trimEnd()); cur = word.trimStart(); }
      }
      out.push(cur.trimEnd());
    }
    return out;
  };
  const text = (s: string, o: { f?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; gap?: number; x?: number } = {}) => {
    const f = o.f ?? font, size = o.size ?? 10.5, lh = size * 1.38, x = o.x ?? M;
    for (const l of wrap(s, f, size, CW - (x - M))) {
      need(lh);
      page.drawText(l, { x, y: y - size, size, font: f, color: o.color ?? ink });
      y -= lh;
    }
    y -= o.gap ?? 0;
  };
  const rule = () => { need(10); page.drawLine({ start: { x: M, y: y - 4 }, end: { x: W - M, y: y - 4 }, thickness: 0.8, color: line }); y -= 12; };
  const heading = (s: string) => { need(40); y -= 4; text(s, { f: bold, size: 13, gap: 4 }); };
  /** A question and its answer, the form's way: the question in grey, the answer under it. */
  const qa = (q: string, a: string | null | undefined) => {
    if (a == null || String(a).trim() === "") return;
    need(30);
    text(q, { f: bold, size: 8.5, color: mut });
    text(String(a), { size: 10.5, gap: 5 });
  };
  const signature = async (png: string, who: string, at: string | null) => {
    need(100);
    const img = await pdf.embedPng(Uint8Array.from(Buffer.from(png.replace(/^data:image\/png;base64,/, ""), "base64")));
    const scale = Math.min(230 / img.width, 70 / img.height, 1);
    page.drawRectangle({ x: M, y: y - 82, width: 250, height: 82, borderColor: line, borderWidth: 1 });
    page.drawImage(img, { x: M + 10, y: y - 76, width: img.width * scale, height: img.height * scale });
    page.drawText(who, { x: M + 266, y: y - 30, size: 11.5, font: bold, color: ink });
    if (at) page.drawText(fmt(at), { x: M + 266, y: y - 47, size: 9, font, color: mut });
    y -= 94;
  };

  // ── Heading ──────────────────────────────────────────────────────────
  text(c.company || "Accident report", { f: bold, size: 9, color: mut });
  text("Safety Director's review sign-off", { f: bold, size: 18, gap: 2 });
  text([c.caseNo, c.job, c.occurredOn ? `accident on ${c.occurredOn}` : null].filter(Boolean).join("  ·  "), { size: 10, color: mut, gap: 2 });
  if (c.person) text(`Accident involving ${c.person}`, { size: 10, color: mut, gap: 6 });
  rule();

  // ── The report's answers ─────────────────────────────────────────────
  for (const s of c.sections) {
    const rows = s.rows.filter(([, v]) => v != null && String(v).trim() !== "");
    if (!rows.length) continue;
    heading(s.title);
    for (const [q, v] of rows) qa(q, v);
    rule();
  }

  // ── Every statement, in full ─────────────────────────────────────────
  for (const st of c.statements) {
    // A short statement starts where its signature fits under it.
    const lines = (st.text ?? "x").split("\n").length + Math.ceil((st.text ?? "").length / 95);
    need(Math.min(60 + lines * 15 + 100, H - 2 * M - 40));
    heading(st.title);
    if (st.meta.length) text(st.meta.join("  ·  "), { size: 9.5, color: mut, gap: 4 });
    text(st.text ?? "Hand-written on paper and photographed; the photograph is filed in this accident's folder.", { size: 11, gap: 8 });
    if (st.sigPng && st.signedBy) await signature(st.sigPng, st.signedBy, st.signedAt);
    else if (st.notSigned) text(`Not signed: ${st.notSigned}`, { size: 10, color: mut, gap: 4 });
    else text("Not signed.", { size: 10, color: mut, gap: 4 });
    rule();
  }

  // ── Scene photos ─────────────────────────────────────────────────────
  if (c.photos.length) {
    need(380);   // the heading goes with its first photo
    heading(`Scene photos (${c.photos.length})`);
    let n = 0;
    for (const p of c.photos) {
      n++;
      let img: PDFImage | null = null;
      try {
        if (p.bytes) {
          const isPng = p.mime === "image/png" || (p.bytes[0] === 0x89 && p.bytes[1] === 0x50);
          const isJpg = p.bytes[0] === 0xff && p.bytes[1] === 0xd8;
          img = isPng ? await pdf.embedPng(p.bytes) : isJpg ? await pdf.embedJpg(p.bytes) : null;
        }
      } catch { img = null; }
      if (!img) { text(`Photo ${n}: ${p.name} — filed in Drive (this format can't be printed here).`, { size: 9.5, color: mut, gap: 4 }); continue; }
      const maxW = CW, maxH = 330;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = img.width * scale, h = img.height * scale;
      need(h + 22);
      page.drawImage(img, { x: M, y: y - h, width: w, height: h });
      y -= h + 4;
      text(`Photo ${n}: ${p.name}`, { size: 8.5, color: mut, gap: 10 });
    }
    rule();
  }

  // ── The sign-off ─────────────────────────────────────────────────────
  heading("Signed off by the Safety Director");
  text(c.attestText, { size: 10.5, gap: 8 });
  await signature(c.sigPng, c.signerName, c.signedAt);
  rule();

  // ── Record of signing: the fingerprints live here now ───────────────
  text("Record of signing", { f: bold, size: 9.5, color: mut, gap: 2 });
  const small = { size: 8.5, color: mut };
  text(`Signed off ${fmt(c.signedAt)}, by the server's clock.`, small);
  if (c.collectedBy) text(`Signed in to ${FIELD_BRAND.name} as ${c.collectedBy}.`, small);
  if (c.userAgent) text(`Device: ${c.userAgent}`, small);
  text(`Signing record: ${c.signatureId}`, small);
  y -= 4;
  text("Each statement's fingerprint (SHA-256 of the exact words it was signed against):", { ...small, f: bold });
  for (const st of c.statements) text(`${st.title}: ${st.sha256 ?? "not signed"}`, small);
  y -= 4;
  text("What this sign-off was measured against, exactly as the database signed it:", { ...small, f: bold });
  text(c.signedText, small);
  text(`SHA-256 of that text: ${c.textSha256}`, small);
  text(`Every signature is held in the ${FIELD_BRAND.name} database with the exact text it was given against. If a statement changes afterwards, its signature no longer matches; earlier signatures are kept.`, { ...small, gap: 0 });

  const pages = pdf.getPages();
  pages.forEach((p, i) => p.drawText(`${c.caseNo ?? ""}  ·  Review sign-off  ·  page ${i + 1} of ${pages.length}`,
    { x: M, y: 28, size: 8, font, color: mut }));
  return pdf.save();
}
