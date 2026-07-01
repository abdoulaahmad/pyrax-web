// SPDX-License-Identifier: LicenseRef-Proprietary
// The internal / observer API bearer auth (Sentinel → devnet-portal). Must be constant-time and
// FAIL-CLOSED: an unset secret means the surface is OFF (never open), and any mismatch is a 401. The
// browser never reaches this surface (it's CSRF-exempt precisely because it's cookie-free bearer auth).
import { describe, it, expect } from "vitest";
import { bearerToken, secretsMatch, isInternalAuthorized, requireInternal } from "../src/server/internal-auth";

const req = (auth?: string) => new Request("https://devnet.pyraxchain.com/api/internal/tests/pending", auth ? { headers: { authorization: auth } } : undefined);
const SECRET = "s3cr3t-nova-agent-value";

describe("bearerToken", () => {
  it("extracts the token from a Bearer header (case-insensitive scheme)", () => {
    expect(bearerToken(req("Bearer abc123"))).toBe("abc123");
    expect(bearerToken(req("bearer abc123"))).toBe("abc123");
    expect(bearerToken(req("BEARER   spaced  "))).toBe("spaced");
  });
  it("returns '' when the header is missing or not a bearer scheme", () => {
    expect(bearerToken(req())).toBe("");
    expect(bearerToken(req("Basic abc123"))).toBe("");
    expect(bearerToken(req("Token abc"))).toBe("");
  });
});

describe("secretsMatch (constant-time, fail-closed on empty)", () => {
  it("accepts an exact match", () => {
    expect(secretsMatch(SECRET, SECRET)).toBe(true);
  });
  it("rejects a mismatch, including near-misses and differing lengths", () => {
    expect(secretsMatch(SECRET + "x", SECRET)).toBe(false);
    expect(secretsMatch(SECRET.slice(0, -1), SECRET)).toBe(false);
    expect(secretsMatch("totally-different", SECRET)).toBe(false);
  });
  it("fails closed when either side is empty", () => {
    expect(secretsMatch("", SECRET)).toBe(false);
    expect(secretsMatch(SECRET, "")).toBe(false);
    expect(secretsMatch("", "")).toBe(false);
  });
});

describe("isInternalAuthorized / requireInternal", () => {
  it("authorizes only the correct bearer when the secret is configured", () => {
    const env = { NOVA_AGENT_SECRET: SECRET } as NodeJS.ProcessEnv;
    expect(isInternalAuthorized(req(`Bearer ${SECRET}`), env)).toBe(true);
    expect(isInternalAuthorized(req("Bearer wrong"), env)).toBe(false);
    expect(isInternalAuthorized(req(), env)).toBe(false);
  });
  it("FAILS CLOSED when NOVA_AGENT_SECRET is unset (surface off, never open)", () => {
    const env = {} as NodeJS.ProcessEnv;
    expect(isInternalAuthorized(req(`Bearer ${SECRET}`), env)).toBe(false);
    expect(isInternalAuthorized(req("Bearer anything"), env)).toBe(false);
    expect(isInternalAuthorized(req(), env)).toBe(false);
  });
  it("requireInternal returns a 401 Response when unauthorized, null when authorized", async () => {
    const env = { NOVA_AGENT_SECRET: SECRET } as NodeJS.ProcessEnv;
    expect(requireInternal(req(`Bearer ${SECRET}`), env)).toBeNull();
    const bad = requireInternal(req("Bearer nope"), env)!;
    expect(bad.status).toBe(401);
    const body = await bad.json();
    expect(body.ok).toBe(false);
    // Generic message — no hint whether the secret is unset vs. mismatched.
    expect(body.error).toBe("Unauthorized.");
  });
});
