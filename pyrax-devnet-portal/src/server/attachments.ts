// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Server-side validation of Issue Council attachment references. An attachment is stored on the bug and
// later rendered to every Issue Council viewer (including staff triagers) as <a href>/<img src>/<video
// src>. The browser sends {url,type,name,size}, but NONE of it can be trusted: a tester could POST an
// arbitrary `url` (an off-CDN phishing/tracking destination disguised as an attachment) or a bogus
// `type`. So we accept an attachment ONLY when:
//   • `type` ∈ {image,video,log} (the render switch's known kinds), and
//   • `url` is a public CDN URL under THIS tester's own upload prefix — the exact key namespace the
//     presign endpoint (uploads/sign.ts) issues: <CDN>/devnet/issues/<testerId>/<...>.
// This mirrors the DO Spaces CDN base the presign + CSP modules derive from the same env, so it can't
// drift from what the app actually serves.

const KINDS = new Set(["image", "video", "log"]);

/** Public DO Spaces CDN base (no trailing slash), derived from the SAME env as s3presign/csp. */
export function cdnBase(env: NodeJS.ProcessEnv = process.env): string {
  const region = env.SPACES_REGION || "tor1";
  const bucket = env.SPACES_BUCKET || "pyrax";
  return `https://${bucket}.${region}.cdn.digitaloceanspaces.com`;
}

/** The per-tester key prefix (as a full CDN URL prefix) that uploads/sign.ts presigns for `testerId`. */
export function testerUploadPrefix(testerId: string, env: NodeJS.ProcessEnv = process.env): string {
  return `${cdnBase(env)}/devnet/issues/${testerId}/`;
}

// A per-step proof reference on a Product Test submission also carries which step it proves and a
// client-computed content hash (SHA-256 of the file bytes, hex). The content hash is the ANTI-FRAUD
// primitive: two submissions whose proof shares a content hash are re-using the same photo/video, so
// the observer + reviewers can flag duplicate/recycled proof even when the CDN url differs (each upload
// gets a fresh, unique key). The hash is advisory metadata — it is NOT trusted for access control (the
// url prefix check above is), so a missing/garbage hash simply can't be matched, never grants access.
export interface Attachment { url: string; type: string; name: string; size?: number; stepIndex?: number; contentHash?: string }

/** A 64-hex-char SHA-256 digest, or undefined. Lower-cased; anything else is dropped (advisory only). */
export function normalizeContentHash(h: unknown): string | undefined {
  if (typeof h !== "string") return undefined;
  const v = h.trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(v) ? v : undefined;
}

/**
 * Validate + normalize a single client-supplied attachment for `testerId`. Returns the clean record or
 * null (dropped). Total: never throws. `name` is bounded and `size` coerced to a non-negative integer.
 * `stepIndex` (which step the proof is for) is coerced to a non-negative int; `contentHash` is kept only
 * when it's a well-formed SHA-256 hex digest (advisory dedup metadata, never an access-control input).
 */
export function sanitizeAttachment(a: any, testerId: string, env: NodeJS.ProcessEnv = process.env): Attachment | null {
  if (!a || typeof a !== "object") return null;
  const url = typeof a.url === "string" ? a.url : "";
  const type = typeof a.type === "string" ? a.type : "";
  if (!KINDS.has(type)) return null;
  // The url must live under this tester's own presigned CDN prefix — nothing else is a real attachment.
  const prefix = testerUploadPrefix(testerId, env);
  if (!url.startsWith(prefix)) return null;
  // Defense in depth: no traversal / control chars / smuggled schemes past the prefix.
  const rest = url.slice(prefix.length);
  if (rest.length === 0 || rest.length > 400 || rest.includes("..") || /[\x00-\x1f\s]/.test(rest)) return null;
  const name = (typeof a.name === "string" ? a.name : "attachment").slice(0, 120);
  const size = Number.isFinite(a.size) ? Math.max(0, Math.floor(a.size)) : undefined;
  const stepIndex = Number.isFinite(a.stepIndex) && a.stepIndex >= 0 ? Math.floor(a.stepIndex) : undefined;
  const contentHash = normalizeContentHash(a.contentHash);
  return {
    url, type, name,
    ...(size !== undefined ? { size } : {}),
    ...(stepIndex !== undefined ? { stepIndex } : {}),
    ...(contentHash !== undefined ? { contentHash } : {}),
  };
}

/** Validate an array of client attachments for `testerId`, dropping invalid ones and capping at `cap`
 *  (default 8 — the Issue Council limit; Product Test submissions pass a higher cap so every step can
 *  carry its own proof). */
export function sanitizeAttachments(list: unknown, testerId: string, env: NodeJS.ProcessEnv = process.env, cap = 8): Attachment[] {
  if (!Array.isArray(list)) return [];
  const out: Attachment[] = [];
  for (const a of list) {
    const clean = sanitizeAttachment(a, testerId, env);
    if (clean) out.push(clean);
    if (out.length >= cap) break;
  }
  return out;
}
