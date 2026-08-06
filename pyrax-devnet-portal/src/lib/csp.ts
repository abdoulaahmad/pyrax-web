// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Pure Content-Security-Policy builder for the portal. Kept out of src/middleware.ts (which imports
// the non-resolvable-in-test `astro:middleware`) so the directive derivation can be unit-tested.
// The policy is intentionally tight; cross-origin allowances are derived from the SAME env the app
// actually uses (chat WS + DigitalOcean Spaces) so they can never drift from runtime behavior.

/** The chat WebSocket lives on a separate origin (CHAT_WS_URL, e.g. wss://chat.pyraxchain.com). A
 *  strict `connect-src 'self'` would block it, so derive its ws/wss origin. Returns "" (nothing extra,
 *  same-origin still works) if the var is unset or not a ws/wss URL. */
export function chatWsOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.CHAT_WS_URL || "";
  if (!raw) return "";
  try {
    const u = new URL(raw);
    if (u.protocol !== "ws:" && u.protocol !== "wss:") return "";
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

/** DigitalOcean Spaces hosts Issue Council attachments: the browser PUTs directly to the bucket
 *  (cross-origin → connect-src) and renders stored images/videos from the CDN host (img/media-src).
 *  Derived from the same env as src/server/s3presign.ts. Null when Spaces isn't configured (uploads
 *  degrade to text-only, so these origins aren't needed). */
export function spacesOrigins(env: NodeJS.ProcessEnv = process.env): { upload: string; cdn: string } | null {
  if (!env.SPACES_KEY || !env.SPACES_SECRET) return null;
  const region = env.SPACES_REGION || "tor1";
  const bucket = env.SPACES_BUCKET || "pyrax";
  return {
    upload: `https://${bucket}.${region}.digitaloceanspaces.com`,
    cdn: `https://${bucket}.${region}.cdn.digitaloceanspaces.com`,
  };
}

// Chat GIFs are rendered as images straight from Giphy's media CDN (e.g. https://media3.giphy.com/…),
// so img-src must include *.giphy.com for the GIF picker previews and posted GIFs.
const GIPHY_IMG = "https://*.giphy.com";

const directive = (...parts: string[]) => parts.filter(Boolean).join(" ");

/** Build the full Content-Security-Policy header value for the given environment. */
export function buildCsp(env: NodeJS.ProcessEnv = process.env): string {
  const chat = chatWsOrigin(env);
  const spaces = spacesOrigins(env);
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    // Fonts are self-hosted (public/fonts, see styles/fonts.css) — no Google Fonts origin needed.
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    directive("img-src 'self' data:", GIPHY_IMG, spaces?.cdn || ""),
    directive("media-src 'self'", spaces?.cdn || ""),
    directive("connect-src 'self'", chat, spaces?.upload || ""),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}
