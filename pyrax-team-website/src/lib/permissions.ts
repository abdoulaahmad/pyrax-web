// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Super-granular RBAC. Every gateable element of the portal is its own PERMISSION. A user
// holds an explicit SET of permissions (stored on their record), so access can be sliced any
// way: downloads-only, faucet-only, a few modules, or everything. Role PRESETS are just
// convenience bundles an admin can apply and then fine-tune per user — the source of truth is
// always the user's permission set.
//
// Used by BOTH the server (endpoint guards) and the UI (render only what you can see).
// The superuser implicitly holds every permission and is immutable.

/** Every atomic capability in the portal. Adding a feature = adding a permission here. */
export const PERMISSIONS = {
  // --- Dashboard ---
  "dashboard.view": { group: "Dashboard", label: "View dashboard", desc: "See the portal home + the modules they're entitled to." },

  // --- Faucet ---
  "faucet.view": { group: "Faucet", label: "View faucet", desc: "Open the faucet module + see available networks." },
  "faucet.drip": { group: "Faucet", label: "Dispense test PYRX", desc: "Send a faucet drip to an address." },

  // --- Downloads: the base role grants ALL listed products; individually-restricted
  //     products additionally require their own permission (e.g. internal Ember). ---
  "downloads.view": { group: "Downloads", label: "Download center (all products)", desc: "Download any listed product — except ones flagged as individually restricted." },
  "downloads.ember": { group: "Downloads", label: "Download internal Ember", desc: "Unlock the restricted internal Ember builds (in addition to the download role)." },

  // --- Team / user management ---
  "users.view": { group: "Team", label: "View team", desc: "See the team roster + each member's access." },
  "users.invite": { group: "Team", label: "Invite / whitelist users", desc: "Whitelist a new @pyraxchain.com user + set their profile." },
  "users.edit_profile": { group: "Team", label: "Edit member profiles", desc: "Edit another member's display name / contact / socials." },
  "users.assign_permissions": { group: "Team", label: "Assign permissions", desc: "Grant or revoke another member's permissions (cannot exceed your own).", elevated: true },
  "users.remove": { group: "Team", label: "Remove users", desc: "Remove a member from the whitelist.", elevated: true },

  // --- Node control (remote kill-switch — last resort) ---
  "node_control.view": { group: "Node Control", label: "View nodes", desc: "See live nodes + their versions.", elevated: true },
  "node_control.kill": { group: "Node Control", label: "Kill / unkill nodes", desc: "Remotely kill or restore an out-of-date node.", superuserOnly: true },

  // --- Ember admin (app role: unlocks the Ember desktop admin area via OTP) ---
  "ember.seed_lists": { group: "Ember Admin", label: "Ember Seed Lists", desc: "Unlock the Seed Lists tab in the Ember desktop admin area." },

  // --- Email signature: every user automatically gets their own personalized signature (no
  //     permission needed). signature.manage gates editing the SHARED company-wide design. ---
  "signature.manage": { group: "Signature", label: "Manage company signature", desc: "Edit the shared email-signature design that applies to the whole company.", elevated: true },

  // --- Devnet Management: the closed-alpha tester program (devnet.pyraxchain.com) ---
  "devnet.manage": { group: "Devnet Management", label: "Manage Devnet Users", desc: "Whitelist testers (email + Telegram handle → invite), set devnet status + the downloads gate.", elevated: true },
  "devnet.issues": { group: "Devnet Management", label: "Devnet Issue Council", desc: "View, comment on, and triage tester bug reports (award bounties).", elevated: true },
  "devnet.tests": { group: "Devnet Management", label: "Devnet Test Reviews", desc: "Review tester product-test submissions: assign, view the proof + Sentinel assessment, accept/reject/request-more, and award PYRX.", elevated: true },
  "devnet.rewards": { group: "Devnet Management", label: "Airdrop Accounting", desc: "View every tester's accrued PYRX rewards + payout wallets (the mainnet-airdrop liability) and export the accounting as CSV.", elevated: true },
  "devnet.chat": { group: "Devnet Management", label: "Devnet Chat", desc: "Join the tester community chat as an Admin (requires a chat username)." },

  // --- Network & App Management: the public nodes site (nodes.pyraxchain.com) ---
  "network.manage": { group: "Network & App Management", label: "Manage the Nodes site", desc: "Open or close the public nodes site, and set the default network shown across all marketing sites.", elevated: true },
  "network.downloads": { group: "Network & App Management", label: "Edit node downloads", desc: "Edit the public node app + CLI download links shown on nodes.pyraxchain.com." },
  "network.broadcast": { group: "Network & App Management", label: "Broadcast notifications", desc: "Email + browser-push the notify list when the portal opens or an app updates.", elevated: true },

  // --- Operational ---
  "error_reports.view": { group: "Operations", label: "View error reports", desc: "Read inbound crash/error reports from nodes + apps." },
  "announcements.publish": { group: "Operations", label: "Publish update announcements", desc: "Announce a new app/CLI version to the network." },

  // --- NEURAX Sentinel (SRE): the guardian-AI operations console. ALL Sentinel activity lives
  //     here in the team portal — status.pyraxchain.com is the PUBLIC status page only. ---
  "sentinel.view": { group: "NEURAX Sentinel", label: "Sentinel console", desc: "Open the NEURAX Sentinel console: brain + fleet health, the live Mind activity stream, and advisories." },
  "sentinel.ask": { group: "NEURAX Sentinel", label: "Ask Sentinel", desc: "Query the Sentinel brain (the on-GPU runtime) from the console." },
  "sentinel.approve": { group: "NEURAX Sentinel", label: "Approve Sentinel actions", desc: "Approve or reject Sentinel's proposed actions — including the red-line consensus/comms/p2p fixes — and resolve advisories.", elevated: true },
  "sentinel.control": { group: "NEURAX Sentinel", label: "Sentinel kill-switch & autonomy", desc: "Arm or disarm autonomy and trip the Sentinel kill-switch (halt all autonomous action at once).", elevated: true },
  "sentinel.incidents": { group: "NEURAX Sentinel", label: "Sentinel incidents", desc: "Manage incidents Sentinel opens: staged status-page notes, the restoration watch, and resolution.", elevated: true },
} as const;

export type Permission = keyof typeof PERMISSIONS;

/** Stable ordered list of permission keys. */
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

/** Permissions grouped by module, for rendering the admin permission matrix. */
export function permissionGroups(): Record<string, Permission[]> {
  const groups: Record<string, Permission[]> = {};
  for (const key of ALL_PERMISSIONS) {
    const g = PERMISSIONS[key].group;
    (groups[g] ??= []).push(key);
  }
  return groups;
}

/** Permissions only the superuser may grant (privilege-escalation guard). */
export function isSuperuserOnly(p: Permission): boolean {
  return "superuserOnly" in PERMISSIONS[p] && (PERMISSIONS[p] as { superuserOnly?: boolean }).superuserOnly === true;
}

/** "Elevated" permissions are high-risk; granting them requires the elevated grantor flow. */
export function isElevated(p: Permission): boolean {
  return "elevated" in PERMISSIONS[p] && (PERMISSIONS[p] as { elevated?: boolean }).elevated === true;
}

/**
 * Convenience role PRESETS — bundles an admin can apply, then fine-tune. NOT the source of
 * truth (the user's explicit permission set is). Order matters for the UI.
 */
export const PRESETS: Record<string, { label: string; desc: string; permissions: Permission[] }> = {
  member: {
    label: "Member",
    desc: "Baseline access: dashboard, faucet, and all standard downloads.",
    permissions: ["dashboard.view", "faucet.view", "faucet.drip", "downloads.view"],
  },
  downloads_manager: {
    label: "Downloads Manager",
    desc: "All downloads incl. internal Ember, plus announcing versions.",
    permissions: ["dashboard.view", "downloads.view", "downloads.ember", "announcements.publish"],
  },
  faucet_operator: {
    label: "Faucet Operator",
    desc: "Run the faucet.",
    permissions: ["dashboard.view", "faucet.view", "faucet.drip"],
  },
  team_admin: {
    label: "Team Admin",
    desc: "Invite + manage members and their access.",
    permissions: ["dashboard.view", "users.view", "users.invite", "users.edit_profile", "users.assign_permissions"],
  },
  node_operator: {
    label: "Node Operator",
    desc: "Monitor nodes (kill-switch is superuser-only).",
    permissions: ["dashboard.view", "node_control.view"],
  },
  devnet_management: {
    label: "Devnet Management",
    desc: "Run the closed-alpha tester program: whitelist testers, status, issues, test reviews, airdrop accounting + chat.",
    permissions: ["dashboard.view", "devnet.manage", "devnet.issues", "devnet.tests", "devnet.rewards", "devnet.chat"],
  },
  signature_manager: {
    label: "Signature Manager",
    desc: "Edit the shared company email-signature design (applies to everyone).",
    permissions: ["dashboard.view", "signature.manage"],
  },
  network_management: {
    label: "Network & App Management",
    desc: "Run the public nodes site: open/close, default network, downloads, and notify broadcasts.",
    permissions: ["dashboard.view", "network.manage", "network.downloads", "network.broadcast"],
  },
  sre: {
    label: "SRE (Neurax Sentinel)",
    desc: "Full NEURAX Sentinel operations: the console + brain/fleet health + live Mind stream, ask the on-GPU brain, approve Sentinel's proposed actions, arm/disarm autonomy + the kill-switch, and manage incidents.",
    permissions: ["dashboard.view", "sentinel.view", "sentinel.ask", "sentinel.approve", "sentinel.control", "sentinel.incidents"],
  },
  full_admin: {
    label: "Full Admin",
    desc: "Everything except the superuser-only node kill-switch.",
    permissions: ALL_PERMISSIONS.filter((p) => !isSuperuserOnly(p)),
  },
};

export interface AccessSubject {
  isSuperuser: boolean;
  permissions: Permission[];
}

/** The single authorization check used everywhere (server guards + UI gating). */
export function can(subject: AccessSubject, permission: Permission): boolean {
  if (subject.isSuperuser) return true;
  return subject.permissions.includes(permission);
}

/** True if the subject can grant `permission` to someone else (no privilege escalation). */
export function canGrant(grantor: AccessSubject, permission: Permission): boolean {
  if (grantor.isSuperuser) return true;
  if (isSuperuserOnly(permission)) return false; // only the superuser
  // You may only grant a permission you hold yourself, and only if you can assign permissions.
  return grantor.permissions.includes("users.assign_permissions") && grantor.permissions.includes(permission);
}

/** Sanitize an incoming permission list to known keys (drops anything unrecognized). */
export function sanitizePermissions(input: unknown): Permission[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<Permission>();
  for (const x of input) {
    if (typeof x === "string" && x in PERMISSIONS) seen.add(x as Permission);
  }
  return ALL_PERMISSIONS.filter((p) => seen.has(p)); // canonical order
}
