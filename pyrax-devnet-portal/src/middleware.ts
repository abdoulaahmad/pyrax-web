// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Security hardening: every response gets strict security headers. The Content-Security-Policy
// is applied in production only (the dev server's HMR needs eval/inline + websockets, which a
// strict CSP would block). HSTS is production-only too (meaningful only over HTTPS).
import { defineMiddleware } from "astro:middleware";
import { buildCsp } from "./lib/csp";

// CSP is derived once at module load from the runtime env: the chat WS origin (CHAT_WS_URL) is added
// to connect-src, and — when DigitalOcean Spaces is configured — the bucket upload host (connect-src)
// and CDN host (img-src/media-src) for Issue Council attachments, plus *.giphy.com for chat GIFs.
// See src/lib/csp.ts (unit-tested there). Falls back safely to 'self'-only directives when unset.
const CSP = buildCsp();

export const onRequest = defineMiddleware(async (_ctx, next) => {
  const res = await next();
  const h = res.headers;
  h.set("X-Frame-Options", "DENY");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()");
  h.set("X-DNS-Prefetch-Control", "off");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("X-Permitted-Cross-Domain-Policies", "none");

  if (import.meta.env.PROD) {
    h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    h.set("Content-Security-Policy", CSP);
  }
  return res;
});
