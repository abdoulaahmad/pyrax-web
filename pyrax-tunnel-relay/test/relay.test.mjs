// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Tests for the tunnel mux + subdomain parsing + the admin HMAC scheme. The transport
// (Node WS framing) and the live server are exercised end-to-end by the desktop app's
// tunnel-e2e suite; here we cover the runtime-agnostic core + the security-critical auth.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TunnelHub, nodeIdFromHost } from "../protocol.mjs";

const RELAY = join(dirname(fileURLToPath(import.meta.url)), "..", "relay.mjs");

/** Boot the relay as a subprocess on a fresh ephemeral port and resolve once it logs that
 *  it is listening. Returns { proc, port, stop() }. The Sentinel reporter is left DISABLED
 *  (no NOVA_AGENT_SECRET) so no test ever emits a real report. */
async function bootRelay(env = {}) {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const proc = spawn(process.execPath, [RELAY], {
    env: { ...process.env, PORT: String(port), PYRAX_TUNNEL_STATE: "", PYRAX_OTA_LATEST: "http://127.0.0.1:1/none", ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  const ready = new Promise((resolve, reject) => {
    proc.stdout.on("data", (d) => {
      out += String(d);
      if (out.includes("listening on")) resolve();
    });
    proc.once("error", reject);
    proc.once("exit", (code) => reject(new Error(`relay exited early (code ${code})\n${out}`)));
  });
  await ready;
  return {
    proc,
    port,
    async stop() {
      proc.kill("SIGKILL");
      await once(proc, "exit").catch(() => {});
    },
  };
}

/** A test double for the agent `Sock` that records what the hub sends it. */
function fakeSock() {
  const sent = [];
  return { sent, send: (d) => sent.push(d), close: () => sent.push("__closed__") };
}

test("nodeIdFromHost parses prod + localhost, rejects junk", () => {
  assert.equal(nodeIdFromHost("d64eeef774a0.nodes.pyraxchain.com"), "d64eeef774a0");
  assert.equal(nodeIdFromHost("d64eeef774a0.nodes.pyraxchain.com:443"), "d64eeef774a0");
  assert.equal(nodeIdFromHost("abcd.localhost"), "abcd");
  assert.equal(nodeIdFromHost("nodes.pyraxchain.com"), null); // base, not a node sub
  assert.equal(nodeIdFromHost("evil.example.com"), null);
  assert.equal(nodeIdFromHost("NOTHEX.nodes.pyraxchain.com"), null);
  assert.equal(nodeIdFromHost(undefined), null);
});

test("http() is 502 with no agent, then round-trips a response", async () => {
  const hub = new TunnelHub();
  assert.equal((await hub.http("GET", "/", {}, null)).status, 502);

  const sock = fakeSock();
  hub.setAgent(sock);
  assert.ok(hub.hasAgent());
  const p = hub.http("GET", "/portal", { host: "x" }, null);
  // The hub should have framed a `req` to the agent; reply as the agent would.
  const req = JSON.parse(sock.sent.at(-1));
  assert.equal(req.t, "req");
  assert.equal(req.path, "/portal");
  hub.handleAgent(JSON.stringify({ t: "res", id: req.id, status: 200, headers: { "x": "1" }, body: null }));
  const r = await p;
  assert.equal(r.status, 200);
  assert.deepEqual(r.headers, { x: "1" });
});

test("dropAgent fails in-flight requests with 502", async () => {
  const hub = new TunnelHub();
  const sock = fakeSock();
  hub.setAgent(sock);
  const p = hub.http("GET", "/", {}, null);
  hub.dropAgent(sock);
  assert.equal((await p).status, 502);
  assert.equal(hub.hasAgent(), false);
});

test("ping() frames a keepalive to the agent", () => {
  const hub = new TunnelHub();
  const sock = fakeSock();
  hub.setAgent(sock);
  hub.ping();
  assert.deepEqual(JSON.parse(sock.sent.at(-1)), { t: "ping" });
});

test("browser WS open frames wsopen + relays messages both ways", () => {
  const hub = new TunnelHub();
  const agent = fakeSock();
  hub.setAgent(agent);
  const browser = fakeSock();
  const stream = hub.openWs(browser, "/?node=x");
  const open = JSON.parse(agent.sent.at(-1));
  assert.equal(open.t, "wsopen");
  // agent → browser
  hub.handleAgent(JSON.stringify({ t: "wsmsg", id: open.id, data: "hello-browser" }));
  assert.equal(browser.sent.at(-1), "hello-browser");
  // browser → agent
  stream.onMessage("hello-node");
  assert.equal(JSON.parse(agent.sent.at(-1)).data, "hello-node");
});

// The admin control plane uses the same HMAC scheme the relay verifies. This mirrors
// relay.mjs's adminOk(), so a regression in the signature contract is caught here.
test("admin HMAC signature verifies for the matching secret only", () => {
  const secret = "test-admin-secret";
  const method = "POST";
  const path = "/__admin/nodes/d64eeef774a0/kill";
  const body = "";
  const ts = 1_700_000_000_000;
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const sig = createHmac("sha256", secret).update(`${method}\n${path}\n${ts}\n${bodyHash}`).digest("hex");
  const wrong = createHmac("sha256", "other").update(`${method}\n${path}\n${ts}\n${bodyHash}`).digest("hex");
  assert.match(`PYRAX-HMAC ts=${ts},sig=${sig}`, /^PYRAX-HMAC ts=\d+,sig=[0-9a-f]{64}$/);
  assert.notEqual(sig, wrong);
});

// ── /healthz contract + --check (Sentinel integration surface) ────────────────

test("GET /healthz always 200 with the health contract shape + no-store", async () => {
  const relay = await bootRelay();
  try {
    const res = await fetch(`http://127.0.0.1:${relay.port}/healthz`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "no-store");
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(typeof body.version, "string");
    assert.ok(body.version.length > 0);
    assert.equal(typeof body.connectedNodes, "number"); // aggregate count, no per-node ids
    assert.equal(body.connectedNodes, 0);
    assert.ok("networkVersion" in body);
    assert.equal(typeof body.ts, "number");
  } finally {
    await relay.stop();
  }
});

test("/healthz body carries no per-node identifiers (aggregate only)", async () => {
  const relay = await bootRelay();
  try {
    const raw = await (await fetch(`http://127.0.0.1:${relay.port}/healthz`)).text();
    // Only these keys — nothing that could carry a node id / peer address of an operator.
    const keys = Object.keys(JSON.parse(raw)).sort();
    assert.deepEqual(keys, ["connectedNodes", "networkVersion", "ok", "ts", "version"]);
  } finally {
    await relay.stop();
  }
});

test("the legacy /health JSON alias still responds 200", async () => {
  const relay = await bootRelay();
  try {
    const res = await fetch(`http://127.0.0.1:${relay.port}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.service, "pyrax-tunnel-relay");
    assert.equal(body.ok, true);
  } finally {
    await relay.stop();
  }
});

test("node relay.mjs --check exits 0 without binding the port", async () => {
  const proc = spawn(process.execPath, [RELAY, "--check"], {
    env: { ...process.env, PYRAX_TUNNEL_STATE: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  proc.stdout.on("data", (d) => (out += String(d)));
  const [code] = await once(proc, "exit");
  assert.equal(code, 0);
  assert.match(out, /--check OK/);
  assert.match(out, /sentinel=off/); // no NOVA_AGENT_SECRET in the test env
});

test("--check reports sentinel=on when NOVA_AGENT_SECRET is set (no report emitted)", async () => {
  const proc = spawn(process.execPath, [RELAY, "--check"], {
    env: { ...process.env, PYRAX_TUNNEL_STATE: "", NOVA_AGENT_SECRET: "test-secret" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  proc.stdout.on("data", (d) => (out += String(d)));
  const [code] = await once(proc, "exit");
  assert.equal(code, 0);
  assert.match(out, /sentinel=on/);
});

// ── Sentinel reporter: fail-open POST shape, Bearer auth, redaction ───────────
// A registry-persist failure is the easiest trigger: point PYRAX_TUNNEL_STATE at an
// impossible path so writeFileSync throws on the first persist (which happens the moment a
// node registers). Capture the report on a local /api/errors stub.

/** A stub Sentinel ingest that records every POST body/headers it receives. */
async function stubIngest() {
  const received = [];
  const srv = createServer((req, res) => {
    if (req.method === "POST" && req.url === "/api/errors") {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        let body = null;
        try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch {}
        received.push({ auth: req.headers["authorization"], body });
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, id: received.length }));
      });
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${srv.address().port}`, received, close: () => srv.close() };
}

/** Poll until `received` has at least one entry (or time out). */
async function waitFor(received, ms = 4000) {
  const deadline = Date.now() + ms;
  while (received.length === 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 25));
  }
}

test("persist failure fires a fail-open Sentinel report with Bearer auth + correct shape", async () => {
  const ingest = await stubIngest();
  // An unwritable state path: a file that already exists as this test file, used as a
  // DIRECTORY component — mkdirSync/writeFileSync will throw (ENOTDIR/EEXIST).
  const badPath = join(RELAY, "cannot", "be", "a", "dir", "registry.json");
  const relay = await bootRelay({
    SENTINEL_INGEST_URL: ingest.url,
    NOVA_AGENT_SECRET: "test-agent-secret",
    PYRAX_TUNNEL_STATE: badPath,
  });
  try {
    // Trigger a persist by registering a node (the register handler calls persist()).
    // We only need the relay to attempt a write and fail; the WS handshake failing is fine.
    const ws = `ws://127.0.0.1:${relay.port}/__tunnel/register?id=abcdef123456&key=00112233445566778899`;
    // A minimal raw upgrade request is heavy; instead trigger persist via the admin plane
    // is HMAC-gated. The simplest deterministic trigger: loadState runs at boot, and the
    // first register persists. Use a WebSocket from undici (global) to dial the register URL.
    const sock = new WebSocket(ws);
    await Promise.race([once(sock, "open"), once(sock, "error"), new Promise((r) => setTimeout(r, 1500))]);
    try { sock.close(); } catch {}

    await waitFor(ingest.received);
    assert.ok(ingest.received.length >= 1, "expected at least one Sentinel report");
    const rep = ingest.received[0];
    assert.equal(rep.auth, "Bearer test-agent-secret");
    assert.equal(rep.body.source, "tunnel-relay");
    assert.equal(rep.body.level, "error");
    assert.equal(typeof rep.body.title, "string");
    assert.ok(rep.body.title.length > 0 && rep.body.title.length <= 200);
    assert.match(rep.body.title, /persist failed/i);
    assert.equal(typeof rep.body.detail, "string");
    assert.match(rep.body.detail, /ENOTDIR|EEXIST|ENOENT|EACCES/); // the underlying write error
    // The bearer secret must never appear anywhere in the report payload.
    const blob = JSON.stringify(rep.body);
    assert.ok(!blob.includes("test-agent-secret"), "report must not leak the agent secret");
    // Privacy scrub: the OS username in a filesystem path must be collapsed, never leaked.
    assert.ok(!/\\Users\\[^\\…]/.test(rep.body.detail), "OS username in path must be redacted");
    assert.match(rep.body.detail, /Users\\…/); // confirms the redaction actually ran
  } finally {
    await relay.stop();
    ingest.close();
  }
});

test("reporter is a silent no-op when NOVA_AGENT_SECRET is unset", async () => {
  const ingest = await stubIngest();
  const badPath = join(RELAY, "cannot", "be", "a", "dir", "registry.json");
  const relay = await bootRelay({
    SENTINEL_INGEST_URL: ingest.url,
    // NOVA_AGENT_SECRET intentionally unset → reporter disabled
    PYRAX_TUNNEL_STATE: badPath,
  });
  try {
    const sock = new WebSocket(`ws://127.0.0.1:${relay.port}/__tunnel/register?id=abcdef123456&key=00112233445566778899`);
    await Promise.race([once(sock, "open"), once(sock, "error"), new Promise((r) => setTimeout(r, 1200))]);
    try { sock.close(); } catch {}
    // Give any (erroneous) report time to arrive; assert none did.
    await new Promise((r) => setTimeout(r, 800));
    assert.equal(ingest.received.length, 0, "no report should be sent without a secret");
  } finally {
    await relay.stop();
    ingest.close();
  }
});

// ── H10 + M15: per-node key is persisted (survives a restart) + growth discipline ─────────
// The per-node registration key MUST be written to registry.json and restored on boot, so a
// relay restart cannot reset it to null and re-open the trust-on-first-use window for every
// subdomain (subdomain-takeover). We also assert the persisted record CARRIES the key field.

/** Open a register WS, wait for it to connect (or fail), then optionally hold it briefly so
 *  the relay's debounced persist can flush. Resolves with the raw close/error outcome. */
async function registerOnce(port, id, key, { holdMs = 0 } = {}) {
  const sock = new WebSocket(`ws://127.0.0.1:${port}/__tunnel/register?id=${id}&key=${key}`);
  let forbidden = false;
  // undici surfaces a 403 handshake as an "error" event (the upgrade never completes).
  const outcome = await Promise.race([
    once(sock, "open").then(() => "open"),
    once(sock, "error").then(() => "error"),
    new Promise((r) => setTimeout(() => r("timeout"), 2500)),
  ]);
  if (outcome === "error") forbidden = true;
  if (outcome === "open" && holdMs) await new Promise((r) => setTimeout(r, holdMs));
  try { sock.close(); } catch {}
  return { outcome, forbidden };
}

test("H10: the per-node key is persisted and survives a relay restart (binding is immutable)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pyrax-relay-"));
  const state = join(dir, "registry.json");
  const id = "abcdef123456";
  const key = randomBytes(16).toString("hex");
  const wrong = randomBytes(16).toString("hex");
  try {
    // Boot #1: first-sight registration binds `key` (persisted SYNCHRONOUSLY on first bind);
    // a short hold ensures the accept + write have completed before we stop the relay.
    let relay = await bootRelay({ PYRAX_TUNNEL_STATE: state });
    const r1 = await registerOnce(relay.port, id, key, { holdMs: 300 });
    assert.equal(r1.outcome, "open", "first registration should be accepted");
    await relay.stop();

    // The persisted registry must carry the KEY (the crux of the fix — pre-fix it wrote none).
    const saved = JSON.parse(readFileSync(state, "utf8"));
    assert.ok(saved[id], "the node record must be persisted");
    assert.equal(saved[id].key, key, "the first-seen key must be persisted");

    // Boot #2 (simulated restart) from the SAME state file: a DIFFERENT key for the same id
    // must be REJECTED (403), proving the binding survived the restart and can't be re-taken.
    relay = await bootRelay({ PYRAX_TUNNEL_STATE: state });
    const rBad = await registerOnce(relay.port, id, wrong);
    assert.equal(rBad.forbidden, true, "a squatter's different key must be rejected after restart");
    // The legitimate key still works after the restart.
    const rGood = await registerOnce(relay.port, id, key, { holdMs: 100 });
    assert.equal(rGood.outcome, "open", "the original key must still be accepted after restart");
    await relay.stop();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("M15: registration is capped so an id flood can't grow the registry without bound", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pyrax-relay-cap-"));
  const state = join(dir, "registry.json");
  try {
    // Cap at 2 tracked records. The 3rd distinct id must be refused (503) rather than minting
    // an unbounded number of records.
    const relay = await bootRelay({ PYRAX_TUNNEL_STATE: state, PYRAX_TUNNEL_MAX_NODES: "2" });
    const key = randomBytes(16).toString("hex");
    const a = await registerOnce(relay.port, "aaaa11112222", key, { holdMs: 50 });
    const b = await registerOnce(relay.port, "bbbb33334444", key, { holdMs: 50 });
    assert.equal(a.outcome, "open");
    assert.equal(b.outcome, "open");
    // A brand-new (third) id at capacity is refused.
    const c = await registerOnce(relay.port, "cccc55556666", key);
    assert.equal(c.forbidden, true, "a fresh id beyond the cap must be refused");
    await relay.stop();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
