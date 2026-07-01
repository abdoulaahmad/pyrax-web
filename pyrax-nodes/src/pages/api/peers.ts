// SPDX-License-Identifier: LicenseRef-Proprietary
// Live peer list. Read-gated: same-origin browser (the site's own pages) OR an app HMAC header.
// ?network=<label> returns that network's online peers; ?network=all returns every live peer (globe).
//
// Privacy: the raw dial IP of a home `operator` node is a residential address, so the PUBLIC (same-origin
// browser) view strips it — those peers still appear on the list/counts/globe with coarse geo but a
// peer-only multiaddr. Only trusted first-party callers that present a valid app HMAC receive full dial
// addresses (they already hold the shared secret and legitimately need the raw multiaddr to connect).
import type { APIRoute } from "astro";
import { listPeers, allLivePeers, publicPeerList, TTL_MS } from "../../server/directory";
import { verifyHmac, sameOrigin } from "../../server/hmac";

export const prerender = false;
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const GET: APIRoute = async ({ request, url }) => {
  const hmacOk = verifyHmac("GET", url.pathname, "", request.headers.get("authorization"));
  const authed = hmacOk || sameOrigin(request);
  if (!authed) return json({ ok: false, error: "unauthorized" }, 401);
  const network = url.searchParams.get("network") || "all";
  const live = network === "all" ? allLivePeers() : listPeers(network);
  // Full dial addresses only for the trusted first-party HMAC caller; the public browser view is redacted.
  const peers = hmacOk ? live : publicPeerList(live);
  return json({ ok: true, network, ttlMs: TTL_MS, peers });
};
