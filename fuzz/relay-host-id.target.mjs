// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Fuzz target: tunnel-relay Host-header → node-id ROUTING parse (the multi-tenant
// browser trust boundary of the self-hosted relay).
//
// Real functions under test (imported from production, never reimplemented):
//   • pyrax-web/pyrax-tunnel-relay/protocol.mjs
//       nodeIdFromHost(host)  — parses the untrusted browser `Host` header to derive the
//                               subdomain id that selects WHICH node tunnel a request is
//                               routed to (`<id>.nodes.pyraxchain.com` / `<id>.localhost`).
//       TunnelHub.handleAgent(text) — parses each untrusted JSON envelope received FROM
//                               the node agent's tunnel socket and dispatches it.
//
// nodeIdFromHost is the router key for a MULTI-TENANT relay: every browser request carries
// an attacker-controllable `Host`, and the returned id decides which node's private tunnel
// the traffic is proxied over. If a crafted Host could make this return anything other than
// a bare lowercase hex label — e.g. a value containing a dot, slash, port, uppercase, or a
// path segment — a request could escape its subdomain namespace, be routed to the wrong
// tenant, or become an unroutable/injected id. handleAgent parses arbitrary agent JSON and
// must never throw, so a malformed/hostile frame from a compromised or buggy agent can't
// crash the relay's message loop.
//
// Security properties asserted:
//   1. TOTAL: nodeIdFromHost never throws for ANY host string/bytes (empty, non-string
//      coercions, embedded NULs, huge strings, unicode, ports, paths).
//   2. ROUTING SOUNDNESS (the trust-boundary rule): the return value is ALWAYS either
//      `null` or a string matching /^[0-9a-f]{4,64}$/ — it can NEVER contain a dot, slash,
//      colon/port, uppercase letter, whitespace, or any path/authority separator. Any such
//      leak is a REAL finding: it would let a crafted Host escape its `<id>.` subdomain
//      namespace or produce an unroutable/injected routing key.
//   3. handleAgent TOTAL: TunnelHub.handleAgent(text) never throws for ANY text — malformed
//      JSON, non-object JSON (numbers/arrays/null), wrong field types, unknown/missing `t`,
//      missing/duplicate ids. It must silently ignore anything it doesn't understand.

import { FuzzedDataProvider } from "@jazzer.js/core";
import { nodeIdFromHost, TunnelHub } from "../pyrax-tunnel-relay/protocol.mjs";

// The ONLY shape a routed id may take. Anything else is a namespace-escape / injection.
const VALID_ID = /^[0-9a-f]{4,64}$/;
// Characters/sequences that, if present in a returned id, mean the Host escaped its label.
const FORBIDDEN = /[.\/:\\ \t\r\n\0A-Z@?#%]/;

// A single reusable hub whose agent-message dispatch we exercise. It has no real agent
// attached, so handleAgent's map lookups all miss — exactly the "hostile frame arrives,
// nothing matches" path we want to prove never throws.
const hub = new TunnelHub({ onAgentChange: () => {} });

/** Assert nodeIdFromHost(host) obeys ROUTING SOUNDNESS + TOTAL. */
function checkHost(host) {
  let id;
  try {
    id = nodeIdFromHost(host);
  } catch (e) {
    throw new Error(`nodeIdFromHost THREW on a host input: ${e && e.message}`);
  }
  if (id === null) return;
  if (typeof id !== "string") throw new Error("nodeIdFromHost returned a non-string, non-null value");
  if (FORBIDDEN.test(id))
    throw new Error(`ROUTING BUG: id "${id}" contains a namespace-escape character (dot/slash/port/uppercase/path)`);
  if (!VALID_ID.test(id))
    throw new Error(`ROUTING BUG: id "${id}" does not match the required /^[0-9a-f]{4,64}$/ routing-key shape`);
}

export function fuzz(data) {
  const fdp = new FuzzedDataProvider(data);
  const mode = fdp.consumeIntegralInRange(0, 4);

  // ----- nodeIdFromHost routing parse (properties 1 + 2) -----
  if (mode === 0) {
    // A structurally-plausible host: an attacker-influenced label + a real/near-real suffix.
    // Exercises the accept path and near-miss boundaries (uppercase, port, extra label, path).
    const label = fdp.consumeString(fdp.consumeIntegralInRange(0, 80));
    const suffix = [
      ".nodes.pyraxchain.com",
      ".localhost",
      ".nodes.pyraxchain.com:443",
      ".NODES.pyraxchain.com",
      ".nodes.pyraxchain.com/../evil",
      ".evil.com",
      "",
    ][fdp.consumeIntegralInRange(0, 6)];
    checkHost(`${label}${suffix}`);
    checkHost(fdp.consumeRemainingAsString()); // plus a fully-arbitrary tail host
    return;
  }

  if (mode === 1) {
    // Non-string coercions must not throw and must be treated as absent/invalid.
    for (const v of [undefined, null, 123, {}, [], true, Symbol.iterator]) {
      // Symbol can't be templated by String() inside the fn only if it dereferences it as
      // a string method — nodeIdFromHost wraps with String(host), so a Symbol WOULD throw
      // in String(); guard it the way a caller would (skip symbols the fn never receives).
      if (typeof v === "symbol") continue;
      checkHost(v);
    }
    checkHost(fdp.consumeRemainingAsString());
    return;
  }

  if (mode === 2) {
    // Fully arbitrary bytes as the entire host — the raw hostile case.
    checkHost(fdp.consumeRemainingAsString());
    return;
  }

  // ----- TunnelHub.handleAgent JSON parse (property 3) -----
  if (mode === 3) {
    // Arbitrary text straight into the agent-message parser (mostly non-JSON / malformed).
    let threw = false;
    try {
      hub.handleAgent(fdp.consumeRemainingAsString());
    } catch {
      threw = true;
    }
    if (threw) throw new Error("handleAgent THREW on arbitrary agent text (must swallow all parse/dispatch errors)");
    return;
  }

  // mode === 4: well-formed-ish JSON envelopes with fuzzed/wrong-typed fields, to drive the
  // `t` dispatch branches (res/wsmsg/wsclose/wsopen) with hostile shapes (missing ids, wrong
  // types, arrays/nulls where objects are expected).
  const t = ["res", "wsmsg", "wsclose", "wsopen", "ping", "pong", "", "??"][fdp.consumeIntegralInRange(0, 7)];
  const idKind = fdp.consumeIntegralInRange(0, 4);
  const id =
    idKind === 0 ? fdp.consumeIntegral(4, false)
    : idKind === 1 ? fdp.consumeString(fdp.consumeIntegralInRange(0, 8))
    : idKind === 2 ? null
    : idKind === 3 ? undefined
    : [1, 2, 3];
  const envelope = {
    t,
    id,
    status: fdp.consumeIntegral(2, false),
    headers: fdp.consumeBoolean() ? { a: fdp.consumeString(4) } : fdp.consumeIntegral(1, false),
    body: fdp.consumeBoolean() ? fdp.consumeString(fdp.consumeIntegralInRange(0, 16)) : null,
    data: fdp.consumeString(fdp.consumeIntegralInRange(0, 16)),
    ok: fdp.consumeBoolean(),
  };
  let text;
  try {
    text = JSON.stringify(envelope);
  } catch {
    text = "{}";
  }
  let threw = false;
  try {
    hub.handleAgent(text);
    // Also feed a couple of raw non-object JSON values that JSON.parse accepts.
    hub.handleAgent("42");
    hub.handleAgent("null");
    hub.handleAgent("[1,2,3]");
    hub.handleAgent('"just a string"');
  } catch {
    threw = true;
  }
  if (threw) throw new Error("handleAgent THREW on a structured hostile JSON envelope (must never throw)");
}
