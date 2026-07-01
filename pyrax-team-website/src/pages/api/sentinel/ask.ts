// SPDX-License-Identifier: LicenseRef-Proprietary
// Ask Sentinel — routes a question to the on-GPU brain (gated by the kill-switch + edge online).
import type { APIRoute } from "astro";
import { proxySentinel } from "../../../server/sentinel";
export const prerender = false;
export const POST: APIRoute = async ({ cookies, request }) => {
  const b = await request.json().catch(() => ({}));
  return proxySentinel(cookies, "sentinel.ask", "/api/nova/ask", {
    method: "POST",
    body: { question: String(b?.question || "").slice(0, 4000), context: b?.context },
  });
};
