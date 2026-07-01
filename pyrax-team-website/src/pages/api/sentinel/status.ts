// SPDX-License-Identifier: LicenseRef-Proprietary
// Snapshot of the Sentinel brain: edge online, model label, autonomy/kill state, advisories, actions.
import type { APIRoute } from "astro";
import { proxySentinel } from "../../../server/sentinel";
export const prerender = false;
export const GET: APIRoute = ({ cookies }) => proxySentinel(cookies, "sentinel.view", "/api/nova/status");
