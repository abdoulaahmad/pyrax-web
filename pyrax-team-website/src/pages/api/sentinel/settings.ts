// SPDX-License-Identifier: LicenseRef-Proprietary
// Sentinel control plane: trip the kill-switch (halt all autonomous action) and set the autonomy
// mode (advisory ↔ autonomous). Gated by the elevated `sentinel.control` SRE permission.
import type { APIRoute } from "astro";
import { proxySentinel } from "../../../server/sentinel";
export const prerender = false;
export const POST: APIRoute = async ({ cookies, request }) => {
  const b = await request.json().catch(() => ({}));
  const body: { kill?: boolean; autonomy?: "advisory" | "autonomous" } = {};
  if (typeof b?.kill === "boolean") body.kill = b.kill;
  if (b?.autonomy === "advisory" || b?.autonomy === "autonomous") body.autonomy = b.autonomy;
  return proxySentinel(cookies, "sentinel.control", "/api/nova/settings", { method: "POST", body });
};
