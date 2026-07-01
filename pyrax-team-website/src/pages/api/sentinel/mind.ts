// SPDX-License-Identifier: LicenseRef-Proprietary
// The live "NEURAX Mind" stream — Sentinel's recent reasoning / advisory / action / edge events.
import type { APIRoute } from "astro";
import { proxySentinel } from "../../../server/sentinel";
export const prerender = false;
export const GET: APIRoute = ({ cookies }) => proxySentinel(cookies, "sentinel.view", "/api/nova/mind");
