// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Security headers for every response (Astro SSR middleware). Tightened to what this site actually
// needs so the globe, fonts, brand CDN image, the self-hosted push service worker, and the /remote
// node-dashboard iframe all keep working:
//
//   - frame-ancestors 'self'   : we don't allow OTHER sites to frame us (clickjacking), but /remote
//                                legitimately frames *.nodes.pyraxchain.com — that's frame-src, below.
//   - frame-src                : the embedded node dashboards live on *.nodes.pyraxchain.com.
//   - img-src                  : self + data:/blob: (canvas snapshots) + the brand CDN (map logo).
//   - style-src 'unsafe-inline': Tailwind/React inline styles + the map's many inline style props, and
//                                Google Fonts' stylesheet host.
//   - font-src                 : Google Fonts files (fonts.gstatic.com) + self.
//   - script-src 'unsafe-inline': Astro injects inline hydration scripts for client: islands.
//   - connect-src 'self'       : the site only fetches its own /api/* (geo is a SERVER-side fetch, so
//                                it never needs a browser connect-src entry).
//   - worker-src 'self'        : the push service worker (public/sw.js).
//   - object-src 'none', base-uri 'self', form-action 'self' : standard hardening.
import { defineMiddleware } from "astro:middleware";

const CDN = "https://pyrax.tor1.cdn.digitaloceanspaces.com";

export const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${CDN}`,
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src https://*.nodes.pyraxchain.com",
].join("; ");

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP,
  // 2 years + preload-eligible. Only meaningful over HTTPS (the droplet terminates TLS at Caddy).
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=()",
};

export const onRequest = defineMiddleware(async (_ctx, next) => {
  const res = await next();
  // Don't disturb non-document responses we don't own (e.g. redirects with no headers object).
  try {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
      if (!res.headers.has(k)) res.headers.set(k, v);
    }
  } catch { /* immutable headers on some internal responses — ignore */ }
  return res;
});
