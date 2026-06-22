// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Client for the explorer indexer read API. Dev → http://localhost:8788; prod → same-origin ("" base,
// Caddy proxies /api → the indexer). Pages prefer the indexer for rich history and fall back to live
// RPC where a network isn't indexed. Override with VITE_INDEXER_BASE.

const base =
  (import.meta.env.VITE_INDEXER_BASE as string | undefined) ??
  (location.hostname === "localhost" || location.hostname === "127.0.0.1" ? "http://localhost:8788" : "");

export class ApiError extends Error {}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`, { headers: { accept: "application/json" } });
  const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError((j.error as string) || `HTTP ${res.status}`);
  return j as T;
}
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({}))) as T;
}

let indexedCache: Set<number> | null = null;
export async function indexedChains(): Promise<Set<number>> {
  if (indexedCache) return indexedCache;
  try {
    const nets = await get<{ chainId: number; indexed: boolean }[]>("/api/networks");
    indexedCache = new Set(nets.filter((n) => n.indexed).map((n) => n.chainId));
  } catch {
    indexedCache = new Set();
  }
  return indexedCache;
}
export const isIndexed = async (chainId: number): Promise<boolean> => (await indexedChains()).has(chainId);

// Indexer row shapes (snake_case, decimal strings/ints from SQLite).
export type IdxBlock = {
  number: number; hash: string; parent_hash: string; miner: string; timestamp: number;
  gas_used: number; gas_limit: number; base_fee: string | null; tx_count: number; size: number; txns?: IdxTx[];
};
export type IdxTx = {
  hash: string; block_number: number; block_time: number; tx_index: number; from_addr: string;
  to_addr: string | null; value: string; gas: number; gas_price: string | null; status: number | null;
  nonce: number; input_size: number; method_id: string | null; contract_created: string | null;
};
export type IdxTransfer = {
  tx_hash: string; log_index: number; block_number: number; block_time: number; token: string;
  from_addr: string; to_addr: string; amount: string; kind: string;
};
export type IdxToken = { chain_id: number; address: string; kind: string; name: string | null; symbol: string | null; decimals: number | null; transfer_count?: number };
export type IdxLog = { tx_hash: string; log_index: number; block_number: number; address: string; topic0: string | null; topic1: string | null; topic2: string | null; topic3: string | null; data: string };
export type IdxContract = { chain_id: number; address: string; name: string; compiler: string; optimization: number; runs: number; evm_version: string | null; source: string; abi: string; verified_at: number };
export type IdxStats = { chainId: number; lastBlock: number; blocks: number; txns: number; transfers: number; tokens: number; contracts: number };

export const apiStats = (c: number): Promise<IdxStats> => get(`/api/${c}/stats`);
export const apiBlocks = (c: number, limit = 25, offset = 0): Promise<IdxBlock[]> => get(`/api/${c}/blocks?limit=${limit}&offset=${offset}`);
export const apiBlock = (c: number, key: string | number): Promise<IdxBlock> => get(`/api/${c}/block/${key}`);
export const apiTxs = (c: number, limit = 25, offset = 0): Promise<IdxTx[]> => get(`/api/${c}/txs?limit=${limit}&offset=${offset}`);
export const apiTx = (c: number, h: string): Promise<IdxTx> => get(`/api/${c}/tx/${h}`);
export const apiAddress = (c: number, a: string, limit = 25, offset = 0): Promise<{ address: string; txCount: number; txns: IdxTx[]; transfers: IdxTransfer[] }> =>
  get(`/api/${c}/address/${a}?limit=${limit}&offset=${offset}`);
export const apiTokens = (c: number, limit = 50, offset = 0): Promise<IdxToken[]> => get(`/api/${c}/tokens?limit=${limit}&offset=${offset}`);
export const apiToken = (c: number, a: string, limit = 25, offset = 0): Promise<{ token: IdxToken | null; transfers: IdxTransfer[] }> =>
  get(`/api/${c}/token/${a}?limit=${limit}&offset=${offset}`);
export const apiLogs = (c: number, params: Record<string, string | number>): Promise<IdxLog[]> =>
  get(`/api/${c}/logs?${new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])))}`);
export const apiContracts = (c: number, limit = 50, offset = 0): Promise<IdxContract[]> => get(`/api/${c}/contracts?limit=${limit}&offset=${offset}`);
export const apiContract = (c: number, a: string): Promise<IdxContract | null> => get(`/api/${c}/contract/${a}`);
export const apiVerify = (c: number, body: unknown): Promise<{ ok: boolean; error?: string; details?: string[]; name?: string; address?: string }> =>
  post(`/api/${c}/verify`, body);
