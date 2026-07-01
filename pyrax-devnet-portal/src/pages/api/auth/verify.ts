// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { verifyLoginCode, createSession, cookieOptions, SESSION_COOKIE } from "../../../server/auth";
import { json } from "../../../server/http";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, url }) => {
  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email : "";
  const code = typeof body?.code === "string" ? body.code : "";
  const r = await verifyLoginCode(email, code);
  if (!r.ok) return json({ ok: false, error: r.reason === "rate" ? "Too many attempts — please wait and try again." : "That code is invalid or has expired." }, 401);
  const { sid, maxAgeMs } = await createSession(r.tester.id, r.tester.session_max_days);
  // `secure` from the ACTUAL request protocol, so a `secure` cookie is only demanded over real HTTPS.
  // Over http://localhost (dev OR a production `preview` build) the cookie is non-secure and sticks,
  // instead of being silently dropped by the browser (which looks like "login doesn't work").
  cookies.set(SESSION_COOKIE, sid, cookieOptions(maxAgeMs, url.protocol === "https:"));
  return json({ ok: true });
};
