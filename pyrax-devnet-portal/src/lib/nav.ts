// SPDX-License-Identifier: LicenseRef-Proprietary
/**
 * Single source of truth for portal navigation.
 *
 * Both the sidebar and every page header read from here, so a page's eyebrow (its section) and
 * index numeral can never drift from where the item actually sits in the nav. Previously each page
 * hard-coded its own `eyebrow`/`index` pair, which had already gone stale — the Dashboard claimed
 * eyebrow "Onboarding" / index "01" while living in the Workspace group.
 */
import type { Permission } from "./permissions";

export type ModuleKey =
  | "dashboard" | "downloads" | "releases" | "tests" | "issues" | "leaderboard"
  | "chat" | "settings" | "triage" | "testers" | "nda" | "tos" | "training"
  | "quiz" | "missions" | "certification";

export interface NavItem {
  key: ModuleKey;
  label: string;
  perm: Permission | null;
  icon: string;
  group: string;
}

/** Declaration order matters only *within* a group — the sidebar renders group-by-group. */
export const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", perm: null, icon: "grid", group: "Workspace" },
  { key: "missions", label: "Missions", perm: null, icon: "route", group: "Onboarding" },
  { key: "training", label: "Training", perm: null, icon: "book", group: "Onboarding" },
  { key: "quiz", label: "Quiz", perm: null, icon: "target", group: "Onboarding" },
  { key: "certification", label: "Certificate", perm: null, icon: "certificate", group: "Onboarding" },
  { key: "downloads", label: "Downloads", perm: null, icon: "download", group: "Workspace" },
  { key: "releases", label: "Releases", perm: null, icon: "tag", group: "Workspace" },
  { key: "tests", label: "Tests", perm: "campaigns.view", icon: "beaker", group: "Testing" },
  { key: "issues", label: "Issue Council", perm: "issues.view", icon: "bug", group: "Testing" },
  { key: "leaderboard", label: "Leaderboard", perm: null, icon: "trophy", group: "Community" },
  { key: "chat", label: "Chat", perm: null, icon: "chat", group: "Community" },
  { key: "settings", label: "Settings", perm: null, icon: "user", group: "Account" },
  { key: "nda", label: "NDA", perm: null, icon: "shield", group: "Legal" },
  { key: "tos", label: "Terms & Conditions", perm: null, icon: "scale", group: "Legal" },
  { key: "triage", label: "Triage", perm: "issues.triage", icon: "filter", group: "Admin" },
  { key: "testers", label: "Testers", perm: "testers.view", icon: "users", group: "Admin" },
];

/** Group order is first-encounter order in NAV — exactly how the sidebar builds its sections. */
export const NAV_GROUPS: string[] = Array.from(new Set(NAV.map((n) => n.group)));

/**
 * NAV flattened into the order the sidebar actually paints it: all of group 1, then all of group 2…
 * This — not NAV's declaration order — is what the page indices count.
 */
export const NAV_ORDER: NavItem[] = NAV_GROUPS.flatMap((g) => NAV.filter((n) => n.group === g));

const META = new Map<ModuleKey, { eyebrow: string; index: string; label: string }>(
  NAV_ORDER.map((n, i) => [n.key, {
    eyebrow: n.group,
    // Zero-padded so the watermark numeral is always two glyphs wide and doesn't reflow.
    index: String(i + 1).padStart(2, "0"),
    label: n.label,
  }]),
);

/**
 * Header metadata for a page. Indices come from the FULL nav, not the permission-filtered subset,
 * so a page's number is the same for every operator regardless of what their role can see.
 */
export function navMeta(key: ModuleKey): { eyebrow: string; index: string; label: string } {
  return META.get(key) ?? { eyebrow: "", index: "", label: "" };
}
