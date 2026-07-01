// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Fuzz target: NOVA's assessment BUILDER (the observer's verdict-gating logic).
//
// Real function under test (imported from production, never reimplemented):
//   • pyrax-nova/server/devnet-observer.js → buildAssessment({ raw, chainChecks, stepCount, modelId, at })
//
// buildAssessment folds a (possibly hostile / prompt-injected) raw model reply + the observer's own
// chain-check results into the contract SentinelAssessment, applying the conservative gates that keep a
// steered model from ever producing a money-moving green light:
//   Gate 1 — any FAILED chain check ⇒ escalate, confidence ≤ 0.4
//   Gate 2 — accept that contradicts a failed perStep ⇒ escalate
//   Gate 3 — accept with NO passing chain check ⇒ escalate (no model-only accept)
// The raw is entirely attacker-influenced (it derives from tester-authored logs/notes), so this target
// fuzzes it hard and asserts the gates hold for EVERY input.
//
// Security properties asserted:
//   1. TOTAL: never throws for ANY raw / chainChecks shape.
//   2. SHAPE: verdict ∈ {accept,reject,escalate}; confidence ∈ [0,1]; perStep entries in-range; the
//      exact contract key set; string bounds on reason/model.
//   3. MONEY GATE (the security invariant): verdict === "accept" is possible ONLY when there is at least
//      one passing chain check AND no failing chain check AND no failing perStep. Any accept violating
//      that is a REAL finding (a path to auto-award without objective proof).

import { FuzzedDataProvider } from "@jazzer.js/core";
import { buildAssessment } from "../../pyrax-nova/server/devnet-observer.js";

const VERDICTS = ["accept", "reject", "escalate"];
const KEYS = new Set(["verdict", "confidence", "perStep", "chainChecks", "reason", "model", "at"]);

export function fuzz(data) {
  const fdp = new FuzzedDataProvider(data);

  const verdicts = ["accept", "reject", "escalate", "", "approve", fdp.consumeString(4)];
  const stepCount = fdp.consumeIntegralInRange(0, 40);
  const psLen = fdp.consumeIntegralInRange(0, 60);
  const perStep = Array.from({ length: psLen }, () => ({
    stepIndex: fdp.consumeIntegralInRange(-2, 45),
    ok: fdp.consumeBoolean(),
    flag: fdp.consumeBoolean() ? fdp.consumeString(fdp.consumeIntegralInRange(0, 260)) : undefined,
  }));
  const raw = {
    verdict: verdicts[fdp.consumeIntegralInRange(0, verdicts.length - 1)],
    confidence: fdp.consumeBoolean() ? fdp.consumeIntegralInRange(-3, 3) : fdp.consumeString(3),
    perStep: fdp.consumeBoolean() ? perStep : fdp.consumeString(3),
    reason: fdp.consumeString(fdp.consumeIntegralInRange(0, 700)),
  };
  const ccLen = fdp.consumeIntegralInRange(0, 12);
  const chainChecks = fdp.consumeBoolean()
    ? Array.from({ length: ccLen }, () => ({ name: fdp.consumeString(fdp.consumeIntegralInRange(0, 80)), ok: fdp.consumeBoolean(), detail: fdp.consumeString(fdp.consumeIntegralInRange(0, 60)) }))
    : fdp.consumeString(4); // sometimes a non-array
  const at = fdp.consumeBoolean() ? fdp.consumeIntegral(6, false) : undefined;

  const a = buildAssessment({ raw, chainChecks, stepCount, modelId: fdp.consumeString(fdp.consumeIntegralInRange(0, 200)), at });

  // SHAPE
  if (!a || typeof a !== "object") throw new Error("buildAssessment returned a non-object");
  for (const k of Object.keys(a)) if (!KEYS.has(k)) throw new Error(`CONTRACT BUG: unexpected key '${k}'`);
  if (!VERDICTS.includes(a.verdict)) throw new Error("CONTRACT BUG: out-of-enum verdict");
  if (typeof a.confidence !== "number" || !(a.confidence >= 0 && a.confidence <= 1)) throw new Error("CONTRACT BUG: confidence not in [0,1]");
  if (!Array.isArray(a.perStep)) throw new Error("CONTRACT BUG: perStep not an array");
  for (const s of a.perStep) {
    if (!Number.isInteger(s.stepIndex) || s.stepIndex < 0 || (stepCount > 0 && s.stepIndex >= stepCount)) throw new Error("CONTRACT BUG: perStep.stepIndex out of range");
    if (typeof s.ok !== "boolean") throw new Error("CONTRACT BUG: perStep.ok not boolean");
  }
  if (typeof a.reason !== "string" || a.reason.length > 800) throw new Error("CONTRACT BUG: reason not a ≤800 string");
  if (typeof a.model !== "string" || a.model.length > 120) throw new Error("CONTRACT BUG: model not a ≤120 string");
  if (!Number.isInteger(a.at) || a.at <= 0) throw new Error("CONTRACT BUG: at not a positive integer");

  // MONEY GATE — the whole point: an accept must be backed by objective, model-unforgeable proof.
  if (a.verdict === "accept") {
    const checks = Array.isArray(a.chainChecks) ? a.chainChecks : [];
    if (!checks.some((c) => c.ok === true)) throw new Error("MONEY-GATE BUG: accept with NO passing chain check");
    if (checks.some((c) => c.ok === false)) throw new Error("MONEY-GATE BUG: accept with a FAILING chain check");
    if (a.perStep.some((s) => s.ok === false)) throw new Error("MONEY-GATE BUG: accept with a FAILING perStep");
  }
}
