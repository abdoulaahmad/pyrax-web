// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
// Verified contracts — the registry of source-verified contracts on the selected network.

import { mountShell } from "../lib/shell.js";
import { subscribe, getSelectedNetwork } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";
import { apiContracts, isIndexed } from "../lib/api.js";
import { icon } from "@pyrax/shared";
import { pageHead, loading, errorPanel, offlinePanel, emptyPanel, badge, wireCopy } from "../lib/widgets.js";
import { shorten, fullTime } from "../lib/format.js";

const main = mountShell("contracts");
let chainId = getSelectedNetwork().chainId;

async function load(): Promise<void> {
  const net = getSelectedNetwork();
  const head = pageHead(
    "Verified contracts",
    `Source-verified contracts on ${net.name}.`,
    `<a class="btn btn-ghost" href="/verify.html" style="font-size:.85rem">${icon("shield", "h-4 w-4")} Verify a contract</a>`,
  );
  main.innerHTML = head + loading();
  try {
    if (!(await isIndexed(net.chainId))) {
      main.innerHTML = head + (net.rpc ? emptyPanel("This network isn't indexed yet.") : offlinePanel(net.name));
      return;
    }
    const rows = await apiContracts(net.chainId, 100, 0);
    if (!rows.length) {
      main.innerHTML = head + emptyPanel("No contracts have been verified on this network yet. Be the first — use “Verify a contract”.");
      return;
    }
    const table = `<div class="expl-card" style="padding:0"><div class="expl-table-wrap"><table class="expl-table">
      <thead><tr><th>Contract</th><th>Name</th><th>Compiler</th><th>Verified</th></tr></thead>
      <tbody>${rows
        .map((c) => `<tr>
          <td><a class="expl-link-addr" href="/contract.html?a=${c.address}">${shorten(c.address, 8, 6)}</a></td>
          <td>${c.name} ${badge("verified", "positive")}</td>
          <td class="expl-mono">${c.compiler}</td>
          <td>${fullTime(c.verified_at)}</td>
        </tr>`)
        .join("")}</tbody></table></div></div>`;
    main.innerHTML = head + table;
    wireCopy(main);
  } catch (e) {
    main.innerHTML = head + errorPanel((e as Error).message);
  }
}

void load();
subscribe((s: NetSnapshot) => {
  if (s.selected.chainId !== chainId) { chainId = s.selected.chainId; void load(); }
});
