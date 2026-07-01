// SPDX-License-Identifier: LicenseRef-Proprietary
// Notify signup: one email, two opt-ins (portal opens / app updates), plus an optional self-hosted
// browser-push subscription. Email goes to the Brevo list; the push subscription is stored locally.
import type { APIRoute } from "astro";
import { upsertNotifyContact } from "../../../server/brevo";
import { savePushSub } from "../../../server/push";
import { notifySubscribeLimiter } from "../../../server/ratelimit";

export const prerender = false;
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Tight per-IP rate limit: each call can hit Brevo (sends/queues email) ⇒ email-bomb amplification.
  const limiterKey = (clientAddress || "unknown").replace(/^::ffff:/i, "");
  if (!notifySubscribeLimiter.take(limiterKey)) return json({ ok: false, error: "Too many requests — please wait a moment." }, 429);

  const b = await request.json().catch(() => ({}));
  const email = String(b?.email ?? "").trim().toLowerCase();
  const sub = b?.push && b.push.endpoint ? b.push : null;

  // Only touch the preferences a form actually sends (general notify form = portal/updates;
  // the disabled-downloads form = downloads), so one form never clobbers another's opt-ins.
  const prefs: { portal?: boolean; updates?: boolean; downloads?: boolean } = {};
  if (b?.portal !== undefined) prefs.portal = b.portal === true;
  if (b?.updates !== undefined) prefs.updates = b.updates === true;
  if (b?.downloads !== undefined) prefs.downloads = b.downloads === true;
  const anyTrue = !!(prefs.portal || prefs.updates || prefs.downloads);

  if (!EMAIL_RE.test(email) || email.length > 200) return json({ ok: false, error: "Enter a valid email address." }, 422);
  if (!anyTrue && !sub) return json({ ok: false, error: "Pick at least one thing to be notified about." }, 422);

  const r = await upsertNotifyContact(email, prefs);
  let pushSaved = false;
  if (sub) pushSaved = await savePushSub(sub, { email, portal: prefs.portal ?? false, updates: prefs.updates ?? false, downloads: prefs.downloads ?? false });

  if (!r.ok && !pushSaved) return json({ ok: false, error: r.error || "Couldn't save your subscription." }, 502);
  return json({ ok: true, email: r.ok, push: pushSaved });
};
