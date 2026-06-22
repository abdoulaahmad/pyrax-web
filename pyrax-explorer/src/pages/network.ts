// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
// Network info — chain parameters + live node stats + indexer stats for the selected network.

import { mountShell } from "../lib/shell.js";
import { subscribe, getSelectedNetwork } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";
import { apiStats, isIndexed } from "../lib/api.js";
import { pageHead, card, kv, statTile, loading, errorPanel, badge, copyable, mono, wireCopy } from "../lib/widgets.js";
import { commas, hexToInt, toGwei } from "../lib/format.js";
import * as rpc from "../lib/rpc.js";

const main = mountShell("network");
let chainId = getSelectedNetwork().chainId;

async function load(): Promise<void> {
  const net = getSelectedNetwork();
  main.innerHTML = pageHead("Network", `Parameters for ${net.name}.`) + loading();
  try {
    const statusTone = net.status === "internal" ? "violet" : net.status === "public" || net.status === "built" ? "amber" : net.status === "pre-launch" ? "" : "positive";
    const params = card(
      [
        kv("Network", badge(net.name, statusTone)),
        kv("Chain ID", mono(String(net.chainId))),
        kv("RPC endpoint", net.rpc ? copyable(net.rpc) : badge("not public", "")),
        kv("Target block time", net.blockTime),
        kv("Faucet", net.faucet ? badge("available", "positive") : "—"),
        kv("Notes", net.note),
      ].join(""),
    );

    let live: string;
    if (net.rpc) {
      const [h, gp, pc, ver] = await Promise.all([
        rpc.blockNumber().catch(() => null),
        rpc.gasPrice().catch(() => null),
        rpc.peerCount(),
        rpc.rpc<string>("web3_clientVersion").catch(() => undefined),
      ]);
      live = `<h2 class="expl-section-title">Live</h2><div class="expl-stat-grid">
        ${statTile("Latest block", h ? "#" + commas(hexToInt(h)) : "—", "", "brand")}
        ${statTile("Gas price", gp ? toGwei(gp) + " gwei" : "—", "", "bolt")}
        ${statTile("Peers", pc != null ? String(hexToInt(pc)) : "—")}
        ${statTile("Client", ver ?? "—")}
      </div>`;
    } else {
      live = `<h2 class="expl-section-title">Live</h2>${card("This network has no public RPC endpoint yet — live stats light up the moment its node is online.")}`;
    }

    let idx = "";
    if (await isIndexed(net.chainId)) {
      const s = await apiStats(net.chainId);
      idx = `<h2 class="expl-section-title">Indexed</h2><div class="expl-stat-grid">
        ${statTile("Indexed height", "#" + commas(s.lastBlock))}
        ${statTile("Blocks", commas(s.blocks))}
        ${statTile("Transactions", commas(s.txns))}
        ${statTile("Transfers", commas(s.transfers))}
        ${statTile("Tokens", commas(s.tokens))}
        ${statTile("Verified contracts", commas(s.contracts))}
      </div>`;
    }

    main.innerHTML = pageHead("Network", `Parameters for ${net.name}.`) + params + live + idx;
    wireCopy(main);
  } catch (e) {
    main.innerHTML = pageHead("Network") + errorPanel((e as Error).message);
  }
}

void load();
subscribe((s: NetSnapshot) => {
  if (s.selected.chainId !== chainId) { chainId = s.selected.chainId; void load(); }
});
