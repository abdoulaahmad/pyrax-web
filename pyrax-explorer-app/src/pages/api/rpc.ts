// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Server-side JSON-RPC proxy for the RPC Playground. Forwards a single read-only method to the
// SELECTED network's RPC (resolved from the pyrax_net cookie) — so the browser never needs a node
// URL, there's no CORS, and only safe read methods are reachable. State-changing / privileged
// methods (tx submission, seed signing, peer control, mixnet send, mining submit) are denied here;
// they belong to wallets and operators, not a public explorer console.
import type { APIRoute } from "astro";
import { selectedChainId, netFor } from "../../server/chain";
import { rpc } from "../../server/rpc";

const DENY = new Set<string>([
  "eth_sendRawTransaction", "eth_sendTransaction", "pyrax_sendTransaction", "pyrax_submitWork",
  "pyrax_seedKeygen", "pyrax_seedListSign", "pyrax_dialPeers", "pyrax_dropPeer",
  "pyrax_streamSend", "pyrax_streamSendLink", "personal_sign", "eth_sign", "eth_signTransaction",
]);

export const POST: APIRoute = async ({ request }) => {
  const net = netFor(selectedChainId(request.headers.get("cookie")));
  let body: { method?: string; params?: unknown[] };
  try { body = await request.json(); } catch { return json({ error: "invalid JSON body" }, 400); }
  const method = String(body.method || "").trim();
  const params = Array.isArray(body.params) ? body.params : [];

  if (!method) return json({ error: "method is required" }, 400);
  if (!/^(eth|net|web3|pyrax)_[A-Za-z0-9]+$/.test(method)) return json({ error: "method must be an eth_*, net_*, web3_* or pyrax_* call" }, 400);
  if (DENY.has(method)) return json({ error: `${method} is not available from the explorer console (read-only)` }, 403);
  if (!net.rpc) return json({ error: `${net.name} has no public RPC endpoint configured`, offline: true }, 503);

  const started = Date.now();
  try {
    const result = await rpc(net.rpc, method, params, 12000);
    return json({ result, ms: Date.now() - started, network: net.key });
  } catch (e: any) {
    return json({ error: String(e?.message || e), ms: Date.now() - started, network: net.key }, 502);
  }
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
