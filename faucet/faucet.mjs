// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// PYRAX public test-token faucet. A tiny dependency-free Node HTTP server that
// dispenses a fixed drip of test PYRX to a submitted address on the active dev
// network, rate-limited per-address AND per-IP. It signs/sends by shelling out to
// the bundled `pyrax` CLI (the faucet's own keystore key), so there is no tx code
// to reimplement. Public networks only — never wired to mainnet.
//
// Env:
//   FAUCET_RPC          the network RPC to dispense on (e.g. https://sidn-rpc.pyraxchain.com:8811)
//   FAUCET_DRIP_ASH     drip amount in base units (ash). default 100 PYRX = 100e18
//   FAUCET_WINDOW_H     per-address/IP cooldown hours. default 12
//   FAUCET_NETWORK      label shown in the UI (e.g. "Internal Devnet 1.0")
//   PYRAX_KEY_PASSPHRASE  unlocks the faucet keystore key (name: "faucet")
//   PORT                listen port (default 8800)

import http from "node:http";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const RPC = process.env.FAUCET_RPC || "";
const DRIP = (process.env.FAUCET_DRIP_ASH || "100000000000000000000").trim(); // 100 PYRX
const WINDOW_MS = Number(process.env.FAUCET_WINDOW_H || 12) * 3600 * 1000;
const NETWORK = process.env.FAUCET_NETWORK || "the test network";
const PORT = Number(process.env.PORT || 8800);
const STATE = "/data/faucet-ratelimit.json";

const drip_pyrx = (() => {
  try {
    return (BigInt(DRIP) / 10n ** 18n).toString();
  } catch {
    return "?";
  }
})();

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

const isAddr = (s) => typeof s === "string" && /^0x[0-9a-fA-F]{40}$/.test(s.trim());
const ms = (k) => hits.get(k) || 0;
const left = (k) => Math.max(0, WINDOW_MS - (Date.now() - ms(k)));

function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  return (Array.isArray(xff) ? xff[0] : (xff || "").split(",")[0]).trim() || req.socket.remoteAddress || "?";
}

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": "*" });
  res.end(body);
}

function drip(address) {
  // Sign + submit via the bundled CLI using the faucet keystore key.
  const r = spawnSync(
    "pyrax",
    ["wallet", "send", address, DRIP, "--from", "faucet", "--rpc-url", RPC],
    { env: process.env, encoding: "utf8", timeout: 30000 },
  );
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const m = out.match(/submitted:\s*(\S+)/);
  if (r.status === 0 && m) return { ok: true, hash: m[1] };
  return { ok: false, error: out.trim().split("\n").slice(-1)[0] || "send failed" };
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    return res.end();
  }
  const url = new URL(req.url, "http://x");
  if (req.method === "GET" && (url.pathname === "/health")) {
    return send(res, 200, { service: "pyrax-faucet", ok: true, network: NETWORK, drip: drip_pyrx });
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
      if (!RPC) return send(res, 503, { error: "faucet not configured (no RPC)" });
      let address;
      try {
        address = JSON.parse(body).address;
      } catch {
        return send(res, 400, { error: "bad request" });
      }
      if (!isAddr(address)) return send(res, 400, { error: "enter a valid 0x… address" });
      address = address.trim();
      const ip = clientIp(req);
      const wait = Math.max(left(`a:${address.toLowerCase()}`), left(`i:${ip}`));
      if (wait > 0) {
        return send(res, 429, { error: `already funded recently — try again in ${Math.ceil(wait / 3600000)}h` });
      }
      const r = drip(address);
      if (!r.ok) return send(res, 502, { error: r.error });
      const now = Date.now();
      hits.set(`a:${address.toLowerCase()}`, now);
      hits.set(`i:${ip}`, now);
      saveHits(hits);
      return send(res, 200, { ok: true, hash: r.hash, amount: drip_pyrx, network: NETWORK });
    });
    return;
  }
  send(res, 404, { error: "not found" });
});

server.listen(PORT, "0.0.0.0", () => console.log(`[faucet] listening :${PORT} — ${drip_pyrx} PYRX per drip on ${NETWORK}`));

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
