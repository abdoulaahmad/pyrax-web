// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
// Gas tracker — current price, base fee, priority-fee tiers, and recent block utilization (eth_feeHistory).

import { mountShell } from "../lib/shell.js";
import { subscribe, getSelectedNetwork } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";
import { pageHead, card, statTile, errorPanel, offlinePanel, wireCopy } from "../lib/widgets.js";
import { toSpark } from "../lib/format.js";
import * as rpc from "../lib/rpc.js";

const main = mountShell("gas");
let chainId = getSelectedNetwork().chainId;
let timer = 0;

const last = <T,>(a: T[]): T | undefined => a[a.length - 1];

function utilBars(ratios: number[]): string {
  const rows = ratios
    .slice(-12)
    .map((r) => {
      const pct = Math.round((r || 0) * 100);
      const tone = pct >= 90 ? "var(--color-negative)" : pct >= 60 ? "var(--color-brand-soft)" : "var(--color-positive)";
      return `<div style="display:flex;align-items:center;gap:.6rem;margin:.25rem 0"><span style="width:3rem;font-size:.75rem;color:var(--color-faint)">${pct}%</span><div style="flex:1;height:.5rem;border-radius:999px;background:var(--color-bg-2);overflow:hidden"><div style="height:100%;width:${pct}%;background:${tone}"></div></div></div>`;
    })
    .join("");
  return card(`<div style="font-size:.8rem;color:var(--color-faint);margin-bottom:.5rem">Recent block gas utilization (oldest → newest)</div>${rows}`);
}

async function load(): Promise<void> {
  const net = getSelectedNetwork();
  const head = pageHead("Gas tracker", `Live fees on ${net.name}.`);
  if (!net.rpc) {
    main.innerHTML = head + offlinePanel(net.name);
    return;
  }
  try {
    const [gp, fh] = await Promise.all([
      rpc.gasPrice().catch(() => null),
      rpc.feeHistory(20, "latest", [10, 50, 90]).catch(() => null),
    ]);
    const baseFee = fh && fh.baseFeePerGas.length ? last(fh.baseFeePerGas) : undefined;
    const rewards = fh?.reward ?? [];
    const lastReward = last(rewards);
    const tiles = `<div class="expl-stat-grid" style="grid-template-columns:repeat(2,1fr)">
      ${statTile("Gas price", gp ? toSpark(gp) + " spark" : "—", "eth_gasPrice", "brand")}
      ${statTile("Base fee", baseFee ? toSpark(baseFee) + " spark" : "—", "latest block", "bolt")}
      ${statTile("Priority — low", lastReward && lastReward[0] ? toSpark(lastReward[0]) + " spark" : "—", "p10 tip")}
      ${statTile("Priority — high", lastReward && lastReward[2] ? toSpark(lastReward[2]) + " spark" : "—", "p90 tip", "violet")}
    </div>`;
    main.innerHTML = head + tiles + (fh ? utilBars(fh.gasUsedRatio) : "");
    wireCopy(main);
  } catch (e) {
    main.innerHTML = head + errorPanel((e as Error).message);
  }
}

function start(): void {
  window.clearInterval(timer);
  timer = window.setInterval(() => void load(), 8000);
}

void load();
start();
subscribe((s: NetSnapshot) => {
  if (s.selected.chainId !== chainId) { chainId = s.selected.chainId; void load(); }
});
