// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The networks the explorer can browse. Only networks with a non-empty `rpc` are reachable/indexable;
// the rest render as "not live yet". Currency is PYRX (18 decimals). Keep chain ids in sync with the
// node apps + the shared endpoints SSOT.
export type NetStatus = "internal" | "devnet" | "pre-launch";
export interface ExplorerNetwork {
  key: string;
  chainId: number;
  name: string;
  short: string;
  rpc: string;
  status: NetStatus;
  blockTime: string;
  color: string;
  note: string;
}

export const NETWORKS: ExplorerNetwork[] = [
  { key: "seed",  chainId: 881109, name: "Pyrax Seed",  short: "Seed",  rpc: process.env.RPC_881109 || "https://pyrax-seed.rpc.pyraxchain.com",  status: "internal",   blockTime: "5s", color: "#60b8cc", note: "Internal simulated dev network" },
  { key: "forge", chainId: 710823, name: "Pyrax Forge", short: "Forge", rpc: process.env.RPC_710823 || "https://pyrax-forge.rpc.pyraxchain.com", status: "devnet",     blockTime: "5s", color: "#f58622", note: "Public-facing closed-alpha development network" },
  { key: "rise",  chainId: 104928, name: "Pyrax Rise",  short: "Rise",  rpc: process.env.RPC_104928 || "",                                       status: "pre-launch", blockTime: "6s", color: "#fcd03d", note: "Public test network — launching soon" },
  { key: "one",   chainId: 563821, name: "Pyrax One",   short: "One",   rpc: process.env.RPC_563821 || "",                                       status: "pre-launch", blockTime: "6s", color: "#34d399", note: "Mainnet — activated after the external audit gate" },
];

export const CURRENCY = { symbol: "PYRX", decimals: 18 };
export const DEFAULT_CHAIN = 881109;

const BY_CHAIN: Record<number, ExplorerNetwork> = Object.fromEntries(NETWORKS.map((n) => [n.chainId, n]));
const BY_KEY: Record<string, ExplorerNetwork> = Object.fromEntries(NETWORKS.map((n) => [n.key, n]));
export const networkByChain = (c: number): ExplorerNetwork | undefined => BY_CHAIN[c];
export const networkByKey = (k: string): ExplorerNetwork | undefined => BY_KEY[k];
export const isLive = (n: ExplorerNetwork) => !!n.rpc;
