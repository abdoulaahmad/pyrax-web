// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Ember desktop app → re-validate a stored device token on launch. Returns the CURRENT admin
// tabs (derived live from the user's RBAC), or 401 if the token was revoked / expired — so a
// revoked device loses admin access the next time it checks in, without needing a fresh OTP.
import type { APIRoute } from "astro";
import { deviceUser, emberAccess } from "../../../../server/ember";
import { json } from "../../../../server/http";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token : "";
  const user = await deviceUser(token);
  if (!user) return json({ ok: false }, 401);
  const { tabs, roles } = emberAccess(user);
  return json({ ok: true, tabs, roles, email: user.email, name: user.display_name });
};
