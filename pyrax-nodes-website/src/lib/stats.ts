// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// The homepage "live network" card — real-time block height / connected peers / live TPS for the
// SELECTED network (see network-store.ts). Honest by default: an unconfigured or unreachable network
// shows a red OFFLINE dot + em-dashes; the numbers light up the instant the network's rpc is wired
// and producing blocks. Re-renders in real time as the store polls.

import { subscribe } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";

const fmtK = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}`.replace(/\.0$/, "") + "M";
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
};
const fmtTps = (n: number): string => (n >= 100 ? fmtK(Math.round(n)) : n >= 10 ? n.toFixed(0) : n.toFixed(1));

export function mountLiveStats(el: HTMLElement): void {
  const cell = (key: string, label: string, fallback: string, isLive = true) => `
    <div class="livecell${isLive ? " livecell-live" : ""}">
      <div class="livecell-num" data-live="${key}">${fallback}</div>
      <div class="livecell-label">${label}</div>
    </div>`;

  el.innerHTML = `
    <div class="livecard grad-ring">
      <div class="livecard-head">
        <span class="live-badge" data-live-badge>
          <span class="status-dot" data-live-dot aria-hidden="true"></span>
          <span data-live-badge-text>LIVE</span>
        </span>
        <span class="livecard-net" data-live-net>—</span>
        <span class="livecard-note" data-live-note>streaming from a running PYRAX mesh</span>
      </div>
      <div class="livecard-grid">
        ${cell("blockHeight", "Block height", "—")}
        ${cell("peers", "Connected peers", "—")}
        ${cell("tps", "Live TPS", "—")}
        ${cell("target", "Throughput target", "500k+", false)}
      </div>
    </div>`;

  const set = (key: string, v: string) => {
    const node = el.querySelector<HTMLElement>(`[data-live="${key}"]`);
    if (node) node.textContent = v;
  };

  subscribe((s: NetSnapshot) => {
    const online = s.live.online && s.live.producing;
    const netEl = el.querySelector<HTMLElement>("[data-live-net]");
    if (netEl) netEl.textContent = s.selected.name;
    el.querySelector<HTMLElement>("[data-live-dot]")?.classList.toggle("is-offline", !online);
    const badge = el.querySelector<HTMLElement>("[data-live-badge-text]");
    if (badge) badge.textContent = online ? "LIVE" : s.live.online ? "SYNCING" : "OFFLINE";
    el.querySelector<HTMLElement>("[data-live-badge]")?.classList.toggle("is-offline", !online);
    const note = el.querySelector<HTMLElement>("[data-live-note]");
    if (note)
      note.textContent = online
        ? "block height & peers streaming live from a running PYRAX mesh"
        : "no live blocks right now — the tiles fill in when the network is producing";
    set("blockHeight", Number.isFinite(s.live.blockHeight) ? `#${(s.live.blockHeight as number).toLocaleString("en-US")}` : "—");
    set("peers", Number.isFinite(s.live.peers) ? String(s.live.peers) : "—");
    set("tps", Number.isFinite(s.live.tps) ? fmtTps(s.live.tps as number) : "—");
  });
}
