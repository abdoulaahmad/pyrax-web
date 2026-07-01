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
import { cookieChainId } from "./server/chain";
import { teamDefaultChain } from "./server/settings";
import { reportServerError, redact } from "./server/sentinel";

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

export const onRequest: MiddlewareHandler = async (ctx, next) => {
  // Default a first-time visitor (no explicit pyrax_net choice) to the team-managed cross-site default
  // network, persisted as a cookie so every SSR page + the topbar selector agree from then on. Only for
  // top-level document GETs; API/asset requests are skipped. Best-effort — never blocks the response.
  if (ctx.request.method === "GET" && !ctx.url.pathname.startsWith("/api/") && cookieChainId(ctx.request.headers.get("cookie")) === null) {
    try {
      ctx.cookies.set("pyrax_net", String(await teamDefaultChain()), { path: "/", maxAge: 31536000, sameSite: "lax" });
    } catch { /* ignore — the page still renders on the local default */ }
  }
  // Single choke-point for SSR/API fault telemetry (Sentinel, source "explorer-web"). A thrown handler
  // or a handler that returns a 5xx is a genuine server fault worth reporting; 2xx/3xx/4xx are normal
  // (4xx = bad user input / not-found, never reported). Fail-open: reporting is fire-and-forget,
  // deduped/throttled + privacy-scrubbed inside the reporter, and can never alter the response.
  let res: Response;
  try {
    res = await next();
  } catch (e: any) {
    // Never swallow — re-throw so Astro renders its own 500. We only observe it in passing.
    reportServerError(`ssr ${ctx.request.method} ${ctx.url.pathname}: ${e?.name || "Error"}`, redact(String(e?.stack || e?.message || e)));
    throw e;
  }
  if (res.status >= 500) {
    reportServerError(`ssr ${ctx.request.method} ${ctx.url.pathname}: HTTP ${res.status}`, `${ctx.url.pathname} returned HTTP ${res.status}`);
  }
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
