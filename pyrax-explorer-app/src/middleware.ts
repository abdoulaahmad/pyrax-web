// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Security headers for every response. Astro SSR middleware runs on each request; we set a tight
// Content-Security-Policy plus the standard hardening headers. Fonts are self-hosted (see
// src/styles/fonts.css), the RPC console talks to a SAME-ORIGIN proxy (/api/rpc), and brand marks are
// inline data: URIs — so the policy needs no third-party origins.
//
// Notes on the few relaxations:
//   • style-src 'unsafe-inline' — the design system uses inline style="…" attributes (tones/widths)
//     and Astro/React inject inline <style>; nonces aren't threaded through those, so inline styles
//     are allowed. Styles can't exfiltrate or execute, so this is low-risk.
//   • script-src 'unsafe-inline' — Astro's view-transition + React island hydration emit inline
//     bootstrap scripts; without a nonce pipeline they need 'unsafe-inline'. No third-party script
//     origins are allowed, and there is no user-generated HTML, so the XSS surface stays small.
import type { MiddlewareHandler } from "astro";

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

export const onRequest: MiddlewareHandler = async (_ctx, next) => {
  const res = await next();
  const h = res.headers;
  h.set("Content-Security-Policy", CSP);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("X-Frame-Options", "DENY");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=()");
  // HSTS: 2 years, subdomains, preload. Browsers only honor this over HTTPS (Caddy terminates TLS).
  h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  return res;
};
