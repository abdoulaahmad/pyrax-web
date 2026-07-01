// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The explorer indexer HTTP read-API. Serves the Postgres-indexed data per network and accepts
// contract verification. Starts the ingest worker on boot. Zero web framework — Node's http + a tiny
// router. The SSR explorer app reads the same Postgres directly (src/server/indexer.ts); this API is
// for external consumers + the realtime WebSocket feed.
//
//   GET  /api/health
//   GET  /api/networks
//   GET  /api/:chainId/stats
//   GET  /api/:chainId/blocks?limit=&offset=
//   GET  /api/:chainId/block/:numberOrHash        (includes its txns)
//   GET  /api/:chainId/txs?limit=&offset=
//   GET  /api/:chainId/tx/:hash
//   GET  /api/:chainId/address/:addr              (tx history + token transfers)
//   GET  /api/:chainId/tokens · /token/:addr
//   GET  /api/:chainId/logs?address=&topic0=&fromBlock=&toBlock=
//   GET  /api/:chainId/contracts · /contract/:addr
//   POST /api/:chainId/verify                      ({ address, source, contractName, compilerVersion, ... })
//   WS   /api/ws                                   (one frame per freshly-indexed block)

import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { createRequire } from "node:module";
import * as db from "./db.js";
import { startIngest, events, ingestProgress } from "./ingest.js";
import { verifyContract } from "./verify.js";
import { report as sentinel } from "./sentinel.js";
import { RateLimiter, clientIp } from "./ratelimit.js";
import { num, clampLimit, clampOffset, readBody } from "./http-helpers.js";
import {
  PORT, HOST, ALLOW_ORIGIN, NETWORKS, enabledNetworks,
  VERIFY_MAX_BODY_BYTES, RL_READ_RPS, RL_READ_BURST, RL_VERIFY_RPS, RL_VERIFY_BURST,
} from "./config.js";

const VERSION = process.env.EXPLORER_INDEXER_VERSION || (() => {
  try { return createRequire(import.meta.url)("./package.json").version; } catch { return "0.0.0"; }
})();

// Head-freshness thresholds for /api/health. A network is flagged unhealthy only when it is BOTH far
// behind the tip AND hasn't advanced for a while — so a momentarily-behind-but-catching-up indexer stays
// healthy, while a genuinely wedged one (RPC gone, DB write loop failing) is detectable.
const STALE_MS = Number(process.env.HEALTH_STALE_MS) || 90_000;   // no forward progress for this long …
const LAG_BLOCKS = Number(process.env.HEALTH_LAG_BLOCKS) || 25;   // … while still this far behind head

const CORS = {
  "access-control-allow-origin": ALLOW_ORIGIN,
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};
const json = (res, code, body) => {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...CORS });
  res.end(JSON.stringify(body));
};
const bad = (res, code, msg, extra) => json(res, code, { error: msg, ...(extra || {}) });

// Per-IP token buckets. Read routes are generous (interactive UI + external consumers); the verify
// route is far more expensive (remote solc download + CPU compile) and gets a much tighter bucket.
const readLimiter = new RateLimiter({ ratePerSec: RL_READ_RPS, burst: RL_READ_BURST });
const verifyLimiter = new RateLimiter({ ratePerSec: RL_VERIFY_RPS, burst: RL_VERIFY_BURST });

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS);
      return res.end();
    }
    const url = new URL(req.url, "http://x");
    const p = url.pathname.replace(/\/+$/, "");
    const sp = url.searchParams;
    const limit = clampLimit(sp.get("limit"));
    const offset = clampOffset(sp.get("offset"));

    // Per-IP read-rate gate on EVERY route (health included, so a flood can't pin the DB probe either).
    // The verify route additionally passes a tighter gate below before any body is read/compiled.
    const ip = clientIp(req);
    const gate = readLimiter.take(ip);
    if (!gate.ok) {
      res.writeHead(429, { "content-type": "application/json; charset=utf-8", "retry-after": String(gate.retryAfter), ...CORS });
      return res.end(JSON.stringify({ error: "rate limit exceeded — slow down", retryAfter: gate.retryAfter }));
    }

    if (p === "/api/health" || p === "/health" || p === "/healthz") {
      // Liveness + a NON-FATAL ingest-freshness/lag oracle. Contract: ALWAYS 200 while the process is up
      // (dependency health is a field, never a non-200). A bounded DB probe reports up/down without
      // hanging the check. `networks[].stale` flips true when a network is BOTH far behind head AND has
      // made no forward progress for STALE_MS — that's the signal a monitor watches for a wedged ingest.
      const dbStatus = await db.ping().catch(() => "down");
      const prog = ingestProgress();
      const networks = enabledNetworks().map((n) => {
        const pr = prog[n.chainId] || null;
        const stale = !!(pr && pr.lagBlocks != null && pr.lagBlocks > LAG_BLOCKS && pr.staleMs > STALE_MS);
        return {
          chainId: n.chainId,
          head: pr ? pr.head : null,
          indexed: pr ? pr.indexed : null,
          lagBlocks: pr ? pr.lagBlocks : null,
          staleMs: pr ? pr.staleMs : null,
          lastTickAgoMs: pr ? pr.lastTickAgoMs : null,
          stale,
        };
      });
      return json(res, 200, {
        ok: true,
        version: VERSION,
        db: dbStatus,
        anyStale: networks.some((x) => x.stale),
        networks,
        ts: Date.now(),
      });
    }
    if (p === "/api/networks")
      return json(res, 200, Object.entries(NETWORKS).map(([id, n]) => ({ chainId: Number(id), name: n.name, indexed: !!n.rpc })));

    const m = p.match(/^\/api\/(\d+)\/(.+)$/);
    if (!m) return bad(res, 404, "not found");
    const chainId = Number(m[1]);
    const rest = m[2];

    if (rest === "stats") return json(res, 200, await db.stats(chainId));
    if (rest === "blocks") return json(res, 200, await db.latestBlocks(chainId, limit, offset));
    if (rest === "txs") return json(res, 200, await db.latestTxs(chainId, limit, offset));
    if (rest === "tokens") return json(res, 200, await db.listTokens(chainId, limit, offset));
    if (rest === "contracts") return json(res, 200, await db.listContracts(chainId, limit, offset));
    if (rest === "logs")
      return json(res, 200, await db.logsQuery(chainId, {
        address: sp.get("address"), topic0: sp.get("topic0"),
        fromBlock: num(sp.get("fromBlock"), NaN), toBlock: num(sp.get("toBlock"), NaN), limit, offset,
      }));

    let mm;
    if ((mm = rest.match(/^block\/(.+)$/))) {
      const key = decodeURIComponent(mm[1]);
      const blk = /^0x/i.test(key) ? await db.blockByHash(chainId, key) : await db.blockByNumber(chainId, Number(key));
      if (!blk) return bad(res, 404, "block not found");
      return json(res, 200, { ...blk, txns: await db.txsInBlock(chainId, blk.number) });
    }
    if ((mm = rest.match(/^tx\/(0x[0-9a-fA-F]{64})$/))) {
      const tx = await db.txByHash(chainId, mm[1]);
      if (!tx) return bad(res, 404, "tx not found");
      return json(res, 200, tx);
    }
    if ((mm = rest.match(/^address\/(0x[0-9a-fA-F]{40})$/))) {
      const a = mm[1];
      const [txCount, txns, transfers] = await Promise.all([
        db.txCountByAddress(chainId, a),
        db.txsByAddress(chainId, a, limit, offset),
        db.transfersByAddress(chainId, a, limit, offset),
      ]);
      return json(res, 200, { address: a.toLowerCase(), txCount, txns, transfers });
    }
    if ((mm = rest.match(/^token\/(0x[0-9a-fA-F]{40})$/))) {
      const [token, transfers] = await Promise.all([
        db.tokenInfo(chainId, mm[1]),
        db.transfersByToken(chainId, mm[1], limit, offset),
      ]);
      return json(res, 200, { token: token ?? null, transfers });
    }
    if ((mm = rest.match(/^contract\/(0x[0-9a-fA-F]{40})$/))) return json(res, 200, (await db.contractGet(chainId, mm[1])) ?? null);

    if (rest === "verify" && req.method === "POST") {
      // A second, MUCH tighter per-IP gate before the (remote solc download + CPU compile) verify path.
      const vgate = verifyLimiter.take(ip);
      if (!vgate.ok) {
        res.writeHead(429, { "content-type": "application/json; charset=utf-8", "retry-after": String(vgate.retryAfter), ...CORS });
        return res.end(JSON.stringify({ error: "verify rate limit exceeded — slow down", retryAfter: vgate.retryAfter }));
      }
      // Hard body cap enforced BEFORE buffering/JSON.parse so an oversized/never-ending body can't
      // allocate arbitrary memory per connection.
      const body = JSON.parse((await readBody(req, VERIFY_MAX_BODY_BYTES)) || "{}");
      const result = await verifyContract(chainId, body);
      return json(res, result.ok ? 200 : 400, result);
    }

    return bad(res, 404, "not found");
  } catch (e) {
    // An oversized body is a client error (413), not a server fault — respond cleanly without paging.
    if (e && e.code === 413) return bad(res, 413, "request body too large");
    // A 500 from a read-API request is a genuine server fault — report it (deduped/throttled/scrubbed),
    // fail-open. The response to the client is unchanged.
    sentinel(`read-api 500 ${req.method} ${req.url?.split("?")[0] || ""}`, `read API: ${e?.message ?? e}`, "error");
    return bad(res, 500, e?.message || "server error");
  }
});

// Realtime push to the browser: a WebSocket endpoint at `/api/ws` that streams a
// frame for every freshly-indexed block (relayed from the ingest worker's `block`
// events). The explorer UI updates the instant a block lands — no polling, no
// 8-second jumps, no gaps. One-way (server→client); the API above remains the source
// for history. Mounted under `/api/*` so the existing Caddy route proxies it (Caddy
// upgrades the WebSocket automatically) — no extra routing needed.
const wss = new WebSocketServer({ server, path: "/api/ws" });
const broadcast = (obj) => {
  const data = JSON.stringify(obj);
  for (const c of wss.clients) {
    if (c.readyState === 1) {
      try {
        c.send(data);
      } catch {
        /* client gone */
      }
    }
  }
};
wss.on("connection", (socket) => {
  try {
    socket.send(JSON.stringify({ type: "hello", networks: enabledNetworks().map((n) => n.chainId) }));
  } catch {
    /* client gone */
  }
});
events.on("block", (b) => broadcast({ type: "block", ...b }));

// Create the schema, THEN serve + start ingesting.
db.init()
  .then(() =>
    server.listen(PORT, HOST, () => {
      console.log(`[api] pyrax-explorer indexer listening on http://${HOST}:${PORT} (+ /ws realtime)`);
      startIngest();
    }),
  )
  .catch((e) => {
    console.error("[api] failed to initialize the database:", e?.message ?? e);
    // Fatal boot failure — report it best-effort BEFORE exiting so an operator sees the crash-loop in
    // Sentinel. Give the fire-and-forget POST a brief moment to flush, then exit regardless (fail-open).
    sentinel("indexer boot failed: db.init", `db.init() at startup: ${e?.message ?? e}`, "error");
    setTimeout(() => process.exit(1), 1_000).unref?.();
  });
