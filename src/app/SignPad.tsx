"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A finger-signature box.
 *
 * Pointer events, so a finger, a stylus and a mouse all draw. The canvas is
 * sized to its box at the device's pixel ratio, or a phone's signature comes
 * out as a blur — capped at 2x, which is plenty for a signature and keeps the
 * PNG small enough to send. touch-action: none on the box stops the page
 * scrolling under the finger mid-signature, the most common way a signature
 * pad fails on a phone. White background baked in, so the mark prints.
 */
export function SignPad({ onChange, hint = "Sign here with your finger", clearLabel = "Clear" }: {
  onChange: (png: string | null) => void; hint?: string; clearLabel?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const inked = useRef(false);
  const [empty, setEmpty] = useState(true);

  const paper = () => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#fff"; g.fillRect(0, 0, r.width, r.height);
    g.lineWidth = 2.4; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#1c2431";
  };
  useEffect(paper, []);

  const at = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    ref.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    const g = ref.current!.getContext("2d")!;
    const [x, y] = at(e);
    g.beginPath(); g.moveTo(x, y);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const g = ref.current!.getContext("2d")!;
    const [x, y] = at(e);
    g.lineTo(x, y); g.stroke();
    if (!inked.current) { inked.current = true; setEmpty(false); }
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (inked.current) onChange(ref.current!.toDataURL("image/png"));
  };
  const clear = () => { paper(); inked.current = false; setEmpty(true); onChange(null); };

  return (
    <div className="fld-pad">
      <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      <div className="fld-pad-line"><span>✕</span>{empty ? hint : ""}</div>
      {!empty && <button type="button" className="fld-pad-clear" onClick={clear}>{clearLabel}</button>}
    </div>
  );
}
