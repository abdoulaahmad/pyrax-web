// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Live state of a pending sign-in code, looked up by the opaque watch-token (rid) handed back
// from /api/auth/request. The sign-in page polls this to auto-flip to "used" / "expired" without
// the user doing anything. The rid is 256-bit random, so this leaks nothing about which emails
// exist — an unknown rid simply reads as "pending".
import type { APIRoute } from "astro";
import { otpStatus } from "../../../server/auth";
import { json } from "../../../server/http";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const rid = url.searchParams.get("rid") || "";
  if (!rid || rid.length > 256) return json({ ok: false, error: "Bad request." }, 400);
  const state = await otpStatus(rid);
  return json({ ok: true, state });
};
