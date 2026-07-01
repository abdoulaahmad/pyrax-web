// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The navbar network selector + live-stats data source. Returns the network roster with live
// height/peers/TPS for each (honest: unreachable networks report online:false), plus the selected chain.
import type { APIRoute } from "astro";
import { NETWORKS, cookieChainId, TARGET_TPS } from "../../lib/networks";
import { allNetworkStats } from "../../server/chain";
import { teamDefaultChain } from "../../server/settings";

export const GET: APIRoute = async ({ request }) => {
  // A visitor's own choice (pyrax_net cookie) wins; otherwise use the team-managed cross-site default.
  const selected = cookieChainId(request.headers.get("cookie")) ?? (await teamDefaultChain());
  const stats = await allNetworkStats();
  const byChain = new Map(stats.map((s) => [s.chainId, s]));
  const networks = NETWORKS.map((n) => ({
    ...(byChain.get(n.chainId) || { online: false }),
    key: n.key, chainId: n.chainId, name: n.name, short: n.short, mode: n.mode, color: n.color,
    blockTime: n.blockTime, role: n.role,
  }));
  return new Response(JSON.stringify({ ok: true, selected, targetTps: TARGET_TPS, networks }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
