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
import { createHmac, createHash, timingSafeEqual, createPrivateKey, sign } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TunnelHub, nodeIdFromHost } from "./protocol.mjs";
import { acceptUpgrade } from "./ws.mjs";

// package version (for /healthz) — best-effort, never fatal.
let PKG_VERSION = "0.0.0";
try {
  PKG_VERSION = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "package.json"), "utf8")).version || PKG_VERSION;
} catch {
  /* keep the fallback */
}

// ── NEURAX Sentinel reporter (server-side operated service) ───────────────────
// This relay runs on the websites droplet (the secret stays on the server), so it uses
// the server ingest path: POST ${SENTINEL_INGEST_URL}/api/errors with a Bearer
// NOVA_AGENT_SECRET. It is FAIL-OPEN: telemetry is best-effort — any throw is swallowed,
// bounded by a timeout, fire-and-forget; a non-200/network error is at most logged
// locally and NEVER surfaced. If the secret/URL is unset it is a silent no-op.
//
// AGGREGATE ONLY: this relay brokers third-party operators' nodes, so a report must NEVER
// carry a per-node id or a peer/operator address. Reports describe the relay's OWN
// failures (registry persist, OTA feed) with aggregate counts only.
const SENTINEL_INGEST_URL = (process.env.SENTINEL_INGEST_URL ?? "https://status.pyraxchain.com").replace(/\/+$/, "");
const NOVA_AGENT_SECRET = process.env.NOVA_AGENT_SECRET ?? "";
// At most one report per unique signature per this window, carrying an occurrence count
// so a burst/loop collapses to a single report. Overridable for tests.
const REPORT_THROTTLE_MS = Number(process.env.PYRAX_REPORT_THROTTLE_MS) || 15 * 60 * 1000;
const REPORT_TIMEOUT_MS = 10_000;

/** Scrub anything sensitive from a message BEFORE it leaves the box. Conservative +
 *  value-targeted: bearer/secret values, bare private-key-like hex, and OS-username
 *  filesystem paths. Aggregate reports shouldn't contain these, but this is the
 *  belt-and-braces so a stray `err.message` (e.g. a failed fetch URL or a write path)
 *  can never leak. */
function redact(line) {
  const s = String(line ?? "");
  const KEYS =
    "pass(?:word|phrase)|secret|mnemonic|private[\\s_-]?key|priv[\\s_-]?key|" +
    "api[\\s_-]?key|access[\\s_-]?token|refresh[\\s_-]?token|auth(?:orization)?|bearer|cookie|x-api-key";
  return s
    .replace(/\b(Bearer|Basic|Digest)\s+[A-Za-z0-9._~+/=-]{4,}/gi, (_m, scheme) => `${scheme} …redacted…`)
    .replace(new RegExp(`("?\\b(?:${KEYS})\\b"?\\s*[:=]\\s*)"[^"]*"`, "gi"), (_m, lead) => `${lead}"…redacted…"`)
    .replace(new RegExp(`("?\\b(?:${KEYS})\\b"?\\s*[:=]\\s*)[^\\s",}]+`, "gi"), (_m, lead) => `${lead}…redacted…`)
    .replace(/(^|[^0xX0-9a-fA-F])([0-9a-fA-F]{64,})\b/g, (_m, pre) => `${pre}…redacted…`)
    .replace(/([A-Za-z]:\\Users\\)[^\\/:*?"<>|\r\n]+/g, "$1…")
    .replace(/(\/(?:home|Users)\/)[^/\s:]+/g, "$1…")
    .slice(0, 4000);
}

// Caller-side dedupe/throttle: signature → last-sent timestamp + accrued count.
const reportState = new Map();

/** Fire-and-forget a Sentinel report. FAIL-OPEN — never throws, never awaited on a hot
 *  path, silent no-op when the secret is unset. `sig` collapses a burst of the same
 *  failure into one report per window (carrying `×count`). */
function reportSentinel(sig, title, detail, level = "error") {
  try {
    if (!NOVA_AGENT_SECRET) return; // reporter disabled — run normally
    const now = Date.now();
    const st = reportState.get(sig);
    if (st) {
      st.count += 1;
      if (now - st.sentAt < REPORT_THROTTLE_MS) return; // within window — just accrue
    }
    const count = st ? st.count : 1;
    reportState.set(sig, { sentAt: now, count: 0 }); // reset the window; accrue future repeats
    const body = JSON.stringify({
      source: "tunnel-relay",
      title: redact(String(title)).slice(0, 200),
      detail: `${redact(String(detail))}${count > 1 ? `\n\n(×${count} since last report)` : ""}`,
      level: level === "warn" || level === "info" ? level : "error",
    });
    // Fire-and-forget: do NOT await. Any throw (network/timeout/abort) is swallowed.
    void fetch(`${SENTINEL_INGEST_URL}/api/errors`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${NOVA_AGENT_SECRET}` },
      body,
      signal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
    }).catch(() => {
      /* best-effort telemetry — never surface a reporting failure */
    });
  } catch {
    /* the reporter itself must never break the caller */
  }
}

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
// id → live + persisted node record. `hub` is live (in-memory); the rest — INCLUDING the
// per-node registration `key` — is persisted, so a kill survives a relay restart AND the
// first-seen key survives too. Persisting the key is a SECURITY invariant, not a
// convenience: if the key were reset to null on every restart (as it once was), each
// restart would re-open the trust-on-first-use window for EVERY subdomain at once, letting
// anyone who computes a victim's public id = SHA-256(peerId).slice(0,12) register first and
// hijack that node's `<id>.nodes.pyraxchain.com` (credential capture / phishing under the
// owner's trusted URL). By persisting the key, a subdomain is bound to its first-seen key
// for the record's lifetime and a restart cannot silently re-bind it.
const nodes = new Map();
let networkVersion = ""; // current network node release (from the OTA feed)

// Hard cap on the number of tracked node records. `register` mints an in-memory record for
// any never-seen id (see finding M15), so without a cap an attacker who floods distinct ids
// would grow the Map + registry.json without bound. Well above any realistic node count.
const MAX_NODES = Number(process.env.PYRAX_TUNNEL_MAX_NODES) || 50_000;
// Evict an unauthenticated, disconnected, non-killed record (no bound key) that has not been
// seen within this short TTL, so transient/never-authenticated ids don't accumulate.
const STALE_TTL_MS = Number(process.env.PYRAX_TUNNEL_STALE_TTL_MS) || 7 * 24 * 3600 * 1000;
// A key-bound but disconnected, non-killed record is a claimed subdomain. It is retained far
// longer (a real node may just be offline), but a GENUINELY ABANDONED claim is reclaimed
// after this long TTL so a squatter/attacker cannot permanently pin the registry at
// MAX_NODES with key-bound records that never reconnect. Killed records are always kept.
const ABANDONED_TTL_MS = Number(process.env.PYRAX_TUNNEL_ABANDONED_TTL_MS) || 30 * 24 * 3600 * 1000;

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

// ── persistence (per-node key + killed flag + last-known meta) ────────────────
// persist() writes the ENTIRE registry, so calling it on every connection is O(N) write
// amplification (finding M15). It is instead COALESCED: callers request a write via
// schedulePersist() and a short debounce collapses a burst (e.g. a reconnect storm) into
// one write. persistNow() is the synchronous flush used on the security-critical paths
// (kill/unkill) where the write must not be lost if the process dies immediately after.
let persistTimer = null;
function schedulePersist() {
  if (persistTimer) return; // a write is already queued
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistNow();
  }, 1000);
  persistTimer.unref?.();
}
function persistNow() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  const out = {};
  for (const [id, e] of nodes) {
    // Persist a record only if it MATTERS across restarts: it is killed, OR it has a bound
    // key (a real node claimed this subdomain — the binding MUST survive so a restart can't
    // re-open it to a squatter). Purely-transient ids (an attacker's fresh, never-
    // authenticated register that carries no key and isn't killed) are NOT persisted, so a
    // flood of distinct ids can never bloat registry.json.
    if (!e.killed && e.key === null) continue;
    out[id] = {
      key: e.key, // SECURITY: persisted so a restart cannot reset it to null + re-open TOFU
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
    const msg = err?.message ?? String(err);
    console.error("registry persist failed", msg);
    // A failing registry write means kills/versions/keys won't survive a restart — worth an
    // aggregate alert. Signature is on the error CODE (not the volatile message) so a
    // repeated failure collapses into one throttled report. No node ids leak — the path
    // is scrubbed by redact() and the count of nodes is aggregate.
    reportSentinel(
      `persist:${err?.code ?? "err"}`,
      "tunnel-relay registry persist failed",
      `writeFileSync(${STATE_FILE}) failed for ${nodes.size} node(s): ${msg}`,
      "error",
    );
  }
}
function loadState() {
  try {
    const saved = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    for (const [id, r] of Object.entries(saved)) {
      if (!/^[0-9a-f]{4,64}$/.test(id)) continue;
      const e = entry(id);
      // Restore the first-seen key so the subdomain stays bound across the restart. Accept
      // only a well-formed key; anything else stays null (the node will re-bind on next
      // register). This is the core of the H10 fix: a restart no longer wipes every key.
      const k = typeof r.key === "string" && /^[0-9a-f]{16,128}$/.test(r.key) ? r.key : null;
      e.key = k;
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

/** Sweep records the registry no longer needs so it can't grow without bound (M15):
 *   • a killed record is ALWAYS kept (the kill must survive),
 *   • a record with a LIVE agent is always kept,
 *   • a keyless, never-authenticated, disconnected record is dropped after STALE_TTL_MS,
 *   • a key-bound but disconnected record (a claimed subdomain) is kept until
 *     ABANDONED_TTL_MS with no contact, then reclaimed so a squatter can't permanently pin
 *     a slot. A live/recent node keeps its binding well within that window. */
function sweepStaleNodes() {
  const now = Date.now();
  for (const [id, e] of nodes) {
    if (e.killed) continue; // a kill must survive
    if (e.hub.hasAgent()) continue; // live connection — keep
    const idle = now - (e.lastSeen || 0);
    if (e.key === null) {
      if (idle > STALE_TTL_MS) nodes.delete(id);
    } else if (idle > ABANDONED_TTL_MS) {
      nodes.delete(id);
    }
  }
}

function onAgentChange(id, up) {
  const e = nodes.get(id);
  if (e) e.lastSeen = Date.now();
  console.log(`node ${id}: tunnel ${up ? "UP" : "down"}`);
}

// ── network current version (OTA feed) ────────────────────────────────────────
// Only report the OTA feed as broken after it fails REPEATEDLY (a single blip is normal
// and self-heals on the next 5-min refresh). Consecutive failures are counted; a success
// resets the counter.
const OTA_FAIL_REPORT_AFTER = 3;
let otaConsecutiveFails = 0;
async function refreshNetworkVersion() {
  try {
    const res = await fetch(OTA_LATEST_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const m = text.match(/^version:\s*([0-9][0-9A-Za-z.\-+]*)/m);
    if (m) networkVersion = m[1].trim();
    otaConsecutiveFails = 0; // recovered
  } catch (err) {
    // feed unreachable — keep the last known value; alert only on repeated failure.
    otaConsecutiveFails += 1;
    if (otaConsecutiveFails >= OTA_FAIL_REPORT_AFTER) {
      reportSentinel(
        "ota-feed",
        "tunnel-relay OTA feed fetch failing",
        `OTA latest feed unreachable ${otaConsecutiveFails}× consecutively (${OTA_LATEST_URL}); ` +
          `last error: ${err?.message ?? String(err)}. Version-gated auto-un-kill is using the last known network version "${networkVersion || "(none)"}".`,
        "warn",
      );
    }
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
    persistNow(); // kill-state change must survive an immediate crash
    console.log(`node ${id}: auto-un-killed (version ${e.nodeVersion} == network ${networkVersion})`);
  } else {
    e.hub.kill?.();
    sendKill(id, e); // hard re-kill: still outdated on reconnect — signed
    console.log(`node ${id}: re-killed on connect (version ${e.nodeVersion || "?"} != network ${networkVersion || "?"})`);
  }
}

// ── node-control signer (ed25519; the team fleet kill switch) ─────────────────
// The PRIVATE half of the node-control key. The app bakes the PUBLIC half and verifies EVERY
// kill/softkill/unkill against it (fail-closed), so a signature from this relay is the ONLY way to
// control a node — a bare {t:"kill"} frame is rejected. Base64 PKCS8 DER, provisioned via the deploy.
// Unset ⇒ signing disabled (the admin control plane refuses to act rather than send an unsigned frame).
const NODE_CONTROL_PRIV_B64 = process.env.PYRAX_NODE_CONTROL_PRIVATE_KEY ?? "";
let nodeControlPriv = null;
try {
  if (NODE_CONTROL_PRIV_B64) nodeControlPriv = createPrivateKey({ key: Buffer.from(NODE_CONTROL_PRIV_B64, "base64"), format: "der", type: "pkcs8" });
} catch {
  nodeControlPriv = null; // an unparseable key ⇒ signing disabled
}
const NODE_CONTROL_TTL_MS = 4 * 60 * 1000; // < the app's 5-min max; a fresh, short-lived signature per command

/** Sign the canonical message the app verifies: `PYRAX_NODE_CONTROL\n{verb}\n{sub}\n{sub}\n{exp}`.
 *  `sub` is the node's subdomain (its map key here) — the identity the app binds the command to.
 *  Returns { exp, sig(base64) } or null when no signing key is configured. */
function signControl(verb, sub) {
  if (!nodeControlPriv) return null;
  const exp = Date.now() + NODE_CONTROL_TTL_MS;
  const sig = sign(null, Buffer.from(`PYRAX_NODE_CONTROL\n${verb}\n${sub}\n${sub}\n${exp}`, "utf8"), nodeControlPriv).toString("base64");
  return { exp, sig };
}

/** Push a SIGNED node-control command down the node's live agent WS. `id` is the node's subdomain.
 *  `verb`: "kill" (hard — persisted + version-gated), "softkill" (stop; owner may restart), "unkill".
 *  Returns false (and sends nothing) when the signing key is unset — the caller then refuses the op. */
function sendKill(id, e, verb = "kill") {
  const signed = signControl(verb, id);
  if (!signed) {
    console.warn(`node ${id}: ${verb} NOT sent — PYRAX_NODE_CONTROL_PRIVATE_KEY unset (signing disabled)`);
    return false;
  }
  e.hub.sendControl?.({ t: verb, exp: signed.exp, sig: signed.sig });
  return true;
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

  // Health probe (container HEALTHCHECK + droplet monitor). ALWAYS 200 while the process
  // is up; dependency health is a NON-FATAL field, never a non-200. Answered before the
  // node-subdomain routing so it works on the base host / container port regardless of
  // the Host header. AGGREGATE ONLY — connected-node COUNT, never per-node ids.
  if (req.method === "GET" && url.pathname === "/healthz") {
    let connected = 0;
    for (const e of nodes.values()) if (e.hub.hasAgent()) connected += 1;
    res
      .writeHead(200, { "content-type": "application/json", "cache-control": "no-store" })
      .end(JSON.stringify({ ok: true, version: PKG_VERSION, connectedNodes: connected, networkVersion: networkVersion || "unconfigured", ts: Date.now() }));
    return;
  }

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
      let opts = {};
      try { opts = body ? JSON.parse(body) : {}; } catch { opts = {}; }
      if (action === "kill") {
        // `{ soft: true }` ⇒ SOFT kill: stop the node now, but the owner may restart it — do NOT persist
        // the kill flag (so it is not re-killed on reconnect, and the registry shows it as not killed).
        if (opts.soft === true) {
          if (!sendKill(id, e, "softkill")) { res.writeHead(503, { "content-type": "application/json" }).end(JSON.stringify({ error: "node-control signing key unset" })); return; }
          console.log(`ADMIN softkill: ${id}`);
        } else {
          e.killed = true;
          if (!sendKill(id, e, "kill")) { e.killed = false; res.writeHead(503, { "content-type": "application/json" }).end(JSON.stringify({ error: "node-control signing key unset" })); return; }
          console.log(`ADMIN kill: ${id}`);
        }
      } else {
        e.killed = false;
        const signed = signControl("unkill", id);
        if (signed) e.hub.sendControl?.({ t: "unkill", exp: signed.exp, sig: signed.sig });
        console.log(`ADMIN unkill: ${id}`);
      }
      persistNow(); // an admin kill/unkill must survive an immediate crash
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, id, killed: e.killed, soft: action === "kill" && opts.soft === true }));
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
    // Capacity guard (M15): if this id has never been seen AND we are already tracking the
    // maximum number of records, refuse rather than mint a brand-new record — a flood of
    // distinct fresh ids can otherwise grow the Map + registry.json without bound. A
    // previously-seen id (already in the Map, e.g. a real node reconnecting) is unaffected.
    if (!nodes.has(id) && nodes.size >= MAX_NODES) {
      sweepStaleNodes(); // try to reclaim room from stale, keyless, disconnected ids first
      if (nodes.size >= MAX_NODES) {
        socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
        socket.destroy();
        return;
      }
    }
    const e = entry(id);
    // Key binding (H10). The per-node key is bound ON FIRST SIGHT and is then IMMUTABLE for
    // the record's lifetime — a mismatching key is rejected. Because the key is now PERSISTED
    // (see persistNow) and restored on boot, a relay restart no longer resets it to null, so
    // the trust-on-first-use window is opened exactly once (at genuine first contact) rather
    // than re-opened for every subdomain on every restart. A squatter therefore cannot
    // re-bind a subdomain that a real node has already claimed, even across a relay restart.
    if (e.key === null) {
      e.key = key;
      // A key was just bound to this record — persist the binding SYNCHRONOUSLY (not
      // coalesced) so a crash in the debounce window can't lose it and re-open the subdomain
      // to a squatter. This is the security-critical write; routine meta/reconnect writes
      // below stay coalesced.
      persistNow();
    } else if (e.key !== key) {
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
            schedulePersist(); // coalesced meta write (M15: no O(N) rewrite per hello)
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
    schedulePersist(); // coalesced (M15): a reconnect storm collapses to one write
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

// Periodically evict stale, keyless, disconnected records (M15) so a flood of transient
// register ids can't leave the registry permanently bloated. If the sweep removed anything,
// coalesce a persist so the on-disk file shrinks too.
setInterval(() => {
  const before = nodes.size;
  sweepStaleNodes();
  if (nodes.size !== before) schedulePersist();
}, 60 * 60 * 1000).unref?.();

// `node relay.mjs --check` — a lightweight self-test for CI / container build: the module
// loaded cleanly (all imports resolve), the health payload assembles, and the reporter is
// wired. Prints a one-line status and exits WITHOUT binding the port or starting timers.
if (process.argv.includes("--check")) {
  const health = { ok: true, version: PKG_VERSION, connectedNodes: 0, networkVersion: networkVersion || "unconfigured", ts: Date.now() };
  console.log(`pyrax-tunnel-relay --check OK (v${PKG_VERSION}); sentinel=${NOVA_AGENT_SECRET ? "on" : "off"}; health=${JSON.stringify(health)}`);
  process.exit(0);
}

loadState();
server.listen(PORT, () => {
  console.log(`pyrax-tunnel-relay listening on :${PORT}`);
  console.log(`  register: wss://nodes.pyraxchain.com/__tunnel/register?id=&key=`);
  console.log(`  admin:    /__admin/nodes  (HMAC${ADMIN_SECRET ? "" : " — DISABLED: set PYRAX_TUNNEL_ADMIN_SECRET"})`);
  console.log(`  health:   GET /healthz  (200 while up)`);
  console.log(`  sentinel: ${NOVA_AGENT_SECRET ? `ON → ${SENTINEL_INGEST_URL}/api/errors` : "OFF (set NOVA_AGENT_SECRET to enable crash telemetry)"}`);
});
