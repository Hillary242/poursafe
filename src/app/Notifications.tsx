"use client";

import { useEffect, useState } from "react";
import { deletePushSubscription, savePushSubscription, sendTestPush } from "@/app/actions";
import { useT } from "@/app/I18n";

type State = "loading" | "unsupported" | "install" | "denied" | "off" | "on";

const b64ToBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/**
 * PHONE NOTIFICATIONS, on the home screen (0265).
 *
 * Android: tap "Turn on", allow, done. iPhone: Apple only lets a site send
 * notifications once it is on the home screen, so until it is, this says how
 * (Share → Add to Home Screen) instead of offering a button that can't work.
 */
export function Notifications({ director, publicKey }: { director: boolean; publicKey: string }) {
  const { t } = useT();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState(isIos() && !standalone() ? "install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") { setState("denied"); return; }
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  if (!publicKey) return null;   // not set up on the server yet: say nothing to the crews
  if (state === "loading") return null;

  const turnOn = async () => {
    setBusy(true); setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); return; }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
      const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const r = await savePushSubscription({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth });
      if (!r.ok) { await sub.unsubscribe(); setMsg(r.error === "not-set-up" ? t.notifNotSetUp : r.error ?? null); setState("off"); return; }
      setState("on");
    } catch (e) {
      setMsg((e as Error).message);
    } finally { setBusy(false); }
  };
  const turnOff = async () => {
    setBusy(true); setMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await deletePushSubscription(sub.endpoint); await sub.unsubscribe(); }
      setState("off");
    } finally { setBusy(false); }
  };
  const test = async () => {
    setBusy(true); setMsg(null);
    const r = await sendTestPush();
    setBusy(false);
    setMsg(r.ok ? t.notifTestSent : r.error === "not-set-up" ? t.notifNotSetUp : r.error ?? null);
  };

  return (
    <div className="fld-card fld-notif">
      <b>🔔 {t.notifTitle}</b>
      <p className="fld-mut">{director ? `${t.notifWhatDirector} ${t.notifWhatForeman}` : t.notifWhatForeman}</p>
      {state === "install" && <p className="fld-info">{t.notifInstall}</p>}
      {state === "unsupported" && <p className="fld-mut">{t.notifUnsupported}</p>}
      {state === "denied" && <p className="fld-alert">{t.notifDenied}</p>}
      {state === "off" && <button className="fld-big" disabled={busy} onClick={turnOn}>{t.notifOn}</button>}
      {state === "on" && (
        <div className="fld-notif-on">
          <span className="fld-ok">✓ {t.notifIsOn}</span>
          <button className="fld-link" disabled={busy} onClick={test}>{t.notifTest}</button>
          <button className="fld-link" disabled={busy} onClick={turnOff}>{t.notifOff}</button>
        </div>
      )}
      {msg && <p className="fld-mut">{msg}</p>}
    </div>
  );
}
