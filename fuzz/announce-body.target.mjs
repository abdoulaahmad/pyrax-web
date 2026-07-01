// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Fuzz target: announce request-body validation.
//
// Real function under test (imported from production, never reimplemented):
//   • pyrax-nodes/src/server/announce-validate.ts → validateAnnounce(body)
//     (the exact function the /api/announce route calls; extracted to a side-effect-free module so it
//      is importable without the route's background-timer imports — see that file's header.)
//
// After the HMAC gate, the JSON body is parsed and handed to validateAnnounce, whose normalized output
// flows into the public peer map / multiaddr / geo. A validation escape (accepting an out-of-range
// port, a peerId with control chars, an over-long relay key, a non-array `peers`) would let a caller
// poison the directory.
//
// Security properties asserted:
//   1. TOTAL: never throws for ANY parsed JSON value (object, array, string, number, null, nested,
//      prototype-polluting keys, huge arrays).
//   2. CONTRACT ON ACCEPT: when it returns { ok: true, value }, every normalized field satisfies the
//      exact validation rules the route relies on — enabled net label, integer port in [1,65535],
//      peerId matching /^[0-9A-Za-z]{6,128}$/, kind ∈ {operator,seed,rpc}, relayPubkey ≤ 128 chars,
//      and peers (if present) an array of ≤ 64 peerId-shaped strings. A regression that let any of
//      these through fails here (assertion is NOT weakened to hide a finding).
//   3. CONTRACT ON REJECT: when it returns { ok: false }, it carries a string error + a numeric HTTP
//      status in the 4xx range the route emits.
//
// The fuzzer builds a wide variety of candidate bodies (raw JSON bytes + structured objects with
// mutated fields) to reach both branches and the boundary conditions of each rule.

import { FuzzedDataProvider } from "@jazzer.js/core";
import { validateAnnounce } from "../pyrax-nodes/src/server/announce-validate.ts";
import { isNetLabel } from "../pyrax-nodes/src/lib/networks.ts";

const ENABLED = (process.env.PYRAX_ENABLED_NETWORKS || "seed,forge,rise,one")
  .split(",").map((s) => s.trim()).filter(Boolean);
const PEERID_RE = /^[0-9A-Za-z]{6,128}$/;

/** Build a structured candidate body from the fuzzer, biased toward interesting shapes/boundaries. */
function buildBody(fdp) {
  const shape = fdp.consumeIntegralInRange(0, 6);
  if (shape === 0) {
    // Raw JSON text → may be any JSON value or invalid (then we pass a plain object instead).
    const text = fdp.consumeRemainingAsString();
    try { return JSON.parse(text); } catch { return { network: text }; }
  }
  if (shape === 1) return fdp.consumeRemainingAsString();           // bare string
  if (shape === 2) return fdp.consumeIntegral(4, true);             // bare number
  if (shape === 3) return null;                                     // null
  if (shape === 4) {                                                // array (invalid top-level)
    const n = fdp.consumeIntegralInRange(0, 8);
    return Array.from({ length: n }, () => fdp.consumeIntegralInRange(0, 1000));
  }
  // shape 5/6: a realistic-ish object with fuzzer-chosen fields.
  const networks = ["seed", "forge", "rise", "one", "", "SEED", "mainnet", fdp.consumeString(6)];
  const kinds = ["operator", "seed", "rpc", "", "admin", fdp.consumeString(4)];
  const peersLen = fdp.consumeIntegralInRange(0, 80); // can exceed the 64 cap → tests the slice
  const peers = Array.from({ length: peersLen }, () => fdp.consumeString(fdp.consumeIntegralInRange(0, 12)));
  return {
    network: networks[fdp.consumeIntegralInRange(0, networks.length - 1)],
    port: fdp.consumeIntegralInRange(-10, 70000),  // straddles the [1,65535] boundary
    peerId: fdp.consumeString(fdp.consumeIntegralInRange(0, 20)),
    kind: kinds[fdp.consumeIntegralInRange(0, kinds.length - 1)],
    relayPubkey: fdp.consumeString(fdp.consumeIntegralInRange(0, 200)), // can exceed the 128 cap
    peers: fdp.consumeBoolean() ? peers : fdp.consumeString(8),         // sometimes a non-array
  };
}

export function fuzz(data) {
  const fdp = new FuzzedDataProvider(data);
  const body = buildBody(fdp);

  const r = validateAnnounce(body);
  if (!r || typeof r.ok !== "boolean") throw new Error("validateAnnounce returned a non-result");

  if (r.ok) {
    const v = r.value;
    if (!isNetLabel(v.network) || !ENABLED.includes(v.network))
      throw new Error("CONTRACT BUG: accepted a disabled/invalid network label");
    if (!Number.isInteger(v.port) || v.port < 1 || v.port > 65535)
      throw new Error("CONTRACT BUG: accepted an out-of-range port");
    if (!PEERID_RE.test(v.peerId))
      throw new Error("CONTRACT BUG: accepted a malformed peerId");
    if (!["operator", "seed", "rpc"].includes(v.kind))
      throw new Error("CONTRACT BUG: accepted an invalid kind");
    if (v.relayPubkey !== undefined) {
      if (typeof v.relayPubkey !== "string" || v.relayPubkey.length > 128)
        throw new Error("CONTRACT BUG: relayPubkey exceeds 128 chars");
    }
    if (v.peers !== undefined) {
      if (!Array.isArray(v.peers) || v.peers.length > 64)
        throw new Error("CONTRACT BUG: peers is not an array of ≤64");
      for (const p of v.peers) {
        if (typeof p !== "string" || !PEERID_RE.test(p))
          throw new Error("CONTRACT BUG: peers contains a malformed peerId");
      }
    }
  } else {
    if (typeof r.error !== "string" || r.error.length === 0)
      throw new Error("CONTRACT BUG: reject without a string error");
    if (!Number.isInteger(r.status) || r.status < 400 || r.status > 499)
      throw new Error("CONTRACT BUG: reject status is not a 4xx integer");
  }
}
