// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The cross-site default network is managed on the team portal's Network Management page and read here
// (server-side) so a first-time visitor — one with no `pyrax_net` cookie yet — lands on whichever
// network the team has chosen. Fetched from the team portal's public endpoint, cached briefly, and
// resilient: if the team portal is unreachable or returns something unknown, we fall back to this
// site's own DEFAULT_CHAIN so the selector never breaks.
import { DOMAINS } from "../lib/endpoints";
import { networkByKey, DEFAULT_CHAIN } from "../lib/networks";

const TEAM_URL = (typeof process !== "undefined" && process.env?.TEAM_URL) || DOMAINS.team;
const TTL_MS = 60_000;
let cache: { chain: number; at: number } | null = null;

/** The team-managed default chain id (cached ~60s), falling back to this site's DEFAULT_CHAIN. */
export async function teamDefaultChain(): Promise<number> {
  const now = nowMs();
  if (cache && now - cache.at < TTL_MS) return cache.chain;
  let chain = DEFAULT_CHAIN;
  try {
    const res = await fetch(`${TEAM_URL}/api/public/default-network`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const data = await res.json();
      const net = data?.default ? networkByKey(String(data.default)) : undefined;
      if (net) chain = net.chainId;
    }
  } catch {
    /* team portal unreachable — fall back to DEFAULT_CHAIN */
  }
  cache = { chain, at: now };
  return chain;
}

function nowMs(): number {
  return typeof Date !== "undefined" ? Date.now() : 0;
}
