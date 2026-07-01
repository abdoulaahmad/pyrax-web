// SPDX-License-Identifier: LicenseRef-Proprietary
// Minimal server-side JSON-RPC client for a PYRAX node (eth_* + pyrax_*).
export async function rpc(url: string, method: string, params: unknown[] = [], timeoutMs = 3500): Promise<any> {
  if (!url) throw new Error("no rpc endpoint");
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: ctl.signal,
    });
    if (!r.ok) throw new Error(`http ${r.status}`);
    const j = (await r.json()) as { result?: any; error?: { message?: string } };
    if (j.error) throw new Error(j.error.message || "rpc error");
    return j.result;
  } finally {
    clearTimeout(t);
  }
}

export const hexToNum = (h: unknown): number =>
  typeof h === "string" ? parseInt(h, 16) : typeof h === "number" ? h : NaN;
