// SPDX-License-Identifier: LicenseRef-Proprietary
// Decide a proposed Sentinel action (approve → executes; reject → drops it). This is the red-line
// human gate for consensus/comms/p2p and other high-impact autonomous actions.
import type { APIRoute } from "astro";
import { proxySentinel } from "../../../../server/sentinel";
export const prerender = false;
export const POST: APIRoute = async ({ cookies, request, params }) => {
  const b = await request.json().catch(() => ({}));
  const decision = b?.decision === "approve" ? "approve" : "reject";
  return proxySentinel(cookies, "sentinel.approve", `/api/nova/actions/${encodeURIComponent(params.id || "")}`, {
    method: "POST",
    body: { decision },
  });
};
