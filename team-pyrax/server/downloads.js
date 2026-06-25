// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// team-pyrax — the gated, always-newest download center.
//
// "Newest version" is resolved from the products' OTA metadata on DigitalOcean
// Spaces (electron-updater latest*.yml for Ember/Inferno; a manifest.json for the
// CLI), cached briefly. The actual download is served two ways, set by
// DOWNLOAD_MODE: `presign` mints a short-lived signed Spaces URL straight from the
// bucket (true gating, hand-rolled AWS SigV4 — no SDK); `public` redirects to the
// OTA CDN. Either way the route requires a valid session + the `downloads` role.

import crypto from "node:crypto";
import { OTA_BASE, SPACES, DOWNLOAD_MODE, PRESIGN_TTL_S, PRODUCTS } from "./config.js";

export const PLATFORMS = ["win", "mac", "linux"];
const PLATFORM_LABEL = { win: "Windows", mac: "macOS", linux: "Linux" };
const YML = { win: "latest.yml", mac: "latest-mac.yml", linux: "latest-linux.yml" };

const productByKey = (k) => PRODUCTS.find((p) => p.key === k) ?? null;

// --- newest-version resolution (cached ~5 min) ------------------------------

const cache = new Map(); // `${product}:${platform}` -> { v: {version,file,key}|null, exp }
const CACHE_OK_MS = 5 * 60 * 1000;
const CACHE_MISS_MS = 60 * 1000;

async function fetchText(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/** Pull `version` + the installer filename out of an electron-updater latest*.yml
 *  without a YAML dependency (`path:`, falling back to the first `files: - url:`). */
function parseLatestYml(text) {
  const version = /^version:\s*(.+)$/m.exec(text)?.[1]?.trim();
  let file = /^path:\s*(.+)$/m.exec(text)?.[1]?.trim() ?? /url:\s*(.+)$/m.exec(text)?.[1]?.trim();
  if (file) file = file.replace(/^['"]|['"]$/g, "").trim();
  return version && file ? { version, file } : null;
}

async function resolveOne(product, platform, fresh = false) {
  const ck = `${product.key}:${platform}`;
  // The dashboard catalogue may use the brief cache (a slightly stale version label is
  // fine), but an actual DOWNLOAD must resolve fresh: the release pipeline purges the
  // previous installer on publish, so a cached filename would point at a deleted file
  // and 404. `fresh` forces a re-read of the live latest*.yml / manifest.
  const hit = cache.get(ck);
  if (!fresh && hit && hit.exp > Date.now()) return hit.v;

  let v = null;
  if (product.kind === "electron") {
    const text = await fetchText(`${OTA_BASE}/${product.feed}/${YML[platform]}`);
    const p = text ? parseLatestYml(text) : null;
    if (p) v = { version: p.version, file: p.file, key: `${product.feed}/${p.file}` };
  } else if (product.kind === "manifest") {
    const text = await fetchText(`${OTA_BASE}/${product.feed}/manifest.json`);
    try {
      const m = text ? JSON.parse(text) : null;
      const file = m?.files?.[platform];
      if (m?.version && file) v = { version: String(m.version), file: String(file), key: `${product.feed}/${file}` };
    } catch {
      v = null;
    }
  }
  cache.set(ck, { v, exp: Date.now() + (v ? CACHE_OK_MS : CACHE_MISS_MS) });
  return v;
}

/** The full catalogue for the dashboard: per product, the current version and which
 *  platforms have a build available right now. */
export async function catalogue() {
  return Promise.all(
    PRODUCTS.map(async (p) => {
      const resolved = await Promise.all(PLATFORMS.map((pl) => resolveOne(p, pl)));
      const platforms = {};
      let version = null;
      PLATFORMS.forEach((pl, i) => {
        platforms[pl] = { label: PLATFORM_LABEL[pl], available: !!resolved[i] };
        if (resolved[i] && !version) version = resolved[i].version;
      });
      return { key: p.key, name: p.name, tagline: p.tagline, version, available: !!version, platforms };
    }),
  );
}

/** Resolve the (presigned or public) download URL for product+platform, or null. */
export async function downloadUrl(productKey, platform) {
  const p = productByKey(productKey);
  if (!p || !PLATFORMS.includes(platform)) return null;
  // Resolve FRESH (bypass the cache) so the link always points at the build that is
  // live on the feed right now — never a just-purged previous version.
  const r = await resolveOne(p, platform, true);
  if (!r) return null;
  if (DOWNLOAD_MODE === "presign" && SPACES.key && SPACES.secret && SPACES.bucket) {
    return presignGet(r.key, PRESIGN_TTL_S);
  }
  return `${OTA_BASE}/${r.key}`;
}

// --- AWS SigV4 presign (GET), virtual-hosted style --------------------------
// Produces https://<bucket>.<host>/<key>?X-Amz-Algorithm=...&X-Amz-Signature=...
// DO Spaces is S3-compatible, so standard SigV4 query signing applies.

const sha256hex = (s) => crypto.createHash("sha256").update(s).digest("hex");
const hmac = (key, s) => crypto.createHmac("sha256", key).update(s).digest();

function spacesHost() {
  if (SPACES.endpoint) return SPACES.endpoint.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `${SPACES.region}.digitaloceanspaces.com`;
}

function presignGet(objectKey, expiresS) {
  const host = `${SPACES.bucket}.${spacesHost()}`;
  const region = SPACES.region || "us-east-1";
  const service = "s3";
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;

  const canonicalUri = "/" + objectKey.split("/").map(encodeURIComponent).join("/");
  const params = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${SPACES.key}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresS),
    "X-Amz-SignedHeaders": "host",
  };
  const canonicalQuery = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");
  const canonicalRequest = ["GET", canonicalUri, canonicalQuery, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256hex(canonicalRequest)].join("\n");

  const kDate = hmac("AWS4" + SPACES.secret, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
