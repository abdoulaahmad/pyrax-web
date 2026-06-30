// SPDX-License-Identifier: LicenseRef-Proprietary
// Broadcast a notification to the notify list — email (Brevo template) + self-hosted browser push.
// Called server-to-server by the team portal's "Network & App Management" controls, authorized with
// the shared NODES_ADMIN_SECRET (constant-time bearer check). Not reachable from the public site.
import type { APIRoute } from "astro";
import crypto from "node:crypto";
import { listNotifyContacts, sendNotifyEmail } from "../../../server/brevo";
import { sendPushToAll } from "../../../server/push";

export const prerender = false;
const SECRET = process.env.NODES_ADMIN_SECRET || "";
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function authorized(req: Request): boolean {
  if (!SECRET) return false;
  const h = req.headers.get("authorization") || "";
  const got = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (got.length !== SECRET.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(SECRET)); } catch { return false; }
}

export const POST: APIRoute = async ({ request }) => {
  if (!authorized(request)) return json({ ok: false, error: "unauthorized" }, 401);
  const b = await request.json().catch(() => ({}));
  const kind = b?.kind === "updates" ? "updates" : "portal";
  const title = String(b?.title ?? "").trim().slice(0, 140);
  const body = String(b?.body ?? "").trim().slice(0, 2000);
  const link = b?.link ? String(b.link).slice(0, 400) : "https://nodes.pyraxchain.com";
  const button = String(b?.button ?? "Open PYRAX Nodes").slice(0, 40);
  if (!title || !body) return json({ ok: false, error: "title and body are required" }, 422);

  // email the opted-in subscribers (transactional template), and push to opted-in subscribers
  const attr = kind === "updates" ? "NOTIFY_UPDATES" : "NOTIFY_PORTAL";
  const emails = await listNotifyContacts(attr as any);
  let emailed = 0;
  for (let i = 0; i < emails.length; i += 20) {
    const batch = emails.slice(i, i + 20);
    const res = await Promise.all(batch.map((e) => sendNotifyEmail(e, { title, body, link, button })));
    emailed += res.filter(Boolean).length;
  }
  const pushed = await sendPushToAll({ title, body, url: link }, kind);
  return json({ ok: true, emailed, pushed, subscribers: emails.length });
};
