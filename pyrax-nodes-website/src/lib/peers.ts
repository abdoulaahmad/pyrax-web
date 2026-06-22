// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// The live peers panel — polls the peer-directory REST endpoint (GET /api/peers) and shows the
// currently-announced, geolocated peers. The directory is an OPTIONAL convenience service; if it is
// unreachable (not deployed yet, CORS, or simply down) this degrades to a calm "discovering peers…"
// state rather than an error — the network itself does not depend on it.

import { PEERS_API } from "./content.js";
import { icon, esc } from "@pyrax/shared";

type RawPeer = Record<string, unknown>;
type Peer = { id: string; country?: string; kind: string; located: boolean };

const POLL_MS = 15_000;
const TIMEOUT_MS = 6000;
const MAX_SHOWN = 24;

const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** Normalize a directory peer record defensively — field names vary, so read several candidates. */
function normalize(p: RawPeer): Peer {
  const id = str(p.peerId) ?? str(p.id) ?? str(p.address) ?? "peer";
  const country = str(p.country) ?? str(p.countryCode) ?? str(p.cc);
  const kind = str(p.kind) ?? str(p.role) ?? "node";
  const located = num(p.lat) !== undefined && num(p.lon) !== undefined;
  return { id, country, kind, located };
}

async function fetchPeers(): Promise<Peer[] | null> {
  // Manual AbortController + setTimeout (matches network-store.ts) — AbortSignal.timeout is ES2024,
  // but the site targets ES2022, so we don't rely on it at runtime.
  const ctl = new AbortController();
  const t = window.setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(PEERS_API, { signal: ctl.signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    const arr = Array.isArray(data) ? data : Array.isArray((data as { peers?: unknown }).peers) ? (data as { peers: unknown[] }).peers : null;
    if (!arr) return null;
    return arr.map((p) => normalize(p as RawPeer));
  } catch {
    return null;
  } finally {
    window.clearTimeout(t);
  }
}

const shortId = (id: string): string => (id.length > 14 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);

export function mountPeers(el: HTMLElement): void {
  el.innerHTML = `
    <div class="card p-6 sm:p-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="icon-orb !h-10 !w-10">${icon("globe", "h-5 w-5")}</span>
          <div>
            <div class="text-lg font-semibold">Live peers</div>
            <div class="text-sm text-[var(--color-muted)]" data-peers-sub>discovering peers…</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-3xl font-extrabold tabular-nums" data-peers-count>—</div>
          <div class="text-xs uppercase tracking-wider text-[var(--color-faint)]">announced now</div>
        </div>
      </div>
      <div class="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" data-peers-grid></div>
      <p class="mt-5 text-xs leading-relaxed text-[var(--color-faint)]">
        The peer directory is an optional discovery convenience — it aggregates nodes that announce themselves so apps can find peers fast.
        Nodes also find each other directly via mDNS, the Kademlia DHT, and signed seed lists, so the network keeps running even if this list is empty.
      </p>
    </div>`;

  const sub = el.querySelector<HTMLElement>("[data-peers-sub]");
  const count = el.querySelector<HTMLElement>("[data-peers-count]");
  const grid = el.querySelector<HTMLElement>("[data-peers-grid]");

  const render = (peers: Peer[] | null) => {
    if (!peers) {
      if (sub) sub.textContent = "peer directory not reachable yet — nodes still connect peer-to-peer";
      if (count) count.textContent = "—";
      if (grid) grid.innerHTML = "";
      return;
    }
    if (count) count.textContent = String(peers.length);
    if (sub) sub.textContent = peers.length ? "geolocated nodes announcing to the directory" : "no peers announced right now — they appear here as nodes join";
    if (grid)
      grid.innerHTML = peers
        .slice(0, MAX_SHOWN)
        .map(
          (p) => `
        <div class="flex items-center gap-2 rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-elevated)] px-3 py-2">
          <span class="status-dot" aria-hidden="true"></span>
          <span class="min-w-0">
            <span class="block truncate font-mono text-xs text-[var(--color-ink)]">${esc(shortId(p.id))}</span>
            <span class="block text-[0.7rem] text-[var(--color-faint)]">${esc(p.country ?? (p.located ? "located" : "—"))} · ${esc(p.kind)}</span>
          </span>
        </div>`,
        )
        .join("");
  };

  const tick = () => void fetchPeers().then(render);
  tick();
  window.setInterval(tick, POLL_MS);
}
