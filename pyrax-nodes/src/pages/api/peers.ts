// SPDX-License-Identifier: LicenseRef-Proprietary
// Live peer list. Read-gated: same-origin browser (the site's own pages) OR an app HMAC header.
// ?network=<label> returns that network's online peers; ?network=all returns every live peer (globe).
import type { APIRoute } from "astro";
import { listPeers, allLivePeers, TTL_MS } from "../../server/directory";
import { verifyHmac, sameOrigin } from "../../server/hmac";

export const prerender = false;
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const GET: APIRoute = async ({ request, url }) => {
  const authed = sameOrigin(request) || verifyHmac("GET", url.pathname, "", request.headers.get("authorization"));
  if (!authed) return json({ ok: false, error: "unauthorized" }, 401);
  const network = url.searchParams.get("network") || "all";
  const peers = network === "all" ? allLivePeers() : listPeers(network);
  return json({ ok: true, network, ttlMs: TTL_MS, peers });
};
