// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
// Address detail (?a=) — live balance/nonce/code via RPC + indexed transaction & token-transfer history.

import { mountShell } from "../lib/shell.js";
import { subscribe, getSelectedNetwork } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";
import { apiAddress, apiContract, isIndexed, type IdxTx, type IdxTransfer } from "../lib/api.js";
import { pageHead, card, statTile, loading, errorPanel, offlinePanel, emptyPanel, copyable, badge, addrLink, txLink, blockLink, wireCopy } from "../lib/widgets.js";
import { toPyrx, commas, timeAgo, hexToInt, qp, isAddress } from "../lib/format.js";
import * as rpc from "../lib/rpc.js";

const main = mountShell("address");
let chainId = getSelectedNetwork().chainId;
const addr = qp("a").toLowerCase();

type View = {
  balance: string; nonce: string; isContract: boolean; contractVerified: boolean; txCount: number;
  txns: IdxTx[]; transfers: IdxTransfer[]; indexed: boolean; hasRpc: boolean;
};

function txTable(addrLc: string, rows: IdxTx[]): string {
  if (!rows.length) return emptyPanel("No transactions recorded for this address yet.");
  return `<div class="expl-card" style="padding:0"><div class="expl-table-wrap"><table class="expl-table">
    <thead><tr><th>Tx hash</th><th>Block</th><th>Age</th><th>From</th><th></th><th>To</th><th>Value</th></tr></thead>
    <tbody>${rows
      .map((t) => {
        const out = t.from_addr === addrLc;
        const dir = out ? badge("OUT", "negative") : badge("IN", "positive");
        const to = t.to_addr ? addrLink(t.to_addr) : badge("Contract creation", "violet");
        return `<tr><td>${txLink(t.hash)}</td><td>${blockLink(t.block_number)}</td><td>${timeAgo(t.block_time)}</td><td>${addrLink(t.from_addr)}</td><td>${dir}</td><td>${to}</td><td>${toPyrx(BigInt(t.value || "0"), 4)} PYRX</td></tr>`;
      })
      .join("")}</tbody></table></div></div>`;
}

function transferTable(rows: IdxTransfer[]): string {
  if (!rows.length) return emptyPanel("No token transfers for this address.");
  return `<div class="expl-card" style="padding:0"><div class="expl-table-wrap"><table class="expl-table">
    <thead><tr><th>Tx</th><th>Age</th><th>Token</th><th>From</th><th>To</th><th>Amount / ID</th><th>Kind</th></tr></thead>
    <tbody>${rows
      .map((x) => `<tr><td>${txLink(x.tx_hash)}</td><td>${timeAgo(x.block_time)}</td><td>${addrLink(x.token)}</td><td>${addrLink(x.from_addr)}</td><td>${addrLink(x.to_addr)}</td><td>${commas(x.amount)}</td><td>${badge(x.kind.toUpperCase(), x.kind === "erc721" ? "violet" : "amber")}</td></tr>`)
      .join("")}</tbody></table></div></div>`;
}

function render(v: View): string {
  const head = pageHead(v.isContract ? "Contract" : "Address", "", v.isContract ? `<a class="expl-more" href="/contract.html?a=${addr}">Contract details →</a>` : "");
  const idLine = card(`<div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap">${v.isContract ? badge("Contract", "violet") : badge("Account", "")}${v.isContract && v.contractVerified ? badge("Verified", "positive") : ""}${copyable(addr)}</div>`);
  const tiles = `<div class="expl-stat-grid" style="grid-template-columns:repeat(2,1fr)">
    ${statTile("Balance", v.hasRpc ? `${v.balance} PYRX` : "—", v.hasRpc ? "live" : "RPC offline", "brand")}
    ${statTile("Nonce", v.nonce, "outgoing txns")}
    ${statTile("Transactions", v.indexed ? commas(v.txCount) : "—", v.indexed ? "indexed" : "needs indexer")}
    ${statTile("Type", v.isContract ? "Contract" : "EOA", v.isContract ? (v.contractVerified ? "source verified" : "unverified") : "externally owned")}
  </div>`;
  const history = v.indexed
    ? `<h2 class="expl-section-title">Transactions</h2>${txTable(addr, v.txns)}<h2 class="expl-section-title">Token transfers</h2>${transferTable(v.transfers)}`
    : `<h2 class="expl-section-title">History</h2>${emptyPanel("Transaction history for this network requires the indexer, which isn't indexing this network yet. Balance, nonce and code above are read live from the node.")}`;
  return head + idLine + tiles + history;
}

async function load(): Promise<void> {
  const net = getSelectedNetwork();
  if (!addr) {
    main.innerHTML = pageHead("Address lookup") + emptyPanel("Paste an address (0x + 40 hex) in the search bar above to look it up.");
    return;
  }
  if (!isAddress(addr)) {
    main.innerHTML = pageHead("Address") + errorPanel("Not a valid address (expected 0x + 40 hex).");
    return;
  }
  main.innerHTML = pageHead("Address") + loading();
  try {
    const indexed = await isIndexed(net.chainId);
    if (!net.rpc && !indexed) {
      main.innerHTML = pageHead("Address") + offlinePanel(net.name);
      return;
    }
    let balance = "—", nonce = "—", isContract = false, contractVerified = false;
    if (net.rpc) {
      const [bal, nc, code] = await Promise.all([
        rpc.getBalance(addr).catch(() => null),
        rpc.getTxCount(addr).catch(() => null),
        rpc.getCode(addr).catch(() => "0x"),
      ]);
      if (bal) balance = toPyrx(bal, 6);
      if (nc) nonce = String(hexToInt(nc));
      isContract = !!code && code !== "0x";
    }
    let txns: IdxTx[] = [], transfers: IdxTransfer[] = [], txCount = 0;
    if (indexed) {
      const a = await apiAddress(net.chainId, addr, 25, 0);
      txns = a.txns; transfers = a.transfers; txCount = a.txCount;
    }
    if (isContract && indexed) {
      try { contractVerified = !!(await apiContract(net.chainId, addr)); } catch { /* unverified */ }
    }
    main.innerHTML = render({ balance, nonce, isContract, contractVerified, txCount, txns, transfers, indexed, hasRpc: !!net.rpc });
    wireCopy(main);
  } catch (e) {
    main.innerHTML = pageHead("Address") + errorPanel((e as Error).message);
  }
}

void load();
subscribe((s: NetSnapshot) => {
  if (s.selected.chainId !== chainId) { chainId = s.selected.chainId; void load(); }
});
