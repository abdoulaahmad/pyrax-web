// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Tester identity + the reward-eligibility rule. Anyone (any email) can be a tester; @pyraxchain.com
// accounts are STAFF and do NOT accrue rewards (they can still test + use everything else).

export const STAFF_DOMAIN = "pyraxchain.com";
export const MAX_SESSION_DAYS = 7;

const EMAIL_RE = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@([a-z0-9.-]+\.[a-z]{2,})$/i;

export function isStaffEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@" + STAFF_DOMAIN);
}
/** Reward-eligible = a real external tester (not staff). */
export function isRewardEligible(email: string): boolean {
  return !isStaffEmail(email);
}

export function validateEmail(email: string): boolean {
  return EMAIL_RE.test((email || "").trim().toLowerCase());
}

export interface TesterProfile {
  displayName: string;
  handle: string;        // unique @handle for chat + leaderboard
  payoutWallet?: string; // PYRAX address for the mainnet airdrop
  sessionMaxDays: number;
}

/** PYRAX payout address — EVM-style 0x + 40 hex. Empty allowed (can be added later). */
export function validateWallet(addr: string): { ok: boolean; value?: string; error?: string } {
  const s = (addr || "").trim();
  if (!s) return { ok: true, value: "" };
  if (!/^0x[0-9a-fA-F]{40}$/.test(s)) return { ok: false, error: "Enter a valid PYRAX address (0x + 40 hex)." };
  return { ok: true, value: s.toLowerCase() };
}

export function normHandle(h: string): string {
  return (h || "").trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, "").slice(0, 20);
}

export function clampSessionDays(n: unknown): number {
  const d = Math.floor(Number(n));
  if (!Number.isFinite(d) || d < 1) return MAX_SESSION_DAYS;
  return Math.min(d, MAX_SESSION_DAYS);
}
