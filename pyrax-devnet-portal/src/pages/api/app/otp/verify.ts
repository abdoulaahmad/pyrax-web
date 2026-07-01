// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Inferno desktop app → verify a sign-in code. On success, issues a device-bound token (persistent
// login for THIS install) and returns the tester's identity + the capabilities/tabs their RBAC
// unlocks. The app seals the token in the OS keychain and re-validates it on launch (device/status).
import type { APIRoute } from "astro";
import { verifyLoginCode } from "../../../../server/auth";
import { createDeviceToken, appAccess } from "../../../../server/app-device";
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
  const access = appAccess(r.tester);
  const token = deviceId ? await createDeviceToken(r.tester.id, deviceId, deviceName) : undefined;
  return json({
    ok: true,
    token,
    email: access.email,
    name: access.name,
    handle: access.handle,
    isStaff: access.isStaff,
    rewardEligible: access.rewardEligible,
    tabs: access.tabs,
    capabilities: access.capabilities,
  });
};
