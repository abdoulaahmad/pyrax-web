// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Fuzz target: SentinelAssessment intake validation (the untrusted observer POST body).
//
// Real function under test (imported from production, never reimplemented):
//   • pyrax-devnet-portal/src/server/observer.ts → validateAssessment(raw)
//
// The observer (NOVA) is a trusted server peer, but its POST to /api/internal/tests/:id/assess is still
// untrusted input — and its normalized output flows into setSentinelAssessment + the §8 auto-award
// decision, which can move real-airdrop-value PYRX. validateAssessment MUST coerce/bound every field so
// a malformed (or hostile, if the bearer ever leaked) assessment can never poison a submission row or
// smuggle an out-of-contract shape past the gate. This target fuzzes that trust boundary directly.
//
// Security properties asserted:
//   1. TOTAL: never throws for ANY parsed JSON value (object, array, string, number, null, nested,
//      prototype-polluting keys, huge arrays).
//   2. CONTRACT ON OK: verdict ∈ {accept,reject,escalate}; confidence a number in [0,1]; perStep an
//      array of {stepIndex ≥0 integer, ok boolean, flag? ≤200 chars} of ≤200; chainChecks (if present)
//      an array of {name ≤120, ok boolean, detail? ≤400} of ≤100; reason a ≤2000 string; model a ≤120
//      string; at a positive integer. A regression that let any bound slip fails HERE (not weakened).
//   3. CONTRACT ON ERROR: carries a non-empty string `error`.

import { FuzzedDataProvider } from "@jazzer.js/core";
import { validateAssessment } from "../pyrax-devnet-portal/src/server/observer.ts";

const VERDICTS = ["accept", "reject", "escalate"];

/** Build a candidate raw assessment biased toward interesting shapes/boundaries. */
function buildRaw(fdp) {
  const shape = fdp.consumeIntegralInRange(0, 6);
  if (shape === 0) { const t = fdp.consumeRemainingAsString(); try { return JSON.parse(t); } catch { return { verdict: t }; } }
  if (shape === 1) return fdp.consumeRemainingAsString();      // bare string
  if (shape === 2) return fdp.consumeIntegral(4, true);        // bare number
  if (shape === 3) return null;                                 // null
  if (shape === 4) return Array.from({ length: fdp.consumeIntegralInRange(0, 8) }, () => fdp.consumeIntegralInRange(0, 9));
  // shape 5/6: a realistic-ish object with fuzzer-mutated fields (straddling every bound).
  const verdicts = ["accept", "reject", "escalate", "", "approve", "ACCEPT", fdp.consumeString(5)];
  const psLen = fdp.consumeIntegralInRange(0, 260);   // can exceed the 200 cap
  const perStep = Array.from({ length: psLen }, () => ({
    stepIndex: fdp.consumeIntegralInRange(-3, 50),
    ok: fdp.consumeBoolean(),
    flag: fdp.consumeBoolean() ? fdp.consumeString(fdp.consumeIntegralInRange(0, 260)) : undefined,
  }));
  const ccLen = fdp.consumeIntegralInRange(0, 140);   // can exceed the 100 cap
  const chainChecks = fdp.consumeBoolean()
    ? Array.from({ length: ccLen }, () => ({ name: fdp.consumeString(fdp.consumeIntegralInRange(0, 200)), ok: fdp.consumeBoolean(), detail: fdp.consumeString(fdp.consumeIntegralInRange(0, 600)) }))
    : fdp.consumeString(6); // sometimes a non-array
  return {
    verdict: verdicts[fdp.consumeIntegralInRange(0, verdicts.length - 1)],
    confidence: fdp.consumeBoolean() ? fdp.consumeIntegralInRange(-5, 5) : fdp.consumeString(4),
    perStep: fdp.consumeBoolean() ? perStep : fdp.consumeString(3),
    chainChecks,
    reason: fdp.consumeString(fdp.consumeIntegralInRange(0, 2600)),
    model: fdp.consumeString(fdp.consumeIntegralInRange(0, 200)),
    at: fdp.consumeBoolean() ? fdp.consumeIntegral(6, false) : fdp.consumeString(3),
  };
}

export function fuzz(data) {
  const fdp = new FuzzedDataProvider(data);
  const raw = buildRaw(fdp);

  const r = validateAssessment(raw);
  if (!r || typeof r.ok !== "boolean") throw new Error("validateAssessment returned a non-result");

  if (r.ok) {
    const v = r.value;
    if (!VERDICTS.includes(v.verdict)) throw new Error("CONTRACT BUG: accepted an out-of-enum verdict");
    if (typeof v.confidence !== "number" || !(v.confidence >= 0 && v.confidence <= 1)) throw new Error("CONTRACT BUG: confidence not in [0,1]");
    if (!Array.isArray(v.perStep) || v.perStep.length > 200) throw new Error("CONTRACT BUG: perStep not an array of ≤200");
    for (const s of v.perStep) {
      if (!Number.isInteger(s.stepIndex) || s.stepIndex < 0) throw new Error("CONTRACT BUG: perStep.stepIndex not a non-negative integer");
      if (typeof s.ok !== "boolean") throw new Error("CONTRACT BUG: perStep.ok not a boolean");
      if (s.flag !== undefined && (typeof s.flag !== "string" || s.flag.length > 200)) throw new Error("CONTRACT BUG: perStep.flag exceeds 200");
    }
    if (v.chainChecks !== undefined) {
      if (!Array.isArray(v.chainChecks) || v.chainChecks.length > 100) throw new Error("CONTRACT BUG: chainChecks not an array of ≤100");
      for (const c of v.chainChecks) {
        if (typeof c.name !== "string" || c.name.length > 120) throw new Error("CONTRACT BUG: chainCheck.name exceeds 120");
        if (typeof c.ok !== "boolean") throw new Error("CONTRACT BUG: chainCheck.ok not a boolean");
        if (c.detail !== undefined && (typeof c.detail !== "string" || c.detail.length > 400)) throw new Error("CONTRACT BUG: chainCheck.detail exceeds 400");
      }
    }
    if (typeof v.reason !== "string" || v.reason.length > 2000) throw new Error("CONTRACT BUG: reason not a ≤2000 string");
    if (typeof v.model !== "string" || v.model.length > 120) throw new Error("CONTRACT BUG: model not a ≤120 string");
    if (!Number.isInteger(v.at) || v.at <= 0) throw new Error("CONTRACT BUG: at not a positive integer");
  } else {
    if (typeof r.error !== "string" || r.error.length === 0) throw new Error("CONTRACT BUG: reject without a string error");
  }
}
