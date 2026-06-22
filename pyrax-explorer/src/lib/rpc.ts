// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// JSON-RPC client bound to the CURRENTLY SELECTED network (via @pyrax/shared's network store). Every
// call reads the live selection, so switching networks in the navbar immediately retargets the
// explorer. An unwired network (rpc === "") raises RpcOffline so pages can show an honest empty state.

import { getSelectedNetwork } from "@pyrax/shared";

export class RpcOffline extends Error {
  constructor(msg = "This network has no public RPC endpoint wired yet.") {
    super(msg);
    this.name = "RpcOffline";
  }
}
export class RpcError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "RpcError";
  }
}

export type Net = ReturnType<typeof getSelectedNetwork>;
export const currentNet = (): Net => getSelectedNetwork();
export const currentRpc = (): string => getSelectedNetwork().rpc;

const RPC_TIMEOUT_MS = 8000;
let reqId = 1;

export async function rpc<T = unknown>(method: string, params: unknown[] = [], url = currentRpc()): Promise<T> {
  if (!url) throw new RpcOffline();
  const ctl = new AbortController();
  const t = window.setTimeout(() => ctl.abort(), RPC_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: reqId++, method, params }),
      signal: ctl.signal,
    });
    if (!res.ok) throw new RpcError(`HTTP ${res.status}`);
    const j = (await res.json()) as { result?: T; error?: { message?: string } };
    if (j.error) throw new RpcError(j.error.message ?? "RPC error");
    return j.result as T;
  } catch (e) {
    if (e instanceof RpcOffline || e instanceof RpcError) throw e;
    throw new RpcError((e as Error)?.message ?? "network error");
  } finally {
    window.clearTimeout(t);
  }
}

// Typed EVM JSON-RPC DTOs — only the fields the explorer reads.
export type RpcTx = {
  hash: string;
  blockHash: string | null;
  blockNumber: string | null;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  input: string;
  nonce: string;
  transactionIndex: string | null;
  type?: string;
};
export type RpcBlock = {
  number: string;
  hash: string;
  parentHash: string;
  nonce?: string;
  miner: string;
  difficulty?: string;
  size: string;
  gasLimit: string;
  gasUsed: string;
  timestamp: string;
  baseFeePerGas?: string;
  extraData?: string;
  stateRoot?: string;
  transactions: (string | RpcTx)[];
};
export type RpcLog = {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
  removed?: boolean;
};
export type RpcReceipt = {
  transactionHash: string;
  status?: string;
  from: string;
  to: string | null;
  contractAddress: string | null;
  gasUsed: string;
  cumulativeGasUsed?: string;
  effectiveGasPrice?: string;
  blockNumber: string;
  blockHash: string;
  logs: RpcLog[];
  type?: string;
};

export const blockNumber = (): Promise<string> => rpc<string>("eth_blockNumber");
export const chainId = (): Promise<string> => rpc<string>("eth_chainId");
export const peerCount = (): Promise<string | undefined> => rpc<string>("net_peerCount").catch(() => undefined);
export const gasPrice = (): Promise<string> => rpc<string>("eth_gasPrice");
export const maxPriorityFee = (): Promise<string | undefined> =>
  rpc<string>("eth_maxPriorityFeePerGas").catch(() => undefined);

export const getBlockByNumber = (n: number | string, full = false): Promise<RpcBlock | null> =>
  rpc<RpcBlock | null>("eth_getBlockByNumber", [typeof n === "number" ? "0x" + n.toString(16) : n, full]);
export const getBlockByHash = (h: string, full = false): Promise<RpcBlock | null> =>
  rpc<RpcBlock | null>("eth_getBlockByHash", [h, full]);
export const getTx = (h: string): Promise<RpcTx | null> => rpc<RpcTx | null>("eth_getTransactionByHash", [h]);
export const getReceipt = (h: string): Promise<RpcReceipt | null> =>
  rpc<RpcReceipt | null>("eth_getTransactionReceipt", [h]);
export const getBalance = (a: string, tag = "latest"): Promise<string> => rpc<string>("eth_getBalance", [a, tag]);
export const getCode = (a: string, tag = "latest"): Promise<string> => rpc<string>("eth_getCode", [a, tag]);
export const getTxCount = (a: string, tag = "latest"): Promise<string> =>
  rpc<string>("eth_getTransactionCount", [a, tag]);
export const ethCall = (to: string, data: string, tag = "latest"): Promise<string> =>
  rpc<string>("eth_call", [{ to, data }, tag]);
export const feeHistory = (
  blocks: number,
  newest = "latest",
  pct: number[] = [25, 50, 75],
): Promise<{ baseFeePerGas: string[]; gasUsedRatio: number[]; oldestBlock: string; reward?: string[][] }> =>
  rpc("eth_feeHistory", ["0x" + blocks.toString(16), newest, pct]);
