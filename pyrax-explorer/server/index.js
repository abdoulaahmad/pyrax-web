// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// The explorer indexer HTTP read-API. Serves the SQLite-indexed data per network and accepts contract
// verification. Starts the ingest worker on boot. Zero web framework — Node's http + a tiny router.
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

import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import * as db from "./db.js";
import { startIngest, events } from "./ingest.js";
import { verifyContract } from "./verify.js";
import { PORT, HOST, ALLOW_ORIGIN, NETWORKS, enabledNetworks } from "./config.js";

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
const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const clampLimit = (v) => Math.min(100, Math.max(1, num(v, 25)));

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

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
    const offset = Math.max(0, num(sp.get("offset"), 0));

    if (p === "/api/health" || p === "/health") return json(res, 200, { ok: true, networks: enabledNetworks().map((n) => n.chainId) });
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
      const body = JSON.parse((await readBody(req)) || "{}");
      const result = await verifyContract(chainId, body);
      return json(res, result.ok ? 200 : 400, result);
    }

    return bad(res, 404, "not found");
  } catch (e) {
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
    process.exit(1);
  });
