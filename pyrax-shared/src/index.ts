// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// @pyrax/shared — the single-source PYRAX site chrome, consumed by every web property (marketing
// site, explorer, nodes, peers). Import the nav/header/footer, the live network store + selector, the
// icon set + UI helpers, the command palette, and the brand stylesheet from here so the navigation
// never drifts across properties again.
//
// Usage (a subdomain):
//   import "@pyrax/shared/styles.css";
//   import { mountChrome, DOMAINS, cmdkEntry } from "@pyrax/shared";
//   mountChrome({ navOrigin: DOMAINS.site, homeHref: "/", searchEntries: [...] });

export * from "./config.js";
export * from "./endpoints.js";
export * from "./content.js";
export * from "./network-store.js";
export * from "./ui.js";
export * from "./search.js";
export * from "./chrome.js";
export * from "./motion.js";
export * from "./scroll-lock.js";
