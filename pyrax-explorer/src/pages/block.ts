// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
// Block detail (?number= or ?hash=) — indexer-backed with a live-RPC fallback.

import { mountShell } from "../lib/shell.js";
import { subscribe, getSelectedNetwork } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";
import { apiBlock, isIndexed } from "../lib/api.js";
import { pageHead, card, kv, loading, errorPanel, offlinePanel, emptyPanel, addrLink, txLink, blockLink, copyable, mono, badge, wireCopy } from "../lib/widgets.js";
import { commas, timeAgo, fullTime, toPyrx, toSpark, hexToInt, qp, shorten } from "../lib/format.js";
import * as rpc from "../lib/rpc.js";

const main = mountShell("");
let chainId = getSelectedNetwork().chainId;

type Tx = { hash: string; from_addr: string; to_addr: string | null; value: string };
type B = { number: number; hash: string; parent_hash: string; miner: string; timestamp: number; gas_used: number; gas_limit: number; base_fee: string | null; size: number; txns: Tx[] };

const key = (): { number?: number; hash?: string } => {
  const h = qp("hash"), n = qp("number");
  if (h) return { hash: h };
  if (n) return { number: Number(n) };
  return {};
};

async function fetchBlock(net: rpc.Net): Promise<B | null> {
  const k = key();
  if (await isIndexed(net.chainId)) {
    try {
      const b = await apiBlock(net.chainId, k.hash ?? k.number ?? 0);
      return { number: b.number, hash: b.hash, parent_hash: b.parent_hash, miner: b.miner, timestamp: b.timestamp, gas_used: b.gas_used, gas_limit: b.gas_limit, base_fee: b.base_fee, size: b.size, txns: (b.txns ?? []).map((t) => ({ hash: t.hash, from_addr: t.from_addr, to_addr: t.to_addr, value: t.value })) };
    } catch {
      /* fall through to RPC */
    }
  }
  if (net.rpc) {
    const rb = k.hash ? await rpc.getBlockByHash(k.hash, true) : await rpc.getBlockByNumber(k.number ?? 0, true);
    if (!rb) return null;
    const txns = rb.transactions.filter((t): t is rpc.RpcTx => typeof t !== "string").map((t) => ({ hash: t.hash, from_addr: t.from, to_addr: t.to, value: BigInt(t.value || "0x0").toString() }));
    return { number: hexToInt(rb.number), hash: rb.hash, parent_hash: rb.parentHash, miner: rb.miner, timestamp: hexToInt(rb.timestamp), gas_used: hexToInt(rb.gasUsed), gas_limit: hexToInt(rb.gasLimit), base_fee: rb.baseFeePerGas ? BigInt(rb.baseFeePerGas).toString() : null, size: hexToInt(rb.size), txns };
  }
  return null;
}

function render(b: B): string {
  const nav = `${b.number > 0 ? blockLink(b.number - 1, "← Prev") : ""}&nbsp;&nbsp;${blockLink(b.number + 1, "Next →")}`;
  const detail = card(
    [
      kv("Height", mono("#" + commas(b.number))),
      kv("Hash", copyable(b.hash)),
      kv("Parent hash", b.number > 0 ? blockLink(b.number - 1, shorten(b.parent_hash, 10, 8)) : mono(b.parent_hash)),
      kv("Timestamp", `${fullTime(b.timestamp)} · ${timeAgo(b.timestamp)}`),
      kv("Miner / producer", addrLink(b.miner, false)),
      kv("Transactions", String(b.txns.length)),
      kv("Gas used", `${commas(b.gas_used)} / ${commas(b.gas_limit)}`),
      kv("Base fee", b.base_fee ? `${toSpark(BigInt(b.base_fee))} spark` : "—"),
      kv("Size", `${commas(b.size)} bytes`),
    ].join(""),
  );
  const txs = b.txns.length
    ? `<h2 class="expl-section-title">Transactions (${b.txns.length})</h2><div class="expl-card" style="padding:0"><div class="expl-table-wrap"><table class="expl-table"><thead><tr><th>Tx hash</th><th>From</th><th>To</th><th>Value</th></tr></thead><tbody>${b.txns.map((t) => `<tr><td>${txLink(t.hash)}</td><td>${addrLink(t.from_addr)}</td><td>${t.to_addr ? addrLink(t.to_addr) : badge("Contract creation", "violet")}</td><td>${toPyrx(BigInt(t.value || "0"), 4)} PYRX</td></tr>`).join("")}</tbody></table></div></div>`
    : `<h2 class="expl-section-title">Transactions</h2>${emptyPanel("This block has no transactions.")}`;
  return pageHead(`Block #${commas(b.number)}`, `${fullTime(b.timestamp)} · ${timeAgo(b.timestamp)}`, nav) + detail + txs;
}

async function load(): Promise<void> {
  const net = getSelectedNetwork();
  const k = key();
  if (k.number === undefined && !k.hash) {
    main.innerHTML = pageHead("Block") + errorPanel("No block specified.");
    return;
  }
  main.innerHTML = pageHead("Block") + loading();
  try {
    if (!(await isIndexed(net.chainId)) && !net.rpc) {
      main.innerHTML = pageHead("Block") + offlinePanel(net.name);
      return;
    }
    const b = await fetchBlock(net);
    main.innerHTML = b ? render(b) : pageHead("Block") + errorPanel(`Block not found on ${net.name}.`);
    wireCopy(main);
  } catch (e) {
    main.innerHTML = pageHead("Block") + errorPanel((e as Error).message);
  }
}

void load();
subscribe((s: NetSnapshot) => {
  if (s.selected.chainId !== chainId) { chainId = s.selected.chainId; void load(); }
});
