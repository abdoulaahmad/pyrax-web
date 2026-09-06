// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The navbar network selector + live-stats data source. Returns the network roster with live
// height/peers/TPS for each (honest: unreachable networks report online:false), plus the selected chain.
import type { APIRoute } from "astro";
import { NETWORKS, cookieChainId, TARGET_TPS } from "../../lib/networks";
import { allNetworkStats } from "../../server/chain";
import { teamDefaultChain } from "../../server/settings";
import { withErrorReport, installProcessHooks } from "../../server/error-reporter";
import { RateLimiter, clientIp } from "../../server/ratelimit";

// Install the process-level unhandledRejection / uncaughtException → Sentinel hooks once. Placed on
// an API module (executed by the SSR server) rather than a page so it runs on the server only, never
// during static analysis. Idempotent + a no-op when telemetry is unconfigured.
installProcessHooks();

// Per-IP throttle. Generous for the navbar's periodic refresh, hostile to a loop that would amplify
// each hit into a ~8-call upstream fan-out. Paired with the ~4s server-side stats cache so even allowed
// bursts collapse to one upstream fetch.
const limiter = new RateLimiter({ ratePerSec: 3, burst: 12 });

const simulatedSeedStats = () => {
  const elapsed = Math.max(0, Date.now() - Date.UTC(2026, 0, 1));
  const height = Math.floor(elapsed / 5_000);
  const wave = Math.sin(Date.now() / 18_000);
  return {
    online: false,
    simulated: true,
    height,
    finalized: Math.max(0, height - 2),
    peers: 12 + Math.round(wave * 3),
    tps: 2_400 + Math.round(wave * 320),
  };
};

// `withErrorReport` reports any UNEXPECTED throw to Sentinel (scrubbed + deduped) and returns a clean
// 500 — a visitor never sees a stack. Expected results the handler returns pass through untouched.
export const GET: APIRoute = withErrorReport("GET /api/net", async ({ request }) => {
  const gate = limiter.take(clientIp(request.headers));
  if (!gate.ok) {
    return new Response(JSON.stringify({ ok: false, error: "rate limit exceeded — slow down", retryAfter: gate.retryAfter }), {
      status: 429,
      headers: { "content-type": "application/json", "cache-control": "no-store", "retry-after": String(gate.retryAfter) },
    });
  }
  // A visitor's own choice (pyrax_net cookie) wins; otherwise use the team-managed cross-site default.
  const selected = cookieChainId(request.headers.get("cookie")) ?? (await teamDefaultChain());
  const stats = await allNetworkStats();
  const byChain = new Map(stats.map((s) => [s.chainId, s]));
  const networks = NETWORKS.map((n) => {
    const liveStats = byChain.get(n.chainId);
    const resolvedStats = liveStats?.online
      ? liveStats
      : n.mode === "Simulated"
        ? simulatedSeedStats()
        : liveStats || { online: false };
    return {
      ...resolvedStats,
      key: n.key, chainId: n.chainId, name: n.name, short: n.short, mode: n.mode, color: n.color,
      blockTime: n.blockTime, role: n.role,
    };
  });
  return new Response(JSON.stringify({ ok: true, selected, targetTps: TARGET_TPS, networks }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
});
