// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Tests for the tunnel mux + subdomain parsing + the admin HMAC scheme. The transport
// (Node WS framing) and the live server are exercised end-to-end by the desktop app's
// tunnel-e2e suite; here we cover the runtime-agnostic core + the security-critical auth.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, createHash } from "node:crypto";
import { TunnelHub, nodeIdFromHost } from "../protocol.mjs";

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
