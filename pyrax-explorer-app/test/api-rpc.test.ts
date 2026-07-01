// SPDX-License-Identifier: LicenseRef-Proprietary
//
// /api/rpc proxy: the read-only ALLOWLIST (default-deny), parameter clamps and rate limiting.
//
// We select the "Pyrax Rise" network (chain 104928) via the pyrax_net cookie. Rise has NO hardcoded
// RPC fallback, so with RPC_104928 unset its `rpc` is "" — an *allowed* method then gets past the
// allowlist and lands on the "no RPC configured" branch (503) instead of making a real upstream call,
// proving the method was accepted without depending on a live node. Denied/invalid methods 403/400.
import { describe, it, expect, beforeAll } from "vitest";

const RISE = 104928;

beforeAll(() => {
  delete process.env.RPC_104928; // Rise has no hardcoded fallback ⇒ net.rpc === ""
});

async function call(method: string, params: unknown[] = [], ip = "test-ip-" + Math.random()) {
  const { POST } = await import("../src/pages/api/rpc");
  const req = new Request("http://localhost/api/rpc", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, cookie: `pyrax_net=${RISE}` },
    body: JSON.stringify({ method, params }),
  });
  const res = await (POST as any)({ request: req });
  return { status: res.status, body: await res.json() };
}

describe("/api/rpc allowlist (default-deny)", () => {
  it("rejects a state-changing method with 403", async () => {
    const r = await call("eth_sendRawTransaction", ["0xdeadbeef"]);
    expect(r.status).toBe(403);
    expect(String(r.body.error)).toMatch(/read-only/i);
  });

  it("rejects an unknown/non-allowlisted method with 403", async () => {
    const r = await call("eth_coinbase");
    expect(r.status).toBe(403);
  });

  it("rejects a malformed method name with 400", async () => {
    const r = await call("DROP TABLE blocks");
    expect(r.status).toBe(400);
  });

  it("accepts an allowlisted read method (reaches the no-RPC branch, not a 403)", async () => {
    const r = await call("eth_blockNumber");
    expect(r.status).not.toBe(403);
    expect(r.status).not.toBe(400);
    // With RPC blanked for the test, an accepted method lands on 503 (no endpoint configured).
    expect(r.status).toBe(503);
    expect(r.body.offline).toBe(true);
  });

  it("accepts a PYRAX-native read method", async () => {
    const r = await call("pyrax_dagRecent", [16]);
    expect(r.status).toBe(503); // accepted by the allowlist, then no-RPC
  });
});

describe("/api/rpc parameter clamps", () => {
  it("rejects an oversized params array with 400", async () => {
    const r = await call("eth_call", Array.from({ length: 20 }, (_, i) => i));
    expect(r.status).toBe(400);
    expect(String(r.body.error)).toMatch(/too many parameters/i);
  });

  it("rejects an inverted eth_getLogs block range with 400", async () => {
    const r = await call("eth_getLogs", [{ fromBlock: "0x64", toBlock: "0x0a" }]);
    expect(r.status).toBe(400);
    expect(String(r.body.error)).toMatch(/before fromBlock/i);
  });

  it("accepts a valid eth_getLogs range (passes the clamp, reaches no-RPC)", async () => {
    const r = await call("eth_getLogs", [{ fromBlock: "0x0", toBlock: "0x10" }]);
    expect(r.status).toBe(503);
  });

  // --- regression: the eth_getLogs window must be bounded on EVERY shape, not just string-hex ---
  it("rejects an eth_getLogs filter with no bounded range (would scan from genesis)", async () => {
    const r = await call("eth_getLogs", [{}]);
    expect(r.status).toBe(400);
    expect(String(r.body.error)).toMatch(/bounded/i);
  });

  it("clamps a missing fromBlock with a huge toBlock (no unbounded back-scan)", async () => {
    const r = await call("eth_getLogs", [{ toBlock: "0xffffffff" }]);
    // Accepted (reaches no-RPC 503) but the proxy injected a bounded fromBlock — proven by the next
    // unit assertion on clampParams; here we just confirm it isn't rejected/forwarded raw.
    expect(r.status).toBe(503);
  });

  it("treats a numeric or tag fromBlock as non-bounding and still clamps the window", async () => {
    // numeric fromBlock (not a hex string) previously skipped the clamp entirely.
    const rNum = await call("eth_getLogs", [{ fromBlock: 0, toBlock: "0xffffffff" }]);
    expect(rNum.status).toBe(503);
    // a block *tag* as fromBlock with an open toBlock has no concrete range → rejected.
    const rTag = await call("eth_getLogs", [{ fromBlock: "latest" }]);
    expect(rTag.status).toBe(400);
  });
});

describe("clampParams eth_getLogs window (always bounded, every shape)", () => {
  async function clamp(filter: unknown) {
    const { clampParams, MAX_LOG_RANGE } = await import("../src/pages/api/rpc");
    return { r: clampParams("eth_getLogs", [filter]), MAX_LOG_RANGE };
  }
  const span = (f: any) => parseInt(f.toBlock, 16) - parseInt(f.fromBlock, 16);

  it("clamps a huge hex range down to MAX_LOG_RANGE", async () => {
    const { r, MAX_LOG_RANGE } = await clamp({ fromBlock: "0x0", toBlock: "0xffffffff" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(span(r.params[0])).toBeLessThanOrEqual(MAX_LOG_RANGE);
  });

  it("injects a bounded fromBlock when it is missing (was an unbounded back-scan)", async () => {
    const { r, MAX_LOG_RANGE } = await clamp({ toBlock: "0xffffffff" });
    expect(r.ok).toBe(true);
    if (r.ok) { expect((r.params[0] as any).fromBlock).toBeDefined(); expect(span(r.params[0])).toBeLessThanOrEqual(MAX_LOG_RANGE); }
  });

  it("treats a numeric fromBlock as a real height and bounds the window", async () => {
    const { r, MAX_LOG_RANGE } = await clamp({ fromBlock: 0, toBlock: "0xffffffff" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(span(r.params[0])).toBeLessThanOrEqual(MAX_LOG_RANGE);
  });

  it("bounds a concrete fromBlock with an open (latest) toBlock", async () => {
    const { r, MAX_LOG_RANGE } = await clamp({ fromBlock: "0x100" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(span(r.params[0])).toBeLessThanOrEqual(MAX_LOG_RANGE);
  });

  it("rejects a fully unbounded filter (no concrete from/to)", async () => {
    const { r } = await clamp({});
    expect(r.ok).toBe(false);
    const tag = await clamp({ fromBlock: "latest", toBlock: "pending" });
    expect(tag.r.ok).toBe(false);
  });

  it("still rejects an inverted concrete range", async () => {
    const { r } = await clamp({ fromBlock: "0x64", toBlock: "0x0a" });
    expect(r.ok).toBe(false);
  });
});

describe("/api/rpc rate limiting", () => {
  it("eventually returns 429 under a burst from one IP", async () => {
    const ip = "flood-ip";
    let saw429 = false;
    // burst is 15 + ~5/s refill; 60 rapid calls from one IP must trip the limiter.
    for (let i = 0; i < 60; i++) {
      const r = await call("eth_blockNumber", [], ip);
      if (r.status === 429) { saw429 = true; expect(r.body.retryAfter).toBeGreaterThan(0); break; }
    }
    expect(saw429).toBe(true);
  });

  it("does not rate-limit a different IP", async () => {
    const r = await call("eth_blockNumber", [], "fresh-unique-ip");
    expect(r.status).not.toBe(429);
  });
});
