// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Authenticated download resolver for the team portal. Returns the CURRENT signed builds — Inferno +
// CLI for anyone with `downloads.view`, and ADDITIONALLY the internal Ember app ONLY for users who
// also hold `downloads.ember` — each with real versions and short-lived PRESIGNED URLs from the
// private DigitalOcean Spaces bucket.
//
// RBAC is enforced SERVER-SIDE: the Ember feed is listed + presigned only when can(subject,
// "downloads.ember") is true, so a user without that permission never receives an Ember presigned URL
// (the UI gate is defense-in-depth, not the gate). Fails closed on auth + on missing Spaces creds.
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../server/guard";
import { can } from "../../lib/permissions";
import { json } from "../../server/http";
import { spacesConfigured } from "../../server/spaces";
import { resolveDesktopFeed, resolveCliFeed, type Product } from "../../server/feeds";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const user = await requireUser(cookies);
  if (!user) return json({ ok: false, error: "Not signed in." }, 401);
  const subject = subjectOf(user);

  // Base gate: the download center itself requires downloads.view.
  if (!can(subject, "downloads.view")) return json({ ok: false, error: "You don't have access to downloads." }, 403);

  const canEmber = can(subject, "downloads.ember");

  // Spaces creds not configured — report honestly; the UI shows a disabled "no builds connected" state.
  if (!spacesConfigured()) {
    return json({ ok: true, configured: false, canEmber, products: [] });
  }

  // Resolve each permitted feed in parallel. Ember is included ONLY when the user holds downloads.ember
  // — its presigned URLs are never even minted for anyone else.
  const tasks: Promise<Product>[] = [];
  if (canEmber) {
    tasks.push(resolveDesktopFeed("ember", { id: "ember", name: "Ember (Internal Seed)", note: "Internal seed node app — restricted. Do not distribute outside the team.", restricted: true }));
  }
  tasks.push(resolveDesktopFeed("node", { id: "inferno", name: "Inferno Node App", note: "Public desktop node — run, mine, and manage from a UI." }));
  tasks.push(resolveCliFeed());

  let products: Product[];
  try {
    products = await Promise.all(tasks);
  } catch {
    // Spaces reachable-but-erroring — honest empty rather than a broken link.
    return json({ ok: true, configured: true, canEmber, products: [] });
  }
  return json({ ok: true, configured: true, canEmber, products });
};
