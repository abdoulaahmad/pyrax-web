// SPDX-License-Identifier: LicenseRef-Proprietary
// PYRAX Nodes service worker — self-hosted (served from nodes.pyraxchain.com). Handles Web Push
// notifications for "portal opened" + "app updated" broadcasts. No third-party push SDK.
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "PYRAX Nodes", body: "", url: "https://nodes.pyraxchain.com" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) { if (event.data) data.body = event.data.text(); }
  event.waitUntil(
    self.registration.showNotification(data.title || "PYRAX Nodes", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/favicon-32.png",
      data: { url: data.url || "https://nodes.pyraxchain.com" },
      tag: data.tag || "pyrax-nodes",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "https://nodes.pyraxchain.com";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) { if ("focus" in c) { try { c.navigate(url); } catch (_) {} return c.focus(); } }
      return self.clients.openWindow(url);
    }),
  );
});
