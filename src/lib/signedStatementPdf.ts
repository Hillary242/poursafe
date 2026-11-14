import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { FIELD_BRAND } from "@/lib/fieldBrand";

/**
 * THE SIGNED COPY of one signature from a field accident report (0260).
 *
 * Built on the server from the signing log row — what the DATABASE recorded,
 * not what the phone said — and filed to the accident's Drive folder. It is
 * the human-readable record: the words, what the signer was shown and agreed
 * to, the drawn signature, the time by the server's clock, whose phone it was
 * collected on, the device, and the SHA-256 of the exact text, so the copy can
 * be checked against the database at any time.
 *
 * Liberation Sans (SIL Open Font License, public/fonts) rather than the PDF
 * standard fonts: those cannot draw Polish letters, and a signed statement
 * must show every character exactly as it was signed — no "?" substitutes.
 */

export type SignedCopy = {
  title: string;                 // "Witness statement", "Injured worker's statement", "Part Two — supervisor's investigation", "Review sign-off"
  company: string;
  caseNo: string | null;
  job: string;
  occurredOn: string | null;
  person: string | null;         // who the accident happened to
  signerName: string;
  listedName: string | null;
  role: string | null;
  employer?: string | null;
  phone?: string | null;
  language: string | null;
  how: string | null;            // own_hand / read_back
  readBy: string | null;
  signedText: string;
  attestText: string;
  sigPng: string;                // data:image/png;base64,...
  signedAt: string;              // ISO, from the database
  collectedBy: string | null;
  userAgent: string | null;
  textSha256: string;
  signatureId: string;
  paper?: boolean;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short",
  });

export async function signedCopyPdf(c: SignedCopy, fonts: { regular: Uint8Array; bold: Uint8Array }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  // subset: false — the whole font goes in, so any character in the text draws.
  const font = await pdf.embedFont(fonts.regular, { subset: false });
  const bold = await pdf.embedFont(fonts.bold, { subset: false });
  pdf.setTitle(`${c.title} — ${c.signerName}${c.caseNo ? ` — ${c.caseNo}` : ""}`);
  pdf.setSubject(`SHA-256 of the signed text: ${c.textSha256}`);
  pdf.setProducer(FIELD_BRAND.name);
  pdf.setCreationDate(new Date(c.signedAt));

  const W = 612, H = 792, M = 54, CW = W - M * 2;
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;
  const ink = rgb(0.11, 0.14, 0.19), mut = rgb(0.42, 0.45, 0.5), line = rgb(0.85, 0.87, 0.9);

  const newPage = () => { page = pdf.addPage([W, H]); y = H - M; };
  const need = (h: number) => { if (y - h < M + 30) newPage(); };
  /** Wrap by measured width, keeping the writer's own line breaks. */
  const wrap = (text: string, f: PDFFont, size: number, width: number) => {
    const out: string[] = [];
    for (const para of text.replace(/\r\n?/g, "\n").split("\n")) {
      if (!para) { out.push(""); continue; }
      let cur = "";
      for (const word of para.split(/(\s+)/)) {
        const next = cur + word;
        if (f.widthOfTextAtSize(next, size) <= width || !cur) {
          // A single word longer than the line is broken by character.
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
  const text = (s: string, o: { f?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; x?: number; width?: number; gap?: number } = {}) => {
    const f = o.f ?? font, size = o.size ?? 10.5, lh = size * 1.38;
    for (const l of wrap(s, f, size, o.width ?? CW)) {
      need(lh);
      page.drawText(l, { x: o.x ?? M, y: y - size, size, font: f, color: o.color ?? ink });
      y -= lh;
    }
    y -= o.gap ?? 0;
  };
  const rule = () => { need(10); page.drawLine({ start: { x: M, y: y - 4 }, end: { x: W - M, y: y - 4 }, thickness: 0.8, color: line }); y -= 12; };
  const field = (label: string, value: string | null | undefined) => {
    if (!value) return;
    need(16);
    page.drawText(label, { x: M, y: y - 9.5, size: 9, font: bold, color: mut });
    const lines = wrap(value, font, 10, CW - 130);
    lines.forEach((l, i) => { if (i) need(14); page.drawText(l, { x: M + 130, y: y - 10 - i * 14, size: 10, font, color: ink }); });
    y -= Math.max(1, lines.length) * 14 + 2;
  };

  // Heading
  text(c.company || "Accident report", { f: bold, size: 9, color: mut });
  text(c.title, { f: bold, size: 18, gap: 2 });
  text([c.caseNo, c.job, c.occurredOn ? `accident on ${c.occurredOn}` : null].filter(Boolean).join("  ·  "), { size: 10, color: mut, gap: 6 });
  rule();

  field("Accident involving", c.person);
  field("Signed by", c.signerName);
  if (c.listedName && c.listedName.trim() && c.listedName.trim() !== c.signerName.trim()) field("Name on the report", c.listedName);
  field("Role", c.role === "injured" ? "Injured worker" : c.role === "witness" ? "Witness" : c.role);
  field("Works for", c.employer);
  field("Phone", c.phone);
  field("Language", c.language);
  field("How it was given", c.how === "read_back" ? `Read back to the signer${c.readBy ? ` by ${c.readBy}` : ""}` : c.how === "own_hand" ? "In the signer's own words" : null);
  rule();

  // The statement itself, exactly as signed
  text(c.paper ? "The statement" : "The statement, exactly as signed", { f: bold, size: 11, gap: 4 });
  text(c.paper
    ? "Hand-written on paper and photographed; the photograph is filed in this accident's folder. The signer signed the paper and this record."
    : c.signedText, { size: 11, gap: 10 });
  rule();

  // What they agreed to
  text("What the signer was shown and agreed to", { f: bold, size: 11, gap: 4 });
  text(c.attestText, { size: 10.5, gap: 10 });

  // The signature
  need(110);
  const png = await pdf.embedPng(Uint8Array.from(Buffer.from(c.sigPng.replace(/^data:image\/png;base64,/, ""), "base64")));
  const scale = Math.min(260 / png.width, 80 / png.height, 1);
  page.drawRectangle({ x: M, y: y - 92, width: 280, height: 92, borderColor: line, borderWidth: 1 });
  page.drawImage(png, { x: M + 10, y: y - 86, width: png.width * scale, height: png.height * scale });
  page.drawText(c.signerName, { x: M + 296, y: y - 30, size: 12, font: bold, color: ink });
  page.drawText(fmt(c.signedAt), { x: M + 296, y: y - 48, size: 9.5, font, color: mut });
  y -= 104;
  rule();

  // How it was recorded
  text("Record of signing", { f: bold, size: 9.5, color: mut, gap: 2 });
  const small = { size: 8.5, color: mut };
  text(`Signed ${fmt(c.signedAt)}, by the server's clock.`, small);
  if (c.collectedBy) text(`Collected on the phone of ${c.collectedBy}, signed in to ${FIELD_BRAND.name}.`, small);
  if (c.userAgent) text(`Device: ${c.userAgent}`, small);
  text(`SHA-256 of the signed text: ${c.textSha256}`, small);
  text(`Signing record: ${c.signatureId}`, small);
  text(`The signature is held in the ${FIELD_BRAND.name} database with the exact text it was given against. If the statement is changed afterwards, the signature no longer matches and a new one is required; earlier signatures are kept.`, { ...small, gap: 0 });

  // Page numbers
  const pages = pdf.getPages();
  pages.forEach((p, i) => p.drawText(`${c.caseNo ?? ""}  ·  ${c.title}  ·  page ${i + 1} of ${pages.length}`,
    { x: M, y: 28, size: 8, font, color: mut }));

  return pdf.save();
}
