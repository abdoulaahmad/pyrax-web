// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// PYRAX peer-directory service (peers.pyraxchain.com).
//
// A hardened, dependency-free presence directory. Nodes (via the desktop apps)
// heartbeat their dialable address; the directory keeps each entry alive only
// while it is refreshed, drops it at TTL when the node goes offline, and pushes
// the live set to the website over SSE in real time — per network.
//
// SECURITY MODEL ("the API is not publicly accessible — only via the app"):
//   * Announce (WRITE) is restricted to the PYRAX apps: every announce must carry
//     an `Authorization: PYRAX-HMAC ts=…,sig=…` header, an HMAC-SHA256 over the
//     canonical request keyed by a shared app secret, within a ±90s clock window,
//     and not previously seen (replay cache). The public cannot inject/alter peers.
//   * Reads (peer list / SSE) are served to the OFFICIAL WEBSITE (same-origin
//     browser requests) OR to apps presenting a valid HMAC — anything else is 401.
//     The listing is shown on the public site by design; the read API itself is
//     gated, CORS-locked, and rate-limited to deter scraping/abuse.
//   * Defense in depth: strict input validation, per-IP token-bucket rate limits,
//     request-size caps, and a full set of security headers (CSP/HSTS/etc.).
//
// Zero runtime dependencies (Node built-ins only) to minimize supply-chain risk.

import http from "node:http";
import crypto from "node:crypto";
import { isIP } from "node:net";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, normalize, extname } from "node:path";

/** True only when this file is the program entrypoint (so importing it for tests
 * does not start the listener / sweep timer). */
const RUN_DIRECTLY = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, "..", "dist");

const PORT = Number(process.env.PORT ?? 8787);
/** A peer is "online" for this long after its last heartbeat. */
const TTL_MS = Number(process.env.TTL_MS ?? 30_000);
/** Allowed clock skew for HMAC-authenticated announces. */
const HMAC_WINDOW_MS = 90_000;
/** Max request body (announce payloads are tiny). */
const MAX_BODY = 4096;
/** The public site origin (for same-origin read access + CORS). */
const SITE_ORIGIN = process.env.SITE_ORIGIN ?? `http://localhost:${PORT}`;

// Known PYRAX networks. `seed` is the dev-team simulated network; `forge` is the
// public-facing development network; `rise` is the public test network; `one` is the
// production network. (The retired plain `devnet` and the deleted internal live
// network are both gone.)
const NETWORKS = new Set([
  "seed",
  "forge",
  "rise",
  "one",
]);

// **Enablement control**: only these networks accept announces / serve reads —
// so the public can't discover/join a network that isn't launched yet. Set
// `PYRAX_ENABLED_NETWORKS=forge,rise,…` as each network goes live. Default:
// seed only (the dev-team simulated network).
const ENABLED = new Set(
  (process.env.PYRAX_ENABLED_NETWORKS ?? "seed")
    .split(",")
    .map((s) => s.trim())
    .filter((n) => NETWORKS.has(n)),
);

// Shared app secret for HMAC. MUST be set in production via PYRAX_DIRECTORY_SECRET
// and shared with the apps; a known dev default is used otherwise (with a warning).
const DEV_SECRET = "pyrax-dev-directory-secret-change-me";
const SECRET = process.env.PYRAX_DIRECTORY_SECRET ?? DEV_SECRET;
if (SECRET === DEV_SECRET) {
  // eslint-disable-next-line no-console
  console.warn(
    "[pyrax-directory] WARNING: using the built-in DEV secret. Set PYRAX_DIRECTORY_SECRET in production.",
  );
}

/** key = `${network}|${address}` → { network, address, lastSeen, since, relayPubkey }. */
const peers = new Map();
/** Open SSE responses: Set<{ res, network }>. */
const streams = new Set();
/** Replay cache for HMAC signatures: Map<sig, expiryMs>. */
const seenSigs = new Map();
/** Per-IP token buckets: Map<ip, { tokens, last }>. */
const buckets = new Map();

const now = () => Date.now();
const keyOf = (network, address) => `${network}|${address}`;

// --- presence --------------------------------------------------------------

// --- geolocation (best-effort, cached, private-IP-safe) --------------------
// Resolves a peer's country (ISO-2) from its connection IP via a free, no-key
// API. The IP is the real TCP source (not a client-supplied value, unless
// TRUST_PROXY), so there's no SSRF/spoof surface. Private/loopback IPs are
// skipped; results (incl. misses) are cached per IP so the API is hit at most
// once per address; any failure degrades silently to "no flag".
// Non-public ranges that should never be geolocated: loopback, the IPv4 private
// blocks, CGNAT (100.64/10), link-local, "this host" (0/8), the IPv6 unspecified
// address, IPv6 link-local, and IPv6 ULA (fc00::/7).
const PRIVATE_IP =
  /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|::1$|::$|fe80:|f[cd][0-9a-f]{2}:)/i;

function isPrivateIp(ip) {
  return !ip || ip === "127.0.0.1" || ip === "localhost" || PRIVATE_IP.test(ip);
}

// Resolve the IP to publish in a peer's dial multiaddr. An announce is HMAC-
// authenticated, so it MAY override the request source IP with a specific PUBLIC
// IP — required when the node and the directory run on the SAME host (an RPC node
// co-located with the directory, where the source IP would be localhost). A
// claimed IP is honored ONLY if it is a valid, routable public address; anything
// invalid or non-public (incl. private/loopback) falls back to the source IP, so
// a holder of the secret can never publish an internal or garbage multiaddr.
function resolveAnnounceIp(claimedIp, sourceIp) {
  const c = String(claimedIp ?? "").replace(/^::ffff:/, "");
  return c && isIP(c) && !isPrivateIp(c) ? c : sourceIp;
}

// Geolocation provider (override with PYRAX_GEO_URL for a paid/HTTPS provider;
// set PYRAX_GEO_DISABLE=1 — or PYRAX_GEO_URL="" — to turn it off entirely, so no
// peer IP is ever sent to a third party). ip-api.com is free, no key, no CORS gate.
const GEO_BASE = process.env.PYRAX_GEO_URL ?? "http://ip-api.com/json";
const GEO_DISABLED = process.env.PYRAX_GEO_DISABLE === "1" || GEO_BASE === "";
const GEO_CACHE_MAX = 10_000;
const GEO_OK_TTL = 24 * 60 * 60 * 1000; // a confirmed country is stable — cache a day
const GEO_FAIL_TTL = 10 * 60 * 1000; // a miss may be transient (timeout/rate-limit) — retry in 10m
const geoCache = new Map(); // ip -> { v: {code,name}|null, exp }
const geoInFlight = new Set(); // ips with a fetch in progress (kept OUT of geoCache)

function cacheGeo(ip, v) {
  if (geoCache.size >= GEO_CACHE_MAX) geoCache.delete(geoCache.keys().next().value);
  geoCache.set(ip, { v, exp: now() + (v ? GEO_OK_TTL : GEO_FAIL_TTL) });
}

async function lookupCountry(ip) {
  if (GEO_DISABLED || isPrivateIp(ip)) return null;
  const hit = geoCache.get(ip);
  if (hit && hit.exp > now()) return hit.v; // fresh hit (success OR a still-valid miss)
  if (geoInFlight.has(ip)) return null; // a fetch is already running for this exact IP
  geoInFlight.add(ip);
  try {
    const res = await fetch(
      `${GEO_BASE}/${encodeURIComponent(ip)}?fields=status,countryCode,country,lat,lon`,
      { signal: AbortSignal.timeout(4000) },
    );
    const d = await res.json();
    const v =
      d && d.status === "success" && /^[A-Za-z]{2}$/.test(String(d.countryCode ?? ""))
        ? {
            code: String(d.countryCode).toUpperCase(),
            name: String(d.country ?? ""),
            lat: Number.isFinite(d.lat) ? d.lat : undefined,
            lon: Number.isFinite(d.lon) ? d.lon : undefined,
          }
        : null;
    cacheGeo(ip, v); // cache misses too (short TTL) so we re-try later, not forever
    return v;
  } catch {
    cacheGeo(ip, null);
    return null;
  } finally {
    geoInFlight.delete(ip);
  }
}

function live(network) {
  const t = now();
  return [...peers.values()]
    .filter((e) => e.network === network && t - e.lastSeen <= TTL_MS)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .map((e) => ({
      address: e.address,
      lastSeen: e.lastSeen,
      since: e.since,
      relayPubkey: e.relayPubkey,
      country: e.country,
      countryName: e.countryName,
      lat: e.lat,
      lon: e.lon,
      kind: e.kind,
    }));
}

function announce({ network, port, peerId, ip, relayPubkey, kind }) {
  const address = `/ip4/${ip}/tcp/${port}/p2p/${peerId}`;
  const k = keyOf(network, address);
  const existing = peers.get(k);
  peers.set(k, {
    network,
    address,
    lastSeen: now(),
    since: existing?.since ?? now(),
    relayPubkey: relayPubkey || existing?.relayPubkey,
    country: existing?.country,
    countryName: existing?.countryName,
    lat: existing?.lat,
    lon: existing?.lon,
    // "seed" (Ember), "operator" (Inferno Node), or "rpc" (violet RPC node); colors the globe.
    kind: kind || existing?.kind,
  });
  // Resolve geolocation once per IP (async); patch the entry + push when it lands.
  if (existing?.lat === undefined) {
    lookupCountry(ip).then((c) => {
      const e = peers.get(k);
      if (e && c) {
        e.country = c.code;
        e.countryName = c.name;
        e.lat = c.lat;
        e.lon = c.lon;
        pushNetwork(network);
      }
    });
  }
  pushNetwork(network);
  return address;
}

/** Immediately remove a node from a network's presence list by its peer id (the
 *  destroy-wipe path: when a node is DESTROYED in the app, it disappears from the
 *  directory at once instead of lingering for the TTL window). Matches on the peer
 *  id embedded in the dial multiaddr, so it's IP-independent. Returns count removed. */
function deregister({ network, peerId }) {
  const suffix = `/p2p/${peerId}`;
  let removed = 0;
  for (const [k, e] of peers) {
    if (e.network === network && e.address.endsWith(suffix)) {
      peers.delete(k);
      removed++;
    }
  }
  if (removed) pushNetwork(network);
  return removed;
}

function sweep() {
  const t = now();
  const changed = new Set();
  for (const [k, e] of peers) {
    if (t - e.lastSeen > TTL_MS) {
      peers.delete(k);
      changed.add(e.network);
    }
  }
  for (const net of changed) pushNetwork(net);
  for (const [sig, exp] of seenSigs) if (exp < t) seenSigs.delete(sig);
}

function pushNetwork(network) {
  const data = `data: ${JSON.stringify({ peers: live(network) })}\n\n`;
  for (const s of streams) if (s.network === network) s.res.write(data);
}

// --- security primitives ---------------------------------------------------

function clientIp(req) {
  // Trust X-Forwarded-For only behind a known proxy; default to the socket.
  const xff = process.env.TRUST_PROXY ? req.headers["x-forwarded-for"] : undefined;
  const raw = (typeof xff === "string" ? xff.split(",")[0].trim() : req.socket.remoteAddress) ?? "";
  const ip = raw.replace(/^::ffff:/, "");
  // A spoofed/garbage XFF must not become a published multiaddr or a geo query;
  // fall back to the real socket address when the forwarded value isn't an IP.
  const valid = isIP(ip) ? ip : (req.socket.remoteAddress ?? "").replace(/^::ffff:/, "");
  return valid === "::1" ? "127.0.0.1" : valid;
}

/** Token-bucket rate limit: `cost` tokens per request; refill `RATE`/sec up to `BURST`. */
const RATE = 5;
const BURST = 40;
function rateLimited(ip, cost = 1) {
  const t = now();
  let b = buckets.get(ip);
  if (!b) {
    b = { tokens: BURST, last: t };
    buckets.set(ip, b);
  }
  b.tokens = Math.min(BURST, b.tokens + ((t - b.last) / 1000) * RATE);
  b.last = t;
  if (b.tokens < cost) return true;
  b.tokens -= cost;
  return false;
}

function timingSafeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/** Verifies the app HMAC over `${method}\n${path}\n${ts}\n${sha256(body)}`. */
function hmacOk(req, path, rawBody) {
  const auth = req.headers["authorization"];
  if (typeof auth !== "string" || !auth.startsWith("PYRAX-HMAC ")) return false;
  const params = Object.fromEntries(
    auth
      .slice("PYRAX-HMAC ".length)
      .split(",")
      .map((kv) => kv.split("=").map((s) => s.trim())),
  );
  const ts = Number(params.ts);
  const sig = String(params.sig ?? "");
  if (!Number.isFinite(ts) || Math.abs(now() - ts) > HMAC_WINDOW_MS) return false;
  if (!/^[0-9a-f]{64}$/.test(sig) || seenSigs.has(sig)) return false;
  const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const mac = crypto
    .createHmac("sha256", SECRET)
    .update(`${req.method}\n${path}\n${ts}\n${bodyHash}`)
    .digest("hex");
  if (!timingSafeEqual(mac, sig)) return false;
  seenSigs.set(sig, now() + HMAC_WINDOW_MS); // one-time use
  return true;
}

/** True for a same-origin browser request from the official site (read access). */
function sameOriginBrowser(req) {
  const origin = req.headers["origin"];
  const referer = req.headers["referer"];
  if (origin && origin === SITE_ORIGIN) return true;
  if (!origin && typeof referer === "string" && referer.startsWith(SITE_ORIGIN)) return true;
  // A direct same-host navigation (no Origin/Referer) to the page is the site too.
  return !origin && !referer && req.headers["sec-fetch-site"] === "same-origin";
}

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "Content-Security-Policy":
    // img-src adds flagcdn.com so the per-peer country FLAG images load (flag EMOJI
    // don't render on Windows, so flags are <img> SVGs from flagcdn — a scoped, image-
    // only allowance; no script/style/connect trust is granted to it).
    "default-src 'self'; img-src 'self' data: https://flagcdn.com; style-src 'self' 'unsafe-inline'; " +
    // connect-src must allow the shared navbar's network store to poll the per-network public RPC
    // endpoints (the @pyrax/shared endpoints SSOT → RPC_BY_CHAIN) so the live status dot reads green.
    // Those RPCs are pyraxchain.com subdomains (e.g. sidn-rpc.pyraxchain.com); 'self' alone blocked
    // the cross-origin fetch, which left the network reading "offline". 'self' still covers the SSE.
    "script-src 'self'; connect-src 'self' https://*.pyraxchain.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

function withHeaders(res, extra = {}) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  res.setHeader("Access-Control-Allow-Origin", SITE_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
  res.setHeader("Vary", "Origin");
  for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
}

function json(res, code, body) {
  withHeaders(res, { "content-type": "application/json" });
  res.writeHead(code);
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw new Error("payload too large");
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString("utf8");
}

// --- static frontend -------------------------------------------------------

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".ico": "image/x-icon",
};

async function serveStatic(req, res, pathname) {
  // Resolve safely within DIST (no path traversal).
  const rel = normalize(pathname === "/" ? "/index.html" : pathname).replace(/^(\.\.[/\\])+/, "");
  const file = join(DIST, rel);
  if (!file.startsWith(DIST)) return json(res, 403, { error: "forbidden" });
  try {
    const s = await stat(file);
    if (!s.isFile()) throw new Error("not a file");
    const buf = await readFile(file);
    withHeaders(res, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
      "cache-control": rel === "/index.html" ? "no-cache" : "public, max-age=3600",
    });
    res.writeHead(200);
    res.end(buf);
  } catch {
    // SPA fallback to index.html for unknown non-API routes.
    try {
      const buf = await readFile(join(DIST, "index.html"));
      withHeaders(res, { "content-type": MIME[".html"], "cache-control": "no-cache" });
      res.writeHead(200);
      res.end(buf);
    } catch {
      withHeaders(res, { "content-type": "text/plain" });
      res.writeHead(404);
      res.end("not found (run `pnpm build` to produce the website)");
    }
  }
}

// --- router ----------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const path = url.pathname;
  const ip = clientIp(req);

  if (req.method === "OPTIONS") {
    withHeaders(res);
    res.writeHead(204);
    return res.end();
  }

  if (rateLimited(ip, path.startsWith("/api/") ? 1 : 0.2)) {
    return json(res, 429, { error: "rate limited" });
  }

  // --- WRITE: announce (app-only, HMAC + replay protected) ---
  if (req.method === "POST" && path === "/api/announce") {
    let raw;
    try {
      raw = await readBody(req);
    } catch {
      return json(res, 413, { error: "payload too large" });
    }
    if (!hmacOk(req, path, raw)) return json(res, 401, { error: "unauthorized" });
    let body;
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      return json(res, 400, { error: "invalid json" });
    }
    const network = String(body?.network ?? "");
    const port = Number(body?.port);
    const peerId = String(body?.peerId ?? "");
    const relayPubkey = /^[0-9a-fA-F]{64}$/.test(String(body?.relayPubkey ?? ""))
      ? String(body.relayPubkey).toLowerCase()
      : undefined;
    // Node kind for the globe: "seed" (Ember), "operator" (Inferno Node), or "rpc" (violet RPC node).
    const kind = body?.kind === "seed" || body?.kind === "operator" || body?.kind === "rpc" ? body.kind : undefined;
    if (
      !NETWORKS.has(network) ||
      !Number.isInteger(port) ||
      port <= 0 ||
      port > 65535 ||
      !/^[A-Za-z0-9]{20,80}$/.test(peerId)
    ) {
      return json(res, 400, { error: "expected { network, port, peerId, [relayPubkey], [kind] }" });
    }
    if (!ENABLED.has(network)) return json(res, 403, { error: "network not enabled" });
    // Optional public-IP override: this announce is already HMAC-authenticated
    // (verified above), so it MAY publish a specific public IP in its dial
    // multiaddr instead of the request source IP — needed when the node and the
    // directory share a host (an RPC node co-located with the directory, where the
    // source IP would be localhost/Docker-internal). We re-validate it is a real
    // PUBLIC IP, so a holder of the secret can only point at routable addresses;
    // private/loopback/garbage falls back to the source IP, exactly as before.
    const effectiveIp = resolveAnnounceIp(body?.ip, ip);
    const address = announce({ network, port, peerId, ip: effectiveIp, relayPubkey, kind });
    return json(res, 200, { ok: true, address, ttlMs: TTL_MS });
  }

  // --- WRITE: deregister (app-only, HMAC + replay protected) — node destroy-wipe ---
  // The app calls this when a managed node is DESTROYED so it vanishes from the
  // directory immediately rather than aging out over the TTL window.
  if (req.method === "POST" && path === "/api/deregister") {
    let raw;
    try {
      raw = await readBody(req);
    } catch {
      return json(res, 413, { error: "payload too large" });
    }
    if (!hmacOk(req, path, raw)) return json(res, 401, { error: "unauthorized" });
    let body;
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      return json(res, 400, { error: "invalid json" });
    }
    const network = String(body?.network ?? "");
    const peerId = String(body?.peerId ?? "");
    if (!NETWORKS.has(network) || !/^[A-Za-z0-9]{20,80}$/.test(peerId)) {
      return json(res, 400, { error: "expected { network, peerId }" });
    }
    const removed = deregister({ network, peerId });
    return json(res, 200, { ok: true, removed });
  }

  // --- READ: live peers (same-origin website OR app HMAC) ---
  if (req.method === "GET" && path === "/api/peers") {
    if (!sameOriginBrowser(req) && !hmacOk(req, path, "")) {
      return json(res, 401, { error: "unauthorized" });
    }
    const network = url.searchParams.get("network") ?? "";
    if (!ENABLED.has(network)) return json(res, 400, { error: "network not enabled" });
    return json(res, 200, { network, ttlMs: TTL_MS, peers: live(network) });
  }

  // --- READ: live peers over SSE (same-origin website OR app HMAC) ---
  if (req.method === "GET" && path === "/api/peers/stream") {
    if (!sameOriginBrowser(req) && !hmacOk(req, path, "")) {
      return json(res, 401, { error: "unauthorized" });
    }
    const network = url.searchParams.get("network") ?? "";
    if (!ENABLED.has(network)) return json(res, 400, { error: "network not enabled" });
    withHeaders(res, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    res.writeHead(200);
    res.write(`data: ${JSON.stringify({ peers: live(network) })}\n\n`);
    const entry = { res, network };
    streams.add(entry);
    const ping = setInterval(() => res.write(": ping\n\n"), 20_000);
    req.on("close", () => {
      clearInterval(ping);
      streams.delete(entry);
    });
    return;
  }

  if (req.method === "GET" && path === "/api/health") {
    // `networks` lists only the ENABLED networks (the website builds its dropdown
    // from this — disabled networks aren't shown/selectable).
    return json(res, 200, { ok: true, networks: [...ENABLED], live: peers.size });
  }

  if (path.startsWith("/api/")) return json(res, 404, { error: "not found" });

  // Everything else: the static website.
  if (req.method === "GET") return serveStatic(req, res, path);
  return json(res, 405, { error: "method not allowed" });
});

if (RUN_DIRECTLY) {
  setInterval(sweep, 5_000);
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`pyrax-peer-directory on http://0.0.0.0:${PORT} (TTL ${TTL_MS}ms, origin ${SITE_ORIGIN})`);
  });
}

// Exported for unit tests (the HMAC + presence logic).
export {
  hmacOk,
  live,
  announce,
  deregister,
  sweep,
  isPrivateIp,
  resolveAnnounceIp,
  lookupCountry,
  NETWORKS,
  ENABLED,
  SECRET,
  rateLimited,
  peers,
  seenSigs,
};
