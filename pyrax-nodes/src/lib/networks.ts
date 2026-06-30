// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Network definitions for nodes.pyraxchain.com. The directory ingest keys on the LABEL the node
// announces ("seed" | "forge" | "rise" | "one"); each maps to a chain id, a friendly display name,
// an EVM RPC (for the live status dot), and an accent colour used by the dropdown dots + 3D globe.

export type NetLabel = "seed" | "forge" | "rise" | "one";

export interface NetworkDef {
  label: NetLabel;
  chainId: number;
  name: string;
  kind: "internal" | "devnet" | "testnet" | "mainnet";
  rpc: string;        // EVM JSON-RPC; "" = not yet wired (status shows offline until launch)
  color: string;      // accent for the network dot + globe points
  note: string;
}

export const NETWORKS: NetworkDef[] = [
  { label: "seed",  chainId: 881109, name: "PYRAX Seed",  kind: "internal", rpc: "https://pyrax-seed.rpc.pyraxchain.com",  color: "#60b8cc", note: "Internal development network" },
  { label: "forge", chainId: 710823, name: "PYRAX Forge", kind: "devnet",   rpc: "https://pyrax-forge.rpc.pyraxchain.com", color: "#f58622", note: "Closed-alpha test network" },
  { label: "rise",  chainId: 104928, name: "PYRAX Rise",  kind: "testnet",  rpc: "",                                       color: "#fcd03d", note: "Public test network (pre-launch)" },
  { label: "one",   chainId: 563821, name: "PYRAX One",   kind: "mainnet",  rpc: "",                                       color: "#34d399", note: "Mainnet (pre-launch)" },
];

export const DEFAULT_NETWORK: NetLabel = "forge";

const BY_LABEL: Record<string, NetworkDef> = Object.fromEntries(NETWORKS.map((n) => [n.label, n]));
const BY_CHAIN: Record<number, NetworkDef> = Object.fromEntries(NETWORKS.map((n) => [n.chainId, n]));

export const networkByLabel = (l: string): NetworkDef | undefined => BY_LABEL[l];
export const networkByChain = (c: number): NetworkDef | undefined => BY_CHAIN[c];
export const isNetLabel = (l: string): l is NetLabel => l in BY_LABEL;
