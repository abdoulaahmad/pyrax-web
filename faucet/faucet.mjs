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
//   FAUCET_NETWORK      label shown in the public HTML UI (e.g. "Internal Devnet 1.0")
//   PYRAX_KEY_PASSPHRASE  unlocks the faucet keystore key (name: "faucet")
//   PORT                listen port (default 8800)
//
// Endpoints:
//   POST /drip     repeatable public faucet — FAUCET_DRIP_ASH per address, FAUCET_WINDOW_H cooldown.
//   POST /welcome  ONE-TIME new-wallet grant — FAUCET_WELCOME_ASH, Internal Devnet 1.0 (881109) ONLY,
//                  once per address for life. Called automatically by the apps/CLI/web on wallet creation.

import http from "node:http";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const RPC = process.env.FAUCET_RPC || "";
const KEY = process.env.FAUCET_KEY || "faucet-op"; // keystore key name (genesis-funded Anvil #2)
const DRIP = (process.env.FAUCET_DRIP_ASH || "100000000000000000000").trim(); // 100 PYRX
// One-time new-wallet welcome grant. 1,000,000 PYRX = 1e6 * 1e18 ash. Internal Devnet 1.0
// only (play money on the simulated chain), once per address — see POST /welcome.
const WELCOME = (process.env.FAUCET_WELCOME_ASH || "1000000000000000000000000").trim();
// Generous per-IP cap on NEW welcome grants per hour — a safety net against a single host
// scripting fresh addresses to drain the shared faucet key (which also funds /drip + the
// synthetic-tx job). Far above any legitimate use (a user creating a handful of wallets);
// set FAUCET_WELCOME_IP_PER_H=0 to disable. Already-funded addresses don't count (they
// return early), and unlike /drip the welcome grant is called per-user-device, not via the
// shared portal IP, so an IP key is safe here.
const WELCOME_IP_PER_H = Number(process.env.FAUCET_WELCOME_IP_PER_H || 60);
const WINDOW_MS = Number(process.env.FAUCET_WINDOW_H || 12) * 3600 * 1000;
const NETWORK = process.env.FAUCET_NETWORK || "the test network";
const PORT = Number(process.env.PORT || 8800);
const STATE = "/data/faucet-ratelimit.json";
const WELCOME_STATE = "/data/faucet-welcomed.json";

// Dispensable networks (SSOT). Mainnet (563821) is intentionally EXCLUDED — the
// faucet is NEVER wired to mainnet. Add a chain by adding one line here; `online`
// is derived from a non-empty rpc, so a chain with no write node yet still shows
// in the selector but is greyed/disabled. Only 881109 has a write RPC for now.
const DEFAULT_CHAIN = 881109;
const NETWORKS = {
  881109: { label: "Pyrax Seed Network", rpc: RPC || "http://node:8545" },
  710823: { label: "Pyrax Forge Network", rpc: process.env.FAUCET_RPC_710823 || "" },
  104928: { label: "Pyrax Rise Network", rpc: process.env.FAUCET_RPC_104928 || "" },
};

const to_pyrx = (ash) => {
  try {
    return (BigInt(ash) / 10n ** 18n).toString();
  } catch {
    return "?";
  }
};
const drip_pyrx = to_pyrx(DRIP);
const welcome_pyrx = to_pyrx(WELCOME);

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

function drip(address, kind, rpc, amount = DRIP) {
  // Sign + submit via the bundled CLI using the faucet keystore key. Transparent and
  // shielded use different subcommands; for shielded-send, --rpc-url is a GLOBAL flag
  // that MUST precede the `wallet` subcommand.
  const args =
    kind === "shielded"
      ? ["--rpc-url", rpc, "wallet", "shielded-send", address, amount, "--from", KEY]
      : ["wallet", "send", address, amount, "--from", KEY, "--rpc-url", rpc];
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
  if (req.method === "GET" && (url.pathname === "/health")) {
    return send(res, 200, { service: "pyrax-faucet", ok: true, network: NETWORK, drip: drip_pyrx, welcome: welcome_pyrx });
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
  if (req.method === "POST" && url.pathname === "/drip") {
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
      const kind = addrKind(address);
      if (!kind) return send(res, 400, { error: "enter a valid 0x… address (transparent or shielded)" });
      address = address.trim();
      const net = NETWORKS[chainId];
      if (!net) return send(res, 404, { error: "unknown network" });
      if (!net.rpc) return send(res, 503, { error: `${net.label} faucet is not online yet` });
      // Rate-limit PER-ADDRESS only on the /drip path. The portal proxies all users from a
      // single shared IP, so an IP-keyed limit here would wrongly block everyone after the
      // first portal request — keep this address-scoped.
      const akey = `a:${address.toLowerCase()}`;
      const wait = left(akey);
      if (wait > 0) {
        return send(res, 429, { error: `already funded recently — try again in ${Math.ceil(wait / 3600000)}h` });
      }
      if (!globalAllowed()) {
        return send(res, 503, { error: "the faucet is at capacity right now — please try again shortly" });
      }
      const r = drip(address, kind, net.rpc);
      if (!r.ok) return send(res, 502, { error: r.error });
      hits.set(akey, Date.now());
      saveHits(hits);
      return send(res, 200, { ok: true, hash: r.hash, amount: drip_pyrx, network: net.label, kind });
    });
    return;
  }
  // One-time new-wallet WELCOME grant (Internal Devnet 1.0 only). Called automatically by
  // the apps/CLI/web when a wallet is created; once per address for life, separate from the
  // repeatable /drip faucet. Idempotent: an address already granted returns ok:true so a
  // re-run of wallet creation never errors or double-funds.
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
      // Devnet1-only by design — every other network uses the normal repeatable faucet.
      if (chainId !== DEFAULT_CHAIN) {
        return send(res, 400, { error: "the welcome grant is only on Internal Devnet 1.0" });
      }
      const kind = addrKind(address);
      if (!kind) return send(res, 400, { error: "enter a valid 0x… address (transparent or shielded)" });
      address = address.trim();
      const net = NETWORKS[chainId];
      if (!net || !net.rpc) return send(res, 503, { error: "the welcome faucet is not online yet" });
      const akey = address.toLowerCase();
      // Once per address for life — re-creating or importing the same address never re-grants.
      // Checked BEFORE the IP cap so an idempotent re-request never consumes a host's budget.
      if (welcomed.has(akey)) {
        return send(res, 200, { ok: true, already: true, amount: welcome_pyrx, network: net.label, kind });
      }
      // Abuse cap: bound NEW grants per source host per hour (see WELCOME_IP_PER_H).
      if (!welcomeIpAllowed(clientIp(req))) {
        return send(res, 429, { error: "welcome grants are rate-limited from this network — try again later" });
      }
      if (!globalAllowed()) {
        return send(res, 503, { error: "the faucet is at capacity right now — please try again shortly" });
      }
      const r = drip(address, kind, net.rpc, WELCOME);
      if (!r.ok) return send(res, 502, { error: r.error });
      welcomed.add(akey);
      saveWelcomed(welcomed);
      return send(res, 200, { ok: true, hash: r.hash, amount: welcome_pyrx, network: net.label, kind });
    });
    return;
  }
  send(res, 404, { error: "not found" });
});

server.listen(PORT, "0.0.0.0", () => console.log(`[faucet] listening :${PORT} — ${drip_pyrx} PYRX/drip, ${welcome_pyrx} PYRX welcome grant on ${NETWORK}`));

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
  else console.warn(`[faucet] synthetic tx failed: ${out.trim().split("\n").slice(-1)[0] || "send failed"}`);
}

if (SYNTH_ON) {
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
b.onclick=function(){m.textContent='';m.style.color='var(--muted)';b.disabled=true;b.textContent='Sending…';
fetch('/drip',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({address:a.value})})
.then(r=>r.json()).then(j=>{if(j.ok){m.style.color='var(--ok)';m.innerHTML='Sent '+j.amount+' PYRX ✓<br>tx: '+j.hash}else{m.style.color='var(--bad)';m.textContent=j.error||'failed'}})
.catch(()=>{m.style.color='var(--bad)';m.textContent='network error'})
.finally(()=>{b.disabled=false;b.textContent='Send test PYRX'})};
a.addEventListener('keydown',function(e){if(e.key==='Enter')b.click()});
</script></body></html>`;
