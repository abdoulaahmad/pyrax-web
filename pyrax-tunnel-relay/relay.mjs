// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// PYRAX self-hosted node-portal tunnel relay (runs on the websites droplet behind Caddy;
// replaces the retired Cloudflare Worker). Two roles, plus an admin control plane:
//
//   • node registration  — wss://nodes.pyraxchain.com/__tunnel/register?id=&key=
//                           (the node dials OUT, so it works behind NAT)
//   • browser access      — https://<id>.nodes.pyraxchain.com/...  (proxied over the tunnel)
//   • admin control plane — /__admin/* (HMAC-gated, server-to-server from team-pyrax):
//       GET  /__admin/nodes            → live registry (id, versions, running, killed, …)
//       POST /__admin/nodes/<id>/kill  → remote kill switch (last resort)
//       POST /__admin/nodes/<id>/unkill→ manual re-enable
//
// KILL SWITCH semantics (the founder's "force updates / last resort"):
//   • A killed node is marked in a PERSISTED registry, and a `{t:"kill"}` is pushed down
//     its live agent WS so the desktop app stops the node AND sets a persistent flag that
//     overrides auto-start/auto-reconnect — so it stays down across restarts.
//   • It comes back online ONLY when its node version matches the network's CURRENT
//     release (auto-un-kill on update) OR an admin explicitly un-kills it. If a killed,
//     still-outdated node reconnects, it is re-killed on sight (it can't dodge by being
//     offline). The current network version is read from the OTA feed.
//
// Zero runtime dependencies (pure Node built-ins), matching the other pyrax-web services.

import { createServer } from "node:http";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TunnelHub, nodeIdFromHost } from "./protocol.mjs";
import { acceptUpgrade } from "./ws.mjs";

// ── branded "node offline" splash ─────────────────────────────────────────────
// When a browser opens <id>.nodes.pyraxchain.com for a node that isn't currently
// connected to the relay, we serve a branded page (PYRAX vertical logo) instead of a
// bare error. IMPORTANT: it is returned with HTTP 200 — Cloudflare replaces an origin
// 5xx body with its own generic "error code: 5xx" page, so a 200 is the only way the
// branded page renders through the proxy. The page auto-refreshes so a node that is just
// starting up "comes alive" without the visitor reloading.
const HERE = dirname(fileURLToPath(import.meta.url));
let OFFLINE_LOGO = "";
try {
  OFFLINE_LOGO = readFileSync(join(HERE, "logo-vertical.svg"), "utf8")
    .replace(/<\?xml[^>]*\?>/i, "") // strip the XML prolog so it inlines cleanly in HTML
    .trim();
} catch {
  /* logo missing — the page still renders, just without the mark */
}
function offlinePage(id) {
  const safeId = String(id ?? "").replace(/[^0-9a-f]/gi, "").slice(0, 64);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="refresh" content="12" />
<title>PYRAX node — offline</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:2rem;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color:#e8e9f0; background: radial-gradient(1200px 800px at 50% -10%, #1a1330 0%, #0b0a14 55%, #07060d 100%); }
  .card { width:100%; max-width:30rem; text-align:center; }
  .logo { width:148px; height:auto; margin:0 auto 1.75rem; display:block; filter: drop-shadow(0 8px 30px rgba(124,77,255,.35)); }
  .logo svg { width:100%; height:auto; display:block; }
  h1 { font-size:1.5rem; font-weight:800; letter-spacing:-.01em; margin:0 0 .5rem; }
  p { margin:.35rem 0; color:#a8abc0; line-height:1.6; font-size:.975rem; }
  .pulse { display:inline-flex; align-items:center; gap:.5rem; margin-top:1.25rem; padding:.5rem .9rem;
    border:1px solid rgba(124,77,255,.35); border-radius:999px; font-size:.825rem; color:#cbb6ff; background:rgba(124,77,255,.08); }
  .dot { width:.55rem; height:.55rem; border-radius:50%; background:#7c4dff; box-shadow:0 0 0 0 rgba(124,77,255,.6); animation:pulse 1.8s infinite; }
  @keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(124,77,255,.55)} 70%{box-shadow:0 0 0 10px rgba(124,77,255,0)} 100%{box-shadow:0 0 0 0 rgba(124,77,255,0)} }
  code { color:#cbb6ff; background:rgba(255,255,255,.05); padding:.1rem .4rem; border-radius:.35rem; font-size:.85em; }
  .foot { margin-top:1.75rem; font-size:.8rem; color:#6f7188; }
</style>
</head>
<body>
  <main class="card">
    <div class="logo">${OFFLINE_LOGO}</div>
    <h1>This node is offline</h1>
    <p>The PYRAX node for this address isn't connected to the tunnel right now.</p>
    <p>If you just started it, give it a moment to come online and connect — this page refreshes automatically.</p>
    <div class="pulse"><span class="dot"></span> Waiting for <code>${safeId || "node"}</code> to reconnect…</div>
    <p class="foot">PYRAX node portal · nodes.pyraxchain.com</p>
  </main>
</body>
</html>`;
}

const PORT = Number(process.env.PORT ?? 8792);
// Shared secret for the admin control plane (team-pyrax holds the same value + signs).
const ADMIN_SECRET = process.env.PYRAX_TUNNEL_ADMIN_SECRET ?? "";
// Where the killed/registry state persists (a Docker volume), so a killed node stays
// killed across relay restarts.
const STATE_FILE = process.env.PYRAX_TUNNEL_STATE ?? "/data/registry.json";
// OTA feed to read the network's CURRENT node release version from (for version compare
// + version-gated auto-un-kill). Refreshed periodically.
const OTA_LATEST_URL = process.env.PYRAX_OTA_LATEST ?? "https://updates.pyraxchain.com/node/latest.yml";
const ADMIN_SKEW_MS = 5 * 60 * 1000; // accept admin signatures within ±5 min
const STRIP = new Set(["content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive"]);

// ── registry ────────────────────────────────────────────────────────────────
// id → live + persisted node record. `hub` + `key` are live (in-memory); the rest is
// persisted so a kill survives a relay restart and a returning node is re-killed.
const nodes = new Map();
let networkVersion = ""; // current network node release (from the OTA feed)

function blank(id) {
  return {
    hub: new TunnelHub({ onAgentChange: (up) => onAgentChange(id, up) }),
    key: null,
    nodeVersion: "",
    appVersion: "",
    network: "",
    peerId: "",
    connectedSince: 0,
    lastSeen: 0,
    killed: false,
  };
}
function entry(id) {
  let e = nodes.get(id);
  if (!e) {
    e = blank(id);
    nodes.set(id, e);
  }
  return e;
}

// ── persistence (killed flag + last-known meta) ───────────────────────────────
function persist() {
  const out = {};
  for (const [id, e] of nodes) {
    // Only persist nodes that matter across restarts (killed, or seen recently).
    out[id] = {
      killed: e.killed,
      nodeVersion: e.nodeVersion,
      appVersion: e.appVersion,
      network: e.network,
      peerId: e.peerId,
      lastSeen: e.lastSeen,
    };
  }
  try {
    mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(out), "utf8");
  } catch (err) {
    console.error("registry persist failed", err?.message ?? err);
  }
}
function loadState() {
  try {
    const saved = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    for (const [id, r] of Object.entries(saved)) {
      if (!/^[0-9a-f]{4,64}$/.test(id)) continue;
      const e = entry(id);
      e.killed = !!r.killed;
      e.nodeVersion = String(r.nodeVersion ?? "");
      e.appVersion = String(r.appVersion ?? "");
      e.network = String(r.network ?? "");
      e.peerId = String(r.peerId ?? "");
      e.lastSeen = Number(r.lastSeen ?? 0) || 0;
    }
    console.log(`loaded registry: ${nodes.size} node(s)`);
  } catch {
    /* first boot — no state yet */
  }
}

function onAgentChange(id, up) {
  const e = nodes.get(id);
  if (e) e.lastSeen = Date.now();
  console.log(`node ${id}: tunnel ${up ? "UP" : "down"}`);
}

// ── network current version (OTA feed) ────────────────────────────────────────
async function refreshNetworkVersion() {
  try {
    const res = await fetch(OTA_LATEST_URL, { signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    const m = text.match(/^version:\s*([0-9][0-9A-Za-z.\-+]*)/m);
    if (m) networkVersion = m[1].trim();
  } catch {
    /* feed unreachable — keep the last known value */
  }
}

/** A node is "current" when its node version equals the network's current release. */
function isCurrent(e) {
  return !!networkVersion && !!e.nodeVersion && e.nodeVersion === networkVersion;
}

/** Apply the kill policy to a (re)connecting node: an up-to-date killed node is
 *  auto-un-killed; a still-outdated killed node is re-killed on sight. */
function enforceKill(id, e) {
  if (!e.killed) return;
  if (isCurrent(e)) {
    e.killed = false; // auto-un-kill: it updated to the current release
    persist();
    console.log(`node ${id}: auto-un-killed (version ${e.nodeVersion} == network ${networkVersion})`);
  } else {
    e.hub.kill?.();
    sendKill(e);
    console.log(`node ${id}: re-killed on connect (version ${e.nodeVersion || "?"} != network ${networkVersion || "?"})`);
  }
}

function sendKill(e) {
  // The agent WS carries control messages too; `{t:"kill"}` tells the app to stop the
  // node + set its persistent kill flag. Sent via the hub's agent socket.
  e.hub.sendControl?.({ t: "kill" });
}

// ── HMAC admin auth (same scheme as the peer directory) ───────────────────────
function adminOk(method, pathname, body, header) {
  if (!ADMIN_SECRET) return false; // control plane disabled until a secret is set
  const m = /^PYRAX-HMAC\s+ts=(\d+),sig=([0-9a-f]{64})$/.exec(header ?? "");
  if (!m) return false;
  const ts = Number(m[1]);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > ADMIN_SKEW_MS) return false;
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const expect = createHmac("sha256", ADMIN_SECRET).update(`${method}\n${pathname}\n${ts}\n${bodyHash}`).digest("hex");
  const got = Buffer.from(m[2], "hex");
  const exp = Buffer.from(expect, "hex");
  return got.length === exp.length && timingSafeEqual(got, exp);
}

function nodeListJson() {
  const now = Date.now();
  const out = [];
  for (const [id, e] of nodes) {
    const connected = e.hub.hasAgent();
    out.push({
      id,
      peerId: e.peerId || undefined,
      network: e.network || undefined,
      nodeVersion: e.nodeVersion || undefined,
      appVersion: e.appVersion || undefined,
      networkVersion: networkVersion || undefined,
      current: isCurrent(e),
      connected,
      lastSeen: e.lastSeen || undefined,
      killed: e.killed,
    });
  }
  // Outdated + connected first (the ones an admin most likely wants to see/act on).
  out.sort((a, b) => Number(b.connected) - Number(a.connected) || Number(a.current) - Number(b.current));
  return { networkVersion, now, nodes: out };
}

// ── HTTP: admin control plane + browser tunnel + health ───────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");

  // Admin control plane (HMAC-gated, server-to-server from team-pyrax).
  if (url.pathname === "/__admin/nodes" || url.pathname.startsWith("/__admin/nodes/")) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks).toString("utf8") : "";
    if (!adminOk(req.method, url.pathname, body, req.headers["authorization"])) {
      res.writeHead(401, { "content-type": "application/json" }).end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    if (req.method === "GET" && url.pathname === "/__admin/nodes") {
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(nodeListJson()));
      return;
    }
    const km = /^\/__admin\/nodes\/([0-9a-f]{4,64})\/(kill|unkill)$/.exec(url.pathname);
    if (req.method === "POST" && km) {
      const [, id, action] = km;
      const e = entry(id);
      if (action === "kill") {
        e.killed = true;
        sendKill(e);
        console.log(`ADMIN kill: ${id}`);
      } else {
        e.killed = false;
        e.hub.sendControl?.({ t: "unkill" });
        console.log(`ADMIN unkill: ${id}`);
      }
      persist();
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, id, killed: e.killed }));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ error: "not found" }));
    return;
  }

  // Browser → node portal, proxied over the tunnel.
  const id = nodeIdFromHost(req.headers.host);
  if (!id) {
    if (url.pathname === "/health" || url.pathname === "/") {
      res
        .writeHead(200, { "content-type": "application/json" })
        .end(JSON.stringify({ service: "pyrax-tunnel-relay", ok: true, nodes: nodes.size, networkVersion }));
    } else {
      res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ error: "unknown node subdomain" }));
    }
    return;
  }
  const e = nodes.get(id);
  if (!e || !e.hub.hasAgent()) {
    // Branded splash, served as 200 so Cloudflare renders it (it swallows origin 5xx
    // bodies into a generic "error code: 5xx" page). `no-store` so a node coming online
    // is reflected on the next refresh, not from cache.
    res
      .writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" })
      .end(offlinePage(id));
    return;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks).toString("base64") : null;
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers[k] = v;
  const r = await e.hub.http(req.method, req.url, headers, body);
  const out = {};
  for (const [k, v] of Object.entries(r.headers)) if (!STRIP.has(k.toLowerCase())) out[k] = v;
  res.writeHead(r.status, out);
  res.end(r.body ? Buffer.from(r.body, "base64") : undefined);
});

// ── WebSocket upgrades: agent registration + browser portal ───────────────────
server.on("upgrade", (req, socket) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/__tunnel/register") {
    const id = (url.searchParams.get("id") ?? "").toLowerCase();
    const key = url.searchParams.get("key") ?? "";
    if (!/^[0-9a-f]{4,64}$/.test(id) || !/^[0-9a-f]{16,128}$/.test(key)) {
      socket.destroy();
      return;
    }
    const e = entry(id);
    if (e.key === null) e.key = key;
    else if (e.key !== key) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }
    // Version/meta the agent advertises on the register URL (additive; older agents that
    // omit them simply show as version "unknown"). The app also re-sends them in a hello.
    e.nodeVersion = (url.searchParams.get("nodeVersion") ?? e.nodeVersion ?? "").slice(0, 32);
    e.appVersion = (url.searchParams.get("appVersion") ?? e.appVersion ?? "").slice(0, 32);
    e.network = (url.searchParams.get("network") ?? e.network ?? "").slice(0, 48);
    e.peerId = (url.searchParams.get("peerId") ?? e.peerId ?? "").slice(0, 128);
    e.connectedSince = Date.now();
    e.lastSeen = Date.now();

    const { sock, onText, onClose } = acceptUpgrade(req, socket);
    // Give the hub a way to push control messages (kill/unkill/ping) + a kill no-op.
    e.hub.sendControl = (msg) => sock.send(JSON.stringify(msg));
    e.hub.kill = () => {};
    onText((t) => {
      e.lastSeen = Date.now();
      // Relay-level control from the agent: a `hello` carrying live version/meta. Anything
      // else is tunnel mux traffic for the hub.
      if (t.length < 512 && t.includes('"t":"hello"')) {
        try {
          const h = JSON.parse(t);
          if (h && h.t === "hello") {
            if (typeof h.nodeVersion === "string") e.nodeVersion = h.nodeVersion.slice(0, 32);
            if (typeof h.appVersion === "string") e.appVersion = h.appVersion.slice(0, 32);
            if (typeof h.network === "string") e.network = h.network.slice(0, 48);
            if (typeof h.peerId === "string") e.peerId = h.peerId.slice(0, 128);
            persist();
            enforceKill(id, e); // re-evaluate kill policy with fresh version info
            return;
          }
        } catch {
          /* fall through to the hub */
        }
      }
      e.hub.handleAgent(t);
    });
    onClose(() => {
      e.hub.dropAgent(sock);
      e.lastSeen = Date.now();
    });
    e.hub.setAgent(sock);
    persist();
    enforceKill(id, e); // kill on sight if this node is killed + still outdated
    return;
  }

  // Browser portal WebSocket → tunneled to the node.
  const id = nodeIdFromHost(req.headers.host);
  const e = id ? nodes.get(id) : null;
  if (!e || !e.hub.hasAgent()) {
    socket.destroy();
    return;
  }
  const { sock, onText, onClose } = acceptUpgrade(req, socket);
  const stream = e.hub.openWs(sock, url.pathname + url.search);
  onText((t) => stream.onMessage(t));
  onClose(() => stream.onClose());
});

// Keepalive: ping every connected agent so the Cloudflare-proxied WS never idles out.
setInterval(() => {
  for (const e of nodes.values()) if (e.hub.hasAgent()) e.hub.ping();
}, 30_000).unref?.();

// Refresh the network version from the OTA feed periodically.
void refreshNetworkVersion();
setInterval(() => void refreshNetworkVersion(), 5 * 60 * 1000).unref?.();

loadState();
server.listen(PORT, () => {
  console.log(`pyrax-tunnel-relay listening on :${PORT}`);
  console.log(`  register: wss://nodes.pyraxchain.com/__tunnel/register?id=&key=`);
  console.log(`  admin:    /__admin/nodes  (HMAC${ADMIN_SECRET ? "" : " — DISABLED: set PYRAX_TUNNEL_ADMIN_SECRET"})`);
});
