// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
// Tokens list — ERC-20/721 tokens seen by the indexer, ranked by transfer activity.

import { mountShell } from "../lib/shell.js";
import { subscribe, getSelectedNetwork } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";
import { apiTokens, isIndexed } from "../lib/api.js";
import { pageHead, loading, errorPanel, offlinePanel, emptyPanel, badge, wireCopy } from "../lib/widgets.js";
import { commas, shorten } from "../lib/format.js";

const main = mountShell("tokens");
let chainId = getSelectedNetwork().chainId;

async function load(): Promise<void> {
  const net = getSelectedNetwork();
  const head = pageHead("Tokens", `ERC-20 & ERC-721 tokens on ${net.name}, by transfer activity.`);
  main.innerHTML = head + loading();
  try {
    if (!(await isIndexed(net.chainId))) {
      main.innerHTML = head + (net.rpc ? emptyPanel("This network isn't indexed yet — token discovery requires the indexer.") : offlinePanel(net.name));
      return;
    }
    const rows = await apiTokens(net.chainId, 100, 0);
    if (!rows.length) {
      main.innerHTML = head + emptyPanel("No token transfers seen yet on this network.");
      return;
    }
    const table = `<div class="expl-card" style="padding:0"><div class="expl-table-wrap"><table class="expl-table">
      <thead><tr><th>Token</th><th>Type</th><th>Symbol</th><th>Transfers</th></tr></thead>
      <tbody>${rows
        .map((t) => `<tr>
          <td><a class="expl-link-addr" href="/token.html?a=${t.address}">${t.name ? t.name + " " : ""}${shorten(t.address, 6, 6)}</a></td>
          <td>${badge((t.kind || "").toUpperCase() || "TOKEN", t.kind === "erc721" ? "violet" : "amber")}</td>
          <td>${t.symbol ?? "—"}</td>
          <td>${commas(t.transfer_count ?? 0)}</td>
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
