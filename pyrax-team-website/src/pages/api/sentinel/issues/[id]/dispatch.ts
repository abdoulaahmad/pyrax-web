// SPDX-License-Identifier: LicenseRef-Proprietary
// Dispatch an advisory to Sentinel's autonomous repair loop (proposes an action for approval).
import type { APIRoute } from "astro";
import { proxySentinel } from "../../../../../server/sentinel";
export const prerender = false;
export const POST: APIRoute = ({ cookies, params }) =>
  proxySentinel(cookies, "sentinel.approve", `/api/nova/issues/${encodeURIComponent(params.id || "")}/dispatch`, { method: "POST" });
