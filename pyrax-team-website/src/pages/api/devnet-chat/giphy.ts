// SPDX-License-Identifier: LicenseRef-Proprietary
// Giphy search/trending proxy (keeps GIPHY_API_KEY server-side). Inert if no key is configured.
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const me = await requireUser(cookies);
  if (!me || !can(subjectOf(me), "devnet.chat")) return json({ ok: false }, 403);
  const key = process.env.GIPHY_API_KEY;
  if (!key) return json({ ok: false, reason: "unconfigured", gifs: [] });
  const q = (url.searchParams.get("q") || "").slice(0, 80);
  const ep = q
    ? `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(q)}&limit=24&rating=pg-13`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${key}&limit=24&rating=pg-13`;
  try {
    const r = await (await fetch(ep)).json();
    const gifs = (r.data || []).map((g: any) => ({ id: g.id, url: g.images?.fixed_height?.url, preview: g.images?.fixed_height_small?.url || g.images?.fixed_height?.url })).filter((g: any) => g.url);
    return json({ ok: true, gifs });
  } catch { return json({ ok: false, gifs: [] }); }
};
