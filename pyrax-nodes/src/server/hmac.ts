// SPDX-License-Identifier: LicenseRef-Proprietary
//
// HMAC gate shared with the nodes + apps (ported from pyrax-peer-directory). Authorization header:
//   PYRAX-HMAC ts=<ms>,sig=<hex>
// sig = HMAC-SHA256(PYRAX_DIRECTORY_SECRET) over `${METHOD}\n${PATH}\n${ts}\n${sha256hex(body)}`.
// Replay-protected: ±90s clock window + one-time-use signature cache.
import crypto from "node:crypto";

const SECRET = process.env.PYRAX_DIRECTORY_SECRET || "pyrax-dev-directory-secret-change-me";
const WINDOW_MS = 90_000;
const seen = new Map<string, number>(); // sig -> expiry

export const usingDevSecret = () => SECRET === "pyrax-dev-directory-secret-change-me";

function sweep() {
  const now = Date.now();
  for (const [k, exp] of seen) if (exp < now) seen.delete(k);
}

export function verifyHmac(method: string, path: string, rawBody: string, authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith("PYRAX-HMAC ")) return false;
  const parts: Record<string, string> = {};
  for (const seg of authHeader.slice("PYRAX-HMAC ".length).split(",")) {
    const [k, v] = seg.trim().split("=");
    if (k && v) parts[k] = v;
  }
  const ts = Number(parts.ts);
  const sig = parts.sig;
  if (!Number.isFinite(ts) || !sig) return false;
  if (Math.abs(Date.now() - ts) > WINDOW_MS) return false;
  const bodyHash = crypto.createHash("sha256").update(rawBody || "").digest("hex");
  const canon = `${method}\n${path}\n${ts}\n${bodyHash}`;
  const expect = crypto.createHmac("sha256", SECRET).update(canon).digest("hex");
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return false;
  if (seen.has(sig)) return false; // replay
  seen.set(sig, Date.now() + WINDOW_MS * 2);
  sweep();
  return true;
}

/** Same-origin browser read gate: the request's Origin/Referer host must equal the request host.
 *  Lets the site's own pages read /api/peers while deterring casual cross-origin scraping. */
export function sameOrigin(request: Request): boolean {
  try {
    const host = new URL(request.url).host;
    const o = request.headers.get("origin");
    if (o) return new URL(o).host === host;
    const r = request.headers.get("referer");
    if (r) return new URL(r).host === host;
  } catch { /* fallthrough */ }
  return false;
}
