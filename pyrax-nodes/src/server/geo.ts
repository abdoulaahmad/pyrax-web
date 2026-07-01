// SPDX-License-Identifier: LicenseRef-Proprietary
// Geo-IP enrichment for the globe (lat/lon/country/city), cached per IP. Runs server-side from this
// host. Disable with PYRAX_GEO_DISABLE=1; override the provider with PYRAX_GEO_URL (use HTTPS).
import { isValidIp, normalizeIp } from "./ip";

const cache = new Map<string, { v: GeoResult | null; exp: number }>();
export interface GeoResult { lat?: number; lon?: number; country?: string; city?: string }

// Bound the per-IP cache so a flood of distinct (possibly forged) IPs can't grow it without limit.
const MAX_CACHE = 50_000;
const SWEEP_MS = 60_000;
let lastSweep = 0;
function sweepCache(now: number) {
  if (now - lastSweep < SWEEP_MS) return;
  lastSweep = now;
  for (const [k, e] of cache) if (e.exp <= now) cache.delete(k);
  // Hard ceiling: if still over the cap after dropping expired, evict the soonest-to-expire entries.
  if (cache.size > MAX_CACHE) evictToCap();
}

// Evict the soonest-to-expire entries until back under the cap. Called on insert too, so the bound
// holds even within a single SWEEP_MS window during a burst of distinct IPs.
function evictToCap() {
  const target = Math.floor(MAX_CACHE * 0.9);
  const entries = [...cache.entries()].sort((a, b) => a[1].exp - b[1].exp);
  for (let i = 0; i < entries.length && cache.size > target; i++) cache.delete(entries[i][0]);
}
function setCache(ip: string, entry: { v: GeoResult | null; exp: number }) {
  cache.set(ip, entry);
  if (cache.size > MAX_CACHE) evictToCap();
}

// SSRF guard. True ONLY for a globally-routable unicast IP we'd send to the geo provider. We normalize
// first so an IPv4-mapped IPv6 form (e.g. ::ffff:10.0.0.1 / ::ffff:127.0.0.1) can't smuggle a private
// or loopback address past these checks. Blocks: RFC1918 private, loopback, link-local (incl. the cloud
// metadata 169.254.169.254), CGNAT (RFC6598 100.64/10), IETF special/benchmark blocks, the unspecified
// address (0.0.0.0 / ::), and IPv6 ULA/link-local. Exported for tests.
export function isPublicIp(raw: string): boolean {
  const ip = normalizeIp(raw);
  if (!ip) return false;
  // IPv4 private / loopback / link-local / CGNAT / unspecified / special-purpose.
  if (/^(0\.|10\.|127\.|192\.168\.|169\.254\.|192\.0\.0\.|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/.test(ip)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return false;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return false; // 100.64.0.0/10 CGNAT
  if (/^198\.1[89]\./.test(ip)) return false;                            // 198.18.0.0/15 benchmarking
  // IPv6 loopback / unspecified / link-local / ULA.
  if (/^(::1$|::$|fe80:|fc00:|fd)/i.test(ip)) return false;
  return true;
}

export async function geoLookup(rawIp: string | undefined): Promise<GeoResult | null> {
  // SSRF guard: only proceed for a syntactically valid, public IP — never a hostname/private/loopback.
  // Normalize so the cache key + the value sent to the provider are the canonical (mapped-stripped) form.
  const ip = rawIp ? normalizeIp(rawIp) : "";
  if (process.env.PYRAX_GEO_DISABLE === "1" || !ip || !isValidIp(ip) || !isPublicIp(ip)) return null;
  sweepCache(Date.now());
  const hit = cache.get(ip);
  if (hit && hit.exp > Date.now()) return hit.v;
  const base = process.env.PYRAX_GEO_URL || "https://ip-api.com/json";
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch(`${base}/${encodeURIComponent(ip)}?fields=status,country,city,lat,lon`, { signal: ctl.signal });
    clearTimeout(t);
    const j = (await r.json()) as any;
    if (j && j.status === "success") {
      const v: GeoResult = { lat: j.lat, lon: j.lon, country: j.country, city: j.city };
      setCache(ip, { v, exp: Date.now() + 24 * 3600_000 });
      return v;
    }
  } catch { /* provider unreachable */ }
  setCache(ip, { v: null, exp: Date.now() + 600_000 });
  return null;
}
