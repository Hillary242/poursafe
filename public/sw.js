/*
 * PourSafe's service worker — only for phone notifications (0265).
 *
 * It caches nothing: PourSafe is always the live site. It shows a push the
 * server sent, and opens the report when the notification is tapped.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "PourSafe", {
    body: d.body || "",
    icon: "/poursafe/poursafe-app-icon-1024.png",
    badge: "/poursafe/poursafe-app-icon-1024.png",
    data: { url: d.url || "/" },
    tag: d.url || undefined,
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of open) {
      if (new URL(c.url).origin === self.location.origin && "focus" in c) {
        await c.focus();
        if ("navigate" in c) await c.navigate(url);
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
