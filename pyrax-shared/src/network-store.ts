// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// The single source of truth for "which network am I looking at + what is it doing right now".
//
// - The SELECTED network is persisted in localStorage (survives reloads, syncs across tabs).
// - A poller hits each network's EVM JSON-RPC (eth_blockNumber, net_peerCount, eth_getBlockByNumber)
//   and derives a live snapshot: online?, producing blocks?, block height, peers, and a TPS estimate
//   computed from recent blocks' tx counts.
// - Any UI (the navbar network selector, the homepage live-stats card) subscribe() to get pushed the
//   current snapshot on every poll + on selection change.
//
// Status semantics (drives the green/red dot — strictly honest):
//   green / LIVE   = online AND an actual block-height ADVANCE has been observed (and we're within a
//                    grace window of the last advance, so a momentarily-equal height never flickers red)
//   red / SYNCING  = online but no advance confirmed yet, or stalled past the grace window
//   red / OFFLINE  = the RPC is unreachable / no rpc configured / returned garbage
// We never show green before a real advance is confirmed.

import { NETWORKS } from "./content.js";

export type Net = (typeof NETWORKS)[number];
export type NetLive = {
  online: boolean;
  producing: boolean;
  blockHeight?: number;
  peers?: number;
  tps?: number;
};
export type NetSnapshot = {
  selected: Net;
  live: NetLive;
  all: Record<number, NetLive>;
  networks: readonly Net[];
};

const KEY = "pyrax:selected-network";
const PERIOD_MS = 5000; // selected-network FULL poll cadence (height + peers + TPS)
const FAST_PERIOD_MS = 1000; // height-only poll — keeps the block number real-time (catches each block within ~1s)
const STATUS_EVERY = 3; // poll the OTHER networks (status dot only) every Nth tick (~15s)
const RPC_TIMEOUT_MS = 5000;
const TPS_WINDOW = 15; // blocks kept for the rolling TPS estimate
const STALL_AFTER_MS = 25_000; // once producing, tolerate gaps up to this long before flipping to stalled

const DEFAULT_NET: Net = NETWORKS[0]!;
const OFFLINE: NetLive = { online: false, producing: false };

const live: Record<number, NetLive> = {};
const tpsByChain: Record<number, { num: number; ts: number; txs: number }[]> = {};
const lastAdvanceByChain: Record<number, number> = {};
let selectedChainId = readSelected();
const subs = new Set<(s: NetSnapshot) => void>();
let started = false;
let tick = 0;

function readSelected(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    if (NETWORKS.some((n) => n.chainId === v)) return v;
  } catch {
    /* localStorage may be unavailable (private mode) */
  }
  return DEFAULT_NET.chainId;
}

function selectedNet(): Net {
  return NETWORKS.find((n) => n.chainId === selectedChainId) ?? DEFAULT_NET;
}

function snapshot(): NetSnapshot {
  return { selected: selectedNet(), live: live[selectedChainId] ?? OFFLINE, all: live, networks: NETWORKS };
}

function notify(): void {
  const s = snapshot();
  subs.forEach((fn) => {
    try {
      fn(s);
    } catch {
      /* a bad subscriber must not break the others */
    }
  });
}

export function getSelectedNetwork(): Net {
  return selectedNet();
}

export function setSelectedNetwork(chainId: number): void {
  if (chainId === selectedChainId || !NETWORKS.some((n) => n.chainId === chainId)) return;
  selectedChainId = chainId;
  try {
    localStorage.setItem(KEY, String(chainId));
  } catch {
    /* ignore */
  }
  notify();
  void pollSelected();
}

export function subscribe(fn: (s: NetSnapshot) => void): () => void {
  subs.add(fn);
  fn(snapshot()); // push the current state immediately
  return () => {
    subs.delete(fn);
  };
}

async function rpc(url: string, method: string, params: unknown[] = []): Promise<unknown> {
  const ctl = new AbortController();
  const t = window.setTimeout(() => ctl.abort(), RPC_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`http ${res.status}`);
    const j = (await res.json()) as { result?: unknown; error?: { message?: string } };
    if (j.error) throw new Error(j.error.message ?? "rpc error");
    return j.result;
  } finally {
    window.clearTimeout(t);
  }
}

const toInt = (hex: unknown): number => parseInt(String(hex), 16);

/** Producing only after a REAL advance is confirmed; then tolerate brief gaps (no green flicker). */
function computeProducing(chainId: number, height: number, prevHeight: number | undefined, now: number): boolean {
  if (typeof prevHeight === "number" && height > prevHeight) {
    lastAdvanceByChain[chainId] = now;
    return true;
  }
  const last = lastAdvanceByChain[chainId];
  return last !== undefined ? now - last < STALL_AFTER_MS : false;
}

/** Light status poll (block height only) — used for the other networks' dropdown dots. */
async function pollStatus(net: Net): Promise<void> {
  if (!net.rpc) {
    live[net.chainId] = OFFLINE;
    return;
  }
  try {
    const height = toInt(await rpc(net.rpc, "eth_blockNumber"));
    if (!Number.isFinite(height)) {
      live[net.chainId] = OFFLINE;
      return;
    }
    const prev = live[net.chainId];
    const producing = computeProducing(net.chainId, height, prev?.blockHeight, Date.now());
    live[net.chainId] = { ...(prev ?? OFFLINE), online: true, producing, blockHeight: height };
  } catch {
    live[net.chainId] = OFFLINE;
  }
}

/** Full poll for the SELECTED network: height + peers + a TPS estimate from recent blocks. */
async function pollSelected(): Promise<void> {
  const net = selectedNet();
  if (!net.rpc) {
    live[net.chainId] = OFFLINE;
    notify();
    return;
  }
  try {
    const [heightHex, peersHex] = await Promise.all([
      rpc(net.rpc, "eth_blockNumber"),
      rpc(net.rpc, "net_peerCount").catch(() => undefined),
    ]);
    const height = toInt(heightHex);
    if (!Number.isFinite(height)) {
      live[net.chainId] = OFFLINE;
      notify();
      return;
    }
    const prev = live[net.chainId];
    const producing = computeProducing(net.chainId, height, prev?.blockHeight, Date.now());
    const peersRaw = peersHex !== undefined ? toInt(peersHex) : undefined;
    const peers = typeof peersRaw === "number" && Number.isFinite(peersRaw) ? peersRaw : prev?.peers;

    let tps = prev?.tps;
    try {
      const block = (await rpc(net.rpc, "eth_getBlockByNumber", ["latest", false])) as
        | { number?: string; timestamp?: string; transactions?: unknown[] }
        | null;
      if (block && block.number && block.timestamp) {
        const num = toInt(block.number);
        const ts = toInt(block.timestamp);
        const txs = Array.isArray(block.transactions) ? block.transactions.length : 0;
        const win = (tpsByChain[net.chainId] ??= []); // per-chain window — never mixes chains
        if (Number.isFinite(num) && Number.isFinite(ts) && !win.some((w) => w.num === num)) {
          win.push({ num, ts, txs });
          win.sort((a, b) => a.num - b.num);
          while (win.length > TPS_WINDOW) win.shift();
        }
        const first = win[0];
        const last = win[win.length - 1];
        if (first && last && win.length >= 2 && last.ts > first.ts) {
          tps = win.reduce((a, w) => a + w.txs, 0) / (last.ts - first.ts);
        } else {
          tps = 0;
        }
      }
    } catch {
      /* keep the previous tps if the block fetch fails */
    }

    live[net.chainId] = { online: true, producing, blockHeight: height, peers, tps };
  } catch {
    live[net.chainId] = OFFLINE;
  }
  notify();
}

/** Lightweight height-only poll for the SELECTED network — keeps the block number real-time (catches
 *  each block within ~1s) without re-fetching peers/TPS. Only notifies when the height actually
 *  changes, so the card animates once per real block instead of churning every second. */
async function pollHeightFast(): Promise<void> {
  const net = selectedNet();
  if (!net.rpc) return;
  try {
    const height = toInt(await rpc(net.rpc, "eth_blockNumber"));
    if (!Number.isFinite(height)) return;
    const prev = live[net.chainId];
    if (prev?.blockHeight === height) return; // unchanged — don't churn the UI
    const producing = computeProducing(net.chainId, height, prev?.blockHeight, Date.now());
    live[net.chainId] = { ...(prev ?? OFFLINE), online: true, producing, blockHeight: height };
    notify();
  } catch {
    /* transient — the 5s full poll stays authoritative for offline */
  }
}

function pollOthers(): void {
  NETWORKS.forEach((n) => {
    if (n.chainId !== selectedChainId) void pollStatus(n).then(notify);
  });
}

/** Begin polling. Idempotent — safe to call from every page's mountChrome. */
export function startNetworkPolling(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  void pollSelected();
  pollOthers();
  window.setInterval(() => {
    tick += 1;
    void pollSelected();
    if (tick % STATUS_EVERY === 0) pollOthers();
  }, PERIOD_MS);
  // Between full polls, refresh the block number every second so it tracks each block in real time
  // instead of batching 2-3 blocks into one 5s tick.
  window.setInterval(() => void pollHeightFast(), FAST_PERIOD_MS);

  // keep the selection in sync across tabs
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY || !e.newValue) return;
    const v = Number(e.newValue);
    if (v !== selectedChainId && NETWORKS.some((n) => n.chainId === v)) {
      selectedChainId = v;
      notify();
      void pollSelected();
    }
  });
}
