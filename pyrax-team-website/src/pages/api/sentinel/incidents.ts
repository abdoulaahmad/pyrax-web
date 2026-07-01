// SPDX-License-Identifier: LicenseRef-Proprietary
// Public incidents Sentinel tracks (with any updates awaiting SRE approval before they post).
import type { APIRoute } from "astro";
import { proxySentinel } from "../../../server/sentinel";
export const prerender = false;
export const GET: APIRoute = ({ cookies }) => proxySentinel(cookies, "sentinel.incidents", "/api/nova/incidents");
