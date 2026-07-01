// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The internal observer (Sentinel) integration for Product Tests. This module owns two pure, testable
// pieces of logic and one orchestration function:
//
//   1. validateAssessment() — parse + normalize the SentinelAssessment JSONB (docs §4). The observer is
//      a trusted server peer, but its POST body is still untrusted input; we accept ONLY the exact shape
//      and coerce/bound every field so a malformed assessment can never poison a submission row.
//
//   2. autoAwardDecision() — the §8 guardrail evaluation. Given the assessment + the tester's counters,
//      it returns whether the observer MAY auto-drive an accept, and if not, WHY. This is the single,
//      auditable place the six non-negotiable guardrails live. It is deliberately conservative: any
//      doubt (missing data, a failing check, low confidence, cap reached, kill-switch off) ⇒ human.
//
//   3. applyAssessment() — stores the assessment (→ ai_screening) and, only when the decision says so,
//      calls reviewSubmission({ verdict, auto:true }) to write the idempotent, audited award.
//
// See docs/PRODUCT-TESTS-CONTRACT.md §4 (shape), §7 (endpoints), §8 (guardrails).

import {
  setSentinelAssessment,
  reviewSubmission,
  getTest,
  testerById,
  testerDecidedSubmissionCount,
  testerAutoAwardsThisWeek,
  testIsOnTime,
  withTesterAwardLock,
  type Submission,
} from "./db";
import { AUTO_AWARD, autoAwardEnabled, perTestReward } from "../lib/rewards";

// ---- SentinelAssessment shape (docs §4) -----------------------------------------------------------

export type SentinelVerdict = "accept" | "reject" | "escalate";

export interface SentinelAssessment {
  verdict: SentinelVerdict;
  confidence: number; // 0..1
  perStep: Array<{ stepIndex: number; ok: boolean; flag?: string }>;
  chainChecks?: Array<{ name: string; ok: boolean; detail?: string }>;
  reason: string;
  model: string;
  at: number; // ms
}

const VERDICTS = new Set<SentinelVerdict>(["accept", "reject", "escalate"]);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Validate + normalize a raw observer body into a SentinelAssessment, or return an error string.
 *  Total: never throws. Bounds string lengths, coerces numbers, and drops malformed per-step / chain
 *  entries rather than failing the whole assessment (a missing field ⇒ default that trends toward
 *  human review, never toward auto-accept). */
export function validateAssessment(raw: unknown): { ok: true; value: SentinelAssessment } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "assessment must be an object" };
  const a = raw as Record<string, unknown>;

  const verdict = a.verdict;
  if (typeof verdict !== "string" || !VERDICTS.has(verdict as SentinelVerdict)) {
    return { ok: false, error: "verdict must be 'accept' | 'reject' | 'escalate'" };
  }
  if (typeof a.confidence !== "number" || !Number.isFinite(a.confidence)) {
    return { ok: false, error: "confidence must be a number 0..1" };
  }
  if (!Array.isArray(a.perStep)) return { ok: false, error: "perStep must be an array" };
  if (typeof a.reason !== "string") return { ok: false, error: "reason must be a string" };
  if (typeof a.model !== "string") return { ok: false, error: "model must be a string" };

  const perStep: SentinelAssessment["perStep"] = [];
  for (const s of a.perStep as unknown[]) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    if (typeof o.stepIndex !== "number" || !Number.isFinite(o.stepIndex) || o.stepIndex < 0) continue;
    if (typeof o.ok !== "boolean") continue;
    perStep.push({
      stepIndex: Math.floor(o.stepIndex),
      ok: o.ok,
      ...(typeof o.flag === "string" && o.flag ? { flag: o.flag.slice(0, 200) } : {}),
    });
    if (perStep.length >= 200) break;
  }

  let chainChecks: SentinelAssessment["chainChecks"];
  if (Array.isArray(a.chainChecks)) {
    chainChecks = [];
    for (const c of a.chainChecks as unknown[]) {
      if (!c || typeof c !== "object") continue;
      const o = c as Record<string, unknown>;
      if (typeof o.name !== "string" || typeof o.ok !== "boolean") continue;
      chainChecks.push({
        name: o.name.slice(0, 120),
        ok: o.ok,
        ...(typeof o.detail === "string" && o.detail ? { detail: o.detail.slice(0, 400) } : {}),
      });
      if (chainChecks.length >= 100) break;
    }
  }

  const at = typeof a.at === "number" && Number.isFinite(a.at) && a.at > 0 ? Math.floor(a.at) : Date.now();

  return {
    ok: true,
    value: {
      verdict: verdict as SentinelVerdict,
      confidence: clamp01(a.confidence),
      perStep,
      ...(chainChecks ? { chainChecks } : {}),
      reason: a.reason.slice(0, 2000),
      model: a.model.slice(0, 120),
      at,
    },
  };
}

// ---- §8 guardrail decision ------------------------------------------------------------------------

/** Everything the guardrail evaluation needs about the tester + test. Kept separate from I/O so the
 *  decision is a pure function that can be exhaustively unit-tested. */
export interface AutoAwardInputs {
  assessment: SentinelAssessment;
  rewardEligible: boolean;        // staff (ineligible) never auto-award (no ledger entry anyway)
  decidedCount: number;          // total decided submissions ever (new-tester grace floor)
  autoAwardsThisWeek: number;    // auto-awards already granted this ISO week (weekly cap)
  killSwitchEnabled: boolean;    // TESTS_AUTO_AWARD_ENABLED
}

export type AutoAwardDecision =
  | { auto: true }
  | { auto: false; reason: string };

/** Evaluate ALL six §8 guardrails. Returns `{auto:true}` only when EVERY bar is cleared; otherwise the
 *  observer stores the assessment and leaves the submission for a human, with the blocking reason. */
export function autoAwardDecision(i: AutoAwardInputs): AutoAwardDecision {
  // (6) Kill-switch — a single env flag disables ALL auto-award; still store + queue for humans.
  if (!i.killSwitchEnabled) return { auto: false, reason: "auto-award disabled (kill-switch off)" };
  // (4)/eligibility — reward-ineligible testers (staff) are never paid; nothing to auto-drive.
  if (!i.rewardEligible) return { auto: false, reason: "tester not reward-eligible" };
  // (3) Confidence + verdict gate — accept only on a confident 'accept'.
  if (i.assessment.verdict !== "accept") return { auto: false, reason: `verdict '${i.assessment.verdict}' requires human review` };
  if (i.assessment.confidence < AUTO_AWARD.minConfidence) {
    return { auto: false, reason: `confidence ${i.assessment.confidence} below auto threshold ${AUTO_AWARD.minConfidence}` };
  }
  if (i.assessment.perStep.some((s) => s.ok === false)) return { auto: false, reason: "a step failed Sentinel screening" };
  if ((i.assessment.chainChecks ?? []).some((c) => c.ok === false)) return { auto: false, reason: "a chain check failed" };
  // (7) Objective-proof gate — the model's opinion is NEVER sufficient to move money on its own. Auto-award
  // requires at least one PASSING chain check: an on-chain fact the observer computed from RPC, which a
  // prompt-injected / steered model cannot forge (unlike `confidence` + `perStep`, which are model-authored
  // and could be inflated by tester text embedded in logs/notes). A test with no verifiable on-chain
  // outcome (install / UI / onboarding) therefore ALWAYS routes to a human — the sole non-bypassable
  // backstop against the prompt-injection → false-accept path.
  if (AUTO_AWARD.requireChainProof && !(i.assessment.chainChecks ?? []).some((c) => c.ok === true)) {
    return { auto: false, reason: "no objective chain-check proof — human review required" };
  }
  // (1) New-tester grace — the first N decided submissions are always human-reviewed.
  if (i.decidedCount < AUTO_AWARD.humanFirstN) {
    return { auto: false, reason: `new-tester grace (${i.decidedCount}/${AUTO_AWARD.humanFirstN} decided)` };
  }
  // (2) Weekly auto-award cap.
  if (i.autoAwardsThisWeek >= AUTO_AWARD.weeklyCap) {
    return { auto: false, reason: `weekly auto-award cap reached (${i.autoAwardsThisWeek}/${AUTO_AWARD.weeklyCap})` };
  }
  return { auto: true };
}

// ---- orchestration --------------------------------------------------------------------------------

export interface ApplyResult {
  submission: Submission;
  autoAwarded: boolean;
  awarded: number;
  decisionReason?: string; // why auto-award was NOT taken (for the observer's log)
}

/** Store the assessment (→ ai_screening) and, only within §8, auto-drive an accept. Returns the updated
 *  submission + whether an award was written. Never throws for a normal not-found; the caller 404s on
 *  null. The award itself is idempotent (ledger ref `test:{submissionId}`) so a replayed observer POST
 *  can never double-pay — and (4) only ever pays `perTestReward` (the observer never sets an override). */
export async function applyAssessment(submissionId: string, assessment: SentinelAssessment): Promise<ApplyResult | null> {
  // Store first: even when we don't auto-accept, Sentinel's read is persisted for the human reviewer.
  const stored = await setSentinelAssessment(submissionId, assessment);
  if (!stored) return null;

  // The cap read → §8 decision → award run under a per-tester advisory lock so concurrent assessments of
  // DIFFERENT submissions by the same tester can't each observe autoAwardsThisWeek < cap and collectively
  // exceed it (the weekly cap isn't ref-keyed, so the ledger's exactly-once alone can't bound it).
  return withTesterAwardLock(stored.testerId, async () => {
    const [tester, test] = await Promise.all([testerById(stored.testerId), getTest(stored.testId)]);
    const [decidedCount, autoAwardsThisWeek] = await Promise.all([
      testerDecidedSubmissionCount(stored.testerId),
      testerAutoAwardsThisWeek(stored.testerId),
    ]);

    const decision = autoAwardDecision({
      assessment,
      rewardEligible: !!tester?.reward_eligible,
      decidedCount,
      autoAwardsThisWeek,
      killSwitchEnabled: autoAwardEnabled(),
    });

    if (!decision.auto) {
      return { submission: stored, autoAwarded: false, awarded: 0, decisionReason: decision.reason };
    }

    // Guardrail (5): audited provenance. reviewSubmission writes reviewer_verdict='accept', records the
    // idempotent award, and notifies. We stamp the reviewer_notes with the model + confidence so the audit
    // trail shows this was an auto-decision and by which model. onTime is computed from the test window.
    const onTime = test ? testIsOnTime(test, stored.createdAt) : true;
    const note = `Auto-accepted by Sentinel (${assessment.model}, confidence ${assessment.confidence.toFixed(2)}). ${assessment.reason}`.slice(0, 8000);
    const result = await reviewSubmission(submissionId, { verdict: "accept", notes: note, auto: true });
    const updated = result?.submission ?? stored;
    void onTime; // reward's on-time bonus is applied inside reviewSubmission via testIsOnTime.
    return { submission: updated, autoAwarded: (result?.awarded ?? 0) > 0, awarded: result?.awarded ?? 0 };
  });
}

// Re-export the reward helper the assess route uses for the response's `awarded` echo, so callers import
// a single observer module rather than reaching into rewards.ts directly.
export { perTestReward };
