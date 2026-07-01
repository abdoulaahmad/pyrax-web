// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The cross-site default network is chosen on the team portal's Network Management page. Read it here
// (server-side) so a first-time visitor — one with no `pyrax_net` cookie — lands on the team-chosen
// network. Fetched from the team portal's public endpoint, cached ~60s, and resilient: if the team
// portal is unreachable or returns an unknown value, fall back to this app's DEFAULT_CHAIN.
import { networkByKey, DEFAULT_CHAIN } from "../lib/networks";

const TEAM_URL = process.env.TEAM_URL || "https://team.pyraxchain.com";
const TTL_MS = 60_000;
let cache: { chain: number; at: number } | null = null;

/** The team-managed default chain id (cached ~60s), falling back to this app's DEFAULT_CHAIN. */
export async function teamDefaultChain(): Promise<number> {
  const now = Date.now();
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
