// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
// Token detail (?a=) — on-chain ERC-20 metadata (eth_call) + indexed transfers.

import { mountShell } from "../lib/shell.js";
import { subscribe, getSelectedNetwork } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";
import { apiToken, isIndexed, type IdxTransfer } from "../lib/api.js";
import { pageHead, card, statTile, loading, errorPanel, offlinePanel, emptyPanel, badge, copyable, addrLink, txLink, wireCopy } from "../lib/widgets.js";
import { commas, timeAgo, hexToInt, hexToBig, formatUnits, qp, isAddress } from "../lib/format.js";
import * as rpc from "../lib/rpc.js";

const main = mountShell("");
let chainId = getSelectedNetwork().chainId;
const addr = qp("a").toLowerCase();

const SEL = { name: "0x06fdde03", symbol: "0x95d89b41", decimals: "0x313ce567", totalSupply: "0x18160ddd" };

const hexToAscii = (h: string): string => {
  let s = "";
  for (let i = 0; i < h.length; i += 2) {
    const c = parseInt(h.slice(i, i + 2), 16);
    if (c > 0) s += String.fromCharCode(c);
  }
  return s.replace(/[^\x20-\x7e]/g, "").trim();
};
function decodeString(hex: string): string {
  const h = (hex || "").replace(/^0x/, "");
  if (h.length === 0) return "";
  if (h.length <= 64) return hexToAscii(h); // bytes32-style
  const len = parseInt(h.slice(64, 128), 16);
  if (!Number.isFinite(len)) return hexToAscii(h.slice(0, 64));
  return hexToAscii(h.slice(128, 128 + len * 2));
}

type Meta = { name?: string; symbol?: string; decimals?: number; totalSupply?: bigint };
async function fetchMeta(net: rpc.Net): Promise<Meta> {
  if (!net.rpc) return {};
  const [n, s, d, ts] = await Promise.all([
    rpc.ethCall(addr, SEL.name).catch(() => "0x"),
    rpc.ethCall(addr, SEL.symbol).catch(() => "0x"),
    rpc.ethCall(addr, SEL.decimals).catch(() => "0x"),
    rpc.ethCall(addr, SEL.totalSupply).catch(() => "0x"),
  ]);
  return {
    name: decodeString(n) || undefined,
    symbol: decodeString(s) || undefined,
    decimals: d && d !== "0x" ? hexToInt(d) : undefined,
    totalSupply: ts && ts !== "0x" ? hexToBig(ts) : undefined,
  };
}

function transferTable(rows: IdxTransfer[], decimals?: number): string {
  if (!rows.length) return emptyPanel("No transfers recorded for this token yet.");
  return `<div class="expl-card" style="padding:0"><div class="expl-table-wrap"><table class="expl-table">
    <thead><tr><th>Tx</th><th>Age</th><th>From</th><th>To</th><th>Amount / ID</th></tr></thead>
    <tbody>${rows
      .map((x) => {
        const amt = x.kind === "erc721" ? `#${x.amount}` : decimals != null ? formatUnits(BigInt(x.amount || "0"), decimals) : commas(x.amount);
        return `<tr><td>${txLink(x.tx_hash)}</td><td>${timeAgo(x.block_time)}</td><td>${addrLink(x.from_addr)}</td><td>${addrLink(x.to_addr)}</td><td>${amt}</td></tr>`;
      })
      .join("")}</tbody></table></div></div>`;
}

async function load(): Promise<void> {
  const net = getSelectedNetwork();
  if (!isAddress(addr)) {
    main.innerHTML = pageHead("Token") + errorPanel("Not a valid token address.");
    return;
  }
  main.innerHTML = pageHead("Token") + loading();
  try {
    const indexed = await isIndexed(net.chainId);
    if (!net.rpc && !indexed) {
      main.innerHTML = pageHead("Token") + offlinePanel(net.name);
      return;
    }
    const meta = await fetchMeta(net);
    let transfers: IdxTransfer[] = [];
    let kind = "erc20";
    if (indexed) {
      const t = await apiToken(net.chainId, addr, 50, 0);
      transfers = t.transfers;
      if (t.token?.kind) kind = t.token.kind;
    }
    const title = meta.name ? `${meta.name}${meta.symbol ? ` (${meta.symbol})` : ""}` : "Token";
    const overview = card(`<div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin-bottom:.8rem">${badge(kind.toUpperCase(), kind === "erc721" ? "violet" : "amber")}${copyable(addr)}</div>`) +
      `<div class="expl-stat-grid" style="grid-template-columns:repeat(2,1fr)">
        ${statTile("Symbol", meta.symbol ?? "—")}
        ${statTile("Decimals", meta.decimals != null ? String(meta.decimals) : "—")}
        ${statTile("Total supply", meta.totalSupply != null ? formatUnits(meta.totalSupply, meta.decimals ?? 0) : "—", "", "brand")}
        ${statTile("Transfers", commas(transfers.length) + (transfers.length >= 50 ? "+" : ""))}
      </div>`;
    main.innerHTML = pageHead(title, "") + overview + `<h2 class="expl-section-title">Transfers</h2>` + transferTable(transfers, meta.decimals);
    wireCopy(main);
  } catch (e) {
    main.innerHTML = pageHead("Token") + errorPanel((e as Error).message);
  }
}

void load();
subscribe((s: NetSnapshot) => {
  if (s.selected.chainId !== chainId) { chainId = s.selected.chainId; void load(); }
});
