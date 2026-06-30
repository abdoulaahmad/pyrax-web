// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { destroySession, cookieOptions, SESSION_COOKIE } from "../../../server/auth";
import { json } from "../../../server/http";

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  await destroySession(cookies.get(SESSION_COOKIE)?.value);
  cookies.set(SESSION_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  return json({ ok: true });
};
