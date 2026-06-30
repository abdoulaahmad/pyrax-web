// SPDX-License-Identifier: LicenseRef-Proprietary
// Immediate peer removal (HMAC-gated) — the app calls this when a node is destroyed, so it drops from
// the directory without waiting for the TTL to lapse.
import type { APIRoute } from "astro";
import { verifyHmac } from "../../server/hmac";
import { removePeer } from "../../server/directory";

export const prerender = false;
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const POST: APIRoute = async ({ request }) => {
  const raw = await request.text();
  if (!verifyHmac("POST", "/api/deregister", raw, request.headers.get("authorization"))) return json({ ok: false, error: "unauthorized" }, 401);
  let b: any;
  try { b = JSON.parse(raw || "{}"); } catch { return json({ ok: false }, 400); }
  const removed = removePeer(String(b.network || ""), String(b.peerId || ""));
  return json({ ok: true, removed });
};
