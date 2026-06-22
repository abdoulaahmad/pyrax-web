// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// pyrax-website renders the single-source site chrome (mega-menu nav + live network selector + ⌘K)
// from @pyrax/shared, so the navigation can never drift from the other PYRAX properties. This thin
// wrapper keeps the existing `mountChrome("ActiveLabel")` call sites and injects THIS site's ⌘K
// entries (key in-page sections + every docs page). Links stay root-relative — this IS the root domain
// (pyraxchain.com), so no navOrigin is passed.

import { mountChrome as mountSharedChrome } from "@pyrax/shared";
import { SEARCH_ENTRIES } from "./search.js";

/** Render the shared header + footer; `active` = the current top-nav label (highlighted). */
export function mountChrome(active = ""): void {
  mountSharedChrome({ active, searchEntries: SEARCH_ENTRIES });
}
