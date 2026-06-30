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

// Reasons recorded in the earnings ledger (audit trail shown to the tester).
export type LedgerReason = "uptime" | "update" | "report" | "bug" | "founding" | "bonus" | "adjustment";
export const LEDGER_LABELS: Record<LedgerReason, string> = {
  uptime: "Node uptime",
  update: "On-time app update",
  report: "Test report accepted",
  bug: "Bug bounty",
  founding: "Founding Tester bonus",
  bonus: "Bonus",
  adjustment: "Adjustment",
};

// Contribution tiers (cosmetic + status), by lifetime accrued PYRX.
export const TIERS = [
  { key: "diamond", label: "Diamond", min: 750_000, color: "#60b8cc" },
  { key: "gold", label: "Gold", min: 200_000, color: "#fcd03d" },
  { key: "silver", label: "Silver", min: 50_000, color: "#c4cad4" },
  { key: "bronze", label: "Bronze", min: 0, color: "#d75427" },
] as const;

export function tierFor(lifetimePyrx: number): (typeof TIERS)[number] {
  for (const t of TIERS) if (lifetimePyrx >= t.min) return t;
  return TIERS[TIERS.length - 1];
}
