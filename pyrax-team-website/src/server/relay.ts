// SPDX-License-Identifier: LicenseRef-Proprietary
// Server-to-server client for the tunnel relay's admin control plane (/__admin/*), used by the Node
// Control page. Signs each request PYRAX-HMAC (the same scheme as the peer directory) with
// PYRAX_TUNNEL_ADMIN_SECRET, which the relay holds too. Reaches the relay over the INTERNAL docker
// network (TUNNEL_RELAY_ADMIN_URL, default http://tunnel-relay:8792) — /__admin is never publicly
// routed by Caddy, so this control plane is not exposed to the internet.
import crypto from "node:crypto";

const RELAY_URL = (process.env.TUNNEL_RELAY_ADMIN_URL || "http://tunnel-relay:8792").replace(/\/+$/, "");
const SECRET = process.env.PYRAX_TUNNEL_ADMIN_SECRET || "";
const sha256hex = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export const relayConfigured = () => !!SECRET;

/** Call the relay admin control plane with a PYRAX-HMAC signature over `${METHOD}\n${path}\n${ts}\n
 *  ${sha256hex(body)}`. Returns { ok, status, data }. Never throws — a network error is a 502. */
export async function relayAdmin(method: "GET" | "POST", path: string, body = ""): Promise<{ ok: boolean; status: number; data: any }> {
  if (!SECRET) return { ok: false, status: 503, data: { error: "Node control isn't configured (relay admin secret unset)." } };
  const ts = Date.now();
  const sig = crypto.createHmac("sha256", SECRET).update(`${method}\n${path}\n${ts}\n${sha256hex(body)}`).digest("hex");
  try {
    const res = await fetch(`${RELAY_URL}${path}`, {
      method,
      headers: { authorization: `PYRAX-HMAC ts=${ts},sig=${sig}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: method === "POST" ? body : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 502, data: { error: "Could not reach the tunnel relay." } };
  }
}
