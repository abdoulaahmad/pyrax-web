// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Realtime block feed over WebSocket (the indexer's `/api/ws`). Calls the handler for
// every freshly-indexed block so pages update the INSTANT a block lands — no polling
// lag, no 8-second jumps, no gaps. Auto-reconnects with backoff; if the endpoint is
// unreachable it silently no-ops, so pages keep their slower polling fallback.

export type LiveBlock = {
  chainId: number;
  number: number;
  hash: string;
  parentHash?: string;
  miner: string;
  timestamp: number;
  txCount: number;
  gasUsed?: number;
};

/** Base WS origin, mirroring the indexer API base in `api.ts`: dev → the local
 *  indexer; prod → same-origin (Caddy proxies `/api/*`, incl. the WS upgrade). */
function wsBase(): string {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_INDEXER_BASE;
  if (env) return env.replace(/^http/i, "ws");
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return "ws://localhost:8788";
  return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;
}

/**
 * Subscribe to realtime block notifications. `handler` fires for every indexed
 * block (across all networks — filter by `chainId` in the handler). Returns an
 * unsubscribe function.
 */
export function onLiveBlock(handler: (b: LiveBlock) => void): () => void {
  let ws: WebSocket | null = null;
  let alive = true;
  let backoff = 1000;

  const connect = () => {
    if (!alive) return;
    try {
      ws = new WebSocket(`${wsBase()}/api/ws`);
    } catch {
      setTimeout(connect, backoff);
      return;
    }
    ws.onopen = () => {
      backoff = 1000;
    };
    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(typeof ev.data === "string" ? ev.data : "");
        if (m && m.type === "block") handler(m as LiveBlock);
      } catch {
        /* ignore non-JSON frames */
      }
    };
    ws.onclose = () => {
      if (!alive) return;
      backoff = Math.min(backoff * 2, 30_000);
      setTimeout(connect, backoff);
    };
    ws.onerror = () => {
      try {
        ws?.close();
      } catch {
        /* already closing */
      }
    };
  };
  connect();

  return () => {
    alive = false;
    try {
      ws?.close();
    } catch {
      /* already closing */
    }
  };
}
