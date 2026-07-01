// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Minimal, dependency-free AWS SigV4 for DigitalOcean Spaces (bucket "pyrax", tor1). Provides:
//   • presignPut  — browser uploads Issue Council attachments directly to Spaces (public-read keys).
//   • listPrefix  — SigV4-signed ListObjectsV2 (GET ?list-type=2) to discover the current build.
//   • presignGet  — presigned GET for a PRIVATE object (the release feeds live in a private bucket,
//                   so download links must be time-limited signed URLs, never public CDN URLs).
//   • getObjectText — SigV4-signed GET that returns an object's body as text (for cli/manifest.json).
// If creds aren't configured, the upload flow degrades gracefully (text-only reports still work) and
// the downloads feed reports "no build available yet" rather than emitting a broken link.
import crypto from "node:crypto";

const ACCESS = process.env.SPACES_KEY || "";
const SECRET = process.env.SPACES_SECRET || "";
const REGION = process.env.SPACES_REGION || "tor1";
const BUCKET = process.env.SPACES_BUCKET || "pyrax";
// SPACES_ENDPOINT (e.g. "https://tor1.digitaloceanspaces.com" or a bare host) is honored when set so
// the origin can be overridden without code changes; otherwise it's derived from region + bucket.
const HOST = spacesHost();
const CDN = `https://${BUCKET}.${REGION}.cdn.digitaloceanspaces.com`;

/** Virtual-hosted bucket host, derived from SPACES_ENDPOINT when provided, else region-derived. */
function spacesHost(): string {
  const ep = (process.env.SPACES_ENDPOINT || "").trim();
  if (ep) {
    let h = ep.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
    // If the endpoint is the regional root (no bucket), prefix the bucket for virtual-hosted style.
    if (h && !h.startsWith(`${BUCKET}.`)) h = `${BUCKET}.${h}`;
    if (h) return h;
  }
  return `${BUCKET}.${REGION}.digitaloceanspaces.com`;
}

export const spacesConfigured = () => !!(ACCESS && SECRET);

const hmac = (key: crypto.BinaryLike, data: string) => crypto.createHmac("sha256", key).update(data).digest();
const sha256hex = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const encKey = (k: string) => k.split("/").map(enc).join("/");

/** Presigned PUT URL for `key`, valid `expiresSec`. The browser PUTs with header x-amz-acl:public-read. */
export function presignPut(key: string, expiresSec = 900): { url: string; publicUrl: string; headers: Record<string, string> } {
  const now = new Date();
  const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const datestamp = amzdate.slice(0, 8);
  const scope = `${datestamp}/${REGION}/s3/aws4_request`;
  const signedHeaders = "host;x-amz-acl";
  const q = new Map<string, string>([
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${ACCESS}/${scope}`],
    ["X-Amz-Date", amzdate],
    ["X-Amz-Expires", String(expiresSec)],
    ["X-Amz-SignedHeaders", signedHeaders],
  ]);
  const canonicalQuery = [...q.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${enc(k)}=${enc(v)}`).join("&");
  const canonicalUri = "/" + encKey(key);
  const canonicalHeaders = `host:${HOST}\nx-amz-acl:public-read\n`;
  const canonicalRequest = ["PUT", canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzdate, scope, sha256hex(canonicalRequest)].join("\n");
  const kDate = hmac("AWS4" + SECRET, datestamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  const url = `https://${HOST}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  return { url, publicUrl: `${CDN}/${key}`, headers: { "x-amz-acl": "public-read" } };
}

/** Derive the SigV4 signing key for the current date/region. */
function signingKey(datestamp: string): Buffer {
  const kDate = hmac("AWS4" + SECRET, datestamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
}

/**
 * Presigned GET URL for a PRIVATE object, valid `expiresSec` (default 1h). Query-string SigV4 — no
 * headers needed, so the browser can fetch it directly. Use for release installers in a private bucket.
 */
export function presignGet(key: string, expiresSec = 3600): string {
  const now = new Date();
  const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const datestamp = amzdate.slice(0, 8);
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

/** One object key returned by a bucket listing. */
export interface SpacesObject { key: string; size: number; lastModified: number }

/** Result of parsing one ListObjectsV2 XML page: the objects on the page + the next continuation token. */
export interface ListPage { objects: SpacesObject[]; nextToken?: string }

/**
 * Pure parser for one ListObjectsV2 XML response body. Extracted from listPrefix() so the untrusted-
 * XML handling can be unit-tested and fuzzed in isolation (the input is a bucket response, i.e. bytes
 * we don't control). It is total: any string — including malformed, truncated, or hostile XML — yields
 * a `ListPage` (never throws), with folder placeholders skipped and entities decoded. `objects` may be
 * empty and `nextToken` undefined; the caller stops paginating when there's no token.
 */
export function parseListObjectsV2(xml: string): ListPage {
  const objects: SpacesObject[] = [];
  for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
    const block = m[1];
    const key = (block.match(/<Key>([\s\S]*?)<\/Key>/)?.[1] || "").trim();
    if (!key || key.endsWith("/")) continue; // skip folder placeholders
    const size = Number(block.match(/<Size>(\d+)<\/Size>/)?.[1] || 0);
    const lm = block.match(/<LastModified>([\s\S]*?)<\/LastModified>/)?.[1] || "";
    objects.push({ key: decodeXml(key), size, lastModified: lm ? Date.parse(lm) : 0 });
  }
  const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
  const nextToken = truncated ? (xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1] || "").trim() : undefined;
  return { objects, nextToken: nextToken || undefined };
}

/**
 * List objects under `prefix` via SigV4-signed ListObjectsV2 (GET ?list-type=2&prefix=…). Returns the
 * keys in the bucket root's feed (e.g. "node/", "cli/"). Signed with AUTHORIZATION header (not query)
 * so it works against a private bucket. Follows continuation tokens up to `maxPages` (feeds are tiny —
 * only the newest build is kept — so one page is the norm).
 */
export async function listPrefix(prefix: string, maxPages = 5): Promise<SpacesObject[]> {
  if (!spacesConfigured()) return [];
  const out: SpacesObject[] = [];
  let token: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const now = new Date();
    const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const datestamp = amzdate.slice(0, 8);
    const scope = `${datestamp}/${REGION}/s3/aws4_request`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    const params = new Map<string, string>([
      ["list-type", "2"],
      ["max-keys", "1000"],
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
      headers: { authorization, "x-amz-date": amzdate, "x-amz-content-sha256": payloadHash },
    });
    if (!res.ok) throw new Error(`Spaces list ${prefix} failed: ${res.status}`);
    const xml = await res.text();
    const page = parseListObjectsV2(xml);
    out.push(...page.objects);
    token = page.nextToken;
    if (!token) break;
  }
  return out;
}

/** Fetch a private object's body as text via a short-lived presigned GET (e.g. cli/manifest.json). */
export async function getObjectText(key: string): Promise<string | null> {
  if (!spacesConfigured()) return null;
  const res = await fetch(presignGet(key, 120));
  if (!res.ok) return null;
  return res.text();
}

const XML_ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
function decodeXml(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|apos);/g, (m) => XML_ENTITIES[m] || m);
}
