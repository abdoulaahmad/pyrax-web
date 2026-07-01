// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Sentinel telemetry contract for the SSR explorer web service (src/server/sentinel.ts):
//   • redact() scrubs secrets / bearer tokens / wallet addresses / raw IPs / OS-username paths, while
//     keeping 0x-prefixed hashes readable;
//   • reportServerError() is FAIL-OPEN (a throwing fetch never propagates), fire-and-forget, deduped
//     (a burst of the same signature collapses to one send + accrues a count);
//   • the reporter is a silent NO-OP when NOVA_AGENT_SECRET is unset.
//
// The module captures NOVA_AGENT_SECRET / SENTINEL_INGEST_URL at load time, so each case sets env then
// vi.resetModules() + a fresh dynamic import to re-evaluate against that env.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_FETCH = globalThis.fetch;
type SentinelModule = typeof import("../src/server/sentinel");
const loadFresh = async (): Promise<SentinelModule> => {
  vi.resetModules();
  return import("../src/server/sentinel");
};

describe("sentinel redact()", () => {
  beforeEach(() => { process.env.NOVA_AGENT_SECRET = "x"; });

  it("scrubs bearer tokens, secret values, wallet addresses, IPs, and OS-username paths", async () => {
    const { redact } = await loadFresh();
    const out = redact(
      'authorization: Bearer eyJhbGciOi.JIUzI1.abcdef123456 secret="hunter2" ' +
        "addr 0x1234567890abcdef1234567890abcdef12345678 from 203.0.113.9 at C:\\Users\\shawn\\node.log",
    );
    // The security-relevant property: none of the sensitive VALUES survive.
    expect(out).not.toContain("eyJhbGciOi");
    expect(out).not.toContain("hunter2");
    expect(out).not.toContain("0x1234567890abcdef1234567890abcdef12345678");
    expect(out).not.toContain("203.0.113.9");
    expect(out).not.toContain("shawn");
    expect(out).toContain("…redacted…");    // the token was collapsed
    expect(out).toContain("C:\\Users\\");    // path root kept, username collapsed

    // A BARE `Bearer <jwt>` (no secret-KEY word like auth/token in front) keeps the scheme word and
    // redacts only the credential that follows it.
    const bare = redact("request rejected: Bearer eyJraw.tokenPart.deadbeefcafe123");
    expect(bare).toContain("Bearer");
    expect(bare).not.toContain("tokenPart");
  });

  it("keeps 0x-prefixed block/tx hashes readable (they are not secrets)", async () => {
    const { redact } = await loadFresh();
    const hash = "0x" + "ab".repeat(32); // 64 hex → a tx hash
    expect(redact(`block ${hash} indexed`)).toContain(hash);
  });
});

describe("sentinel reportServerError() — configured", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    process.env.NOVA_AGENT_SECRET = "test-agent-secret";
    process.env.SENTINEL_INGEST_URL = "https://status.example.test";
    fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => { globalThis.fetch = ORIGINAL_FETCH; vi.restoreAllMocks(); });

  it("POSTs to /api/errors with the operator bearer + the source, and never leaks the raw secret in the body", async () => {
    const { reportServerError } = await loadFresh();
    reportServerError("boom", "stack trace here");
    await new Promise((r) => setTimeout(r, 0)); // let the fire-and-forget POST dispatch
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe("https://status.example.test/api/errors");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer test-agent-secret");
    const body = JSON.parse(init.body as string);
    expect(body.source).toBe("explorer-web");
    expect(body.title).toBe("boom");
    // The bearer secret must never be echoed back inside the reported body.
    expect(init.body as string).not.toContain("test-agent-secret");
  });

  it("dedupes a burst of the SAME signature into one immediate send (rest accrue)", async () => {
    const { reportServerError } = await loadFresh();
    for (let i = 0; i < 50; i++) reportServerError("db: query failed 42", "SELECT ... timed out after 5000ms");
    await new Promise((r) => setTimeout(r, 0));
    // Volatile ids (the 42 / 5000) are normalized out of the signature, so all 50 collapse to ONE send.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("is FAIL-OPEN: a throwing fetch never propagates to the caller", async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error("network down"); }) as unknown as typeof fetch;
    const { reportServerError } = await loadFresh();
    expect(() => reportServerError("unique-failopen-sig", "detail")).not.toThrow();
    await new Promise((r) => setTimeout(r, 0)); // the swallowed rejection must not surface either
  });
});

describe("sentinel — unconfigured is a silent no-op", () => {
  it("does not call fetch when NOVA_AGENT_SECRET is unset", async () => {
    const prev = process.env.NOVA_AGENT_SECRET;
    delete process.env.NOVA_AGENT_SECRET;
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const { reportServerError, sentinelEnabled } = await loadFresh();
      expect(sentinelEnabled()).toBe(false);
      reportServerError("would-not-send", "detail");
      await new Promise((r) => setTimeout(r, 0));
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = ORIGINAL_FETCH;
      if (prev !== undefined) process.env.NOVA_AGENT_SECRET = prev;
    }
  });
});
