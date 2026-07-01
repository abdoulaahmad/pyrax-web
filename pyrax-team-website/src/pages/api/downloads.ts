// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Authenticated download resolver for the team portal. The team portal serves the internal Ember app
// ONLY — and ONLY to users who hold `downloads.ember`. Inferno is distributed exclusively on the devnet
// + nodes sites, and the CLI is not published this round, so neither is offered here. Ember is returned
// with a real version and a short-lived PRESIGNED URL from the private DigitalOcean Spaces bucket.
//
// RBAC is enforced SERVER-SIDE: the Ember feed is listed + presigned only when can(subject,
// "downloads.ember") is true, so a user without that permission never receives an Ember presigned URL
// (the UI gate is defense-in-depth, not the gate). Fails closed on auth + on missing Spaces creds.
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../server/guard";
import { can } from "../../lib/permissions";
import { json } from "../../server/http";
import { spacesConfigured } from "../../server/spaces";
import { resolveDesktopFeed, type Product } from "../../server/feeds";

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
  // Inferno + the CLI are intentionally NOT offered on the team portal — Inferno is distributed via the
  // devnet + nodes sites, and the CLI is not published this round. The team portal serves Ember only.

  let products: Product[];
  try {
    products = await Promise.all(tasks);
  } catch {
    // Spaces reachable-but-erroring — honest empty rather than a broken link.
    return json({ ok: true, configured: true, canEmber, products: [] });
  }
  return json({ ok: true, configured: true, canEmber, products });
};
