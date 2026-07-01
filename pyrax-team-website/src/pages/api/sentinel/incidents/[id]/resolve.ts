// SPDX-License-Identifier: LicenseRef-Proprietary
// Mark a Sentinel-tracked incident resolved (adds a final public update).
import type { APIRoute } from "astro";
import { proxySentinel } from "../../../../../server/sentinel";
export const prerender = false;
export const POST: APIRoute = async ({ cookies, request, params }) => {
  const b = await request.json().catch(() => ({}));
  return proxySentinel(cookies, "sentinel.incidents", `/api/nova/incidents/${encodeURIComponent(params.id || "")}/resolve`, {
    method: "POST",
    body: { body: b?.body },
  });
};
