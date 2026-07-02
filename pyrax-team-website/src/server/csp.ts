// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Content-Security-Policy builder. Kept pure + dependency-free so the policy — including the small,
// deliberate widenings for the cross-origin services the portal legitimately talks to (the shared
// chat WebSocket + giphy's media CDNs) — is unit-testable and can't silently regress to either
// "too tight" (breaks chat) or "too loose" (a blanket allow). The middleware computes it once at
// module load from the environment.

/** Origin (scheme://host[:port]) of a URL, or null if it doesn't parse. */
export function originOf(u: string | undefined | null): string | null {
  if (!u) return null;
  try {
    return new URL(u).origin;
  } catch {
    return null;
  }
}

/** DigitalOcean Spaces CDN host that serves Issue Council attachment images/videos. Derived from the
 *  SAME SPACES_* env as the presigner (src/server/s3presign.ts), so img-src/media-src can never drift
 *  from the stored attachment URLs. Returns "" when Spaces isn't configured. */
export function spacesCdnOrigin(env: NodeJS.ProcessEnv = process.env): string {
  if (!env.SPACES_KEY || !env.SPACES_SECRET) return "";
  const region = env.SPACES_REGION || "tor1";
  const bucket = env.SPACES_BUCKET || "pyrax";
  return `https://${bucket}.${region}.cdn.digitaloceanspaces.com`;
}

export interface CspEnv {
  /** CHAT_WS_URL — the shared chat WebSocket host (e.g. wss://chat.pyraxchain.com). */
  chatWsUrl?: string | null;
  /** GIPHY_API_KEY — when set, the in-chat GIF picker is enabled (giphy media <img>s render). */
  giphyKey?: string | null;
  /** Spaces CDN origin (spacesCdnOrigin()) — lets Issue Council attachment <img>/<video> render inline. */
  spacesCdn?: string | null;
}

/**
 * Build the production Content-Security-Policy string.
 * - `connect-src` is `'self'` plus the chat WS origin (so the WebSocket handshake isn't refused).
 * - `img-src` is `'self' data:` plus giphy's media hosts only when the GIF picker is enabled.
 * Everything else stays locked down (no inline objects, framing denied, base/form pinned to self).
 */
export function buildCsp(env: CspEnv): string {
  const chatOrigin = originOf(env.chatWsUrl);
  const cdn = env.spacesCdn || "";
  const connectSrc = ["'self'", chatOrigin].filter(Boolean).join(" ");
  const imgSrc = ["'self'", "data:", env.giphyKey ? "https://*.giphy.com" : "", cdn].filter(Boolean).join(" ");
  const mediaSrc = ["'self'", cdn].filter(Boolean).join(" ");
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src ${imgSrc}`,
    `media-src ${mediaSrc}`,
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}
