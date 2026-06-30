// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Directory-specific glue between the shared chrome and this service's SSE streams. The nav, header,
// footer, mega panels and the network list now come from @pyrax/shared (the single source of truth —
// the navbar never drifts across PYRAX properties). All that lives here is (a) the map from the shared
// network store's selected chainId to the string network-id this directory streams by, and (b) the
// ⌘K palette entries for the directory's own pages.

import { cmdkEntry, type CmdkEntry } from "@pyrax/shared";

/**
 * The shared network store selects a network by its EVM chainId; this directory's SSE stream is keyed
 * by a string network-id (matching the server's NETWORKS). Map one to the other so the navbar selector
 * drives which network's peers are shown. Chain IDs mirror @pyrax/shared NETWORKS exactly.
 */
export const CHAIN_TO_SSE: Record<number, string> = {
  881109: "seed",
  710823: "forge",
  104928: "rise",
  563821: "one",
};

/** The directory's own pages, surfaced first in the shared ⌘K command palette. */
export const PEERS_SEARCH: CmdkEntry[] = [
  cmdkEntry("Live peers", "/", "Peers", "pulse", "directory nodes reachable presence network"),
  cmdkEntry("Guides & help", "/guides.html", "Peers", "book", "connect manual troubleshooting quickstart"),
];
