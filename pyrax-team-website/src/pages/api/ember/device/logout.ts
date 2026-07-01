// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Ember desktop app → sign out this device (revoke its token). Idempotent.
import type { APIRoute } from "astro";
import { revokeDevice } from "../../../../server/ember";
import { json } from "../../../../server/http";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token : "";
  await revokeDevice(token);
  return json({ ok: true });
};
