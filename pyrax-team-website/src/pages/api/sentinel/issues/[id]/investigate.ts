// SPDX-License-Identifier: LicenseRef-Proprietary
// Ask Sentinel to investigate an advisory — it builds an evidence dossier (affected hosts/repos,
// hypotheses, suggested fix) without taking any action.
//
// Investigate drives on-GPU brain inference on the single edge Sentinel and writes a dossier +
// audit entry, so it is gated on the ELEVATED `sentinel.approve` permission — the same permission
// the Investigate button is rendered under in the console (sentinel.tsx) and the sibling
// dispatch.ts requires. The endpoint permission must never be weaker than the UI implies, or a
// view-only user could POST here directly to trigger inference they were never meant to run.
import type { APIRoute } from "astro";
import { proxySentinel } from "../../../../../server/sentinel";
export const prerender = false;
export const POST: APIRoute = ({ cookies, params }) =>
  proxySentinel(cookies, "sentinel.approve", `/api/nova/issues/${encodeURIComponent(params.id || "")}/investigate`, { method: "POST" });
