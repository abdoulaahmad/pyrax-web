// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Node Control — the team-pyrax server's client for the self-hosted tunnel relay's
// HMAC-gated /__admin control plane (the live node registry + the remote kill switch).
// Each call is signed exactly the way the relay verifies (relay.mjs `adminOk`): an
// Authorization header `PYRAX-HMAC ts=<ms-epoch>,sig=<64-hex>` over the newline-joined
// `METHOD\nPATHNAME\nTS\nSHA256HEX(body)`. The shared secret is PYRAX_TUNNEL_ADMIN_SECRET
// (must equal the relay's). Server-to-server only — the browser never sees the secret.

import crypto from "node:crypto";
import { TUNNEL_ADMIN_BASE, TUNNEL_ADMIN_SECRET } from "./config.js";

function authHeader(method, pathname, body) {
  const ts = Date.now();
  const bodyHash = crypto.createHash("sha256").update(body).digest("hex");
  const sig = crypto
    .createHmac("sha256", TUNNEL_ADMIN_SECRET)
    .update(`${method}\n${pathname}\n${ts}\n${bodyHash}`)
    .digest("hex");
  return `PYRAX-HMAC ts=${ts},sig=${sig}`;
}

async function call(method, pathname, body = "") {
  if (!TUNNEL_ADMIN_SECRET) {
    return { status: 503, body: { error: "Node control is not configured (PYRAX_TUNNEL_ADMIN_SECRET unset)." } };
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(`${TUNNEL_ADMIN_BASE}${pathname}`, {
      method,
      headers: { "content-type": "application/json", authorization: authHeader(method, pathname, body) },
      body: method === "GET" ? undefined : body,
      signal: ctl.signal,
    });
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    return { status: res.status, body: json };
  } catch {
    return { status: 502, body: { error: "The tunnel relay is unreachable." } };
  } finally {
    clearTimeout(timer);
  }
}

/** Live node registry (id, versions, current?, connected, lastSeen, killed). */
export function listNodes() {
  return call("GET", "/__admin/nodes");
}
/** Remote KILL: force-stop a node + keep it down (last resort / force-update). */
export function killNode(id) {
  return call("POST", `/__admin/nodes/${id}/kill`);
}
/** Manual un-kill (a node also auto-un-kills once it updates to the current version). */
export function unkillNode(id) {
  return call("POST", `/__admin/nodes/${id}/unkill`);
}
