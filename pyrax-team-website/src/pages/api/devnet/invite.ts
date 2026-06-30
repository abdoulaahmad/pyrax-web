// SPDX-License-Identifier: LicenseRef-Proprietary
// Whitelist a devnet tester: capture their email + Telegram @handle (their future chat name),
// create an invite in devnet_tester, and email them the personal join link. (requires devnet.manage)
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { createDevnetInvite } from "../../../server/devnet-db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";
import { sendDevnetInvite } from "../../../server/email";

export const prerender = false;
const EMAIL_RE = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@([a-z0-9.-]+\.[a-z]{2,})$/i;

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "devnet.manage")) return json({ ok: false, error: "Forbidden." }, 403);

  const b = await request.json().catch(() => ({}));
  const email = String(b?.email ?? "").trim().toLowerCase();
  const handle = String(b?.telegramHandle ?? "").trim().replace(/^@/, "").replace(/[^a-zA-Z0-9_]/g, "");
  const errors: Record<string, string> = {};
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  if (handle.length < 3) errors.telegramHandle = "Enter their Telegram @handle.";
  if (Object.keys(errors).length) return json({ ok: false, errors }, 422);

  const r = await createDevnetInvite(email, handle, me.id);
  if (!r.ok) return json({ ok: false, errors: { email: "That tester is already whitelisted." } }, 409);
  void sendDevnetInvite(email, r.token);
  return json({ ok: true });
};
