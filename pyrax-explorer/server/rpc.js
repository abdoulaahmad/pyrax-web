// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
// Minimal server-side JSON-RPC client (Node 24 global fetch) + small helpers.

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
