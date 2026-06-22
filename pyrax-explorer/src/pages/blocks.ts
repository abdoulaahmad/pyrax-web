// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
// Blocks list — indexer-backed, with a live-RPC fallback for networks that aren't indexed.

import { mountShell } from "../lib/shell.js";
import { subscribe, getSelectedNetwork } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";
import { apiBlocks, isIndexed } from "../lib/api.js";
import { pageHead, loading, errorPanel, offlinePanel, emptyPanel, addrLink, blockLink, wireCopy } from "../lib/widgets.js";
import { commas, timeAgo, hexToInt } from "../lib/format.js";
import * as rpc from "../lib/rpc.js";

const main = mountShell("blocks");
let chainId = getSelectedNetwork().chainId;
let page = 0;
const PAGE = 25;

type Row = { number: number; timestamp: number; miner: string; tx_count: number; gas_used: number };

function frame(): void {
  main.innerHTML = `${pageHead("Blocks", "Every block on the selected network — newest first.")}<div data-out>${loading()}</div>`;
}

const table = (rows: Row[]): string => `
  <div class="expl-card" style="padding:0"><div class="expl-table-wrap"><table class="expl-table">
    <thead><tr><th>Block</th><th>Age</th><th>Txns</th><th>Miner</th><th>Gas used</th></tr></thead>
    <tbody>${rows
      .map((b) => `<tr><td>${blockLink(b.number)}</td><td>${timeAgo(b.timestamp)}</td><td>${b.tx_count}</td><td>${addrLink(b.miner)}</td><td>${commas(b.gas_used)}</td></tr>`)
      .join("")}</tbody></table></div></div>`;

const pager = (): string =>
  `<div class="expl-pager"><button data-prev ${page === 0 ? "disabled" : ""}>← Newer</button><span style="color:var(--color-muted);font-size:.85rem;align-self:center">Page ${page + 1}</span><button data-next>Older →</button></div>`;

function wirePager(hasMore: boolean): void {
  main.querySelector<HTMLButtonElement>("[data-prev]")?.addEventListener("click", () => {
    if (page > 0) { page--; void load(); }
  });
  const next = main.querySelector<HTMLButtonElement>("[data-next]");
  if (next) { next.disabled = !hasMore; next.addEventListener("click", () => { page++; void load(); }); }
}

async function load(): Promise<void> {
  const net = getSelectedNetwork();
  const el = main.querySelector("[data-out]");
  if (!el) return;
  el.innerHTML = loading();
  try {
    if (await isIndexed(net.chainId)) {
      const rows = (await apiBlocks(net.chainId, PAGE, page * PAGE)).map((b) => ({
        number: b.number, timestamp: b.timestamp, miner: b.miner, tx_count: b.tx_count, gas_used: b.gas_used,
      }));
      el.innerHTML = rows.length ? table(rows) + pager() : emptyPanel(page > 0 ? "No more blocks." : "No blocks indexed yet for this network.");
      wirePager(rows.length === PAGE);
    } else if (net.rpc) {
      const head = hexToInt(await rpc.blockNumber());
      const start = head - page * PAGE;
      const nums: number[] = [];
      for (let i = 0; i < PAGE && start - i >= 0; i++) nums.push(start - i);
      const blks = (await Promise.all(nums.map((n) => rpc.getBlockByNumber(n, false).catch(() => null)))).filter(
        (b): b is rpc.RpcBlock => b != null,
      );
      const rows = blks.map((b) => ({
        number: hexToInt(b.number), timestamp: hexToInt(b.timestamp), miner: b.miner,
        tx_count: b.transactions.length, gas_used: hexToInt(b.gasUsed),
      }));
      el.innerHTML = rows.length ? table(rows) + pager() : emptyPanel("No blocks.");
      wirePager(start - PAGE >= 0);
    } else {
      el.innerHTML = offlinePanel(net.name);
    }
    wireCopy(main);
  } catch (e) {
    el.innerHTML = errorPanel((e as Error).message);
  }
}

frame();
void load();
subscribe((s: NetSnapshot) => {
  if (s.selected.chainId !== chainId) { chainId = s.selected.chainId; page = 0; frame(); void load(); }
});
