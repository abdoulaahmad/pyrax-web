// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Devnet reward economics. Rewards ACCRUE as PYRX and are paid via the mainnet airdrop — nothing
// is paid now and (per founder) rewards are NEVER advertised pre-login; testers first see them on
// their dashboard. Generous (2x) tier. Price is fixed at $0.0025/PYRX for the USD-equivalent shown.
// Only reward-eligible testers (non-@pyraxchain.com) accrue. ONE node is rewarded, even if more run.

export const PYX_USD = 0.0025;
export const usd = (pyrx: number): number => Math.round(pyrx * PYX_USD * 100) / 100;

export const REWARDS = {
  // Monthly node uptime (best single node). Tiered by uptime %.
  uptimeTiers: [
    { min: 98, pyrx: 24_000 },
    { min: 90, pyrx: 16_000 },
    { min: 75, pyrx: 10_000 },
    { min: 50, pyrx: 4_000 },
    { min: 0, pyrx: 0 },
  ],
  updateOnTime: 3_000,      // per release, updated within the window
  reportAccepted: 1_600,    // per accepted test report
  reportOnTimeBonus: 800,   // + if submitted within the campaign window
  bug: { critical: 48_000, high: 20_000, medium: 8_000, low: 2_400 } as Record<string, number>,
  bugReproBonusPct: 25,     // +25% for great reproduction steps
  consistencyMultiplier: 1.2, // full month: >=95% uptime + all updates on time + >=1 accepted report
  foundingTester: { count: 10, bonus: 50_000, title: "Founding Tester" }, // first 10 to connect a node
  updateWindowHours: 72,
} as const;

export type BugSeverity = keyof typeof REWARDS.bug;

/** Monthly PYRX for a given uptime %. */
export function uptimeReward(pct: number): number {
  for (const t of REWARDS.uptimeTiers) if (pct >= t.min) return t.pyrx;
  return 0;
}

/** Bug bounty incl. the optional reproduction-quality bonus. */
export function bugBounty(severity: BugSeverity, greatRepro = false): number {
  const base = REWARDS.bug[severity] ?? 0;
  return greatRepro ? Math.round(base * (1 + REWARDS.bugReproBonusPct / 100)) : base;
}

// ---------------------------------------------------------------------------------------------------
// Product Tests economics
// ---------------------------------------------------------------------------------------------------
// A "test" (the repurposed `campaigns` row) is a self-contained module a tester completes end-to-end
// and submits proof for. Each test carries its OWN reward (`weight_pyrx`) so staff/seed can price the
// smallest install step differently from the validator step. On top of the per-test weight, a tester
// who submits within the test's on-time window earns a flat bonus. Nothing is paid until a submission
// is ACCEPTED (human or auto-approved within the guardrails); the award is written once, idempotently,
// under the ledger ref `test:{report_id}`.

/** Flat PYRX added to a test's own weight when the submission lands within the on-time window. Tunable. */
export const ON_TIME_TEST_BONUS_PYRX = 800;

/** Consistency (sustained, accurate participation) bonus parameters. A tester qualifies for a week when
 *  EITHER cadence bar is met (enough accepted tests OR enough accepted issue reports that week) AND the
 *  rolling accept-rate is at/above `accuracyFloor`. Sustaining that for `sustainedWeeks` consecutive
 *  weeks pays `bonusPyrx`, scaled by accuracy so sloppy-but-frequent testers earn less than careful ones.
 *  All values are tunable; the award is idempotent per ISO week under ledger ref `consistency:{isoWeek}`. */
export const CONSISTENCY = {
  minAcceptedTestsPerWeek: 3,
  minAcceptedIssueReportsPerWeek: 2,
  sustainedWeeks: 3,
  bonusPyrx: 12_000,
  accuracyFloor: 0.6,
} as const;

/** The stats the consistency evaluator needs (computed in db.testerTestStats). */
export interface TesterTestStats {
  acceptedThisWeek: number;          // accepted test submissions in the current ISO week
  acceptedIssueReportsThisWeek: number; // accepted (bounty-paid) bugs in the current ISO week
  rollingAcceptRate: number;         // 0..1 accept rate over the tester's recent submissions
  weeklyStreak: number;              // consecutive qualifying weeks (incl. the current one)
}

/** One test as priced by the economics (a subset of the DB row; only what pricing needs). */
export interface PricedTest { weight_pyrx: number | bigint }

/** PYRX for accepting ONE test submission: the test's own weight + the on-time bonus when applicable.
 *  This is the ONLY per-test payout; consistency is a separate, additive bonus. Never negative. */
export function perTestReward(test: PricedTest, onTime: boolean): number {
  const weight = Math.max(0, Math.round(Number(test.weight_pyrx) || 0));
  return weight + (onTime ? ON_TIME_TEST_BONUS_PYRX : 0);
}

/** Whether the tester's CURRENT week meets the consistency bar (cadence AND accuracy). */
export function meetsConsistencyWeek(stats: TesterTestStats): boolean {
  const cadence = stats.acceptedThisWeek >= CONSISTENCY.minAcceptedTestsPerWeek
    || stats.acceptedIssueReportsThisWeek >= CONSISTENCY.minAcceptedIssueReportsPerWeek;
  return cadence && stats.rollingAcceptRate >= CONSISTENCY.accuracyFloor;
}

/** Consistency bonus for a tester whose streak has just reached `sustainedWeeks`. Returns the PYRX to
 *  pay (scaled by accuracy) or 0 if not yet qualified. This is a RECURRING weekly bonus: once the streak
 *  reaches `sustainedWeeks`, every subsequent week the tester keeps meeting the bar pays again, exactly
 *  once per ISO week (the caller enforces once-per-week idempotency via the `consistency:{isoWeek}`
 *  ledger ref). Returns 0 when the streak or accuracy bar isn't met. */
export function consistencyBonus(stats: TesterTestStats): number {
  if (stats.weeklyStreak < CONSISTENCY.sustainedWeeks) return 0;
  if (!meetsConsistencyWeek(stats)) return 0;
  // Scale by accuracy within [accuracyFloor, 1] → payout in [accuracyFloor*bonus, bonus].
  const acc = Math.min(1, Math.max(CONSISTENCY.accuracyFloor, stats.rollingAcceptRate));
  return Math.round(CONSISTENCY.bonusPyrx * acc);
}

/** Auto-award guardrails (see docs/PRODUCT-TESTS-CONTRACT.md §8). These bound the Sentinel observer's
 *  ability to accept a submission without a human. All are Phase-1 defaults; tuning is a contract change.
 *  Auto-award + consistency are additionally kill-switched by env (default OFF until the review UI +
 *  Sentinel are proven in production). */
export const AUTO_AWARD = {
  humanFirstN: 3,        // a tester's first N decided submissions are always human-reviewed
  weeklyCap: 5,          // max auto-awards per tester per ISO week
  minConfidence: 0.85,   // Sentinel confidence required to auto-accept
  requireChainProof: true, // auto-award ONLY when the assessment carries a PASSING chain check (§8.7):
                           // a prompt-injected model can inflate confidence + mark every step ok, but it
                           // cannot forge an RPC-derived chain fact, so a UI-only test is always human-reviewed.
} as const;

/** Ceiling on a manual staff `awardPyrx` override. Defense-in-depth against a rogue/compromised reviewer
 *  minting unbounded PYRX: an override may exceed the computed per-test reward for an exceptional
 *  submission, but is bounded to the greater of the computed reward and MAX_OVERRIDE_FACTOR × the test
 *  weight, and never above MAX_MANUAL_AWARD_PYRX in absolute terms. Any award beyond this ceiling is a
 *  tokenomics decision that must go through a contract change, not a single review click. */
export const MAX_OVERRIDE_FACTOR = 4;
export const MAX_MANUAL_AWARD_PYRX = 50_000;

/** Clamp a manual award override to the defensible ceiling above. An undefined/NaN/negative override
 *  falls back to the computed reward unchanged. Never negative. Mirror-implemented on the team-review
 *  surface — keep both in sync via the contract. */
export function boundedAward(override: number | undefined, computed: number, weightPyrx: number | bigint): number {
  if (typeof override !== "number" || !Number.isFinite(override) || override < 0) return Math.max(0, Math.round(computed));
  const weight = Math.max(0, Math.round(Number(weightPyrx) || 0));
  const ceiling = Math.min(MAX_MANUAL_AWARD_PYRX, Math.max(Math.round(computed), weight * MAX_OVERRIDE_FACTOR));
  return Math.max(0, Math.min(Math.round(override), ceiling));
}

/** Whether auto-award is enabled at all (kill-switch). Default OFF: the observer still stores
 *  assessments + queues everything for humans until this is explicitly turned on. */
export function autoAwardEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.TESTS_AUTO_AWARD_ENABLED === "1" || env.TESTS_AUTO_AWARD_ENABLED === "true";
}
/** Whether the weekly consistency award is enabled (separate kill-switch). Default OFF. */
export function consistencyAwardEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.TESTS_CONSISTENCY_ENABLED === "1" || env.TESTS_CONSISTENCY_ENABLED === "true";
}

// Reasons recorded in the earnings ledger (audit trail shown to the tester).
// `test` = an accepted product-test submission; `consistency` = the sustained-participation bonus.
export type LedgerReason = "uptime" | "update" | "report" | "bug" | "founding" | "bonus" | "adjustment" | "test" | "consistency";
export const LEDGER_LABELS: Record<LedgerReason, string> = {
  uptime: "Node uptime",
  update: "On-time app update",
  report: "Test report accepted",
  bug: "Bug bounty",
  founding: "Founding Tester bonus",
  bonus: "Bonus",
  adjustment: "Adjustment",
  test: "Product test accepted",
  consistency: "Consistency bonus",
};

// Contribution tiers (cosmetic + status), by lifetime accrued PYRX.
export const TIERS = [
  { key: "diamond", label: "Diamond", min: 750_000, color: "#60b8cc" },
  { key: "gold", label: "Gold", min: 200_000, color: "#fed23c" },
  { key: "silver", label: "Silver", min: 50_000, color: "#c4cad4" },
  { key: "bronze", label: "Bronze", min: 0, color: "#d75427" },
] as const;

export function tierFor(lifetimePyrx: number): (typeof TIERS)[number] {
  for (const t of TIERS) if (lifetimePyrx >= t.min) return t;
  return TIERS[TIERS.length - 1];
}
