// SPDX-License-Identifier: LicenseRef-Proprietary
// Network roster + live status for the topbar selector.
import type { APIRoute } from "astro";
import { NETWORKS } from "../../lib/networks";
import { cookieChainId, liveStatus } from "../../server/chain";
import { teamDefaultChain } from "../../server/settings";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  // A visitor's own choice (pyrax_net cookie) wins; otherwise the team-managed cross-site default.
  const selected = cookieChainId(request.headers.get("cookie")) ?? (await teamDefaultChain());
  const networks = await Promise.all(NETWORKS.map(async (n) => {
    const s = await liveStatus(n);
    return { key: n.key, chainId: n.chainId, name: n.name, short: n.short, color: n.color, status: n.status, online: s.online, height: s.height };
  }));
  return new Response(JSON.stringify({ ok: true, networks, selected }), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
};
