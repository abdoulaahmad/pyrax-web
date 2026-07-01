// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Inferno desktop app → re-validate a stored device token on launch. Returns the CURRENT identity +
// capabilities (derived live from the tester's RBAC), or 401 if the token was revoked / expired or
// the tester was suspended — so a revoked device loses access at its next check-in, no fresh OTP
// required for the common case, and a suspension takes effect immediately.
import type { APIRoute } from "astro";
import { deviceUser, appAccess } from "../../../../server/app-device";
import { json } from "../../../../server/http";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token : "";
  const tester = await deviceUser(token);
  if (!tester) return json({ ok: false }, 401);
  const access = appAccess(tester);
  return json({
    ok: true,
    email: access.email,
    name: access.name,
    handle: access.handle,
    isStaff: access.isStaff,
    rewardEligible: access.rewardEligible,
    tabs: access.tabs,
    capabilities: access.capabilities,
  });
};
