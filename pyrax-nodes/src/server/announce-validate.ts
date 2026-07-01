// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Pure validation of a parsed /api/announce body — extracted from the route so it has NO side-effectful
// imports (the route's directory/geo/ratelimit modules register background timers) and can be unit-
// tested and fuzzed in isolation. The route (pages/api/announce.ts) re-exports and calls this.
//
// The normalized output flows into the PUBLIC peer map / multiaddr / geo, so every field is validated:
// an enabled network label, an integer port in [1,65535], a peerId matching /^[0-9A-Za-z]{6,128}$/, a
// kind ∈ {operator,seed,rpc} (defaulting to operator), a relayPubkey clamped to 128 chars, and peers
// (if present) a ≤64-element array of peerId-shaped strings. Anything else is rejected with a 4xx.
import { isNetLabel } from "../lib/networks";

const ENABLED = (process.env.PYRAX_ENABLED_NETWORKS || "seed,forge,rise,one")
  .split(",").map((s) => s.trim()).filter(Boolean);

export interface AnnounceBody {
  network: string;
  port: number;
  peerId: string;
  kind: "operator" | "seed" | "rpc";
  relayPubkey?: string;
  peers?: string[];
}

/**
 * Pure validation of a parsed announce body. Returns the normalized fields or an `{ error, status }`.
 * Total: never throws for any input value. Keeps the route handler thin + the trust boundary testable.
 */
export function validateAnnounce(b: any): { ok: true; value: AnnounceBody } | { ok: false; error: string; status: number } {
  const network = String(b?.network || "");
  if (!isNetLabel(network) || !ENABLED.includes(network)) return { ok: false, error: "network not enabled", status: 403 };
  const port = Number(b?.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return { ok: false, error: "bad port", status: 400 };
  const peerId = String(b?.peerId || "");
  if (!/^[0-9A-Za-z]{6,128}$/.test(peerId)) return { ok: false, error: "bad peerId", status: 400 };
  const kind = ["operator", "seed", "rpc"].includes(b?.kind) ? b.kind : "operator";
  const relayPubkey = b?.relayPubkey ? String(b.relayPubkey).slice(0, 128) : undefined;
  const peers = Array.isArray(b?.peers)
    ? b.peers.map((x: any) => String(x)).filter((s: string) => /^[0-9A-Za-z]{6,128}$/.test(s)).slice(0, 64)
    : undefined;
  return { ok: true, value: { network, port, peerId, kind: kind as AnnounceBody["kind"], relayPubkey, peers } };
}
