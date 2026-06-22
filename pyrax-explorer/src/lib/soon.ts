// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Interim page renderer for explorer views that are scaffolded but not yet wired to live data. Mounts
// the full shell (chrome + sidebar) so navigation + the network selector work everywhere, and shows an
// honest "landing next" notice. Replaced page-by-page as each view is implemented.

import { mountShell } from "./shell.js";
import { icon } from "@pyrax/shared";
import { pageHead, card } from "./widgets.js";

export function mountSoon(active: string, title: string, desc: string): void {
  const main = mountShell(active);
  main.innerHTML = `
    ${pageHead(title)}
    ${card(
      `<div class="expl-soon">
        <span class="expl-soon-ic">${icon("rocket", "h-5 w-5")}</span>
        <div>
          <h2>Landing next</h2>
          <p>${desc}</p>
          <p style="margin-top:.6rem">The <strong style="color:var(--color-ink)">Overview</strong> dashboard and the universal search are already live — pick a network in the navbar to watch it.</p>
        </div>
      </div>`,
    )}`;
}
