// SPDX-License-Identifier: LicenseRef-Proprietary
// Live network roster for the navbar dropdown + map: each network with its online state and the
// count of currently-online peers. (Presence is wired to the peer-directory ingest in a later step;
// until a node announces, networks read offline — which is correct and degrades gracefully.)
import type { APIRoute } from "astro";
import { NETWORKS, DEFAULT_NETWORK } from "../../lib/networks";
import { onlineCountByNetwork } from "../../server/directory";
import { getSiteSettings } from "../../server/settings";

export const prerender = false;

export const GET: APIRoute = async () => {
  const counts = onlineCountByNetwork();
  const settings = await getSiteSettings();
  const networks = NETWORKS.map((n) => ({
    label: n.label, name: n.name, chainId: n.chainId, kind: n.kind, color: n.color, note: n.note,
    peers: counts[n.label] || 0,
    online: (counts[n.label] || 0) > 0,
  }));
  return new Response(JSON.stringify({ ok: true, networks, default: settings.defaultNetwork || DEFAULT_NETWORK }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
