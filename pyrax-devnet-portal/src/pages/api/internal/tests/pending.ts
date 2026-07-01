// SPDX-License-Identifier: LicenseRef-Proprietary
//
// GET /api/internal/tests/pending?limit= — the observer (Sentinel) work queue (docs §7). Returns each
// 'submitted' submission WITHOUT an assessment yet, enriched with the CONTEXT nova needs for its chain
// cross-checks: the test's steps, the tester's results + logs + attachments (with any duplicate-proof
// flags), the tester's payout identity + guardrail counters, and the tester's nodes (height +
// lastHeartbeat). Bearer NOVA_AGENT_SECRET, constant-time, fail-closed — never browser-exposed.
import type { APIRoute } from "astro";
import { requireInternal } from "../../../../server/internal-auth";
import { pendingSubmissionContexts } from "../../../../server/db";
import { json } from "../../../../server/http";

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const unauth = requireInternal(request);
  if (unauth) return unauth;
  // Clamp at the edge too (pendingSubmissionContexts re-clamps, but bounding here keeps a negative/NaN/huge
  // limit from ever reaching the query builder — defense-in-depth, and the two clamps can't drift).
  const limitRaw = Number(url.searchParams.get("limit") || "25");
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 25;
  const pending = await pendingSubmissionContexts(limit);
  return json({ ok: true, pending });
};
