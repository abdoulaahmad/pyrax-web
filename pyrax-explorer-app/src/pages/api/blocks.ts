// SPDX-License-Identifier: LicenseRef-Proprietary
// Live blocks list for the LiveBlocks island's 5s poll — the same shape blocks.astro seeds from.
// Public read (no same-origin gate, like /api/net); the net is resolved from the pyrax_net cookie so a
// polled update stays on the visitor's selected network. Honors the ?before= cursor so a paged view
// keeps polling its own window rather than jumping back to the tip.
import type { APIRoute } from "astro";
import { selectedChainId, netFor, getBlocks } from "../../server/chain";

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const net = netFor(selectedChainId(request.headers.get("cookie")));
  const before = Number(url.searchParams.get("before")) || undefined;
  const { source, blocks } = await getBlocks(net, before);
  return new Response(JSON.stringify({ ok: true, source, blocks }), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
};
