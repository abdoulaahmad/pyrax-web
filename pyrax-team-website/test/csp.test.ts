// SPDX-License-Identifier: LicenseRef-Proprietary
//
// CSP builder invariants. Locks two rules the hardening must hold simultaneously: the policy stays
// tight by default (no blanket allow), yet does NOT silently break Devnet Chat — the chat WebSocket
// origin is allowed under connect-src, and giphy's media hosts under img-src only when the GIF
// picker is enabled.
import { describe, it, expect } from "vitest";
import { buildCsp, originOf } from "../src/server/csp";

/** Pull a single directive's value out of a CSP string. */
function directive(csp: string, name: string): string | undefined {
  return csp.split(";").map((s) => s.trim()).find((s) => s.startsWith(name + " "))?.slice(name.length + 1);
}

describe("originOf()", () => {
  it("returns the wss origin (scheme + host + port) for a chat URL", () => {
    expect(originOf("wss://chat.pyraxchain.com")).toBe("wss://chat.pyraxchain.com");
    expect(originOf("ws://localhost:8788")).toBe("ws://localhost:8788");
  });
  it("returns null for empty / unparseable input", () => {
    expect(originOf("")).toBeNull();
    expect(originOf(undefined)).toBeNull();
    expect(originOf(null)).toBeNull();
    expect(originOf("not a url")).toBeNull();
  });
});

describe("buildCsp() — tight by default", () => {
  it("with no chat/giphy config, connect-src + img-src stay minimal", () => {
    const csp = buildCsp({});
    expect(directive(csp, "connect-src")).toBe("'self'");
    expect(directive(csp, "img-src")).toBe("'self' data:");
    // Core lock-downs are always present.
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });
});

describe("buildCsp() — does not break Devnet Chat", () => {
  it("allows the chat WebSocket origin under connect-src", () => {
    const csp = buildCsp({ chatWsUrl: "wss://chat.pyraxchain.com" });
    expect(directive(csp, "connect-src")).toBe("'self' wss://chat.pyraxchain.com");
  });

  it("allows giphy media hosts under img-src only when the GIF picker is enabled", () => {
    const off = buildCsp({ chatWsUrl: "wss://chat.pyraxchain.com" });
    expect(directive(off, "img-src")).toBe("'self' data:");
    const on = buildCsp({ chatWsUrl: "wss://chat.pyraxchain.com", giphyKey: "k" });
    expect(directive(on, "img-src")).toBe("'self' data: https://*.giphy.com");
  });

  it("ignores an unparseable CHAT_WS_URL rather than emitting a broken source", () => {
    const csp = buildCsp({ chatWsUrl: "::::nonsense" });
    expect(directive(csp, "connect-src")).toBe("'self'");
  });
});
