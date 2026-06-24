// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// team-pyrax (team-pyrax.pyraxchain.com) — the gated PYRAX team portal.
//
// ONE Node process serves the built SPA (dist/) AND the JSON API. Access is
// passwordless: a teammate requests a magic link, clicks it, and gets a session.
// Everything past the login screen is role-gated (see auth.js / config.js).
//
// SECURITY MODEL:
//   • Only @<domain> addresses, and only ones on the whitelist, can sign in.
//   • Magic tokens + session ids are single-use / TTL'd and stored only as HMACs.
//   • Mutations require: a valid session, the matching CSRF token (X-CSRF-Token),
//     AND a same-origin Origin/Referer — defence in depth on top of SameSite=Lax.
//   • Per-IP token-bucket rate limiting, request-size caps, strict security headers.
//   • The superuser (shawn.wilson@<domain>) is hardcoded, seeded, and immutable.

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, normalize, extname } from "node:path";

import { PORT, PUBLIC_URL, MODULES, ROLES, TRUST_PROXY, SESSION_SECRET_IS_EPHEMERAL, BREVO_API_KEY } from "./config.js";
import { init as initDb, Tokens, Sessions } from "./db.js";
import {
  issueMagicToken,
  magicLinkUrl,
  consumeMagicToken,
  startSession,
  endSession,
  sessionUser,
  hasRole,
  csrfToken,
  csrfOk,
  rawSidFromReq,
  sessionCookie,
  clearCookie,
} from "./auth.js";
import { sendMagicLink } from "./email.js";
import { catalogue, downloadUrl } from "./downloads.js";
import { listUsers, addUser, setRoles, removeUser } from "./admin.js";
import { emitEvent } from "./events.js";

const RUN_DIRECTLY = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, "..", "dist");
const MAX_BODY = 8 * 1024;

// Internal test-token faucet (reached over the compose network). The portal proxies
// signed-in users to it so they never hit it directly. Empty/unreachable → graceful.
const FAUCET_BASE = process.env.FAUCET_BASE || "http://faucet:8800";

// --- security primitives ----------------------------------------------------

function clientIp(req) {
  const xff = TRUST_PROXY ? req.headers["x-forwarded-for"] : undefined;
  const raw = (typeof xff === "string" ? xff.split(",")[0].trim() : req.socket.remoteAddress) ?? "";
  const ip = raw.replace(/^::ffff:/, "");
  return ip === "::1" ? "127.0.0.1" : ip;
}

const buckets = new Map(); // ip -> { tokens, last }
const RATE = 4; // tokens/sec refill
const BURST = 30;
function rateLimited(ip, cost = 1) {
  const t = Date.now();
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

const SECURE = PUBLIC_URL.startsWith("https://");
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Content-Security-Policy":
    "default-src 'self'; img-src 'self' data:; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; " +
    "script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  ...(SECURE ? { "Strict-Transport-Security": "max-age=63072000; includeSubDomains" } : {}),
};

function withHeaders(res, extra = {}) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  // Same-origin only; no cross-origin reads of the API.
  res.setHeader("Access-Control-Allow-Origin", PUBLIC_URL);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, x-csrf-token");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
  for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
}

function json(res, code, body, extra = {}) {
  withHeaders(res, { "content-type": "application/json; charset=utf-8", ...extra });
  res.writeHead(code);
  res.end(JSON.stringify(body));
}

function redirect(res, location, extra = {}) {
  withHeaders(res, { Location: location, ...extra });
  res.writeHead(302);
  res.end();
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

/** A mutation must come from this origin (defence in depth atop SameSite=Lax). */
function sameOrigin(req) {
  const origin = req.headers["origin"];
  if (origin) return origin === PUBLIC_URL;
  const referer = req.headers["referer"];
  return typeof referer === "string" && referer.startsWith(PUBLIC_URL + "/");
}

/**
 * Proxy a request to the internal faucet service (compose network). Best-effort with an
 * AbortController timeout, like events.js: on a network/abort/parse failure it throws, so
 * callers swallow it (.catch) and degrade gracefully. Returns { status, body }.
 */
async function fetchFaucet(path, { method = "GET", body } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const res = await fetch(`${FAUCET_BASE}${path}`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body,
      signal: ctl.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, body: data };
  } finally {
    clearTimeout(timer);
  }
}

// --- static SPA -------------------------------------------------------------

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
};

async function serveStatic(res, pathname) {
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
    // SPA fallback: serve index.html for unknown non-asset routes.
    try {
      const buf = await readFile(join(DIST, "index.html"));
      withHeaders(res, { "content-type": MIME[".html"], "cache-control": "no-cache" });
      res.writeHead(200);
      res.end(buf);
    } catch {
      withHeaders(res, { "content-type": "text/plain" });
      res.writeHead(404);
      res.end("not found (run `pnpm build`)");
    }
  }
}

// --- router -----------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", PUBLIC_URL);
  const path = url.pathname;
  const method = req.method ?? "GET";
  const ip = clientIp(req);

  if (method === "OPTIONS") {
    withHeaders(res);
    res.writeHead(204);
    return res.end();
  }
  if (rateLimited(ip, path.startsWith("/api/") || path.startsWith("/auth/") ? 1 : 0.2)) {
    return json(res, 429, { error: "Too many requests — slow down." });
  }

  const rawSid = rawSidFromReq(req);
  const user = await sessionUser(rawSid); // null when signed out / expired

  // guards ------------------------------------------------------------------
  const requireUser = () => {
    if (!user) {
      json(res, 401, { error: "Not signed in." });
      return false;
    }
    return true;
  };
  const requireRole = (role) => {
    if (!requireUser()) return false;
    if (!hasRole(user, role)) {
      json(res, 403, { error: "You don't have access to that." });
      return false;
    }
    return true;
  };
  /** For mutations: signed in + same-origin + valid CSRF token. */
  const requireMutation = () => {
    if (!requireUser()) return false;
    if (!sameOrigin(req) || !csrfOk(rawSid, req.headers["x-csrf-token"])) {
      json(res, 403, { error: "Bad or missing CSRF token." });
      return false;
    }
    return true;
  };

  try {
    // --- auth: request a magic link ---
    if (method === "POST" && path === "/api/auth/request") {
      const raw = await readBody(req).catch(() => null);
      if (raw === null) return json(res, 413, { error: "payload too large" });
      let email;
      try {
        email = JSON.parse(raw || "{}")?.email;
      } catch {
        return json(res, 400, { error: "invalid json" });
      }
      const issued = await issueMagicToken(email);
      if (issued) {
        // Best-effort send; never reveal success/failure to the client (anti-enum).
        sendMagicLink(issued.email, magicLinkUrl(issued.raw)).catch((e) =>
          console.error("[team-pyrax] magic-link send failed:", e?.message ?? e),
        );
      }
      return json(res, 200, { ok: true, message: "If that address is on the team, a sign-in link is on its way." });
    }

    // --- auth: consume the magic link (top-level navigation from the email) ---
    if (method === "GET" && path === "/auth/callback") {
      const u = await consumeMagicToken(url.searchParams.get("token") ?? "");
      if (!u) return redirect(res, "/?error=link");
      const sid = await startSession(u.id);
      // Record the login as a gas-only on-chain event (fire-and-forget; never blocks
      // or fails the login). The relayer puts only the event TYPE + timestamp on chain.
      emitEvent("team-login");
      return redirect(res, "/", { "Set-Cookie": sessionCookie(sid) });
    }

    // --- auth: sign out ---
    if (method === "POST" && path === "/api/auth/logout") {
      await endSession(rawSid);
      return json(res, 200, { ok: true }, { "Set-Cookie": clearCookie() });
    }

    // --- who am I + my modules + CSRF token ---
    if (method === "GET" && path === "/api/me") {
      if (!user) return json(res, 200, { user: null });
      const modules = MODULES.filter((m) => hasRole(user, m.role));
      return json(res, 200, {
        user: { email: user.email, roles: user.roles, isSuperuser: user.isSuperuser, lastLogin: user.lastLogin },
        modules,
        csrf: csrfToken(rawSid),
      });
    }

    // --- downloads ---
    if (method === "GET" && path === "/api/downloads") {
      if (!requireRole(ROLES.DOWNLOADS)) return;
      return json(res, 200, { products: await catalogue() });
    }
    {
      const m = /^\/api\/downloads\/([a-z0-9-]{1,32})\/(win|mac|linux)$/.exec(path);
      if (method === "GET" && m) {
        if (!requireRole(ROLES.DOWNLOADS)) return;
        const dl = await downloadUrl(m[1], m[2]);
        if (!dl) return json(res, 404, { error: "No build available for that platform yet." });
        return redirect(res, dl, { "cache-control": "no-store" });
      }
    }

    // --- user management ---
    if (path === "/api/admin/users" && method === "GET") {
      if (!requireRole(ROLES.USER_ADMIN)) return;
      const r = await listUsers(user);
      return json(res, r.status, r.body);
    }
    if (path === "/api/admin/users" && method === "POST") {
      if (!requireRole(ROLES.USER_ADMIN) || !requireMutation()) return;
      const body = JSON.parse((await readBody(req).catch(() => "{}")) || "{}");
      const r = await addUser(user, body);
      return json(res, r.status, r.body);
    }
    {
      const mr = /^\/api\/admin\/users\/(\d+)\/roles$/.exec(path);
      if (mr && method === "POST") {
        if (!requireRole(ROLES.USER_ADMIN) || !requireMutation()) return;
        const body = JSON.parse((await readBody(req).catch(() => "{}")) || "{}");
        const r = await setRoles(user, mr[1], body);
        return json(res, r.status, r.body);
      }
      const md = /^\/api\/admin\/users\/(\d+)\/delete$/.exec(path);
      if (md && method === "POST") {
        if (!requireRole(ROLES.USER_ADMIN) || !requireMutation()) return;
        const r = await removeUser(user, md[1]);
        return json(res, r.status, r.body);
      }
    }

    // --- faucet (open to ALL signed-in users; not role-gated) ---
    if (method === "GET" && path === "/api/faucet/networks") {
      if (!requireUser()) return;
      const nets = await fetchFaucet("/networks").catch(() => null);
      return json(res, 200, Array.isArray(nets?.body) ? nets.body : []);
    }
    if (method === "POST" && path === "/api/faucet/drip") {
      if (!requireMutation()) return; // signed in + same-origin + CSRF
      const raw = (await readBody(req).catch(() => "{}")) || "{}";
      let payload;
      try {
        const b = JSON.parse(raw);
        payload = { address: b.address, chainId: b.chainId };
      } catch {
        return json(res, 400, { error: "invalid json" });
      }
      const r = await fetchFaucet("/drip", { method: "POST", body: JSON.stringify(payload) }).catch(() => null);
      if (!r) return json(res, 502, { error: "Faucet is unreachable. Try again shortly." });
      return json(res, r.status, r.body);
    }

    if (path === "/api/health") {
      return json(res, 200, { ok: true, brevo: !!BREVO_API_KEY });
    }
    if (path.startsWith("/api/")) return json(res, 404, { error: "not found" });

    // everything else → the SPA
    if (method === "GET") return serveStatic(res, path);
    return json(res, 405, { error: "method not allowed" });
  } catch (e) {
    console.error("[team-pyrax] handler error:", e?.message ?? e);
    return json(res, 500, { error: "internal error" });
  }
});

if (RUN_DIRECTLY) {
  if (SESSION_SECRET_IS_EPHEMERAL) {
    console.warn("[team-pyrax] WARNING: SESSION_SECRET unset — using an ephemeral key. Sessions + pending links reset on restart. Set it in production.");
  }
  // periodic cleanup of expired tokens + sessions
  setInterval(() => {
    Tokens.sweep().catch(() => {});
    Sessions.sweep().catch(() => {});
  }, 5 * 60 * 1000).unref();
  // Create the schema + seed the superuser, THEN start serving.
  initDb()
    .then(() => server.listen(PORT, () => console.log(`team-pyrax on http://0.0.0.0:${PORT} (origin ${PUBLIC_URL})`)))
    .catch((e) => {
      console.error("[team-pyrax] failed to initialize the database:", e?.message ?? e);
      process.exit(1);
    });
}

export { server };
