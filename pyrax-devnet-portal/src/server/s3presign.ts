// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Minimal, dependency-free AWS SigV4 presigned PUT for DigitalOcean Spaces (bucket "pyrax", tor1).
// Lets the browser upload Issue Council attachments directly to Spaces. Files are public-read with
// unguessable keys; the CDN URL is stored on the bug. If creds aren't configured, the upload flow
// degrades gracefully (text-only reports still work).
import crypto from "node:crypto";

const ACCESS = process.env.SPACES_KEY || "";
const SECRET = process.env.SPACES_SECRET || "";
const REGION = process.env.SPACES_REGION || "tor1";
const BUCKET = process.env.SPACES_BUCKET || "pyrax";
const HOST = `${BUCKET}.${REGION}.digitaloceanspaces.com`;
const CDN = `https://${BUCKET}.${REGION}.cdn.digitaloceanspaces.com`;

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
