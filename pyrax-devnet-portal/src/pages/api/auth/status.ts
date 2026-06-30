// SPDX-License-Identifier: LicenseRef-Proprietary
import type { APIRoute } from "astro";
import { otpStatus } from "../../../server/auth";
import { json } from "../../../server/http";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const rid = url.searchParams.get("rid") || "";
  if (!rid || rid.length > 256) return json({ ok: false, error: "Bad request." }, 400);
  return json({ ok: true, state: await otpStatus(rid) });
};
