// SPDX-License-Identifier: LicenseRef-Proprietary
// Live overview payload for the LiveOverview island's 5s poll — the same shape index.astro seeds from.
// Public read (no same-origin gate, like /api/net); the net is resolved from the pyrax_net cookie so a
// polled update stays on the visitor's selected network.
import type { APIRoute } from "astro";
import { selectedChainId, netFor, getOverview } from "../../server/chain";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const net = netFor(selectedChainId(request.headers.get("cookie")));
  const overview = await getOverview(net);
  return new Response(JSON.stringify({ ok: true, net: { name: net.name, chainId: net.chainId }, overview }), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
};
