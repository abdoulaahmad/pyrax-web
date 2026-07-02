// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Dynamic sitemap. Emits the canonical (locale-free) URL for every route (marketing pages + the 10
// industry categories + all 100 business types). While the site is served single-language at plain
// URLs, there are no per-locale hreflang alternates; they return when multi-locale routing is re-enabled.
import type { APIRoute } from "astro";
import { CATEGORIES } from "../lib/industries";

const ORIGIN = "https://pyraxchain.com";

// Path (no locale prefix) for every route, with a crawl priority.
function routes(): { path: string; priority: number }[] {
  const base = [
    { path: "", priority: 1.0 },
    { path: "/technology", priority: 0.9 },
    { path: "/token", priority: 0.9 },
    { path: "/network", priority: 0.8 },
    { path: "/developers", priority: 0.8 },
    { path: "/whitepaper", priority: 0.8 },
    { path: "/pitch", priority: 0.7 },
    { path: "/company", priority: 0.6 },
    { path: "/industries", priority: 0.9 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
  ];
  for (const c of CATEGORIES) {
    base.push({ path: `/industries/${c.slug}`, priority: 0.7 });
    for (const b of c.businesses) base.push({ path: `/industries/${c.slug}/${b.slug}`, priority: 0.6 });
  }
  return base;
}

const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export const GET: APIRoute = () => {
  const urls = routes().map(({ path, priority }) => {
    return `  <url>
    <loc>${xmlEscape(`${ORIGIN}${path || "/"}`)}</loc>
    <changefreq>weekly</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
  }).join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
};
