// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Server-side JSON-RPC proxy for the RPC Playground. Forwards a single read-only method to the
// SELECTED network's RPC (resolved from the pyrax_net cookie) — so the browser never needs a node
// URL, there's no CORS, and ONLY an explicit allowlist of safe read methods is reachable.
//
// Hardening:
//   • Explicit ALLOWLIST (default-deny) of ~20 read-only eth_*/net_*/web3_*/pyrax_* methods — any
//     state-changing / privileged / unknown method is rejected. Safer than a denylist (a new RPC
//     method can't slip through).
//   • Per-IP token-bucket rate limiting (src/server/ratelimit.ts).
//   • Expensive-parameter clamps: eth_getLogs block range, pyrax_dagRecent limit, oversized arrays.
import type { APIRoute } from "astro";
import { selectedChainId, netFor } from "../../server/chain";
import { rpc } from "../../server/rpc";
import { RateLimiter, clientIp } from "../../server/ratelimit";

// Read-only methods the console legitimately needs. Default-deny: anything not here is rejected.
const ALLOW = new Set<string>([
  // chain / block / tx reads
  "eth_chainId", "eth_blockNumber", "eth_gasPrice", "eth_feeHistory", "eth_getBalance",
  "eth_getCode", "eth_getStorageAt", "eth_getTransactionCount", "eth_call", "eth_estimateGas",
  "eth_getBlockByNumber", "eth_getBlockByHash", "eth_getTransactionByHash", "eth_getTransactionReceipt",
  "eth_getLogs", "eth_blobBaseFee", "eth_maxPriorityFeePerGas",
  // node / net identity
  "net_version", "net_listening", "net_peerCount", "web3_clientVersion",
  // PYRAX-native reads
  "pyrax_blockNumber", "pyrax_consensusInfo", "pyrax_syncStatus", "pyrax_peerCount", "pyrax_peers",
  "pyrax_nodeInfo", "pyrax_noteState", "pyrax_dagRecent", "pyrax_supplyInfo", "pyrax_gasInfo",
]);

const MAX_PARAMS = 8;          // no read method needs more than a handful of positional params
export const MAX_LOG_RANGE = 5000;    // eth_getLogs block-range cap
const MAX_DAG_RECENT = 256;    // pyrax_dagRecent count cap

// Per-IP: sustained 5 req/s, burst 15. Generous for an interactive console, hostile to a flood.
const limiter = new RateLimiter({ ratePerSec: 5, burst: 15 });

/** A concrete block height from a 0x-hex string or a JS number; NaN for tags ("latest"/"earliest"/
 *  "pending"/"safe"/"finalized"), decimal strings (RPC block params are hex by spec) and anything else. */
function blockHeight(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^0x[0-9a-fA-F]+$/.test(v)) return parseInt(v, 16);
  return NaN;
}

/** Clamp the well-known expensive params in place; reject when a range is structurally invalid.
 *  Exported for unit tests; not a route — the public surface is the POST handler below. */
export function clampParams(method: string, params: unknown[]): { ok: true; params: unknown[] } | { ok: false; error: string } {
  if (params.length > MAX_PARAMS) return { ok: false, error: `too many parameters (max ${MAX_PARAMS})` };

  if (method === "eth_getLogs" && params[0] && typeof params[0] === "object") {
    const f = { ...(params[0] as Record<string, unknown>) };
    // Resolve a numeric block height from a hex *or* decimal number (a bare number, a non-hex tag like
    // "latest", or a missing value all yield NaN). The previous version only parsed string-hex, so a
    // missing / numeric / tag fromBlock skipped the range clamp entirely and let an unbounded scan reach
    // the node. We now ALWAYS bound the window: when toBlock is a concrete height we force fromBlock to
    // within MAX_LOG_RANGE of it; an unbounded range (no concrete toBlock and no concrete fromBlock) is
    // rejected so the node can never be asked to scan from genesis to head.
    const toHeight = blockHeight(f.toBlock);
    const fromHeight = blockHeight(f.fromBlock);
    if (Number.isFinite(toHeight)) {
      if (Number.isFinite(fromHeight) && toHeight! < fromHeight!) return { ok: false, error: "eth_getLogs: toBlock is before fromBlock" };
      const lo = Number.isFinite(fromHeight) ? Math.max(fromHeight!, toHeight! - MAX_LOG_RANGE) : toHeight! - MAX_LOG_RANGE;
      f.fromBlock = "0x" + Math.max(0, lo).toString(16);
      f.toBlock = "0x" + toHeight!.toString(16);
    } else if (Number.isFinite(fromHeight)) {
      // Concrete start, open-ended (latest) end — cap the window forward from the start.
      f.fromBlock = "0x" + Math.max(0, fromHeight!).toString(16);
      f.toBlock = "0x" + (fromHeight! + MAX_LOG_RANGE).toString(16);
    } else {
      return { ok: false, error: `eth_getLogs requires a bounded fromBlock/toBlock range (max ${MAX_LOG_RANGE} blocks)` };
    }
    // Bound the topics array so a giant OR-filter can't blow up the upstream node.
    if (Array.isArray(f.topics) && f.topics.length > 4) f.topics = f.topics.slice(0, 4);
    return { ok: true, params: [f, ...params.slice(1)] };
  }

  if (method === "pyrax_dagRecent") {
    const n = Number(params[0]);
    const clamped = Number.isFinite(n) ? Math.min(Math.max(1, Math.floor(n)), MAX_DAG_RECENT) : 48;
    return { ok: true, params: [clamped, ...params.slice(1)] };
  }

  return { ok: true, params };
}

export const POST: APIRoute = async ({ request }) => {
  const ip = clientIp(request.headers);
  const gate = limiter.take(ip);
  if (!gate.ok) return json({ error: "rate limit exceeded — slow down", retryAfter: gate.retryAfter }, 429, { "retry-after": String(gate.retryAfter) });

  const net = netFor(selectedChainId(request.headers.get("cookie")));
  let body: { method?: string; params?: unknown[] };
  try { body = await request.json(); } catch { return json({ error: "invalid JSON body" }, 400); }
  const method = String(body.method || "").trim();
  const rawParams = Array.isArray(body.params) ? body.params : [];

  if (!method) return json({ error: "method is required" }, 400);
  if (!/^(eth|net|web3|pyrax)_[A-Za-z0-9]+$/.test(method)) return json({ error: "method must be an eth_*, net_*, web3_* or pyrax_* call" }, 400);
  if (!ALLOW.has(method)) return json({ error: `${method} is not available from the explorer console (read-only allowlist)` }, 403);

  const clamp = clampParams(method, rawParams);
  if (!clamp.ok) return json({ error: clamp.error }, 400);
  if (!net.rpc) return json({ error: `${net.name} has no public RPC endpoint configured`, offline: true }, 503);

  const started = Date.now();
  try {
    const result = await rpc(net.rpc, method, clamp.params, 12000);
    return json({ result, ms: Date.now() - started, network: net.key });
  } catch (e: any) {
    return json({ error: String(e?.message || e), ms: Date.now() - started, network: net.key }, 502);
  }
};

function json(obj: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...extraHeaders } });
}
