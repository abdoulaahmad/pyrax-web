// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// The ref-counted body scroll lock (lockScroll/unlockScroll) is the single source in @pyrax/shared.
// Re-exported here so the mobile drawer + command palette share ONE lock counter with the shared chrome.
export * from "@pyrax/shared";
