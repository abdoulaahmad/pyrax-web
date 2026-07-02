// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Live node-status WebSocket server for the PYRAX Devnet Portal. A paired node (Inferno desktop / the
// pyrax CLI) opens a PERSISTENT WebSocket with its heartbeat token (?token=<nodeToken>, sha256 ->
// nodes.token_hash) and pushes live status frames; the server upserts liveness + telemetry into
// devnet_tester so the "your nodes" dashboard shows real-time uptime. Companion to
// scripts/chat-server.mjs — same standalone droplet-service shape (HTTP health + WS share one port).
//   env: DATABASE_URL_DEVNET, NODE_STATUS_WS_PORT (default 8790)
import crypto from "node:crypto";
import http from "node:http";
import { WebSocketServer } from "ws";
import pg from "pg";

const PORT = Number(process.env.NODE_STATUS_WS_PORT || 8790);
const cs = (process.env.DATABASE_URL_DEVNET || "").replace(/[?&]sslmode=[^&]*/, "");
const pool = new pg.Pool({ connectionString: cs, ssl: { rejectUnauthorized: false }, max: 4 });
const sha256hex = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : undefined);
const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : undefined);

/** Authenticate a connecting node by its pairing-issued heartbeat token. Returns { node_pk, tester_id } or null. */
async function nodeByToken(token) {
  if (!token) return null;
  try {
    const r = await pool.query("SELECT node_pk, tester_id FROM nodes WHERE token_hash=$1", [sha256hex(token)]);
    return r.rows[0] || null;
  } catch (e) {
    console.error("[node-status] auth query error:", e?.message || e);
    return null;
  }
}

/** Upsert liveness + telemetry into `nodes` + append a `node_heartbeats` tick (mirrors recordHeartbeat
 *  in src/server/db.ts, so the dashboard's uptime/online computation is identical to the HTTP path). */
async function recordHeartbeat(testerId, nodePk, info) {
  const now = Date.now();
  await pool.query(
    `INSERT INTO nodes (node_pk,tester_id,label,app,app_version,node_version,height,peers,first_seen,last_heartbeat)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
     ON CONFLICT (node_pk) DO UPDATE SET label=COALESCE($3,nodes.label), app=COALESCE($4,nodes.app), app_version=COALESCE($5,nodes.app_version),
       node_version=COALESCE($6,nodes.node_version), height=COALESCE($7,nodes.height), peers=COALESCE($8,nodes.peers), last_heartbeat=$9`,
    [nodePk, testerId, info.label, info.app, info.appVersion, info.nodeVersion, info.height, info.peers, now],
  );
  await pool.query("INSERT INTO node_heartbeats (node_pk,tester_id,ts) VALUES ($1,$2,$3)", [nodePk, testerId, now]);
}

const httpServer = http.createServer((req, res) => {
  if (req.method === "GET" && (req.url === "/health" || req.url === "/healthz")) {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify({ ok: true, service: "pyrax-node-status", clients: wss.clients.size, ts: Date.now() }));
    return;
  }
  res.writeHead(404, { "content-type": "text/plain" }).end("not found");
});
const wss = new WebSocketServer({ server: httpServer });
const send = (ws, obj) => { try { ws.send(JSON.stringify(obj)); } catch {} };

wss.on("connection", async (ws, req) => {
  const url = new URL(req.url, "http://x");
  const node = await nodeByToken(url.searchParams.get("token"));
  if (!node) { send(ws, { type: "error", error: "auth" }); ws.close(); return; }
  ws.nodePk = node.node_pk; ws.testerId = node.tester_id; ws.times = [];
  send(ws, { type: "ready", nodePk: node.node_pk, everySec: 30 });
  // Mark online immediately on connect.
  recordHeartbeat(node.tester_id, node.node_pk, {}).catch((e) => console.error("[node-status] connect hb error:", e?.message || e));

  ws.on("message", async (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    if (m.type === "ping") { send(ws, { type: "pong" }); return; }
    if (m.type !== "status") return;
    // Per-node rate cap: honest nodes push ~every 30s, so a handful/min is plenty.
    const now = Date.now();
    ws.times = ws.times.filter((t) => now - t < 60_000);
    if (ws.times.length >= 8) return;
    ws.times.push(now);
    try {
      await recordHeartbeat(node.tester_id, node.node_pk, {
        label: str(m.label, 60), app: str(m.app, 24), appVersion: str(m.appVersion, 24), nodeVersion: str(m.nodeVersion, 24),
        height: num(m.height), peers: num(m.peers),
      });
      // NOTE: richer opt-in telemetry (m.telemetry) is ingested in the telemetry increment.
      send(ws, { type: "ack", ts: now });
    } catch (e) {
      console.error("[node-status] status error:", e?.message || e);
    }
  });
});

// A pg Pool emits 'error' when an idle client's connection drops; without a listener pg would crash the
// process. Log it and keep the WS service up through transient DB blips.
pool.on("error", (e) => console.error("[node-status] pool error:", e?.message || e));
process.on("unhandledRejection", (e) => console.error("[node-status] unhandledRejection:", e?.message || e));
httpServer.listen(PORT, () => console.log(`[node-status] node-status WebSocket server listening on :${PORT} (health: GET /health)`));
