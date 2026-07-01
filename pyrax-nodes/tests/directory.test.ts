// SPDX-License-Identifier: LicenseRef-Proprietary
// Public peer projection: a home `operator` node's raw residential IP + dial multiaddr must NOT leak to
// anonymous (same-origin browser) callers, while it still contributes to counts + coarse geo. Public
// infrastructure kinds (seed/rpc) keep their full dial address, since being dialable is their purpose.
import { describe, it, expect } from "vitest";
import { publicPeerView, publicPeerList, type Peer } from "../src/server/directory";

const peer = (over: Partial<Peer> = {}): Peer => ({
  peerId: "12D3KooWabc123",
  network: "forge",
  ip: "203.0.113.42",
  port: 30303,
  multiaddr: "/ip4/203.0.113.42/tcp/30303/p2p/12D3KooWabc123",
  kind: "operator",
  lat: 51.5, lon: -0.12, country: "United Kingdom", city: "London",
  firstSeen: 1000, lastSeen: 2000,
  ...over,
});

describe("publicPeerView", () => {
  it("strips a home operator's raw IP and reduces the multiaddr to peer-only", () => {
    const v = publicPeerView(peer());
    expect(v.ip).toBeUndefined();
    expect(v.multiaddr).toBe("/p2p/12D3KooWabc123");
  });

  it("keeps coarse geo + counts fields so the operator still shows on the list/globe", () => {
    const v = publicPeerView(peer());
    expect(v.country).toBe("United Kingdom");
    expect(v.city).toBe("London");
    expect(v.lat).toBe(51.5);
    expect(v.lon).toBe(-0.12);
    expect(v.peerId).toBe("12D3KooWabc123");
    expect(v.network).toBe("forge");
    expect(v.kind).toBe("operator");
  });

  it("preserves the full dial address for public infrastructure kinds (seed/rpc)", () => {
    for (const kind of ["seed", "rpc"] as const) {
      const p = peer({ kind, multiaddr: `/ip4/198.51.100.5/tcp/30303/p2p/x`, ip: "198.51.100.5" });
      const v = publicPeerView(p);
      expect(v.ip).toBe("198.51.100.5");
      expect(v.multiaddr).toBe("/ip4/198.51.100.5/tcp/30303/p2p/x");
    }
  });

  it("does not mutate the source record (returns a copy)", () => {
    const src = peer();
    publicPeerView(src);
    expect(src.ip).toBe("203.0.113.42");
    expect(src.multiaddr).toBe("/ip4/203.0.113.42/tcp/30303/p2p/12D3KooWabc123");
  });
});

describe("publicPeerList", () => {
  it("redacts operators but not seed/rpc across a mixed list", () => {
    const list = [peer({ peerId: "op1", kind: "operator" }), peer({ peerId: "seed1", kind: "seed" })];
    const out = publicPeerList(list);
    expect(out[0].ip).toBeUndefined();
    expect(out[0].multiaddr).toBe("/p2p/op1");
    expect(out[1].ip).toBe("203.0.113.42");
  });
});
