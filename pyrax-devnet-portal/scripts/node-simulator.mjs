// SPDX-License-Identifier: LicenseRef-Proprietary
//
// PYRAX node simulator — stands in for the Inferno app / CLI until they're wired up.
// 1) In the portal dashboard, click "Link a node" to get an 8-char pairing code.
// 2) Run:  node scripts/node-simulator.mjs <CODE> [PORTAL_URL]
// It pairs, then sends a heartbeat every 15s so you can watch the node go online + uptime climb.
const code = process.argv[2];
const portal = process.argv[3] || "http://localhost:4322";
if (!code) { console.error("Usage: node scripts/node-simulator.mjs <PAIRING_CODE> [PORTAL_URL]"); process.exit(1); }

const pair = await (await fetch(`${portal}/api/node/pair`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ code, app: "inferno-sim", appVersion: "0.4.0", nodeVersion: "0.4.0", label: "Simulated Node" }),
})).json();
if (!pair.ok) { console.error("Pair failed:", pair.error); process.exit(1); }
console.log(`Paired ${pair.nodePk}` + (pair.foundingRank ? ` — Founding Tester #${pair.foundingRank}!` : ""));

let height = 100000;
async function beat() {
  height += Math.floor(Math.random() * 5) + 1;
  try {
    const r = await (await fetch(`${portal}/api/node/heartbeat`, {
      method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + pair.nodeToken },
      body: JSON.stringify({ height, peers: 8 + Math.floor(Math.random() * 6), appVersion: "0.4.0", nodeVersion: "0.4.0" }),
    })).json();
    console.log(new Date().toISOString(), r.ok ? `heartbeat ok (height ${height})` : `heartbeat error: ${r.error}`);
  } catch (e) { console.log("heartbeat failed:", e.message); }
}
await beat();
setInterval(beat, 15000);
console.log("Heartbeating every 15s. Ctrl+C to stop (node goes offline after ~90s).");
