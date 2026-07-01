// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The company-wide email-signature design (Signature Studio).
//   GET /api/signature-settings  → current design          (requires signature.manage)
//   PUT /api/signature-settings  → save design (sanitized)  (requires signature.manage)
// Saving takes effect for every member's signature immediately (it's rendered server-side from
// this row). Members re-copy from "My Signature" to pick up structural changes.
import type { APIRoute } from "astro";
import { getSignatureSettings, setSignatureSettings, audit } from "../../../server/db";
import { requireUser, subjectOf } from "../../../server/guard";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";
import { sanitizeSettings } from "../../../lib/signature-settings";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "signature.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  return json({ ok: true, settings: await getSignatureSettings() });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "signature.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  const body = await request.json().catch(() => ({}));
  const clean = sanitizeSettings(body?.settings);
  await setSignatureSettings(clean, me.id);
  await audit({ actorId: me.id, actorEmail: me.email, action: "signature.update", detail: { tagline: clean.tagline } });
  return json({ ok: true, settings: clean });
};
