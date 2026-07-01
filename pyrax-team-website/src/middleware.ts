// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Security middleware, applied to every request:
//   1. CSRF defense-in-depth — same-origin Origin/Referer check on state-changing /api requests.
//   2. Server-side gate on /app — resolve the session BEFORE rendering the portal shell (no
//      client-side auth flash); unauthenticated users are 302'd to "/".
//   3. Strict security headers + (production-only) CSP/HSTS on every response.
import { defineMiddleware } from "astro:middleware";
import { checkRequestCsrf } from "./server/csrf";
import { requireUser } from "./server/guard";
import { json } from "./server/http";
import { buildCsp } from "./server/csp";

// The production CSP, computed once from the environment. It allows the shared chat WebSocket origin
// (CHAT_WS_URL) under connect-src and giphy's media hosts under img-src ONLY when the GIF picker is
// enabled — otherwise a strict `connect-src 'self'` / `img-src 'self' data:` would silently break
// Devnet Chat. See src/server/csp.ts (pure + unit-tested).
const CSP = buildCsp({ chatWsUrl: process.env.CHAT_WS_URL, giphyKey: process.env.GIPHY_API_KEY });

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { request, url } = ctx;

  // --- 1. CSRF: reject cross-origin state-changing API calls (belt-and-suspenders to SameSite=Lax).
  // Auth bootstrap routes (request/verify a sign-in code) run before a session exists; they are
  // anti-enumeration-safe and rate-limited, and a browser still sends a same-origin Origin for them,
  // so they go through the same check. We scope the check to the JSON API surface.
  // The `/api/ember/*` endpoints are called server-to-server by the Ember desktop app (no browser
  // Origin) and are NOT cookie-authenticated — they use an email 9-digit code + a bearer device
  // token, so CSRF (which protects cookie-auth'd browser requests) does not apply. Every other /api
  // route keeps the same-origin check.
  if (url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/ember/")) {
    const csrf = checkRequestCsrf(request);
    if (!csrf.ok) {
      return json({ ok: false, error: "Cross-origin request blocked." }, 403);
    }
  }

  // --- 2. Server-side guard for the authenticated portal shell. Doing this here (instead of a
  // client redirect in Portal.tsx) removes the brief unauthenticated flash and never ships the
  // shell to a signed-out visitor.
  if (url.pathname === "/app" || url.pathname === "/app/") {
    const me = await requireUser(ctx.cookies);
    if (!me) return ctx.redirect("/", 302);
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
