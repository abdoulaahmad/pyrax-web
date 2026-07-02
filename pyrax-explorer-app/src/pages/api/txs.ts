// SPDX-License-Identifier: LicenseRef-Proprietary
// Live transactions list for the LiveTxs island's 5s poll — the same shape txs.astro seeds from.
// Public read (no same-origin gate, like /api/net); the net is resolved from the pyrax_net cookie so a
// polled update stays on the visitor's selected network. Honors the ?offset= cursor so a paged view
// keeps polling its own page.
import type { APIRoute } from "astro";
import { selectedChainId, netFor, getTxs } from "../../server/chain";

export const prerender = false;

const PAGE = 25;

export const GET: APIRoute = async ({ request, url }) => {
  const net = netFor(selectedChainId(request.headers.get("cookie")));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const { source, txs } = await getTxs(net, { limit: PAGE, offset });
  return new Response(JSON.stringify({ ok: true, source, txs }), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
};
