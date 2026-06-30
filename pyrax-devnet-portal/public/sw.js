// SPDX-License-Identifier: LicenseRef-Proprietary
// PYRAX Devnet service worker — Web Push for new-release / notification alerts.
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || "PYRAX Devnet";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/favicon-32.png",
    data: { url: data.url || "/app" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url.includes(url) && "focus" in c) return c.focus();
      return self.clients.openWindow(url);
    })
  );
});
