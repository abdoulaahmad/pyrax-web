// SPDX-License-Identifier: LicenseRef-Proprietary
// Public site configuration (open/closed gate, downloads list, default network) — set by the team
// portal's "Network & App Management" controls, read by this site's pages.
import type { APIRoute } from "astro";
import { getSiteSettings } from "../../server/settings";

export const prerender = false;

export const GET: APIRoute = async () => {
  const s = await getSiteSettings();
  return new Response(JSON.stringify({ ok: true, open: s.open, closedMessage: s.closedMessage, defaultNetwork: s.defaultNetwork, downloads: s.downloads, updatedAt: s.updatedAt }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
