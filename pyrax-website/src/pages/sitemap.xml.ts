// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Dynamic sitemap. Emits the canonical English URL for every route (marketing pages + the 10 industry
// categories + all 100 business types), each with hreflang alternates for the 26 locales so search
// engines index the right language per region.
import type { APIRoute } from "astro";
import { LOCALES, DEFAULT_LOCALE } from "../i18n/config";
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
    const alternates = LOCALES.map((l) => `    <xhtml:link rel="alternate" hreflang="${l.code}" href="${xmlEscape(`${ORIGIN}/${l.code}${path}`)}"/>`).join("\n");
    const xdefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(`${ORIGIN}/${DEFAULT_LOCALE}${path}`)}"/>`;
    return `  <url>
    <loc>${xmlEscape(`${ORIGIN}/${DEFAULT_LOCALE}${path}`)}</loc>
    <changefreq>weekly</changefreq>
    <priority>${priority.toFixed(1)}</priority>
${alternates}
${xdefault}
  </url>`;
  }).join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`;

  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
};
