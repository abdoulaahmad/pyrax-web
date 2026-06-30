// SPDX-License-Identifier: LicenseRef-Proprietary
// Minimal server-side JSON-RPC client (Node 24 global fetch) + small helpers, incl. the PYRAX-native
// pyrax_dagRecent → {blueScore → stream} merge used to enrich indexed blocks with their stream.

const TIMEOUT_MS = 15000;
let id = 1;

export async function rpc(url, method, params = []) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: id++, method, params }),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    if (j.error) throw new Error(j.error.message || "rpc error");
    return j.result;
  } finally {
    clearTimeout(t);
  }
}

export const hexToInt = (h) => (typeof h === "string" ? parseInt(h, 16) : NaN);
export const hexToBigStr = (h) => {
  try {
    return BigInt(h ?? "0x0").toString();
  } catch {
    return "0";
  }
};

// Canonical TriStream seal-lane rule (mirrors pyrax-consensus lane_algo, production real_lanes):
//   Stream A → BLAKE3 (even blue score) / SHA-256d (odd);  Stream B → kHeavyHash;  Stream C → PoS.
// eth_getBlockBy* and pyrax_dagRecent don't surface header.seal_algo, so the lane is reconstructed
// from the (real) stream — always consistent with the block's stream, never mixed across streams.
export function deriveSeal(stream, blueScore) {
  if (stream === "C") return "pos";
  if (stream === "B") return "kheavyhash";
  return blueScore % 2 === 0 ? "blake3" : "sha256d";
}

/** Fetch pyrax_dagRecent → Map<blueScore, "A"|"B"|"C">. Empty map if the method is absent. */
export async function dagStreamMap(url, limit = 64) {
  const m = new Map();
  try {
    const recent = await rpc(url, "pyrax_dagRecent", [limit]);
    if (Array.isArray(recent)) for (const d of recent) {
      const bs = Number(d.blueScore);
      if (Number.isFinite(bs) && (d.stream === "A" || d.stream === "B" || d.stream === "C") && !m.has(bs)) m.set(bs, d.stream);
    }
  } catch {
    /* node may not expose pyrax_* (non-PYRAX node) — blocks just index without a stream */
  }
  return m;
}

/** Run `fn` over `items` with a bounded concurrency, preserving order. */
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out;
}
