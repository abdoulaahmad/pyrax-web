// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// PYRAX public test-token faucet. A tiny dependency-free Node HTTP server that
// dispenses a fixed drip of test PYRX to a submitted address on the active dev
// network, rate-limited per-address AND per-IP. It signs/sends by shelling out to
// the bundled `pyrax` CLI (the faucet's own keystore key), so there is no tx code
// to reimplement. Public networks only — never wired to mainnet.
//
// Env:
//   FAUCET_RPC          the default-network RPC to dispense on (chain 881109)
//   FAUCET_DRIP_ASH     drip amount in base units (ash). default 100 PYRX = 100e18
//   FAUCET_WELCOME_ASH  one-time new-wallet welcome grant in ash. default 1,000,000 PYRX
//   FAUCET_WINDOW_H     per-address/IP cooldown hours. default 12
//   FAUCET_NETWORK      label shown in the public HTML UI (e.g. "Pyrax Seed Network")
//   PYRAX_KEY_PASSPHRASE  unlocks the faucet keystore key (name: "faucet")
//   PORT                listen port (default 8800)
//
// Endpoints:
//   POST /drip     repeatable public faucet — FAUCET_DRIP_ASH per address, FAUCET_WINDOW_H cooldown.
//   POST /welcome  ONE-TIME new-wallet grant — FAUCET_WELCOME_ASH, Pyrax Seed Network (881109) ONLY,
//                  once per address for life. Called automatically by the apps/CLI/web on wallet creation.

import http from "node:http";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";

const RPC = process.env.FAUCET_RPC || "";
// Keystore key NAME the faucet signs Seed (881109) txs with. Its address is the
// genesis-funded, CONTROLLED Seed faucet/genesis-public wallet
// (0xd175f99de68ba0bc017ba85e507e0f3798e98863, ~1 T at genesis + all coinbase). The deploy
// imports the secret SEED_FAUCET_KEY (root .env vault) into the CLI keystore under this
// name (the public Anvil #2 key it replaced is gone).
const KEY = process.env.FAUCET_KEY || "seed-faucet";
// Keystore key NAME the faucet signs Forge (710823) txs with. Its address is the
// genesis-funded, CONTROLLED Forge welcome-faucet wallet
// (0x4904bf39e97d804275c6ab26bbe681e955d4101c, 100 M carved from the Ecosystem pool at
// genesis). The deploy imports the secret FORGE_FAUCET_KEY (root .env vault) into the CLI
// keystore under this name. Signing keys are PER-NETWORK — a chain's welcome grant is
// sealed by that chain's own genesis-funded wallet.
const KEY_710823 = process.env.FAUCET_KEY_710823 || "forge-faucet";
const DRIP = (process.env.FAUCET_DRIP_ASH || "100000000000000000000").trim(); // 100 PYRX
// One-time new-wallet welcome grant. 1,000,000 PYRX = 1e6 * 1e18 ash. Pyrax Seed Network
// only (play money on the simulated chain), once per address — see POST /welcome.
const WELCOME = (process.env.FAUCET_WELCOME_ASH || "1000000000000000000000000").trim();
// Generous per-IP cap on NEW welcome grants per hour — a safety net against a single host
// scripting fresh addresses to drain the shared faucet key (which also funds /drip + the
// synthetic-tx job). Far above any legitimate use (a user creating a handful of wallets);
// set FAUCET_WELCOME_IP_PER_H=0 to disable. Already-funded addresses don't count (they
// return early), and unlike /drip the welcome grant is called per-user-device, not via the
// shared portal IP, so an IP key is safe here.
const WELCOME_IP_PER_H = Number(process.env.FAUCET_WELCOME_IP_PER_H || 60);
// Per-caller anti-automation cap on the repeatable /drip endpoint (finding M17). /drip is
// address-scoped only, so scripting fresh 0x addresses (each never-funded, so each passes
// the per-address cooldown) could otherwise drain up to the global ceiling to attacker
// wallets. This bounds NEW drips per source IP per hour so one host can't script that drain,
// giving the per-attacker granularity the address cooldown alone lacks. It relies on the
// trusted client IP (clientIp(), which reads the RIGHTMOST proxy-appended XFF only when
// TRUST_PROXY is on — a client-spoofed leftmost hop can never be used as identity). Generous
// vs. any legitimate use (a developer topping up a handful of addresses); set
// FAUCET_DRIP_IP_PER_H=0 to disable. Successful drips only — a rejected drip never consumes
// budget. A drip that also cleared a PoW challenge (see below) is exempt from this cap.
const DRIP_IP_PER_H = Number(process.env.FAUCET_DRIP_IP_PER_H || 20);
// Optional hashcash-style proof-of-work gate for /drip. When FAUCET_DRIP_POW_BITS > 0 the
// browser must first GET /drip/challenge and submit a `pow:{challenge,nonce}` whose
// sha256(challenge:nonce) has >= this many leading zero bits. This raises the per-request
// COST of scripting fresh-address drains without a CAPTCHA, and a valid PoW also exempts the
// request from the per-IP cap (so a genuine user behind a shared portal IP is never blocked).
// Off by default (0) so existing programmatic callers are unaffected; operators enable it if
// the faucet is being scripted. Kept small (a few bits) — enough to deter bulk automation,
// cheap for one legitimate request.
const DRIP_POW_BITS = Math.max(0, Math.min(24, Number(process.env.FAUCET_DRIP_POW_BITS || 0)));
const WINDOW_MS = Number(process.env.FAUCET_WINDOW_H || 12) * 3600 * 1000;
const NETWORK = process.env.FAUCET_NETWORK || "the test network";
const PORT = Number(process.env.PORT || 8800);
const STATE = "/data/faucet-ratelimit.json";
const WELCOME_STATE = "/data/faucet-welcomed.json";

// Dispensable networks (SSOT). Mainnet (563821) is intentionally EXCLUDED — the
// faucet is NEVER wired to mainnet. Add a chain by adding one line here; `online`
// is derived from a non-empty rpc, so a chain with no write node yet still shows
// in the selector but is greyed/disabled. Each entry carries the keystore key NAME the
// faucet signs THAT chain's txs with (per-network genesis-funded wallets).
const DEFAULT_CHAIN = 881109;
const NETWORKS = {
  881109: { label: "Pyrax Seed Network", rpc: RPC || "http://node:8545", key: KEY },
  710823: { label: "Pyrax Forge Network", rpc: process.env.FAUCET_RPC_710823 || "", key: KEY_710823 },
  104928: { label: "Pyrax Rise Network", rpc: process.env.FAUCET_RPC_104928 || "", key: KEY },
};
// Chains eligible for the ONE-TIME new-wallet WELCOME grant (POST /welcome): Seed (the
// simulation) and Forge (closed-alpha). Each seals from its OWN genesis-funded welcome-
// faucet wallet. Rise/mainnet are intentionally excluded — they use the repeatable /drip
// faucet only. The grant is once per (chain, address) for life, enforced server-side.
const WELCOME_CHAINS = new Set([881109, 710823]);

const to_pyrx = (ash) => {
  try {
    return (BigInt(ash) / 10n ** 18n).toString();
  } catch {
    return "?";
  }
};
const drip_pyrx = to_pyrx(DRIP);
const welcome_pyrx = to_pyrx(WELCOME);

// --- Sentinel crash telemetry (fail-open, server-side operated) ------------------
// The faucet is a SERVER-side operated service (its secret stays on the droplet), so it
// reports operationally important failures to NOVA/Sentinel via the AGENT ingest path:
//   POST ${SENTINEL_INGEST_URL}/api/errors   authorization: Bearer ${NOVA_AGENT_SECRET}
// This is best-effort observability ONLY — it is FAIL-OPEN: if the secret/URL is unset the
// reporter is a silent no-op, and any error while reporting is swallowed and NEVER surfaced
// to a faucet caller or allowed to break dispensing. We report the drain-signal failures a
// human operator actually needs to see: CLI send failures (drip 502 paths), the shielded
// pre-shield-depleted path, synthetic-tx failures, and a warn when the global abuse ceiling
// is hit. Benign 4xx (bad address, cooldown, unknown network) are NOT reported.
const SENTINEL_BASE = (process.env.SENTINEL_INGEST_URL || "https://status.pyraxchain.com").replace(/\/+$/, "");
const SENTINEL_SECRET = process.env.NOVA_AGENT_SECRET || "";
const SENTINEL_URL = `${SENTINEL_BASE}/api/errors`;
const SENTINEL_ON = !!SENTINEL_SECRET; // no-op until the agent secret is configured
const SENTINEL_VERSION = process.env.FAUCET_VERSION || "faucet-1";
const DROPLET = process.env.DROPLET_HOST || process.env.HOSTNAME || "";
// Caller-side dedupe/throttle: at most one report per unique signature per window, carrying
// an occurrence count so a send-failure loop is ONE report ("×217"), not a flood.
const SENTINEL_THROTTLE_MS = Number(process.env.SENTINEL_THROTTLE_MS) || 15 * 60 * 1000;
const sentinelSeen = new Map(); // signature -> { count, resetAt }

/** Privacy scrub — the same value-targeted approach the desktop apps' redact() uses. The CLI
 *  output we forward as `detail` can contain an RPC URL, the operator address, or a path with
 *  an OS username; strip secrets, bearer tokens, home-dir usernames, and bare private-key-like
 *  hex, while leaving 0x-prefixed hashes/addresses readable for debugging. When in doubt, omit. */
function redact(line) {
  if (typeof line !== "string") return "";
  const KEYS =
    "pass(?:word|phrase)|secret|mnemonic|seed[\\s_-]?phrase|private[\\s_-]?key|priv[\\s_-]?key|" +
    "api[\\s_-]?key|access[\\s_-]?token|refresh[\\s_-]?token|auth(?:orization)?|bearer|cookie|x-api-key";
  return line
    .replace(/\b(Bearer|Basic|Digest)\s+[A-Za-z0-9._~+/=-]{4,}/gi, (_m, scheme) => `${scheme} …redacted…`)
    .replace(new RegExp(`("?\\b(?:${KEYS})\\b"?\\s*[:=]\\s*)"[^"]*"`, "gi"), (_m, lead) => `${lead}"…redacted…"`)
    .replace(new RegExp(`("?\\b(?:${KEYS})\\b"?\\s*[:=]\\s*)[^\\s",}]+`, "gi"), (_m, lead) => `${lead}…redacted…`)
    .replace(/(^|[^0xX0-9a-fA-F])([0-9a-fA-F]{64,})\b/g, (_m, pre) => `${pre}…redacted…`)
    .replace(/([A-Za-z]:\\Users\\)[^\\/:*?"<>|\r\n]+/g, "$1…")
    .replace(/(\/(?:home|Users)\/)[^/\s:]+/g, "$1…");
}

/** Collapse volatile bits (numbers, hex, hashes) so the SAME failure with different ids
 *  dedupes to one signature for the throttle window. */
function sentinelSig(title) {
  return String(title)
    .replace(/0x[0-9a-fA-F]+/g, "0x…")
    .replace(/\b[0-9a-fA-F]{16,}\b/g, "…")
    .replace(/\d+/g, "#")
    .slice(0, 200);
}

/** Fire-and-forget a report to Sentinel. FAIL-OPEN: never awaited on a hot path, every throw
 *  swallowed, bounded by a 10s timeout, deduped/throttled per signature. `title` is a stable
 *  <=200-char summary; `detail` is the full (redacted) CLI output/context. `level` is
 *  "error" | "warn" | "info". Returns nothing and never rejects. */
function reportToSentinel(source, title, detail, level = "error") {
  try {
    if (!SENTINEL_ON) return; // fail-open no-op until NOVA_AGENT_SECRET is set
    const sig = `${source}|${level}|${sentinelSig(title)}`;
    const now = Date.now();
    const e = sentinelSeen.get(sig);
    if (e && now < e.resetAt) {
      // A window is already open for this signature — accrue the repeat count only; the open
      // window's report already went out, so a crash loop stays ONE report, never a flood.
      e.count += 1;
      return;
    }
    const count = e ? e.count + 1 : 1;
    sentinelSeen.set(sig, { count: 0, resetAt: now + SENTINEL_THROTTLE_MS });
    // Opportunistically prune expired signatures so the map can't grow unbounded.
    if (sentinelSeen.size > 5000) {
      for (const [k, v] of sentinelSeen) if (now >= v.resetAt) sentinelSeen.delete(k);
    }
    const safeTitle = redact(String(title)).slice(0, 180);
    const occ = count > 1 ? ` (×${count})` : "";
    const body = JSON.stringify({
      source,
      title: `${safeTitle}${occ}`.slice(0, 200),
      detail: redact(String(detail || "")).slice(0, 8000),
      level,
      ...(DROPLET ? { droplet: DROPLET } : {}),
    });
    // Fire-and-forget: do NOT await. Swallow every rejection (best-effort telemetry).
    fetch(SENTINEL_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SENTINEL_SECRET}` },
      body,
      signal: AbortSignal.timeout(10_000),
    }).catch(() => {
      /* best-effort — a non-200/network error is never surfaced or rethrown */
    });
  } catch {
    /* reporting must NEVER break the faucet — swallow everything */
  }
}

/** Drain signal: the GLOBAL hourly dispense ceiling was hit — the faucet is refusing new
 *  grants until the window resets. That is an ABUSE/drain condition an operator wants to see
 *  (someone is scripting the faucet, or the key is being drained), so emit a level:"warn"
 *  report. Deduped/throttled by reportToSentinel, so a sustained flood is one warn per window. */
function reportGlobalCeiling(endpoint, netLabel) {
  reportToSentinel(
    "faucet",
    `global dispense ceiling reached (${GLOBAL_MAX_PER_H}/h) — refusing grants`,
    `The faucet hit its global hourly cap of ${GLOBAL_MAX_PER_H} grants and is returning 503 ` +
      `until the window resets. Triggering endpoint=${endpoint} network=${netLabel}. This is a ` +
      `drain/abuse backstop — verify the operator key isn't being scripted.`,
    "warn",
  );
}

/** Persisted cooldown map: key (address|ip) -> last drip epoch ms. */
function loadHits() {
  try {
    return new Map(Object.entries(JSON.parse(readFileSync(STATE, "utf8"))));
  } catch {
    return new Map();
  }
}
function saveHits(hits) {
  try {
    mkdirSync("/data", { recursive: true });
    writeFileSync(STATE, JSON.stringify(Object.fromEntries(hits)));
  } catch {
    /* best-effort */
  }
}
let hits = loadHits();

/** Addresses that have already received the one-time welcome grant (lowercased). */
function loadWelcomed() {
  try {
    return new Set(JSON.parse(readFileSync(WELCOME_STATE, "utf8")));
  } catch {
    return new Set();
  }
}
function saveWelcomed(set) {
  try {
    mkdirSync("/data", { recursive: true });
    writeFileSync(WELCOME_STATE, JSON.stringify([...set]));
  } catch {
    /* best-effort */
  }
}
let welcomed = loadWelcomed();

// In-memory per-IP fixed-window counter for NEW welcome grants (abuse cap only; a restart
// safely resets it — the per-address `welcomed` set still prevents any re-funding).
const welcomeIp = new Map(); // ip -> { count, resetAt }
// Trust the proxy's X-Forwarded-For ONLY when explicitly enabled (we run behind Caddy).
// Caddy APPENDS the real client IP as the RIGHTMOST hop, so a client-spoofed leftmost XFF
// can never be used as identity — closing the per-IP rate-limit bypass.
const TRUST_PROXY = /^(1|true|yes|on)$/i.test(process.env.TRUST_PROXY || "");
function clientIp(req) {
  if (TRUST_PROXY) {
    const xff = req.headers["x-forwarded-for"];
    if (typeof xff === "string" && xff.length) {
      const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length) return parts[parts.length - 1];
    }
  }
  return req.socket?.remoteAddress || "unknown";
}
// GLOBAL hourly dispense ceiling across ALL endpoints/IPs/addresses — the backstop that
// bounds total drain even if every other gate is bypassed (mining refills the operator key
// faster than this). 0 disables. Far above any legitimate aggregate use.
const GLOBAL_MAX_PER_H = Number(process.env.FAUCET_GLOBAL_MAX_PER_H || 1000);
let globalWin = { count: 0, resetAt: 0 };
function globalAllowed() {
  if (GLOBAL_MAX_PER_H <= 0) return true;
  const now = Date.now();
  if (now >= globalWin.resetAt) globalWin = { count: 0, resetAt: now + 3600_000 };
  if (globalWin.count >= GLOBAL_MAX_PER_H) return false;
  globalWin.count += 1;
  return true;
}
// CORS: value-dispensing endpoints must NOT be wildcard-open. Echo the Origin only for
// PYRAX-owned origins; same-origin (the faucet page) needs no ACAO and the apps/CLI call
// server-side (not CORS-gated), so this just blocks drive-by abuse from third-party pages.
function corsOrigin(req) {
  const o = req.headers.origin;
  if (typeof o === "string" && /^https:\/\/([a-z0-9-]+\.)*pyraxchain\.com$/i.test(o)) return o;
  return "";
}
function welcomeIpAllowed(ip) {
  if (WELCOME_IP_PER_H <= 0) return true; // disabled
  const now = Date.now();
  // Prune expired buckets opportunistically so the map can't grow unbounded.
  if (welcomeIp.size > 10000) {
    for (const [k, v] of welcomeIp) if (now >= v.resetAt) welcomeIp.delete(k);
  }
  const e = welcomeIp.get(ip);
  if (!e || now >= e.resetAt) {
    welcomeIp.set(ip, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (e.count >= WELCOME_IP_PER_H) return false;
  e.count += 1;
  return true;
}

// Per-IP fixed-window counter for NEW /drip grants (anti-automation; a restart safely resets
// it — the per-address cooldown still governs re-funding). `check()` reports whether the IP
// is under the cap WITHOUT consuming budget; `consume()` records a successful drip. Splitting
// them means a drip that fails to seal (502) never burns the caller's budget.
const dripIp = new Map(); // ip -> { count, resetAt }
function dripIpUnder(ip) {
  if (DRIP_IP_PER_H <= 0) return true; // disabled
  const now = Date.now();
  if (dripIp.size > 10000) {
    for (const [k, v] of dripIp) if (now >= v.resetAt) dripIp.delete(k);
  }
  const e = dripIp.get(ip);
  if (!e || now >= e.resetAt) return true; // fresh window — room for the first grant
  return e.count < DRIP_IP_PER_H;
}
function dripIpConsume(ip) {
  if (DRIP_IP_PER_H <= 0) return;
  const now = Date.now();
  const e = dripIp.get(ip);
  if (!e || now >= e.resetAt) dripIp.set(ip, { count: 1, resetAt: now + 3600_000 });
  else e.count += 1;
}

// ── Hashcash-style proof-of-work for /drip (optional; enabled when DRIP_POW_BITS > 0) ──────
// A challenge is a random 16-byte hex token the server minted and has not yet consumed; the
// client finds a `nonce` such that sha256(`${challenge}:${nonce}`) has >= DRIP_POW_BITS
// leading zero bits. Each challenge is single-use (consumed on first valid solve) and expires
// after POW_TTL_MS, so a solved challenge can't be replayed and a stockpile of pre-solved
// challenges can't be built up. The issued set is bounded so minting can't be used to grow
// memory. This costs a scripted drainer real CPU per fresh address while a single legitimate
// request solves a few-bit puzzle instantly.
const POW_TTL_MS = 2 * 60 * 1000;
const POW_MAX_OPEN = 20000; // cap outstanding challenges (bounded memory)
const powChallenges = new Map(); // challenge -> expiresAt
function issuePowChallenge() {
  const now = Date.now();
  if (powChallenges.size > POW_MAX_OPEN) {
    for (const [c, exp] of powChallenges) if (now >= exp) powChallenges.delete(c);
    // If still over cap after pruning expired ones, drop the oldest to make room.
    while (powChallenges.size > POW_MAX_OPEN) {
      const oldest = powChallenges.keys().next().value;
      if (oldest === undefined) break;
      powChallenges.delete(oldest);
    }
  }
  const challenge = randomBytes(16).toString("hex");
  powChallenges.set(challenge, now + POW_TTL_MS);
  return { challenge, bits: DRIP_POW_BITS, ttlMs: POW_TTL_MS };
}
/** Count leading zero BITS of a byte buffer. */
function leadingZeroBits(buf) {
  let bits = 0;
  for (const b of buf) {
    if (b === 0) {
      bits += 8;
      continue;
    }
    bits += Math.clz32(b) - 24; // clz32 of a byte, offset to the low 8 bits
    break;
  }
  return bits;
}
/** Verify + CONSUME a PoW solution. Returns true only for a live, unconsumed challenge whose
 *  sha256(challenge:nonce) meets the difficulty. Single-use: a valid challenge is deleted so
 *  it cannot be replayed. */
function verifyPow(pow) {
  if (DRIP_POW_BITS <= 0) return true; // PoW disabled ⇒ always satisfied
  if (!pow || typeof pow !== "object") return false;
  const { challenge, nonce } = pow;
  if (typeof challenge !== "string" || !/^[0-9a-f]{32}$/.test(challenge)) return false;
  if (typeof nonce !== "string" || nonce.length === 0 || nonce.length > 64) return false;
  const exp = powChallenges.get(challenge);
  if (exp === undefined || Date.now() >= exp) {
    powChallenges.delete(challenge);
    return false;
  }
  const digest = createHash("sha256").update(`${challenge}:${nonce}`).digest();
  if (leadingZeroBits(digest) < DRIP_POW_BITS) return false;
  powChallenges.delete(challenge); // single-use — consume on success
  return true;
}

// Auto-detect address kind: 40 hex => transparent, 128 hex => shielded, else null.
function addrKind(s) {
  if (typeof s !== "string") return null;
  const v = s.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(v)) return "transparent";
  if (/^0x[0-9a-fA-F]{128}$/.test(v)) return "shielded";
  return null;
}
const ms = (k) => hits.get(k) || 0;
const left = (k) => Math.max(0, WINDOW_MS - (Date.now() - ms(k)));

function send(res, code, obj) {
  // The per-request CORS allow-list header is set once on `res` at the top of the handler.
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}

function drip(address, kind, rpc, amount = DRIP, key = KEY) {
  // Sign + submit via the bundled CLI using the faucet keystore key for THIS network.
  // Transparent and shielded use different subcommands; for shielded-send, --rpc-url is a
  // GLOBAL flag that MUST precede the `wallet` subcommand.
  const args =
    kind === "shielded"
      ? ["--rpc-url", rpc, "wallet", "shielded-send", address, amount, "--from", key]
      : ["wallet", "send", address, amount, "--from", key, "--rpc-url", rpc];
  const r = spawnSync("pyrax", args, { env: process.env, encoding: "utf8", timeout: 30000 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const m = out.match(/submitted:\s*(\S+)/);
  if (r.status === 0 && m) return { ok: true, hash: m[1] };
  return { ok: false, error: out.trim().split("\n").slice(-1)[0] || "send failed" };
}

const server = http.createServer((req, res) => {
  // CORS: only PYRAX-owned origins are echoed (most callers are same-origin or server-side).
  const acao = corsOrigin(req);
  if (acao) res.setHeader("access-control-allow-origin", acao);
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    return res.end();
  }
  const url = new URL(req.url, "http://x");
  // Liveness/health. `/health` keeps its existing shape (the HTML UI reads .drip/.network);
  // `/healthz` is the canonical Sentinel contract alias — it ALWAYS returns 200 while the
  // process is up, no-store, with { ok, version, db, ts } plus the faucet's own fields. The
  // faucet has no database (state is a JSON file on the data volume), so db is "unconfigured";
  // a non-fatal dependency field is never a non-200. Point the container HEALTHCHECK at it.
  if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/healthz")) {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    return res.end(
      JSON.stringify({
        service: "pyrax-faucet",
        ok: true,
        version: SENTINEL_VERSION,
        db: "unconfigured",
        network: NETWORK,
        drip: drip_pyrx,
        welcome: welcome_pyrx,
        ts: Date.now(),
      }),
    );
  }
  // Dispensable networks for the portal selector. online = has a non-empty rpc.
  if (req.method === "GET" && url.pathname === "/networks") {
    const nets = Object.entries(NETWORKS).map(([chainId, n]) => ({
      chainId: Number(chainId),
      label: n.label,
      online: !!n.rpc,
    }));
    return send(res, 200, nets);
  }
  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(PAGE);
  }
  // Proof-of-work challenge for /drip (anti-automation). Returns { enabled, challenge, bits,
  // ttlMs }. When PoW is disabled (bits=0) it reports enabled:false and mints nothing, so the
  // browser knows it can drip directly. No-store — every challenge is single-use.
  if (req.method === "GET" && url.pathname === "/drip/challenge") {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    if (DRIP_POW_BITS <= 0) return res.end(JSON.stringify({ enabled: false, bits: 0 }));
    return res.end(JSON.stringify({ enabled: true, ...issuePowChallenge() }));
  }
  if (req.method === "POST" && url.pathname === "/drip") {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 4096) req.destroy();
    });
    req.on("end", () => {
      let address, chainId, pow;
      try {
        const j = JSON.parse(body);
        address = j.address;
        chainId = Number(j.chainId) || DEFAULT_CHAIN;
        pow = j.pow;
      } catch {
        return send(res, 400, { error: "bad request" });
      }
      const kind = addrKind(address);
      if (!kind) return send(res, 400, { error: "enter a valid 0x… address (transparent or shielded)" });
      address = address.trim();
      const net = NETWORKS[chainId];
      if (!net) return send(res, 404, { error: "unknown network" });
      if (!net.rpc) return send(res, 503, { error: `${net.label} faucet is not online yet` });
      // Anti-automation gate (finding M17). Two layers keep a scripted fresh-address drain
      // from reaching the global ceiling while never blocking a legitimate user:
      //   1) Proof-of-work: when enabled (DRIP_POW_BITS>0), a request MUST carry a valid,
      //      single-use `pow` solution — this makes bulk automation pay CPU per address.
      //   2) Per-IP cap: bound NEW drips per source IP per hour. A request that solved a PoW
      //      is exempt (a genuine user behind a shared portal IP is never blocked); a request
      //      WITHOUT a valid PoW must be under the per-IP cap. When PoW is disabled, the per-IP
      //      cap alone provides the per-attacker granularity the address cooldown lacks.
      // `powCleared` is true ONLY when PoW is enabled AND a valid single-use solution was
      // presented — that (and only that) exempts the per-IP cap. When PoW is disabled it is
      // false, so the per-IP cap always applies in the default config.
      const powCleared = DRIP_POW_BITS > 0 && verifyPow(pow);
      if (DRIP_POW_BITS > 0 && !powCleared) {
        return send(res, 428, { error: "proof-of-work required — GET /drip/challenge first", powRequired: true, bits: DRIP_POW_BITS });
      }
      const ip = clientIp(req);
      // A PoW solve exempts the per-IP cap (so a genuine user behind a shared portal IP is
      // never blocked); otherwise the caller must be under the per-IP hourly cap.
      if (!powCleared && !dripIpUnder(ip)) {
        return send(res, 429, { error: "too many requests from your network — please slow down and try again shortly" });
      }
      // Rate-limit PER-ADDRESS: a given address is fundable at most once per cooldown window.
      const akey = `a:${address.toLowerCase()}`;
      const wait = left(akey);
      if (wait > 0) {
        return send(res, 429, { error: `already funded recently — try again in ${Math.ceil(wait / 3600000)}h` });
      }
      if (!globalAllowed()) {
        reportGlobalCeiling("drip", net.label);
        return send(res, 503, { error: "the faucet is at capacity right now — please try again shortly" });
      }
      const r = drip(address, kind, net.rpc, DRIP, net.key);
      if (!r.ok) {
        // Operationally important: the CLI could not seal a drip (RPC down, key locked, no
        // shielded notes, etc.). Fire-and-forget a Sentinel report; the caller still gets 502.
        reportToSentinel(
          "faucet",
          `drip send failed on ${net.label} (${kind})`,
          `chain=${chainId} kind=${kind}\n${r.error}`,
          "error",
        );
        return send(res, 502, { error: r.error });
      }
      hits.set(akey, Date.now());
      saveHits(hits);
      // Count this successful drip against the source IP's hourly budget (skipped when the
      // request cleared a PoW, and a no-op when the per-IP cap is disabled).
      if (!powCleared) dripIpConsume(ip);
      return send(res, 200, { ok: true, hash: r.hash, amount: drip_pyrx, network: net.label, kind });
    });
    return;
  }
  // One-time new-wallet WELCOME grant (Pyrax Seed + Forge networks). Called automatically by
  // the apps/CLI/web when a wallet is created; once per (chain, address) for life, separate
  // from the repeatable /drip faucet. Each chain seals from its OWN genesis-funded welcome-
  // faucet wallet (Seed: SEED_FAUCET; Forge: FORGE_FAUCET). Idempotent: an already-granted
  // (chain, address) returns ok:true so a re-run of wallet creation never errors or double-funds.
  if (req.method === "POST" && url.pathname === "/welcome") {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 4096) req.destroy();
    });
    req.on("end", () => {
      let address, chainId;
      try {
        const j = JSON.parse(body);
        address = j.address;
        chainId = Number(j.chainId) || DEFAULT_CHAIN;
      } catch {
        return send(res, 400, { error: "bad request" });
      }
      // Welcome-eligible chains only (Seed + Forge); every other network uses the repeatable faucet.
      if (!WELCOME_CHAINS.has(chainId)) {
        return send(res, 400, { error: "the welcome grant is only on the Pyrax Seed and Forge networks" });
      }
      const kind = addrKind(address);
      if (!kind) return send(res, 400, { error: "enter a valid 0x… address (transparent or shielded)" });
      address = address.trim();
      const net = NETWORKS[chainId];
      if (!net || !net.rpc) return send(res, 503, { error: "the welcome faucet is not online yet" });
      // The once-per-life key is namespaced by chain (`chainId:address`) so a per-network
      // address is tracked independently. Legacy bare-address entries predate Forge and were
      // all Seed, so a Seed request also checks the un-namespaced form for backward compat.
      const alc = address.toLowerCase();
      const akey = `${chainId}:${alc}`;
      const already = welcomed.has(akey) || (chainId === DEFAULT_CHAIN && welcomed.has(alc));
      // Once per (chain, address) for life — re-creating or importing the same address never
      // re-grants. Checked BEFORE the IP cap so an idempotent re-request never consumes budget.
      if (already) {
        return send(res, 200, { ok: true, already: true, amount: welcome_pyrx, network: net.label, kind });
      }
      // Abuse cap: bound NEW grants per source host per hour (see WELCOME_IP_PER_H).
      if (!welcomeIpAllowed(clientIp(req))) {
        return send(res, 429, { error: "welcome grants are rate-limited from this network — try again later" });
      }
      if (!globalAllowed()) {
        reportGlobalCeiling("welcome", net.label);
        return send(res, 503, { error: "the faucet is at capacity right now — please try again shortly" });
      }
      const r = drip(address, kind, net.rpc, WELCOME, net.key);
      if (!r.ok) {
        // Operationally important: the one-time welcome grant could not be sealed. Report it
        // (fire-and-forget); the caller still gets its 502. A shielded welcome that fails here
        // is the pre-shield-depleted signal (the shielded pool ran out of notes).
        reportToSentinel(
          "faucet",
          `welcome grant send failed on ${net.label} (${kind})`,
          `chain=${chainId} kind=${kind}\n${r.error}`,
          "error",
        );
        return send(res, 502, { error: r.error });
      }
      welcomed.add(akey);
      saveWelcomed(welcomed);
      return send(res, 200, { ok: true, hash: r.hash, amount: welcome_pyrx, network: net.label, kind });
    });
    return;
  }
  send(res, 404, { error: "not found" });
});

// Start listening only when run as the entrypoint (not when imported by a test, which
// exercises the pure gate helpers below without binding a port or starting the synth job).
if (import.meta.main) {
  server.listen(PORT, "0.0.0.0", () => console.log(`[faucet] listening :${PORT} — ${drip_pyrx} PYRX/drip, ${welcome_pyrx} PYRX welcome grant on ${NETWORK}`));
}

// Exported for unit tests: the security-critical, side-effect-free gate helpers. Importing
// this module does NOT start the server (see import.meta.main above).
export { clientIp, verifyPow, issuePowChallenge, leadingZeroBits, dripIpUnder, dripIpConsume, welcomeIpAllowed, addrKind };

// --- synthetic transactions (chain activity) -------------------------------
// Periodically send a TINY transfer to a rotating set of sink addresses so the
// simulated chain carries real transactions and the explorer shows non-empty
// blocks (production-faithful), rather than an endless run of 0-tx blocks. This
// is an INTERNAL, env-gated job: it calls drip() directly, so it bypasses the
// public per-address cooldown, and it uses its own small amount (never the public
// drip size). Off unless SYNTHETIC_TX is truthy.
const SYNTH_ON = /^(1|true|yes|on)$/i.test(process.env.SYNTHETIC_TX || "");
const SYNTH_INTERVAL_MS = Math.max(15, Number(process.env.SYNTHETIC_TX_INTERVAL_S || 60)) * 1000;
const SYNTH_AMOUNT = (process.env.SYNTHETIC_TX_ASH || "1000000000000000").trim(); // 0.001 PYRX
const SYNTH_CHAIN = Number(process.env.SYNTHETIC_TX_CHAIN || DEFAULT_CHAIN);
// Valid transparent (0x + 40 hex) devnet sink addresses; rotated for variety.
const SYNTH_SINKS = [
  "0x5e7e7700000000000000000000000000000c0de1",
  "0x5e7e7700000000000000000000000000000c0de2",
  "0x5e7e7700000000000000000000000000000c0de3",
  "0x5e7e7700000000000000000000000000000c0de4",
  "0x5e7e7700000000000000000000000000000c0de5",
];
let synthIdx = 0;

function synthDrip() {
  const net = NETWORKS[SYNTH_CHAIN];
  if (!net?.rpc) return; // network has no write RPC yet — skip this tick
  const to = SYNTH_SINKS[synthIdx % SYNTH_SINKS.length];
  synthIdx++;
  // reuse drip() but with the small synthetic amount (temporarily swap DRIP via a
  // local arg path would be cleaner — inline a minimal send here to avoid touching
  // the public drip amount).
  const args = ["wallet", "send", to, SYNTH_AMOUNT, "--from", KEY, "--rpc-url", net.rpc];
  const r = spawnSync("pyrax", args, { env: process.env, encoding: "utf8", timeout: 30000 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const m = out.match(/submitted:\s*(\S+)/);
  if (r.status === 0 && m) console.log(`[faucet] synthetic tx → ${to.slice(0, 12)}… ${m[1]}`);
  else {
    const err = out.trim().split("\n").slice(-1)[0] || "send failed";
    console.warn(`[faucet] synthetic tx failed: ${err}`);
    // Operationally important: the chain-activity job can't seal (the write RPC is down or the
    // operator key is stuck), which means the explorer will show empty blocks. Report it
    // (deduped/throttled — a persistent outage is one report per window).
    reportToSentinel("faucet", `synthetic tx failed on chain ${SYNTH_CHAIN}`, `chain=${SYNTH_CHAIN}\n${err}`, "error");
  }
}

if (import.meta.main && SYNTH_ON) {
  console.log(`[faucet] synthetic transactions ON — every ${SYNTH_INTERVAL_MS / 1000}s on chain ${SYNTH_CHAIN}`);
  // first fire after a short delay (let the node/write-RPC settle), then on interval
  setTimeout(() => {
    synthDrip();
    setInterval(synthDrip, SYNTH_INTERVAL_MS).unref();
  }, 20_000).unref();
}

const PAGE = `<!doctype html><html lang="en" class="dark"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/><title>PYRAX Faucet</title>
<style>
:root{--bg:#06070b;--card:#0f1119;--line:#2a2f3b;--muted:#99a2b5;--ink:#f6f8fc;--brand:#f58722;--ok:#34d399;--bad:#f87171}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);font:15px/1.5 ui-sans-serif,system-ui,Segoe UI,sans-serif}
.card{width:min(440px,92vw);background:var(--card);border:1px solid var(--line);border-radius:16px;padding:28px}
h1{margin:0 0 4px;font-size:22px}p{color:var(--muted);margin:.2em 0 1.2em}
input{width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--line);background:#090b11;color:var(--ink);font:inherit;font-family:ui-monospace,monospace}
button{width:100%;margin-top:12px;padding:12px;border:0;border-radius:10px;background:var(--brand);color:#fff;font:inherit;font-weight:700;cursor:pointer}
button:disabled{opacity:.6;cursor:default}#msg{margin-top:14px;font-size:14px;word-break:break-all}a{color:var(--brand)}
</style></head><body><div class="card">
<h1>PYRAX Faucet</h1><p id="sub">Free test PYRX for development.</p>
<input id="addr" placeholder="0x your address" autocomplete="off"/>
<button id="go">Send test PYRX</button>
<div id="msg"></div>
</div><script>
var b=document.getElementById('go'),a=document.getElementById('addr'),m=document.getElementById('msg');
fetch('/health').then(r=>r.json()).then(h=>{document.getElementById('sub').textContent=h.drip+' PYRX per request on '+h.network+' · one per address every few hours.'}).catch(()=>{});
// Leading-zero-bit count of a byte array (mirrors the server's difficulty check).
function lz(bytes){var n=0;for(var i=0;i<bytes.length;i++){var x=bytes[i];if(x===0){n+=8;continue;}n+=Math.clz32(x)-24;break;}return n;}
async function sha256Hex(s){var buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return new Uint8Array(buf);}
// Solve a hashcash challenge: find a nonce so sha256(challenge:nonce) has >= bits leading zeros.
async function solvePow(challenge,bits){for(var n=0;;n++){var d=await sha256Hex(challenge+':'+n);if(lz(d)>=bits)return String(n);}}
b.onclick=async function(){m.textContent='';m.style.color='var(--muted)';b.disabled=true;b.textContent='Sending…';
try{
  var pow=null;
  // Fetch a challenge; solve it only if the server has PoW enabled.
  try{var ch=await (await fetch('/drip/challenge',{cache:'no-store'})).json();
    if(ch&&ch.enabled&&ch.bits>0){b.textContent='Verifying…';var nonce=await solvePow(ch.challenge,ch.bits);pow={challenge:ch.challenge,nonce:nonce};b.textContent='Sending…';}
  }catch(e){/* challenge unavailable — try the drip anyway (PoW may be disabled) */}
  var j=await (await fetch('/drip',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({address:a.value,pow:pow})})).json();
  if(j.ok){m.style.color='var(--ok)';m.innerHTML='Sent '+j.amount+' PYRX ✓<br>tx: '+j.hash}else{m.style.color='var(--bad)';m.textContent=j.error||'failed'}
}catch(e){m.style.color='var(--bad)';m.textContent='network error'}
finally{b.disabled=false;b.textContent='Send test PYRX'}};
a.addEventListener('keydown',function(e){if(e.key==='Enter')b.click()});
</script></body></html>`;
