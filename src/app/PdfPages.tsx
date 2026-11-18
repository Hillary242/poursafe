"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A PDF drawn page by page, as wide as the screen (her ask, 15 Nov: a signed
 * form should open as its PDF). Not a frame: on an iPhone a PDF in a frame
 * shows its first page and stops there. pdf.js draws each page onto a
 * canvas; its worker is served by PourSafe itself (public/pdfjs, copied at
 * build), so it can't be a different version from the library.
 */
export function PdfPages({ url, failText, loadingText, sharp = false }: {
  url: string; failText: string; loadingText: string;
  /** Drawings: drawn at several times the screen's width so pinch-zoom stays readable (capped so a phone doesn't run out of memory). */
  sharp?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ok" | "fail">("loading");

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const pdfjs: any = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        const bytes = await (await fetch(url)).arrayBuffer();
        // No eval: PourSafe's content policy doesn't allow it, and pdf.js doesn't need it.
        const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false }).promise;
        const host = box.current;
        if (!host || dead) return;
        host.innerHTML = "";
        const width = host.clientWidth || 340;
        const ratio = Math.min(window.devicePixelRatio || 1, 2.5);
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          if (dead) return;
          const base = page.getViewport({ scale: 1 });
          let scale = (width / base.width) * (sharp ? Math.max(ratio, 1) * 2.5 : ratio);
          const MAX = 9_000_000; // pixels per page — Android Chrome refuses much bigger canvases
          if (base.width * base.height * scale * scale > MAX) scale = Math.sqrt(MAX / (base.width * base.height));
          const vp = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(vp.width);
          canvas.height = Math.floor(vp.height);
          canvas.style.width = "100%";
          canvas.className = "fld-pdfpage";
          host.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
          if (n === 1) setState("ok");
        }
      } catch {
        if (!dead) setState("fail");
      }
    })();
    return () => { dead = true; };
  }, [url]);

  return (
    <div className="fld-pdf">
      {state === "loading" && <p className="fld-mut fld-pdf-msg">{loadingText}</p>}
      {state === "fail" && <p className="fld-alert">{failText}</p>}
      <div ref={box} />
    </div>
  );
}
