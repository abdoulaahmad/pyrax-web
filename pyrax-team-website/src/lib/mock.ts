// SPDX-License-Identifier: LicenseRef-Proprietary
//
// In-memory mock data for the localhost preview build. Lets the whole portal be clicked through
// (auth, RBAC gating, every module) before the real Postgres + Brevo + OTP backend is wired.
// Nothing here ships to production — the real data layer replaces this module.

import type { Permission } from "./permissions";
import { ALL_PERMISSIONS, PRESETS } from "./permissions";
import type { MemberProfile } from "./profile";

export interface Member extends MemberProfile {
  id: string;
  isSuperuser: boolean;
  permissions: Permission[];
  status: "active" | "invited";
  lastLogin?: number;
  createdBy?: string;
}

export const MEMBERS: Member[] = [
  {
    id: "u_super", isSuperuser: true, status: "active", lastLogin: Date.now() - 3_600_000,
    displayName: "Shawn Wilson", email: "shawn.wilson@pyraxchain.com", position: "Founder",
    permissions: [...ALL_PERMISSIONS], socials: { x: "@shawn", github: "github.com/shawn" },
  },
  {
    id: "u_dev", isSuperuser: false, status: "active", lastLogin: Date.now() - 86_400_000,
    displayName: "Ada Reyes", email: "ada.reyes@pyraxchain.com", position: "Protocol Engineer",
    permissions: PRESETS.downloads_manager.permissions, socials: { github: "github.com/ada" }, createdBy: "shawn.wilson@pyraxchain.com",
  },
  {
    id: "u_ops", isSuperuser: false, status: "active", lastLogin: Date.now() - 2 * 86_400_000,
    displayName: "Marco Bianchi", email: "marco.bianchi@pyraxchain.com", position: "Network Operations",
    permissions: ["dashboard.view", "node_control.view", "faucet.view", "faucet.drip"], socials: {}, createdBy: "shawn.wilson@pyraxchain.com",
  },
  {
    id: "u_invited", isSuperuser: false, status: "invited",
    displayName: "Priya Nair", email: "priya.nair@pyraxchain.com", position: "Community Lead",
    permissions: PRESETS.member.permissions, socials: {}, createdBy: "shawn.wilson@pyraxchain.com",
  },
];

export const NETWORKS = [
  { slug: "seed", name: "PYRAX Seed Network", chainId: 881109, mode: "Simulated", online: true },
  { slug: "forge", name: "PYRAX Forge Network", chainId: 710823, mode: "Production", online: false },
];

// `restrict` (optional): an individually-restricted product that needs its own permission in
// addition to the base download role. No `restrict` = available to anyone with downloads.view.
export const DOWNLOADS = [
  { key: "ember", name: "Ember", tag: "Internal", restrict: "downloads.ember", version: "0.6.0", platforms: ["windows", "macos", "linux"], desc: "Internal dev-team desktop node (admin + seed lists)." },
  { key: "inferno", name: "Inferno Node", tag: "Public", restrict: undefined, version: "0.6.0", platforms: ["windows", "macos", "linux"], desc: "The public PYRAX desktop node app." },
  { key: "cli", name: "PYRAX CLI", tag: "Public", restrict: undefined, version: "1.91.0", platforms: ["windows", "macos", "linux"], desc: "The command-line node — run one or many nodes." },
] as const;

export const NODES = [
  { id: "n1", label: "seed-producer-01", network: "seed", version: "0.6.0", latest: "0.6.0", peers: 42, status: "healthy" },
  { id: "n2", label: "seed-rpc-02", network: "seed", version: "0.5.1", latest: "0.6.0", peers: 31, status: "outdated" },
  { id: "n3", label: "forge-validator-01", network: "forge", version: "0.6.0", latest: "0.6.0", peers: 8, status: "healthy" },
];

export const ERROR_REPORTS = [
  { id: "e1", app: "Inferno", level: "error", component: "p2p/relay", message: "Dropping inbound stream at capacity", count: 7, at: Date.now() - 1_800_000 },
  { id: "e2", app: "Ember", level: "warn", component: "sync", message: "Peer tip ahead, re-requesting", count: 2, at: Date.now() - 5_400_000 },
];

/** The "logged-in" member for the preview. The dev permission-preview switcher overrides the
 *  effective permission set client-side so you can SEE the granular gating from each viewpoint. */
export const CURRENT_MEMBER_ID = "u_super";
