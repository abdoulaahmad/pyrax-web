// SPDX-License-Identifier: LicenseRef-Proprietary
//
// In-memory peer-presence store (ported from pyrax-peer-directory's server). A node announces every
// ~10s with a 30s TTL; we keep the live set in memory (single SSR process) and sweep expired entries.
// This is the source of truth for the navbar dropdown counts, the /peers list, and the 3D globe.

export interface Peer {
  peerId: string;
  network: string;
  ip?: string;
  port: number;
  multiaddr: string;
  relayPubkey?: string;
  kind: "operator" | "seed" | "rpc";
  /** peerIds this node reports it is currently connected to (real P2P topology, if the node sends it). */
  peers?: string[];
  lat?: number;
  lon?: number;
  country?: string;
  city?: string;
  firstSeen: number;
  lastSeen: number;
}

export const TTL_MS = Number(process.env.PYRAX_DIRECTORY_TTL_MS || 30_000);
const peers = new Map<string, Peer>(); // key = `${network}:${peerId}`
const key = (network: string, peerId: string) => `${network}:${peerId}`;

let sweeping = false;
function startSweep() {
  if (sweeping || typeof setInterval === "undefined") return;
  sweeping = true;
  setInterval(() => {
    const cutoff = Date.now() - TTL_MS;
    for (const [k, p] of peers) if (p.lastSeen < cutoff) peers.delete(k);
  }, 5_000);
}
startSweep();

/** Insert or refresh a peer's presence. Returns the stored record. */
export function upsertPeer(p: Omit<Peer, "firstSeen" | "lastSeen"> & { firstSeen?: number }): Peer {
  const k = key(p.network, p.peerId);
  const now = Date.now();
  const existing = peers.get(k);
  const rec: Peer = {
    ...p,
    firstSeen: existing?.firstSeen ?? now,
    lastSeen: now,
    // keep prior geo if this announce didn't carry it (geo is enriched async)
    lat: p.lat ?? existing?.lat,
    lon: p.lon ?? existing?.lon,
    country: p.country ?? existing?.country,
    city: p.city ?? existing?.city,
  };
  peers.set(k, rec);
  return rec;
}

export function patchGeo(network: string, peerId: string, geo: { lat?: number; lon?: number; country?: string; city?: string }): void {
  const k = key(network, peerId);
  const p = peers.get(k);
  if (p) peers.set(k, { ...p, ...geo });
}

export function removePeer(network: string, peerId: string): boolean {
  return peers.delete(key(network, peerId));
}

const isLive = (p: Peer) => p.lastSeen >= Date.now() - TTL_MS;

/** Live peers for one network (most-recently-seen first). */
export function listPeers(network: string): Peer[] {
  return [...peers.values()].filter((p) => p.network === network && isLive(p)).sort((a, b) => b.lastSeen - a.lastSeen);
}

/** All live peers across every network (for the globe). */
export function allLivePeers(): Peer[] {
  return [...peers.values()].filter(isLive);
}

/** Count of online peers per network label — drives the navbar dropdown dots. */
export function onlineCountByNetwork(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of peers.values()) if (isLive(p)) out[p.network] = (out[p.network] || 0) + 1;
  return out;
}

// Kinds that advertise a PUBLICLY-REACHABLE dial address by design (infrastructure nodes an operator
// stands up expecting to be dialed). Home/operator nodes do NOT: their `ip` is a residential address we
// must not publish to anonymous callers. Peers can still contribute to counts + coarse geo either way.
const PUBLIC_REACHABLE_KINDS = new Set<Peer["kind"]>(["seed", "rpc"]);

/**
 * Privacy-preserving projection of a peer for UNTRUSTED (public, same-origin browser) callers. For a
 * non-public-reachability kind (i.e. a home `operator` node) the raw `ip` is removed and the dial
 * `multiaddr` is reduced to a peer-only address (/p2p/<peerId>) so the node still appears on the list,
 * counts, and globe (via coarse country/city geo) WITHOUT disclosing its exact residential IP. Public
 * infrastructure kinds (seed/rpc) keep their full dial address, since being dialable is their purpose.
 */
export function publicPeerView(p: Peer): Peer {
  if (PUBLIC_REACHABLE_KINDS.has(p.kind)) return p;
  const { ip: _ip, ...rest } = p;
  return { ...rest, multiaddr: `/p2p/${p.peerId}` };
}

/** Apply publicPeerView to a list (for the public /peers + globe read paths). */
export function publicPeerList(list: Peer[]): Peer[] {
  return list.map(publicPeerView);
}
