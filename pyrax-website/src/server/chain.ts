// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Live-or-honest network stats for the navbar selector + the homepage live card. Honest by default: an
// unwired or unreachable network returns `{ online: false }` and the UI shows a grey dot + em-dashes;
// the numbers light up the instant that network's RPC is reachable. Never fabricates a height/TPS.
import { rpc, hexToNum } from "./rpc";
import { NETWORKS, networkByChain, type PyraxNetwork } from "../lib/networks";

export interface NetStats {
  chainId: number;
  online: boolean;
  height?: number;
  peers?: number;
  tps?: number;
  finalized?: number;
  mode?: string;
}

/** Real height / peers / live TPS for one network. TPS is derived from recent blocks' tx counts over
 *  their real time span (0 when the chain is idle — empty blocks — which is honest, not an error). */
export async function networkStats(net: PyraxNetwork): Promise<NetStats> {
  if (!net.rpc) return { chainId: net.chainId, online: false };
  try {
    const [bn, peers, sync] = await Promise.all([
      rpc(net.rpc, "eth_blockNumber", [], 3000).catch(() => null),
      rpc(net.rpc, "pyrax_peerCount", [], 3000).catch(() => null),
      rpc(net.rpc, "pyrax_syncStatus", [], 3000).catch(() => null),
    ]);
    const height = hexToNum(bn);
    if (!Number.isFinite(height)) return { chainId: net.chainId, online: false };

    // Sample up to 5 recent blocks (tx-count only) to compute real TPS over their span.
    let tps = 0;
    try {
      const nums = Array.from({ length: 5 }, (_, i) => height - i).filter((n) => n >= 0);
      const blocks = (await Promise.all(
        nums.map((n) => rpc(net.rpc, "eth_getBlockByNumber", ["0x" + n.toString(16), false], 3000).catch(() => null)),
      )).filter(Boolean);
      if (blocks.length >= 2) {
        const txs = blocks.reduce((a: number, b: any) => a + (Array.isArray(b.transactions) ? b.transactions.length : 0), 0);
        const newest = hexToNum(blocks[0].timestamp);
        const oldest = hexToNum(blocks[blocks.length - 1].timestamp);
        const span = Math.max(1, newest - oldest);
        tps = txs / span;
      }
    } catch {}

    return {
      chainId: net.chainId,
      online: true,
      height,
      peers: Number(peers) || 0,
      tps: Number.isFinite(tps) ? tps : 0,
      finalized: hexToNum(sync?.finalizedBlueScore ?? sync?.height) || height,
      mode: net.mode,
    };
  } catch {
    return { chainId: net.chainId, online: false };
  }
}

// Short server-side cache for the full roster fan-out. Each allNetworkStats() call issues up to ~8
// upstream RPC calls PER online network to the shared public seed node; /api/net (and the SSR
// overview/gas pages) are unauthenticated, so a client looping them would amplify every request into a
// burst against that single shared dependency. A brief TTL collapses concurrent bursts + rapid polls to
// ONE upstream fan-out. `inflight` deduplicates concurrent misses so a thundering herd shares one fetch.
const ROSTER_TTL_MS = Number((typeof process !== "undefined" && process.env?.NET_STATS_TTL_MS) || 4000);
let rosterCache: { stats: NetStats[]; at: number } | null = null;
let rosterInflight: Promise<NetStats[]> | null = null;

/** Stats for every network (used by /api/net for the navbar roster). Cached ~4s + single-flighted so
 *  bursts collapse to one upstream fan-out against the shared seed node. */
export async function allNetworkStats(): Promise<NetStats[]> {
  const now = Date.now();
  if (rosterCache && now - rosterCache.at < ROSTER_TTL_MS) return rosterCache.stats;
  if (rosterInflight) return rosterInflight;
  rosterInflight = (async () => {
    try {
      const stats = await Promise.all(NETWORKS.map((n) => networkStats(n)));
      rosterCache = { stats, at: Date.now() };
      return stats;
    } finally {
      rosterInflight = null;
    }
  })();
  return rosterInflight;
}

export const statsForChain = (chainId: number): Promise<NetStats> => {
  const net = networkByChain(chainId) || NETWORKS[0];
  return networkStats(net);
};
