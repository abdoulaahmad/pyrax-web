// SPDX-License-Identifier: LicenseRef-Proprietary
//
// POST /api/internal/tests/:id/assess — the observer (Sentinel) writes its machine assessment for a
// submission (docs §7 + §4). The server validates the SentinelAssessment shape, stores it via
// setSentinelAssessment (moving 'submitted' → 'ai_screening'), and — ONLY within the §8 guardrails —
// MAY auto-drive reviewSubmission({verdict,auto:true}). The TESTS_AUTO_AWARD_ENABLED kill-switch
// (default OFF) disables all auto-award; the assessment is still stored and the submission queues for a
// human. Bearer NOVA_AGENT_SECRET, constant-time, fail-closed. Returns { ok:true, submission, ... }.
import type { APIRoute } from "astro";
import { requireInternal } from "../../../../../server/internal-auth";
import { validateAssessment, applyAssessment } from "../../../../../server/observer";
import { json } from "../../../../../server/http";

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const unauth = requireInternal(request);
  if (unauth) return unauth;

  const submissionId = String(params.id || "");
  const raw = await request.json().catch(() => null);
  const parsed = validateAssessment(raw);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, 422);

  const result = await applyAssessment(submissionId, parsed.value);
  if (!result) return json({ ok: false, error: "Not found." }, 404);

  return json({
    ok: true,
    submission: result.submission,
    autoAwarded: result.autoAwarded,
    awarded: result.awarded,
    ...(result.decisionReason ? { queuedForHuman: result.decisionReason } : {}),
  });
};
