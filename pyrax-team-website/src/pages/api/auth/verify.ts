// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { verifyLoginCode, createSession, cookieOptions, SESSION_COOKIE } from "../../../server/auth";
import { json } from "../../../server/http";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email : "";
  const code = typeof body?.code === "string" ? body.code : "";
  const r = await verifyLoginCode(email, code);
  if (!r.ok) {
    return json({ ok: false, error: r.reason === "rate" ? "Too many attempts — please wait and try again." : "That code is invalid or has expired." }, 401);
  }
  const sid = await createSession(r.user.id);
  cookies.set(SESSION_COOKIE, sid, cookieOptions());
  return json({ ok: true });
};
