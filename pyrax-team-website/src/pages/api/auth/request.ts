// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { requestLoginCode } from "../../../server/auth";
import { json } from "../../../server/http";
import { clientIpFrom } from "../../../server/ip";

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email : "";
  if (!email) return json({ ok: false, error: "Email is required." }, 400);
  const r = await requestLoginCode(email, clientIpFrom(request, clientAddress));
  if (!r.ok) return json({ ok: false, error: "Too many requests — please try again shortly." }, 429);
  // Anti-enumeration: identical response (incl. ttl + watch-token) whether or not the address is
  // whitelisted. ttl drives the on-page countdown; rid lets the page poll the code's live state.
  return json({ ok: true, ttl: r.ttl, rid: r.rid });
};
