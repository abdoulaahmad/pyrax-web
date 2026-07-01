// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Signed download feed for the Downloads page. Returns the CURRENT Inferno (node feed) + PYRAX CLI
// builds, each with a version and a per-platform presigned (SigV4) URL to the PRIVATE Spaces bucket.
// Gated to signed-in testers (the whole portal is invite-only) and honors the admin download gate
// (`downloadsOpen`) exactly like the team-side toggle — closed ⇒ no links are emitted.
import type { APIRoute } from "astro";
import { requireTester } from "../../server/guard";
import { getDevnetSettings } from "../../server/db";
import { downloadsPayload } from "../../server/releases-feed";
import { json } from "../../server/http";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);

  const settings = await getDevnetSettings();
  if (!settings.downloadsOpen) {
    return json({
      ok: true,
      open: false,
      message: settings.downloadsClosedMessage || "Downloads are temporarily closed.",
      inferno: { available: false, version: null, assets: [] },
    });
  }

  try {
    // The CLI is not published this round — the devnet portal offers Inferno only.
    const { configured, inferno } = await downloadsPayload();
    return json({ ok: true, open: true, configured, inferno });
  } catch (e) {
    console.error("[downloads] feed resolve failed:", (e as Error)?.message || e);
    // Honest failure: report unavailable rather than a broken link.
    return json({
      ok: true,
      open: true,
      configured: true,
      error: "Could not reach the release storage. Please try again shortly.",
      inferno: { available: false, version: null, assets: [] },
    });
  }
};
