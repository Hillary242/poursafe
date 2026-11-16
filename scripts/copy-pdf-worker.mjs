/**
 * Put pdf.js's worker where the browser can fetch it.
 *
 * Signed daily forms are previewed in the browser (PourSafe, 15 Nov); pdf.js does that work
 * in a web worker it loads by URL. Pointing that URL at a CDN broke — the
 * version we install isn't at the path cdnjs uses — and pdf.js reports a
 * missing worker as "Setting up fake worker failed", which names neither the
 * version nor the URL. Serving it ourselves removes the whole class of
 * problem: it cannot 404, and it cannot be a different version from the
 * library that loads it.
 *
 * Runs as `prebuild`, so the copy is refreshed whenever the app is built and
 * can never lag behind an upgrade of pdfjs-dist.
 */
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const to = join(root, "public", "pdfjs", "pdf.worker.min.mjs");

if (!existsSync(from)) {
  // Not fatal: a checked-in copy is already there, and failing the build over
  // this would take the whole app down for one screen.
  console.warn("[copy-pdf-worker] pdfjs-dist isn't installed; keeping the copy in public/pdfjs.");
  process.exit(0);
}

mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);
console.log("[copy-pdf-worker] public/pdfjs/pdf.worker.min.mjs refreshed.");
