// SPDX-License-Identifier: LicenseRef-Proprietary
//
// RBAC for the Devnet Tester Portal. Testers self-onboard via invite and get the baseline `tester`
// preset; staff (assigned by an admin) get triage / management. Same can()/canGrant() model as the
// team portal — the server enforces, the UI hides what you can't see.

export const PERMISSIONS = {
  "dashboard.view": { group: "Core", label: "View dashboard", desc: "The tester home + their own data." },
  "issues.view": { group: "Issue Council", label: "View the Issue Council", desc: "Browse bug reports." },
  "issues.submit": { group: "Issue Council", label: "Submit & confirm bugs", desc: "File reports, confirm/repro, comment, vote." },
  "issues.triage": { group: "Issue Council", label: "Triage bugs", desc: "Set status/severity, link duplicates, award bug bounties.", elevated: true },
  "campaigns.view": { group: "Testing", label: "View test campaigns", desc: "See + complete assigned test campaigns." },
  "campaigns.manage": { group: "Testing", label: "Manage campaigns", desc: "Create + publish test campaigns and accept reports.", elevated: true },
  "releases.publish": { group: "Releases", label: "Publish releases", desc: "Announce a build → notifies all testers (push + email).", elevated: true },
  "chat.moderate": { group: "Community", label: "Moderate chat", desc: "Delete messages, mute testers.", elevated: true },
  "testers.view": { group: "Admin", label: "View testers", desc: "See the tester roster, uptime + earnings.", elevated: true },
  "testers.manage": { group: "Admin", label: "Manage testers", desc: "Adjust eligibility, roles, and reward ledger entries.", elevated: true },
  "rewards.admin": { group: "Admin", label: "Reward admin", desc: "Tune reward parameters + run payouts/exports.", superuserOnly: true },
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export function permissionGroups(): Record<string, Permission[]> {
  const g: Record<string, Permission[]> = {};
  for (const k of ALL_PERMISSIONS) (g[PERMISSIONS[k].group] ??= []).push(k);
  return g;
}
export function isSuperuserOnly(p: Permission): boolean {
  return "superuserOnly" in PERMISSIONS[p] && (PERMISSIONS[p] as { superuserOnly?: boolean }).superuserOnly === true;
}

// Baseline every tester gets on join.
export const TESTER_BASELINE: Permission[] = ["dashboard.view", "issues.view", "issues.submit", "campaigns.view"];

export const PRESETS: Record<string, { label: string; desc: string; permissions: Permission[] }> = {
  tester: { label: "Tester", desc: "Baseline closed-alpha tester.", permissions: TESTER_BASELINE },
  triage: { label: "Triage", desc: "Triage bugs + manage campaigns.", permissions: [...TESTER_BASELINE, "issues.triage", "campaigns.manage"] },
  release_manager: { label: "Release Manager", desc: "Publish releases + manage campaigns.", permissions: [...TESTER_BASELINE, "releases.publish", "campaigns.manage"] },
  moderator: { label: "Moderator", desc: "Moderate community chat.", permissions: [...TESTER_BASELINE, "chat.moderate"] },
  devnet_admin: { label: "Devnet Admin", desc: "Everything except superuser-only reward admin.", permissions: ALL_PERMISSIONS.filter((p) => !isSuperuserOnly(p)) },
};

export interface AccessSubject { isSuperuser: boolean; permissions: Permission[] }

export function can(s: AccessSubject, p: Permission): boolean {
  return s.isSuperuser || s.permissions.includes(p);
}
export function canGrant(g: AccessSubject, p: Permission): boolean {
  if (g.isSuperuser) return true;
  if (isSuperuserOnly(p)) return false;
  return g.permissions.includes("testers.manage") && g.permissions.includes(p);
}
export function sanitizePermissions(input: unknown): Permission[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<Permission>();
  for (const x of input) if (typeof x === "string" && x in PERMISSIONS) seen.add(x as Permission);
  return ALL_PERMISSIONS.filter((p) => seen.has(p));
}
