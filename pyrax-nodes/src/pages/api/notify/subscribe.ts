// SPDX-License-Identifier: LicenseRef-Proprietary
// Notify signup: one email, two opt-ins (portal opens / app updates), plus an optional self-hosted
// browser-push subscription. Email goes to the Brevo list; the push subscription is stored locally.
import type { APIRoute } from "astro";
import { upsertNotifyContact } from "../../../server/brevo";
import { savePushSub } from "../../../server/push";

export const prerender = false;
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const POST: APIRoute = async ({ request }) => {
  const b = await request.json().catch(() => ({}));
  const email = String(b?.email ?? "").trim().toLowerCase();
  const portal = b?.portal !== false;       // default opted-in
  const updates = b?.updates !== false;     // default opted-in
  const sub = b?.push && b.push.endpoint ? b.push : null;

  if (!EMAIL_RE.test(email) || email.length > 200) return json({ ok: false, error: "Enter a valid email address." }, 422);
  if (!portal && !updates && !sub) return json({ ok: false, error: "Pick at least one thing to be notified about." }, 422);

  const r = await upsertNotifyContact(email, { portal, updates });
  let pushSaved = false;
  if (sub) pushSaved = await savePushSub(sub, { email, portal, updates });

  if (!r.ok && !pushSaved) return json({ ok: false, error: r.error || "Couldn't save your subscription." }, 502);
  return json({ ok: true, email: r.ok, push: pushSaved });
};
