// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Security hardening: every response gets strict security headers. The Content-Security-Policy
// is applied in production only (the dev server's HMR needs eval/inline + websockets, which a
// strict CSP would block). HSTS is production-only too (meaningful only over HTTPS).
import { defineMiddleware } from "astro:middleware";

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
    h.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        "upgrade-insecure-requests",
      ].join("; "),
    );
  }
  return res;
});
