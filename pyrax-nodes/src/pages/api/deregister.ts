// SPDX-License-Identifier: LicenseRef-Proprietary
// Immediate peer removal (HMAC-gated) — the app calls this when a node is destroyed, so it drops from
// the directory without waiting for the TTL to lapse.
import type { APIRoute } from "astro";
import { verifyHmac, ingestSecretReady } from "../../server/hmac";
import { removePeer } from "../../server/directory";
import { deregisterLimiter } from "../../server/ratelimit";
import { isNetLabel } from "../../lib/networks";

export const prerender = false;
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// peerId shape mirrors announce-validate (so garbage/oversized ids can't be used to churn the limiter
// or the directory). Same charset + length bound the announce path enforces before a peer is stored.
const isPeerId = (s: string) => /^[0-9A-Za-z]{6,128}$/.test(s);

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Fail closed: refuse in production when no real directory secret is configured (see hmac.ts).
  if (!ingestSecretReady()) return json({ ok: false, error: "ingest not configured" }, 503);

  // Per-IP rate limit (the socket peer — not spoofable XFF) to blunt directory-churn floods: the shared
  // HMAC secret authenticates the MESSAGE, not the node, so any holder could otherwise loop deregister
  // over every live peerId faster than the ~10s re-announce cycle and keep the public map blanked.
  const limiterKey = (clientAddress || "unknown").replace(/^::ffff:/i, "");
  if (!deregisterLimiter.take(limiterKey)) return json({ ok: false, error: "rate limited" }, 429);

  const raw = await request.text();
  if (raw.length > 4096) return json({ ok: false, error: "payload too large" }, 413);
  if (!verifyHmac("POST", "/api/deregister", raw, request.headers.get("authorization"))) return json({ ok: false, error: "unauthorized" }, 401);
  let b: any;
  try { b = JSON.parse(raw || "{}"); } catch { return json({ ok: false }, 400); }

  const network = String(b?.network || "");
  const peerId = String(b?.peerId || "");
  // Reject malformed identifiers before touching the directory — a well-formed request removes a peer
  // that self-heals on its next announce; a malformed one is only ever an attempt to probe/churn.
  if (!isNetLabel(network)) return json({ ok: false, error: "bad network" }, 400);
  if (!isPeerId(peerId)) return json({ ok: false, error: "bad peerId" }, 400);

  const removed = removePeer(network, peerId);
  return json({ ok: true, removed });
};
