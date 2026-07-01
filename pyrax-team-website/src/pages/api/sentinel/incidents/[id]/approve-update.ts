// SPDX-License-Identifier: LicenseRef-Proprietary
// Approve a staged incident update so it publishes to the public status page (the human gate on
// Sentinel's staged status-page notes).
import type { APIRoute } from "astro";
import { proxySentinel } from "../../../../../server/sentinel";
export const prerender = false;
export const POST: APIRoute = async ({ cookies, request, params }) => {
  const b = await request.json().catch(() => ({}));
  const uid = encodeURIComponent(String(b?.uid || ""));
  return proxySentinel(
    cookies,
    "sentinel.incidents",
    `/api/nova/incidents/${encodeURIComponent(params.id || "")}/updates/${uid}/approve`,
    { method: "POST" },
  );
};
