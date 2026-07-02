// SPDX-License-Identifier: LicenseRef-Proprietary
// Resend a devnet tester's pending welcome/invite email (refreshes its expiry). (requires devnet.manage)
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../../server/guard";
import { resendDevnetInvite } from "../../../../server/devnet-db";
import { audit } from "../../../../server/db";
import { json } from "../../../../server/http";
import { can } from "../../../../lib/permissions";
import { sendDevnetInvite } from "../../../../server/email";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "devnet.manage")) return json({ ok: false, error: "Forbidden." }, 403);

  const b = await request.json().catch(() => ({}));
  const email = String(b?.email ?? "").trim().toLowerCase();
  if (!email) return json({ ok: false, error: "Missing email." }, 422);

  const token = await resendDevnetInvite(email);
  if (!token) return json({ ok: false, error: "No pending invite for that email — they may already be active." }, 404);
  await audit({ actorId: me.id, actorEmail: me.email, action: "devnet.invite.resend", targetEmail: email, detail: {} });
  void sendDevnetInvite(email, token);
  return json({ ok: true });
};
