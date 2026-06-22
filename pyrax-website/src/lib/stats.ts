// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// The homepage "live network" card — real-time block height / connected peers / live TPS for the
// SELECTED network (see network-store.ts). Honest by default: an unconfigured or unreachable network
// shows a red OFFLINE dot + em-dashes; the numbers light up the instant the network's rpc is wired
// and producing blocks. Re-renders in real time as the store polls.
//
// Block height animates with a count-up so each new block reads smoothly (the store polls the height
// every ~1s). Live TPS is the REAL value (0 when the chain is idle — empty blocks) and is colored
// against the published throughput target: neutral while idle, then red -> amber -> green as real
// throughput approaches/exceeds the target.

import { subscribe } from "./network-store.js";
import type { NetSnapshot } from "./network-store.js";

const fmtK = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}`.replace(/\.0$/, "") + "M";
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
};
const fmtTps = (n: number): string => (n >= 100 ? fmtK(Math.round(n)) : n >= 10 ? n.toFixed(0) : n.toFixed(1));

// The published throughput target the Live TPS is colored against.
const TARGET_TPS = 500_000;
/** Color tier for Live TPS vs the target. Idle (~0 TPS, no transaction load) is NEUTRAL, not red. */
function tpsTier(tps: number): string {
  if (!Number.isFinite(tps) || tps < 1) return "tps-idle"; // no load — neutral, not "underperforming"
  if (tps < TARGET_TPS * 0.5) return "tps-under"; // red — well below target
  if (tps < TARGET_TPS) return "tps-ontarget"; // amber — approaching target
  return "tps-exceed"; // green — at/above target
}

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

  // Count-up animation: eases the displayed number toward the latest value (easeOutCubic) and gives a
  // brief "bump" when it lands — so the block height feels live without ever showing a fake value.
  const shown = new Map<string, number>();
  const rafs = new Map<string, number>();
  const animateNum = (key: string, target: number, fmt: (n: number) => string): void => {
    const node = el.querySelector<HTMLElement>(`[data-live="${key}"]`);
    if (!node) return;
    const from = shown.get(key) ?? 0;
    if (from === target) {
      node.textContent = fmt(target);
      shown.set(key, target);
      return;
    }
    const existing = rafs.get(key);
    if (existing) cancelAnimationFrame(existing);
    const start = performance.now();
    const dur = Math.min(800, 200 + Math.abs(target - from) * 6); // longer roll for a bigger jump, capped
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = fmt(Math.round(from + (target - from) * eased));
      if (p < 1) {
        rafs.set(key, requestAnimationFrame(step));
      } else {
        shown.set(key, target);
        node.classList.remove("bump");
        void node.offsetWidth; // restart the CSS animation
        node.classList.add("bump");
      }
    };
    rafs.set(key, requestAnimationFrame(step));
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

    // Block height — animated count-up (real value only; em-dash when unknown).
    if (Number.isFinite(s.live.blockHeight)) {
      animateNum("blockHeight", s.live.blockHeight as number, (n) => `#${n.toLocaleString("en-US")}`);
    } else {
      shown.delete("blockHeight");
      set("blockHeight", "—");
    }

    set("peers", Number.isFinite(s.live.peers) ? String(s.live.peers) : "—");

    // Live TPS — the REAL value, colored against the throughput target (idle = neutral).
    const tpsNode = el.querySelector<HTMLElement>('[data-live="tps"]');
    if (tpsNode) {
      const tps = s.live.tps;
      tpsNode.textContent = Number.isFinite(tps) ? fmtTps(tps as number) : "—";
      tpsNode.classList.remove("tps-idle", "tps-under", "tps-ontarget", "tps-exceed");
      if (Number.isFinite(tps)) tpsNode.classList.add(tpsTier(tps as number));
    }
  });
}
