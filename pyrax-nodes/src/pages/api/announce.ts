// SPDX-License-Identifier: LicenseRef-Proprietary
// Peer announce ingest (HMAC-gated, replay-protected, rate-limited). A node POSTs here every ~10s; we
// store its presence with a 30s TTL and asynchronously enrich it with geo-IP for the globe. Same wire
// protocol as the legacy peers.pyraxchain.com directory — nodes only need their directory host
// repointed here.
//
// Security model for the embedded IP (it becomes the public multiaddr + is geo-located, so a spoofed
// value would poison the map): we DO NOT trust the request body `b.ip` or `X-Forwarded-For` unless an
// explicit TRUSTED_PROXY flag is set (i.e. a real reverse proxy we trust is in front). By default we
// use the socket peer address (Astro's clientAddress). The IP shape is validated before any use, and
// private/loopback ranges are dropped from geo by isPublicIp() in the geo module.
import type { APIRoute } from "astro";
import { verifyHmac, ingestSecretReady } from "../../server/hmac";
import { upsertPeer, patchGeo, TTL_MS } from "../../server/directory";
import { geoLookup } from "../../server/geo";
import { isNetLabel } from "../../lib/networks";
import { resolveClientIp, multiaddrFor } from "../../server/ip";
import { announceLimiter } from "../../server/ratelimit";

export const prerender = false;
const ENABLED = (process.env.PYRAX_ENABLED_NETWORKS || "seed,forge,rise,one").split(",").map((s) => s.trim()).filter(Boolean);
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export interface AnnounceBody {
  network: string;
  port: number;
  peerId: string;
  kind: "operator" | "seed" | "rpc";
  relayPubkey?: string;
  peers?: string[];
}

/**
 * Pure validation of a parsed announce body. Returns the normalized fields or an `{ error, status }`.
 * Exported for tests — keeps the route handler thin.
 */
export function validateAnnounce(b: any): { ok: true; value: AnnounceBody } | { ok: false; error: string; status: number } {
  const network = String(b?.network || "");
  if (!isNetLabel(network) || !ENABLED.includes(network)) return { ok: false, error: "network not enabled", status: 403 };
  const port = Number(b?.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return { ok: false, error: "bad port", status: 400 };
  const peerId = String(b?.peerId || "");
  if (!/^[0-9A-Za-z]{6,128}$/.test(peerId)) return { ok: false, error: "bad peerId", status: 400 };
  const kind = ["operator", "seed", "rpc"].includes(b?.kind) ? b.kind : "operator";
  const relayPubkey = b?.relayPubkey ? String(b.relayPubkey).slice(0, 128) : undefined;
  const peers = Array.isArray(b?.peers)
    ? b.peers.map((x: any) => String(x)).filter((s: string) => /^[0-9A-Za-z]{6,128}$/.test(s)).slice(0, 64)
    : undefined;
  return { ok: true, value: { network, port, peerId, kind: kind as AnnounceBody["kind"], relayPubkey, peers } };
}

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

  // Resolve the IP from the trusted source (socket by default; body/XFF only with TRUSTED_PROXY=1),
  // shape-validated. An invalid/unresolvable IP yields an empty host — geo is skipped, the node is
  // still recorded so the directory counts it.
  const ip = resolveClientIp({
    clientAddress,
    bodyIp: b?.ip,
    xForwardedFor: request.headers.get("x-forwarded-for"),
  });
  const multiaddr = multiaddrFor(ip, port, peerId);

  upsertPeer({ peerId, network, ip: ip || undefined, port, multiaddr, relayPubkey, kind, peers });
  if (ip) void geoLookup(ip).then((g) => { if (g) patchGeo(network, peerId, g); });

  return json({ ok: true, address: multiaddr, ttlMs: TTL_MS });
};
