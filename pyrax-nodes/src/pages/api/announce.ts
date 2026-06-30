// SPDX-License-Identifier: LicenseRef-Proprietary
// Peer announce ingest (HMAC-gated, replay-protected). A node POSTs here every ~10s; we store its
// presence with a 30s TTL and asynchronously enrich it with geo-IP for the globe. Same wire protocol
// as the legacy peers.pyraxchain.com directory — nodes only need their directory host repointed here.
import type { APIRoute } from "astro";
import { verifyHmac } from "../../server/hmac";
import { upsertPeer, patchGeo, TTL_MS } from "../../server/directory";
import { geoLookup } from "../../server/geo";
import { isNetLabel } from "../../lib/networks";

export const prerender = false;
const ENABLED = (process.env.PYRAX_ENABLED_NETWORKS || "seed,forge,rise,one").split(",").map((s) => s.trim()).filter(Boolean);
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const raw = await request.text();
  if (raw.length > 4096) return json({ ok: false, error: "payload too large" }, 413);
  if (!verifyHmac("POST", "/api/announce", raw, request.headers.get("authorization"))) return json({ ok: false, error: "unauthorized" }, 401);

  let b: any;
  try { b = JSON.parse(raw || "{}"); } catch { return json({ ok: false, error: "bad json" }, 400); }

  const network = String(b.network || "");
  if (!isNetLabel(network) || !ENABLED.includes(network)) return json({ ok: false, error: "network not enabled" }, 403);
  const port = Number(b.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return json({ ok: false, error: "bad port" }, 400);
  const peerId = String(b.peerId || "");
  if (!/^[0-9A-Za-z]{6,128}$/.test(peerId)) return json({ ok: false, error: "bad peerId" }, 400);
  const kind = ["operator", "seed", "rpc"].includes(b.kind) ? b.kind : "operator";
  const relayPubkey = b.relayPubkey ? String(b.relayPubkey).slice(0, 128) : undefined;
  // Optional REAL connection topology: the peerIds this node reports being connected to right now.
  const peers = Array.isArray(b.peers)
    ? b.peers.map((x: any) => String(x)).filter((s: string) => /^[0-9A-Za-z]{6,128}$/.test(s)).slice(0, 64)
    : undefined;

  const xff = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  let ip = (typeof b.ip === "string" && b.ip) ? b.ip : (xff || clientAddress || "");
  ip = ip.replace(/^::ffff:/, "");
  const multiaddr = `/ip4/${ip}/tcp/${port}/p2p/${peerId}`;

  upsertPeer({ peerId, network, ip, port, multiaddr, relayPubkey, kind: kind as any, peers });
  void geoLookup(ip).then((g) => { if (g) patchGeo(network, peerId, g); });

  return json({ ok: true, address: multiaddr, ttlMs: TTL_MS });
};
