// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Dependency-free AWS SigV4 for DigitalOcean Spaces (no aws-sdk). Two capabilities:
//   1. LIST  — SigV4-signed GET `?list-type=2&prefix=<feed>/` to discover the current installer
//              filename per platform (the version is baked into the filename, and release.yml keeps
//              ONLY the newest build per feed via `aws s3 sync --delete`).
//   2. PRESIGN — a SigV4 query-signed GET URL for a private object, so a browser can download it
//              directly from the private bucket without the credentials ever leaving the server.
//
// The desktop-app installers live in a PRIVATE Spaces bucket under three feeds:
//   node/  = Inferno installers   (Inferno-*.exe / *.dmg / *.AppImage + latest*.yml + *.blockmap)
//   ember/ = Ember installers     (not exposed by the public nodes site)
//   cli/   = pyrax-cli-*-windows-x86_64.zip / *-mac.tar.gz / *-linux.tar.gz + manifest.json
//
// Ported from pyrax-devnet-portal/src/server/s3presign.ts (same SigV4 core), extended with LIST +
// feed resolution. Fails closed: if creds aren't configured, spacesConfigured() is false and the
// download API reports "no build published" honestly instead of emitting a broken link.
import crypto from "node:crypto";

const ACCESS = process.env.SPACES_KEY || "";
const SECRET = process.env.SPACES_SECRET || "";
const REGION = process.env.SPACES_REGION || "tor1";
const BUCKET = process.env.SPACES_BUCKET || "pyrax";
// SPACES_ENDPOINT is the regional endpoint, e.g. https://tor1.digitaloceanspaces.com. We derive the
// virtual-hosted-style host (<bucket>.<region>.digitaloceanspaces.com) that SigV4 must sign against.
const ENDPOINT = process.env.SPACES_ENDPOINT || `https://${REGION}.digitaloceanspaces.com`;

/** Regional origin host (no bucket), e.g. tor1.digitaloceanspaces.com. */
function endpointHost(): string {
  try {
    return new URL(ENDPOINT).host;
  } catch {
    return `${REGION}.digitaloceanspaces.com`;
  }
}
/** Virtual-hosted-style host the browser + SigV4 use, e.g. pyrax.tor1.digitaloceanspaces.com. */
const HOST = `${BUCKET}.${endpointHost()}`;

/** True only when real Spaces credentials are configured — otherwise downloads degrade gracefully. */
export const spacesConfigured = (): boolean => !!(ACCESS && SECRET);

const hmac = (key: crypto.BinaryLike, data: string) => crypto.createHmac("sha256", key).update(data).digest();
const sha256hex = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const encKey = (k: string) => k.split("/").map(enc).join("/");

function amzNow(): { amzdate: string; datestamp: string } {
  const amzdate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  return { amzdate, datestamp: amzdate.slice(0, 8) };
}

function signingKey(datestamp: string): Buffer {
  const kDate = hmac("AWS4" + SECRET, datestamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
}

/**
 * Presigned GET URL for a private object `key`, valid for `expiresSec`. The browser can GET this URL
 * directly — the signature authorizes exactly this object for exactly this window; the secret never
 * leaves the server. Returns "" if creds aren't configured (caller treats that as "unavailable").
 */
export function presignGet(key: string, expiresSec = 900): string {
  if (!spacesConfigured()) return "";
  const { amzdate, datestamp } = amzNow();
  const scope = `${datestamp}/${REGION}/s3/aws4_request`;
  const signedHeaders = "host";
  const q = new Map<string, string>([
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${ACCESS}/${scope}`],
    ["X-Amz-Date", amzdate],
    ["X-Amz-Expires", String(expiresSec)],
    ["X-Amz-SignedHeaders", signedHeaders],
  ]);
  const canonicalQuery = [...q.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${enc(k)}=${enc(v)}`).join("&");
  const canonicalUri = "/" + encKey(key);
  const canonicalHeaders = `host:${HOST}\n`;
  const canonicalRequest = ["GET", canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzdate, scope, sha256hex(canonicalRequest)].join("\n");
  const signature = crypto.createHmac("sha256", signingKey(datestamp)).update(stringToSign).digest("hex");
  return `https://${HOST}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/** Result of parsing one ListObjectsV2 XML page: keys on the page + the next continuation token. */
export interface ListKeysPage { keys: string[]; nextToken?: string }

/**
 * Pure parser for one ListObjectsV2 XML response body. Extracted from listKeys() so the untrusted-XML
 * handling can be unit-tested and fuzzed in isolation (a bucket response is bytes we don't control).
 * Total: any string — including malformed/truncated/hostile XML — yields a `ListKeysPage` (never
 * throws), with `<Key>` values entity-decoded. The caller stops paginating when there's no token.
 */
export function parseListKeysPage(xml: string): ListKeysPage {
  const keys: string[] = [];
  for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.push(decodeXml(m[1]));
  const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
  const next = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
  return { keys, nextToken: truncated && next ? decodeXml(next[1]) : undefined };
}

/**
 * List object keys under `prefix` via SigV4-signed ListObjectsV2. Returns the flat list of keys
 * (handles pagination). Throws on a non-2xx response so the caller can degrade to "unavailable".
 */
export async function listKeys(prefix: string): Promise<string[]> {
  if (!spacesConfigured()) return [];
  const keys: string[] = [];
  let token: string | undefined;
  // Bounded loop: feeds hold a handful of files, but paginate defensively (cap 20 pages).
  for (let page = 0; page < 20; page++) {
    const { amzdate, datestamp } = amzNow();
    const scope = `${datestamp}/${REGION}/s3/aws4_request`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    const params = new Map<string, string>([
      ["list-type", "2"],
      ["prefix", prefix],
    ]);
    if (token) params.set("continuation-token", token);
    const canonicalQuery = [...params.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${enc(k)}=${enc(v)}`).join("&");
    const payloadHash = sha256hex("");
    const canonicalHeaders = `host:${HOST}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzdate}\n`;
    const canonicalRequest = ["GET", "/", canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");
    const stringToSign = ["AWS4-HMAC-SHA256", amzdate, scope, sha256hex(canonicalRequest)].join("\n");
    const signature = crypto.createHmac("sha256", signingKey(datestamp)).update(stringToSign).digest("hex");
    const authorization = `AWS4-HMAC-SHA256 Credential=${ACCESS}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const res = await fetch(`https://${HOST}/?${canonicalQuery}`, {
      method: "GET",
      headers: { host: HOST, "x-amz-date": amzdate, "x-amz-content-sha256": payloadHash, authorization },
    });
    if (!res.ok) throw new Error(`Spaces list ${prefix} failed: ${res.status}`);
    const xml = await res.text();
    const page = parseListKeysPage(xml);
    keys.push(...page.keys);
    if (!page.nextToken) break;
    token = page.nextToken;
  }
  return keys;
}

function decodeXml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
