// SPDX-License-Identifier: LicenseRef-Proprietary
// Peer announce ingest (HMAC-gated, replay-protected, rate-limited). A node POSTs here every ~10s; we
// store its presence with a 30s TTL and asynchronously enrich it with geo-IP for the globe. Same wire
// protocol as the legacy peers.pyraxchain.com directory — nodes only need their directory host
// repointed here.
//
// Security model for the embedded IP (it becomes the public multiaddr + is geo-located, so a spoofed
// value would poison the map): we DO NOT trust the request body `b.ip` or `X-Forwarded-For` unless an
// explicit TRUSTED_PROXY flag is set (i.e. a real reverse proxy we trust is in front). By default we
// use the socket peer address (Astro's clientAddress). With TRUSTED_PROXY set we read the proxy-attested
// hop from the RIGHT of X-Forwarded-For (never the client-controlled leftmost entry), never the body ip.
// The IP shape is validated before any use, and private/loopback ranges are dropped from geo by
// isPublicIp() in the geo module.
import type { APIRoute } from "astro";
import { verifyHmac, ingestSecretReady } from "../../server/hmac";
import { upsertPeer, patchGeo, TTL_MS } from "../../server/directory";
import { geoLookup } from "../../server/geo";
import { resolveClientIp, multiaddrFor } from "../../server/ip";
import { announceLimiter } from "../../server/ratelimit";
import { validateAnnounce, type AnnounceBody } from "../../server/announce-validate";

// Re-exported so existing importers of the route keep working; the implementation lives in the pure,
// side-effect-free announce-validate module (importable + fuzzable without the route's timers).
export { validateAnnounce, type AnnounceBody };

export const prerender = false;
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Fail closed: in production, refuse ingest if no real directory secret is configured (the published
  // dev secret would otherwise let anyone forge announces and poison the peer map).
  if (!ingestSecretReady()) return json({ ok: false, error: "ingest not configured" }, 503);

  // Per-IP rate limit (the socket peer — not spoofable XFF) to blunt announce floods.
  const limiterKey = (clientAddress || "unknown").replace(/^::ffff:/i, "");
  if (!announceLimiter.take(limiterKey)) return json({ ok: false, error: "rate limited" }, 429);

  const raw = await request.text();
  if (raw.length > 4096) return json({ ok: false, error: "payload too large" }, 413);
  if (!verifyHmac("POST", "/api/announce", raw, request.headers.get("authorization"))) return json({ ok: false, error: "unauthorized" }, 401);

  let b: any;
  try { b = JSON.parse(raw || "{}"); } catch { return json({ ok: false, error: "bad json" }, 400); }

  const v = validateAnnounce(b);
  if (!v.ok) return json({ ok: false, error: v.error }, v.status);
  const { network, port, peerId, kind, relayPubkey, peers } = v.value;

  // Resolve the IP from the trusted source (socket by default; the proxy-attested XFF hop only with
  // TRUSTED_PROXY=1 — never the body ip), shape-validated. An invalid/unresolvable IP yields an empty
  // host — geo is skipped, the node is still recorded so the directory counts it.
  const ip = resolveClientIp({
    clientAddress,
    xForwardedFor: request.headers.get("x-forwarded-for"),
    // Authoritative real-node IP behind the Cloudflare edge (unforgeable; honored only with
    // TRUSTED_PROXY=1). Without this the ingest records the rotating CF edge IP and geo never resolves.
    cfConnectingIp: request.headers.get("cf-connecting-ip"),
  });
  const multiaddr = multiaddrFor(ip, port, peerId);

  upsertPeer({ peerId, network, ip: ip || undefined, port, multiaddr, relayPubkey, kind, peers });
  if (ip) void geoLookup(ip).then((g) => { if (g) patchGeo(network, peerId, g); });

  return json({ ok: true, address: multiaddr, ttlMs: TTL_MS });
};
