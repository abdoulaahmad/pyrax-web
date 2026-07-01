// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Data-layer fail-safe + stream→seal correctness.
//
// These run with NO database configured (EXPLORER_DATABASE_URL / DATABASE_URL unset) and use the
// "Pyrax Rise" network (chain 104928) which has an empty RPC in the test env — so the indexer returns
// null and there is no live node. Every getter must therefore fall through to PYRAX-native SAMPLE
// data WITHOUT throwing. This is the contract that keeps the explorer rendering anywhere.
import { describe, it, expect, beforeAll } from "vitest";

// Ensure no DB is seen by the indexer module before it's imported (the pool is created lazily).
beforeAll(() => {
  delete process.env.EXPLORER_DATABASE_URL;
  delete process.env.DATABASE_URL;
});

const RISE = 104928; // pre-launch: no RPC, no indexer ⇒ pure sample path

describe("data-layer fail-safe (no DB, no RPC ⇒ sample, never throws)", () => {
  it("indexer readers return null with no DB configured", async () => {
    const idx = await import("../src/server/indexer");
    expect(idx.ready()).toBe(false);
    expect(await idx.blocks(RISE)).toBeNull();
    expect(await idx.txs(RISE)).toBeNull();
    expect(await idx.logs(RISE)).toBeNull();
    expect(await idx.contracts(RISE)).toBeNull();
    expect(await idx.tokens(RISE)).toBeNull();
    expect(await idx.contract(RISE, "0x" + "1".repeat(40))).toBeNull();
    expect(await idx.token(RISE, "0x" + "2".repeat(40))).toBeNull();
  });

  it("every chain.ts getter falls back to sample and never throws", async () => {
    const { netFor, getOverview, getBlocks, getBlock, getTxs, getTx, getAddress, getShielded, getDag, getNetwork, getGas, getValidators, getContracts, getTokens, getLogs, getContract, getToken } = await import("../src/server/chain");
    const net = netFor(RISE);
    expect(net.rpc).toBe(""); // precondition: no live node in the test env

    const overview = await getOverview(net);
    expect(overview.source).toBe("sample");
    expect(Array.isArray(overview.blocks)).toBe(true);

    expect((await getBlocks(net)).source).toBe("sample");
    expect((await getBlock(net, "4812800")).source).toBe("sample");
    expect((await getTxs(net)).source).toBe("sample");
    expect((await getTx(net, "0x" + "a".repeat(64))).source).toBe("sample");
    expect((await getAddress(net, "0x" + "b".repeat(40))).source).toBe("sample");
    expect((await getShielded(net)).source).toBe("sample");
    expect((await getDag(net)).source).toBe("sample");
    expect((await getNetwork(net)).source).toBe("sample");
    expect((await getGas(net)).source).toBe("sample");
    expect((await getValidators(net)).source).toBe("sample");
    expect((await getContracts(net)).source).toBe("sample");
    expect((await getTokens(net)).source).toBe("sample");
    expect((await getLogs(net)).source).toBe("sample");
    expect((await getContract(net, "0x" + "c".repeat(40))).source).toBe("sample");
    expect((await getToken(net, "0x" + "d".repeat(40))).source).toBe("sample");
  });

  it("detail getters reject a non-address path param → sample, never touching SQL/RPC", async () => {
    const { netFor, getAddress, getContract, getToken } = await import("../src/server/chain");
    const net = netFor(RISE);
    for (const bad of ["not-an-address", "0xZZZ", "' OR 1=1", "0x123", "<script>", "0x" + "a".repeat(80)]) {
      expect((await getAddress(net, bad)).source, `address ${bad}`).toBe("sample");
      expect((await getContract(net, bad)).source, `contract ${bad}`).toBe("sample");
      expect((await getToken(net, bad)).source, `token ${bad}`).toBe("sample");
    }
    // A well-formed address is accepted (and, with no DB/RPC, still resolves to sample).
    const ok = "0x" + "a".repeat(40);
    expect((await getContract(net, ok)).source).toBe("sample");
    expect((await getToken(net, ok)).source).toBe("sample");
    expect((await getAddress(net, ok)).source).toBe("sample");
  });

  it("getTx rejects a non-hash path param → sample, never touching the node RPC or the indexer (L8)", async () => {
    const { netFor, getTx } = await import("../src/server/chain");
    const net = netFor(RISE);
    for (const bad of ["not-a-hash", "0xZZZ", "' OR 1=1", "0x123", "<script>", "0x" + "a".repeat(200), "0x" + "a".repeat(40)]) {
      const r = await getTx(net, bad);
      expect(r.source, `tx ${bad}`).toBe("sample");
      // The echoed hash is the raw input, unaltered (sample detail is honest about what was requested).
      expect((r as any).hash).toBe(bad);
    }
    // A well-formed 32-byte hash is accepted (and, with no DB/RPC, still resolves to sample, lower-cased).
    const okHash = "0x" + "A".repeat(64);
    const good = await getTx(net, okHash);
    expect(good.source).toBe("sample");
    expect((good as any).hash).toBe(okHash.toLowerCase());
  });

  it("getLogs accepts a filter without throwing and still returns sample", async () => {
    const { netFor, getLogs } = await import("../src/server/chain");
    const net = netFor(RISE);
    const r = await getLogs(net, { address: "0x" + "e".repeat(40), topic0: "0x" + "f".repeat(64), fromBlock: 10, toBlock: 20, limit: 25, offset: 0 });
    expect(r.source).toBe("sample");
    expect(Array.isArray(r.logs)).toBe(true);
  });
});

describe("stream → seal lane correctness (deriveSeal + sample, never mixed across streams)", () => {
  it("deriveSeal binds each stream to its only valid lane(s)", async () => {
    const { deriveSeal } = await import("../src/server/rpc");
    // Stream C is always PoS; Stream B is always kHeavyHash; Stream A is blake3 (even) / sha256d (odd).
    expect(deriveSeal("C", 100)).toBe("pos");
    expect(deriveSeal("C", 101)).toBe("pos");
    expect(deriveSeal("B", 100)).toBe("kheavyhash");
    expect(deriveSeal("B", 101)).toBe("kheavyhash");
    expect(deriveSeal("A", 100)).toBe("blake3");
    expect(deriveSeal("A", 101)).toBe("sha256d");
  });

  it("sample blocks never carry a seal from another stream's lane", async () => {
    const { STREAM_ALGOS, sampleBlocks, sampleDag } = await import("../src/server/sample");
    for (const b of sampleBlocks(200)) {
      expect(STREAM_ALGOS[b.stream]).toContain(b.sealAlgo);
    }
    for (const n of sampleDag().nodes) {
      expect(STREAM_ALGOS[n.stream]).toContain(n.sealAlgo);
    }
    // Cross-check the invariant directly: C is pos-only, B is kheavyhash/argon2id, A is blake3/sha256d.
    expect(STREAM_ALGOS.C).toEqual(["pos"]);
    expect(STREAM_ALGOS.A).toEqual(["blake3", "sha256d"]);
    expect(STREAM_ALGOS.B).toEqual(["kheavyhash", "argon2id"]);
  });

  it("derived seal on a sample DAG never mixes streams (deriveSeal stays consistent with stream)", async () => {
    const { deriveSeal } = await import("../src/server/rpc");
    const { sampleDag } = await import("../src/server/sample");
    for (const n of sampleDag().nodes) {
      const derived = deriveSeal(n.stream, n.blueScore);
      if (n.stream === "C") expect(derived).toBe("pos");
      if (n.stream === "B") expect(derived).toBe("kheavyhash");
      if (n.stream === "A") expect(["blake3", "sha256d"]).toContain(derived);
    }
  });
});
