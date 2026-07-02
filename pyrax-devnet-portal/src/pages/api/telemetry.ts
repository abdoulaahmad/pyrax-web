// SPDX-License-Identifier: LicenseRef-Proprietary
// Anonymous, OPT-IN app telemetry ingest. No auth — the caller is identified ONLY by a random install
// id it mints (never a tester or node token), so a snapshot cannot be tied back to a person. Rate-
// limited per source IP AND per install id; country is derived server-side from Cloudflare's
// CF-IPCountry header (the client never sends geo). Feeds the team Statistics page.
import type { APIRoute } from "astro";
import { recordTelemetry } from "../../server/db";
import { json } from "../../server/http";
import { rateLimited, ipKey } from "../../server/ratelimit";

export const prerender = false;
const APPS = new Set(["inferno", "ember", "pyrax-cli"]);

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Throttle by source IP BEFORE any parsing so a flood can't hammer the DB. Snapshots are ~5-minutely.
  const ipLimited = rateLimited(`tm:ip:${ipKey(request, clientAddress)}`, 60, 60_000);
  if (ipLimited) return ipLimited;

  const b = await request.json().catch(() => ({}));
  const installId = String(b?.installId ?? "").trim();
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(installId)) return json({ ok: false, error: "bad install id" }, 400);
  const idLimited = rateLimited(`tm:id:${installId}`, 6, 60_000); // per-install cap
  if (idLimited) return idLimited;

  const app = APPS.has(String(b?.app)) ? String(b.app) : "unknown";
  const appVersion = typeof b?.appVersion === "string" ? b.appVersion.slice(0, 24) : undefined;
  const os = typeof b?.os === "string" ? b.os.slice(0, 24) : undefined;
  const country = ((request.headers.get("cf-ipcountry") || "").slice(0, 2).toUpperCase()) || undefined;

  // The opt-in metric bundle — size-capped defensively (it's anonymous + structured by the app).
  let data: unknown = {};
  if (b && typeof b.data === "object" && b.data !== null && JSON.stringify(b.data).length <= 8000) data = b.data;

  await recordTelemetry(installId, { app, appVersion, os, country, data });
  return json({ ok: true, nextSec: 300 });
};
