// SPDX-License-Identifier: LicenseRef-Proprietary
// Minimal JSON-RPC client for a PYRAX node — supports both eth_* and the native pyrax_* namespace.
export async function rpc(url: string, method: string, params: unknown[] = [], timeoutMs = 6000): Promise<any> {
  if (!url) throw new Error("no rpc endpoint");
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: ctl.signal });
    if (!r.ok) throw new Error(`http ${r.status}`);
    const j = (await r.json()) as { result?: any; error?: { message?: string } };
    if (j.error) throw new Error(j.error.message || "rpc error");
    return j.result;
  } finally { clearTimeout(t); }
}

/** Fire several RPC calls, tolerating individual failures (returns undefined for those). */
export async function rpcAll(url: string, calls: [string, unknown[]?][], timeoutMs = 7000): Promise<any[]> {
  return Promise.all(calls.map(([m, p]) => rpc(url, m, p || [], timeoutMs).catch(() => undefined)));
}

export const hexToNum = (h: unknown): number => (typeof h === "string" ? parseInt(h, 16) : typeof h === "number" ? h : NaN);
export const hexToBig = (h: unknown): bigint => { try { return BigInt(h as any); } catch { return 0n; } };

// Seal lane reconstructed from the stream, per pyrax-consensus `lane_algo` (production `real_lanes`):
//   Stream A → BLAKE3 (even blue score) / SHA-256d (odd);  Stream B → kHeavyHash (GPU primary);
//   Stream C → PoS/BLS. Neither eth_getBlockBy* nor pyrax_dagRecent surface header.seal_algo, so the
//   lane is rebuilt from the (real) stream — always consistent with the stream, never mixed.
export function deriveSeal(stream: string, blueScore: number): string {
  if (stream === "C") return "pos";
  if (stream === "B") return "kheavyhash";
  return blueScore % 2 === 0 ? "blake3" : "sha256d";
}
