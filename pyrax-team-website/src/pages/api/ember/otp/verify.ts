// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Ember desktop app → verify a sign-in code. On success, issues a device-bound token (persistent
// login for THIS install) and returns the admin tabs the user's RBAC permissions unlock. The app
// seals the token in the OS keychain and re-validates it on launch (see device/status).
import type { APIRoute } from "astro";
import { verifyLoginCode } from "../../../../server/auth";
import { createDeviceToken, emberAccess } from "../../../../server/ember";
import { json } from "../../../../server/http";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email : "";
  const code = typeof body?.code === "string" ? body.code : "";
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";
  const deviceName = typeof body?.deviceName === "string" ? body.deviceName : "";

  const r = await verifyLoginCode(email, code);
  if (!r.ok) {
    return json(
      { ok: false, error: r.reason === "rate" ? "Too many attempts — please wait and try again." : "That code is invalid or has expired." },
      401,
    );
  }
  const { tabs, roles } = emberAccess(r.user);
  const token = deviceId ? await createDeviceToken(r.user.id, deviceId, deviceName) : undefined;
  return json({ ok: true, tabs, roles, token, email: r.user.email, name: r.user.display_name });
};
