// SPDX-License-Identifier: LicenseRef-Proprietary
// Geo-IP enrichment for the globe (lat/lon/country/city), cached per IP. Runs server-side from this
// host. Disable with PYRAX_GEO_DISABLE=1; override the provider with PYRAX_GEO_URL (use HTTPS).
const cache = new Map<string, { v: GeoResult | null; exp: number }>();
export interface GeoResult { lat?: number; lon?: number; country?: string; city?: string }

const isPublicIp = (ip: string) =>
  !!ip && !/^(10\.|127\.|192\.168\.|169\.254\.|::1|fe80:|fc00:|fd)/i.test(ip) && !/^172\.(1[6-9]|2\d|3[01])\./.test(ip);

export async function geoLookup(ip: string | undefined): Promise<GeoResult | null> {
  if (process.env.PYRAX_GEO_DISABLE === "1" || !ip || !isPublicIp(ip)) return null;
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
      cache.set(ip, { v, exp: Date.now() + 24 * 3600_000 });
      return v;
    }
  } catch { /* provider unreachable */ }
  cache.set(ip, { v: null, exp: Date.now() + 600_000 });
  return null;
}
