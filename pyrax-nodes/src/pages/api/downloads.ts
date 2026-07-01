// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Public download resolver for nodes.pyraxchain.com. Returns the CURRENT Inferno installers
// (Windows / macOS / Linux) with real versions and short-lived PRESIGNED download URLs pulled from
// the private DigitalOcean Spaces bucket. NO Ember here — the nodes site never exposes the internal
// seed app. NO CLI here either — the CLI is not published this round.
//
// Flow: LIST the feed prefix (node/ , cli/) → find the current installer per platform → PRESIGN each.
// Same-origin gated (the site's own Downloads page) + rate-limited to deter presign-URL harvesting.
// Honors the team's downloads kill-switch (downloadsOpen) so a closed page never mints links.
import type { APIRoute } from "astro";
import { sameOrigin } from "../../server/hmac";
import { createRateLimiter } from "../../server/ratelimit";
import { spacesConfigured } from "../../server/spaces";
import { resolveDesktopFeed, type Product } from "../../server/feeds";
import { getSiteSettings } from "../../server/settings";

export const prerender = false;
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// Presigning lists + fetches from Spaces; keep it modest so the endpoint can't be used to mint
// download URLs en masse. A browser hits it once on the Downloads page.
const downloadsLimiter = createRateLimiter({ capacity: 12, refillPerSec: 0.2 });

export const GET: APIRoute = async ({ request, clientAddress }) => {
  if (!sameOrigin(request)) return json({ ok: false, error: "unauthorized" }, 401);
  // Per-IP throttle (socket peer — not spoofable) to deter presign-URL harvesting.
  const limiterKey = (clientAddress || "unknown").replace(/^::ffff:/i, "");
  if (!downloadsLimiter.take(limiterKey)) return json({ ok: false, error: "rate_limited" }, 429);

  const settings = await getSiteSettings();
  // Team kill-switch: when downloads are closed, return the gate reason (the page shows a notice +
  // signup) and never mint presigned URLs.
  if (settings.downloadsOpen === false) {
    return json({ ok: true, open: false, message: settings.downloadsMessage, products: [] });
  }
  // Creds not configured (or no build published) — report honestly; the UI shows a disabled state.
  if (!spacesConfigured()) {
    return json({ ok: true, open: true, configured: false, products: [] });
  }

  let products: Product[];
  try {
    products = await Promise.all([
      resolveDesktopFeed("node", "inferno", "Inferno Node App", "Desktop node — run, mine, and manage from a UI. Connects outbound, no port-forwarding."),
    ]);
  } catch {
    // Spaces reachable-but-erroring (e.g. transient list failure) — honest empty, not a broken link.
    return json({ ok: true, open: true, configured: true, products: [] });
  }
  return json({ ok: true, open: true, configured: true, products });
};
