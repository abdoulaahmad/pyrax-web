// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Security hardening, applied to every request:
//   1. CSRF defense-in-depth — same-origin Origin/Referer check on state-changing /api requests.
//   2. Strict security headers + (production-only) CSP/HSTS on every response.
// The Content-Security-Policy is applied in production only (the dev server's HMR needs eval/inline +
// websockets, which a strict CSP would block). HSTS is production-only too (meaningful over HTTPS).
import { defineMiddleware } from "astro:middleware";
import { buildCsp } from "./lib/csp";
import { checkRequestCsrf } from "./server/csrf";
import { json } from "./server/http";

// CSP is derived once at module load from the runtime env: the chat WS origin (CHAT_WS_URL) is added
// to connect-src, and — when DigitalOcean Spaces is configured — the bucket upload host (connect-src)
// and CDN host (img-src/media-src) for Issue Council attachments, plus *.giphy.com for chat GIFs.
// See src/lib/csp.ts (unit-tested there). Falls back safely to 'self'-only directives when unset.
const CSP = buildCsp();

// Server-to-server API surfaces that are cookie-free and authenticated by their own credentials, so
// the browser same-origin CSRF check (which protects cookie-auth'd requests) does not apply:
//   /api/app/*        — the Inferno desktop app's device-login (9-digit OTP + bearer device token),
//                       called from the app's MAIN process with no browser Origin.
//   /api/node/pair    — the app/CLI redeeming a short pairing code to link a node (public, code-auth).
//   /api/node/heartbeat — the app/CLI's periodic heartbeat (Authorization: Bearer <nodeToken>).
// Every other /api route (cookie/session-authenticated browser calls) keeps the same-origin check.
function csrfExempt(pathname: string): boolean {
  return pathname.startsWith("/api/app/") || pathname === "/api/node/pair" || pathname === "/api/node/heartbeat";
}

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
  // --- 1. CSRF: reject cross-origin state-changing API calls (belt-and-suspenders to SameSite=Lax).
  // Scoped to the JSON API surface; safe methods (GET/HEAD/OPTIONS) always pass inside checkCsrf.
  if (url.pathname.startsWith("/api/") && !csrfExempt(url.pathname)) {
    const csrf = checkRequestCsrf(request);
    if (!csrf.ok) return json({ ok: false, error: "Cross-origin request blocked." }, 403);
  }

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
