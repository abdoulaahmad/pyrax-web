// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The four PYRAX networks (one binary, four chainspecs). RPC endpoints are the public read RPCs the
// navbar network selector + the live-stats card poll. An empty rpc => that network reads "offline"
// (grey dot) until its vhost is live, then flips green automatically. Override any RPC via env
// RPC_<chainId> for local dev against a running node.
export interface PyraxNetwork {
  key: string;
  chainId: number;
  name: string;
  short: string;
  mode: "Simulated" | "Production";
  blockTime: number; // seconds
  color: string;
  rpc: string;
  role: string;
  live: boolean; // is this network expected to be reachable now?
}

const env = (k: string): string => (typeof process !== "undefined" ? process.env?.[k] ?? "" : "");

export const NETWORKS: PyraxNetwork[] = [
  {
    key: "seed", chainId: 881109, name: "PYRAX Seed", short: "Seed", mode: "Simulated", blockTime: 5,
    color: "#5cbace", rpc: env("RPC_881109") || "https://pyrax-seed.rpc.pyraxchain.com",
    role: "Permanent developer sandbox — faithful simulation, play-money.", live: true,
  },
  {
    key: "forge", chainId: 710823, name: "PYRAX Forge", short: "Forge", mode: "Production", blockTime: 5,
    color: "#f68a24", rpc: env("RPC_710823") || "",
    role: "Closed public alpha — real production consensus, seeded validators.", live: false,
  },
  {
    key: "rise", chainId: 104928, name: "PYRAX Rise", short: "Rise", mode: "Production", blockTime: 6,
    color: "#7c5cff", rpc: env("RPC_104928") || "",
    role: "Official public testnet — incentivized, audit-facing.", live: false,
  },
  {
    key: "one", chainId: 563821, name: "PYRAX One", short: "One", mode: "Production", blockTime: 6,
    color: "#fed23c", rpc: env("RPC_563821") || "",
    role: "Mainnet — launches after the external audit gate.", live: false,
  },
];

export const DEFAULT_CHAIN = 881109;
export const networkByChain = (id: number): PyraxNetwork | undefined => NETWORKS.find((n) => n.chainId === id);
export const networkByKey = (k: string): PyraxNetwork | undefined => NETWORKS.find((n) => n.key === k);

/** Selected chain from the pyrax_net cookie, defaulting to Seed. */
export function selectedChainId(cookieHeader: string | null): number {
  return cookieChainId(cookieHeader) ?? DEFAULT_CHAIN;
}

/** The chain explicitly chosen in the pyrax_net cookie, or null when the visitor hasn't chosen one yet
 *  (the caller then applies the team-managed default). */
export function cookieChainId(cookieHeader: string | null): number | null {
  const m = (cookieHeader || "").match(/(?:^|;\s*)pyrax_net=(\d+)/);
  const id = m ? Number(m[1]) : NaN;
  return networkByChain(id) ? id : null;
}

/** The published network-wide throughput target (used to color live TPS). */
export const TARGET_TPS = 500_000;
/** Hard-cap supply, for the tokenomics surfaces. */
export const MAX_SUPPLY = 50_000_000_000;
