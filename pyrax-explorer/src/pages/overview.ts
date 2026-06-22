// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Overview / dashboard — live from the SELECTED network's JSON-RPC. Shows network status, headline
// stats, the latest blocks and the latest transactions. Honest by default: an unwired network shows
// an "isn't live yet" panel; an idle chain simply shows zero throughput. Re-targets instantly when the
// network selector changes.

import { mountShell } from "../lib/shell.js";
import { subscribe, getSelectedNetwork, icon } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";
import * as rpc from "../lib/rpc.js";
import { RpcOffline, type RpcBlock, type RpcTx } from "../lib/rpc.js";
import { searchBarHtml, wireSearch } from "../lib/searchbox.js";
import { pageHead, statTile, addrLink, txLink, blockLink, loading, errorPanel, offlinePanel, badge, wireCopy } from "../lib/widgets.js";
import { hexToInt, toPyrx, toGwei, commas, timeAgo } from "../lib/format.js";

const main = mountShell("overview");
const sel = <T extends Element>(s: string): T | null => main.querySelector<T>(s);

let chainId = getSelectedNetwork().chainId;
let polling = 0;
let busy = false;

function frame(): void {
  main.innerHTML = `
    ${pageHead("PYRAX Explorer", "Browse blocks, transactions, accounts and contracts across every PYRAX network. Choose a network in the navbar — the explorer reads that chain live.")}
    <div class="expl-hero-search">${searchBarHtml(true)}</div>
    <div data-ov-status></div>
    <div class="expl-stat-grid" data-ov-stats>${loading("Reading the network…")}</div>
    <div class="expl-two-col">
      <section class="expl-card expl-listcard">
        <div class="expl-listcard-head"><h2>Latest blocks</h2><a href="/blocks.html" class="expl-more">View all ${icon("arrow", "h-3.5 w-3.5")}</a></div>
        <div data-ov-blocks>${loading()}</div>
      </section>
      <section class="expl-card expl-listcard">
        <div class="expl-listcard-head"><h2>Latest transactions</h2><a href="/txs.html" class="expl-more">View all ${icon("arrow", "h-3.5 w-3.5")}</a></div>
        <div data-ov-txs>${loading()}</div>
      </section>
    </div>`;
  wireSearch(main);
}

function statusBanner(net: rpc.Net, online: boolean, producing: boolean): string {
  const tone = online && producing ? "positive" : online ? "amber" : "negative";
  const label = online && producing ? "LIVE" : online ? "SYNCING" : "OFFLINE";
  const note =
    online && producing
      ? "Connected and sealing blocks — data below is live."
      : online
        ? "Reachable, but no confirmed block advance yet."
        : "No public RPC endpoint wired for this network yet.";
  return `
    <div class="expl-statusbar">
      <span class="expl-statusdot expl-statusdot-${tone}" aria-hidden="true"></span>
      <span class="expl-status-net">${net.name}</span>
      ${badge(label, tone)}
      <span class="expl-status-note">${note}</span>
    </div>`;
}

function blockRow(b: RpcBlock): string {
  const num = hexToInt(b.number);
  const ts = hexToInt(b.timestamp);
  const txCount = Array.isArray(b.transactions) ? b.transactions.length : 0;
  return `
    <div class="expl-row">
      <span class="expl-row-ic">${icon("blocks", "h-4 w-4")}</span>
      <div class="expl-row-main">
        <div class="expl-row-top">${blockLink(num)}<span class="expl-row-age">${timeAgo(ts)}</span></div>
        <div class="expl-row-sub">Miner ${addrLink(b.miner)} · gas ${commas(hexToInt(b.gasUsed))}</div>
      </div>
      <a href="/block.html?number=${num}" class="expl-row-chip">${txCount} txn${txCount === 1 ? "" : "s"}</a>
    </div>`;
}

function txRow(t: RpcTx, ts: number): string {
  const to = t.to ? addrLink(t.to) : `<span class="expl-badge expl-badge-violet">Contract creation</span>`;
  return `
    <div class="expl-row">
      <span class="expl-row-ic">${icon("arrow", "h-4 w-4")}</span>
      <div class="expl-row-main">
        <div class="expl-row-top">${txLink(t.hash)}<span class="expl-row-age">${timeAgo(ts)}</span></div>
        <div class="expl-row-sub">${addrLink(t.from)} <span class="expl-arrow">→</span> ${to}</div>
      </div>
      <span class="expl-row-chip">${toPyrx(t.value, 4)} PYRX</span>
    </div>`;
}

async function refresh(): Promise<void> {
  if (busy) return;
  busy = true;
  const net = getSelectedNetwork();
  const statusEl = sel("[data-ov-status]");
  const statsEl = sel("[data-ov-stats]");
  const blocksEl = sel("[data-ov-blocks]");
  const txsEl = sel("[data-ov-txs]");
  try {
    if (!net.rpc) {
      if (statusEl) statusEl.innerHTML = statusBanner(net, false, false);
      if (statsEl) statsEl.innerHTML = "";
      if (blocksEl) blocksEl.innerHTML = offlinePanel(net.name);
      if (txsEl) txsEl.innerHTML = "";
      return;
    }

    const [heightHex, gasHex, peersHex] = await Promise.all([
      rpc.blockNumber(),
      rpc.gasPrice().catch(() => undefined),
      rpc.peerCount(),
    ]);
    const height = hexToInt(heightHex);

    const N = 8;
    const nums: number[] = [];
    for (let i = 0; i < N && height - i >= 0; i++) nums.push(height - i);
    const blocks = (await Promise.all(nums.map((n) => rpc.getBlockByNumber(n, true).catch(() => null)))).filter(
      (b): b is RpcBlock => b != null,
    );

    const newest = blocks[0];
    const producing = blocks.length >= 2;
    if (statusEl) statusEl.innerHTML = statusBanner(net, true, producing);

    // avg block time from the fetched window
    let avgBlockTime = "—";
    if (blocks.length >= 2) {
      const first = blocks[blocks.length - 1]!;
      const last = blocks[0]!;
      const span = hexToInt(last.timestamp) - hexToInt(first.timestamp);
      const gaps = blocks.length - 1;
      if (span > 0 && gaps > 0) avgBlockTime = (span / gaps).toFixed(1) + "s";
    }
    const txWindow = blocks.reduce((a, b) => a + (Array.isArray(b.transactions) ? b.transactions.length : 0), 0);

    if (statsEl)
      statsEl.innerHTML = [
        statTile("Latest block", "#" + commas(height), newest ? timeAgo(hexToInt(newest.timestamp)) : "", "brand"),
        statTile("Gas price", gasHex ? toGwei(gasHex) + " gwei" : "—", "current base", "bolt"),
        statTile("Connected peers", peersHex != null ? commas(hexToInt(peersHex)) : "—", "via net_peerCount"),
        statTile("Avg block time", avgBlockTime, `last ${blocks.length} blocks`),
        statTile("Txns (last 8 blk)", commas(txWindow), "recent throughput", "violet"),
        statTile("Chain ID", commas(net.chainId), net.blockTime + " target"),
      ].join("");

    if (blocksEl)
      blocksEl.innerHTML = blocks.length
        ? blocks.slice(0, 6).map(blockRow).join("")
        : `<div class="expl-empty">No blocks yet.</div>`;

    // latest transactions: newest blocks first, flatten their (full) transactions
    const txs: { t: RpcTx; ts: number }[] = [];
    for (const b of blocks) {
      const ts = hexToInt(b.timestamp);
      for (const t of b.transactions) {
        if (typeof t !== "string") txs.push({ t, ts });
        if (txs.length >= 6) break;
      }
      if (txs.length >= 6) break;
    }
    if (txsEl)
      txsEl.innerHTML = txs.length
        ? txs.map(({ t, ts }) => txRow(t, ts)).join("")
        : `<div class="expl-empty">No transactions in the latest blocks — this chain is idle right now.</div>`;

    wireCopy(main);
  } catch (e) {
    const msg = e instanceof RpcOffline ? e.message : (e as Error)?.message ?? "Failed to read the network.";
    if (statusEl) statusEl.innerHTML = statusBanner(net, false, false);
    if (statsEl) statsEl.innerHTML = "";
    if (blocksEl) blocksEl.innerHTML = errorPanel(msg);
    if (txsEl) txsEl.innerHTML = "";
  } finally {
    busy = false;
  }
}

function startPolling(): void {
  window.clearInterval(polling);
  polling = window.setInterval(() => void refresh(), 6000);
}

frame();
void refresh();
startPolling();

// React to network-selector changes: re-frame + refetch immediately on a chain switch.
subscribe((s: NetSnapshot) => {
  if (s.selected.chainId !== chainId) {
    chainId = s.selected.chainId;
    frame();
    void refresh();
  }
});
