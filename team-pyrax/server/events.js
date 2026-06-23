// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Fire-and-forget on-chain event emitter: POSTs a curated event to the PYRAX events
// relayer (`pyrax relay`), HMAC-signed exactly as the relayer expects. Zero deps
// (Node built-ins only). It NEVER blocks the caller and NEVER throws — if the
// relayer or its secret is absent/unreachable, it is a silent no-op. On-chain
// events are non-critical telemetry; logins must always succeed regardless.

import crypto from "node:crypto";

const RELAY_BASE = process.env.RELAY_BASE || ""; // e.g. http://127.0.0.1:8799
const RELAY_SECRET = process.env.PYRAX_RELAY_SECRET || "";

/**
 * Emit a curated on-chain event (fire-and-forget — returns immediately). The relayer
 * records it as a gas-only transaction on the newest live network. `kind` must be one
 * of the relayer's allowed kinds (e.g. "team-login").
 */
export function emitEvent(kind) {
  if (!RELAY_BASE || !RELAY_SECRET) return; // not configured → no-op
  const body = JSON.stringify({ kind });
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = crypto.createHmac("sha256", RELAY_SECRET).update(`${ts}.${body}`).digest("hex");
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 3000);
  // Best-effort: swallow every error (network, abort, non-2xx); never propagate.
  fetch(`${RELAY_BASE}/event`, {
    method: "POST",
    headers: { "content-type": "application/json", "X-Timestamp": ts, "X-Signature": sig },
    body,
    signal: ctl.signal,
  })
    .catch(() => {})
    .finally(() => clearTimeout(timer));
}
