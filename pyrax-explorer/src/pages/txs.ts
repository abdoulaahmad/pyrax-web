// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
// Transactions list — indexer-backed, with a live-RPC fallback (flatten recent blocks' txns).

import { mountShell } from "../lib/shell.js";
import { subscribe, getSelectedNetwork } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";
import { apiTxs, isIndexed } from "../lib/api.js";
import { pageHead, loading, errorPanel, offlinePanel, emptyPanel, addrLink, txLink, blockLink, badge, wireCopy } from "../lib/widgets.js";
import { toPyrx, timeAgo, hexToInt } from "../lib/format.js";
import * as rpc from "../lib/rpc.js";

const main = mountShell("txs");
let chainId = getSelectedNetwork().chainId;
let page = 0;
const PAGE = 25;

type Row = { hash: string; block_number: number; block_time: number; from_addr: string; to_addr: string | null; value: string; status: number | null; contract_created: string | null };

function frame(): void {
  main.innerHTML = `${pageHead("Transactions", "Recent transactions on the selected network — newest first.")}<div data-out>${loading()}</div>`;
}

const toCell = (r: Row): string =>
  r.to_addr ? addrLink(r.to_addr) : r.contract_created ? `${badge("Created", "violet")} ${addrLink(r.contract_created)}` : badge("Contract creation", "violet");
const statusCell = (s: number | null): string => (s === 1 ? badge("Success", "positive") : s === 0 ? badge("Failed", "negative") : "—");

const table = (rows: Row[]): string => `
  <div class="expl-card" style="padding:0"><div class="expl-table-wrap"><table class="expl-table">
    <thead><tr><th>Tx hash</th><th>Block</th><th>Age</th><th>From</th><th>To</th><th>Value</th><th>Status</th></tr></thead>
    <tbody>${rows
      .map((r) => `<tr><td>${txLink(r.hash)}</td><td>${blockLink(r.block_number)}</td><td>${timeAgo(r.block_time)}</td><td>${addrLink(r.from_addr)}</td><td>${toCell(r)}</td><td>${toPyrx(BigInt(r.value || "0"), 4)} PYRX</td><td>${statusCell(r.status)}</td></tr>`)
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
      const rows = (await apiTxs(net.chainId, PAGE, page * PAGE)).map((t) => ({
        hash: t.hash, block_number: t.block_number, block_time: t.block_time, from_addr: t.from_addr,
        to_addr: t.to_addr, value: t.value, status: t.status, contract_created: t.contract_created,
      }));
      el.innerHTML = rows.length ? table(rows) + pager() : emptyPanel(page > 0 ? "No more transactions." : "No transactions indexed yet — this chain may be idle.");
      wirePager(rows.length === PAGE);
    } else if (net.rpc) {
      // RPC fallback: flatten txns from recent full blocks (page 0 only — RPC can't paginate tx history).
      const head = hexToInt(await rpc.blockNumber());
      const rows: Row[] = [];
      for (let i = 0; i < 25 && head - i >= 0 && rows.length < PAGE; i++) {
        const b = await rpc.getBlockByNumber(head - i, true).catch(() => null);
        if (!b) continue;
        const ts = hexToInt(b.timestamp);
        for (const t of b.transactions) {
          if (typeof t === "string") continue;
          rows.push({ hash: t.hash, block_number: hexToInt(b.number), block_time: ts, from_addr: t.from, to_addr: t.to, value: BigInt(t.value || "0x0").toString(), status: null, contract_created: null });
          if (rows.length >= PAGE) break;
        }
      }
      el.innerHTML = rows.length ? table(rows) : emptyPanel("No transactions in recent blocks — this chain is idle.");
      wirePager(false);
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
