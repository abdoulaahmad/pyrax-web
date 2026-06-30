// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requestLoginCode } from "../../../server/auth";
import { json } from "../../../server/http";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email : "";
  if (!email) return json({ ok: false, error: "Email is required." }, 400);
  const r = await requestLoginCode(email);
  if (!r.ok) return json({ ok: false, error: "Too many requests — please try again shortly." }, 429);
  return json({ ok: true, ttl: r.ttl, rid: r.rid });
};
