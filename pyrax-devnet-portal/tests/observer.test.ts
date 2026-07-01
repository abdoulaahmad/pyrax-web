// SPDX-License-Identifier: LicenseRef-Proprietary
// The observer (Sentinel) logic: SentinelAssessment shape validation (docs §4) + the §8 auto-award
// guardrail decision. These are the pure, security-critical pieces — auto-acceptance is a convenience,
// never a bypass, so the guardrail evaluation must reject on ANY doubt.
import { describe, it, expect } from "vitest";
import { validateAssessment, autoAwardDecision, type SentinelAssessment, type AutoAwardInputs } from "../src/server/observer";
import { AUTO_AWARD } from "../src/lib/rewards";

const goodRaw = () => ({
  verdict: "accept",
  confidence: 0.95,
  perStep: [{ stepIndex: 0, ok: true }, { stepIndex: 1, ok: true, flag: "note" }],
  chainChecks: [{ name: "validator active", ok: true, detail: "height 10881" }],
  reason: "All steps verified against the chain.",
  model: "nova-sentinel-1",
  at: 1_800_000_000_000,
});

describe("validateAssessment (docs §4)", () => {
  it("accepts + normalizes a well-formed assessment", () => {
    const r = validateAssessment(goodRaw());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.verdict).toBe("accept");
      expect(r.value.confidence).toBe(0.95);
      expect(r.value.perStep).toHaveLength(2);
      expect(r.value.chainChecks).toHaveLength(1);
      expect(r.value.model).toBe("nova-sentinel-1");
    }
  });

  it("clamps confidence into 0..1", () => {
    const hi = validateAssessment({ ...goodRaw(), confidence: 5 });
    const lo = validateAssessment({ ...goodRaw(), confidence: -2 });
    expect(hi.ok && hi.value.confidence).toBe(1);
    expect(lo.ok && lo.value.confidence).toBe(0);
  });

  it("rejects an unknown verdict / non-number confidence / missing fields", () => {
    expect(validateAssessment({ ...goodRaw(), verdict: "maybe" }).ok).toBe(false);
    expect(validateAssessment({ ...goodRaw(), confidence: "high" as any }).ok).toBe(false);
    expect(validateAssessment({ ...goodRaw(), perStep: "nope" as any }).ok).toBe(false);
    expect(validateAssessment({ ...goodRaw(), reason: 42 as any }).ok).toBe(false);
    expect(validateAssessment({ ...goodRaw(), model: undefined as any }).ok).toBe(false);
  });

  it("drops malformed per-step + chain entries rather than failing the whole assessment", () => {
    const r = validateAssessment({
      ...goodRaw(),
      perStep: [{ stepIndex: 0, ok: true }, { stepIndex: -1, ok: true }, { stepIndex: 1, ok: "yes" }, { nope: 1 }],
      chainChecks: [{ name: "ok", ok: true }, { ok: true }, "junk"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.perStep).toEqual([{ stepIndex: 0, ok: true }]);
      expect(r.value.chainChecks).toEqual([{ name: "ok", ok: true }]);
    }
  });

  it("is total for junk input (never throws)", () => {
    for (const junk of [null, undefined, 42, "str", [], { verdict: "accept" }]) {
      expect(() => validateAssessment(junk)).not.toThrow();
      expect(validateAssessment(junk).ok).toBe(false);
    }
  });

  it("defaults `at` to now when absent/invalid", () => {
    const before = Date.now();
    const r = validateAssessment({ ...goodRaw(), at: undefined });
    expect(r.ok && r.value.at >= before).toBe(true);
  });
});

const asm = (over: Partial<SentinelAssessment> = {}): SentinelAssessment => ({
  verdict: "accept", confidence: 0.95, perStep: [{ stepIndex: 0, ok: true }],
  chainChecks: [{ name: "ok", ok: true }], reason: "ok", model: "m", at: Date.now(), ...over,
});
const inputs = (over: Partial<AutoAwardInputs> = {}): AutoAwardInputs => ({
  assessment: asm(), rewardEligible: true, decidedCount: AUTO_AWARD.humanFirstN, autoAwardsThisWeek: 0,
  killSwitchEnabled: true, ...over,
});

describe("autoAwardDecision (docs §8 guardrails)", () => {
  it("auto-awards ONLY when every bar is cleared", () => {
    expect(autoAwardDecision(inputs())).toEqual({ auto: true });
  });

  it("(6) kill-switch off ⇒ never auto (even on a perfect assessment)", () => {
    const d = autoAwardDecision(inputs({ killSwitchEnabled: false }));
    expect(d.auto).toBe(false);
  });

  it("(4) reward-ineligible testers (staff) never auto-award", () => {
    expect(autoAwardDecision(inputs({ rewardEligible: false })).auto).toBe(false);
  });

  it("(3) verdict gate: only 'accept' auto-awards; escalate/reject ⇒ human", () => {
    expect(autoAwardDecision(inputs({ assessment: asm({ verdict: "escalate" }) })).auto).toBe(false);
    expect(autoAwardDecision(inputs({ assessment: asm({ verdict: "reject" }) })).auto).toBe(false);
  });

  it("(3) confidence gate: below AUTO_CONFIDENCE ⇒ human", () => {
    expect(autoAwardDecision(inputs({ assessment: asm({ confidence: AUTO_AWARD.minConfidence - 0.01 }) })).auto).toBe(false);
    expect(autoAwardDecision(inputs({ assessment: asm({ confidence: AUTO_AWARD.minConfidence }) })).auto).toBe(true);
  });

  it("(3) any failed step or failed chain check ⇒ human", () => {
    expect(autoAwardDecision(inputs({ assessment: asm({ perStep: [{ stepIndex: 0, ok: false }] }) })).auto).toBe(false);
    expect(autoAwardDecision(inputs({ assessment: asm({ chainChecks: [{ name: "x", ok: false }] }) })).auto).toBe(false);
  });

  it("(7) objective-proof gate: an accept with NO passing chain check ⇒ human (blocks prompt-injection false-accept)", () => {
    // A confident 'accept', every step ok, but no chainChecks at all (a UI-only test): must NOT auto-award.
    const noChecks = autoAwardDecision(inputs({ assessment: asm({ chainChecks: undefined }) }));
    expect(noChecks.auto).toBe(false);
    if (!noChecks.auto) expect(noChecks.reason).toMatch(/chain-check proof/i);
    // Empty chainChecks array is the same — no objective proof.
    expect(autoAwardDecision(inputs({ assessment: asm({ chainChecks: [] }) })).auto).toBe(false);
    // A single passing chain check restores eligibility (base fixture already has one).
    expect(autoAwardDecision(inputs({ assessment: asm({ chainChecks: [{ name: "stake", ok: true }] }) })).auto).toBe(true);
  });

  it("(1) new-tester grace: first N decided submissions are always human", () => {
    expect(autoAwardDecision(inputs({ decidedCount: 0 })).auto).toBe(false);
    expect(autoAwardDecision(inputs({ decidedCount: AUTO_AWARD.humanFirstN - 1 })).auto).toBe(false);
    expect(autoAwardDecision(inputs({ decidedCount: AUTO_AWARD.humanFirstN })).auto).toBe(true);
  });

  it("(2) weekly auto-award cap: at/over cap ⇒ human", () => {
    expect(autoAwardDecision(inputs({ autoAwardsThisWeek: AUTO_AWARD.weeklyCap })).auto).toBe(false);
    expect(autoAwardDecision(inputs({ autoAwardsThisWeek: AUTO_AWARD.weeklyCap - 1 })).auto).toBe(true);
  });

  it("always includes a human-readable reason when NOT auto", () => {
    const d = autoAwardDecision(inputs({ killSwitchEnabled: false }));
    expect(d.auto).toBe(false);
    if (!d.auto) expect(typeof d.reason).toBe("string");
  });
});
