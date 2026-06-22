// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Indexer configuration. Networks mirror the explorer/website SSOT (endpoints.ts). Only networks
// with a non-empty RPC are ingested; the rest are simply absent from the indexed data (the frontend
// falls back to a live-RPC read / honest "not live" state). Override any RPC via env (RPC_<chainId>).

export const NETWORKS = {
  881109: { name: "Internal Devnet 1.0", rpc: process.env.RPC_881109 ?? "https://sidn-rpc.pyraxchain.com:8811" },
  429294: { name: "Internal Live", rpc: process.env.RPC_429294 ?? "" },
  710823: { name: "Devnet2", rpc: process.env.RPC_710823 ?? "" },
  104928: { name: "Testnet", rpc: process.env.RPC_104928 ?? "" },
  563821: { name: "Mainnet", rpc: process.env.RPC_563821 ?? "" },
};

export const PORT = Number(process.env.PORT ?? 8788);
export const HOST = process.env.HOST ?? "0.0.0.0";
export const DATA_DIR = process.env.DATA_DIR ?? "./data";

// Ingest cadence + bounds (kept modest so a public node isn't hammered).
export const INGEST_INTERVAL_MS = Number(process.env.INGEST_INTERVAL_MS ?? 4000);
export const INGEST_BATCH = Number(process.env.INGEST_BATCH ?? 40); // max blocks ingested per network per tick
export const RECEIPT_CONCURRENCY = Number(process.env.RECEIPT_CONCURRENCY ?? 8);

// CORS: which origins may call the read API in the browser. "*" is fine for a public read-only API;
// tighten via ALLOW_ORIGIN in production if desired.
export const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN ?? "*";

/** Networks that have an RPC wired (the only ones we ingest). */
export const enabledNetworks = () =>
  Object.entries(NETWORKS)
    .filter(([, n]) => n.rpc)
    .map(([id, n]) => ({ chainId: Number(id), name: n.name, rpc: n.rpc }));

export const networkName = (chainId) => NETWORKS[chainId]?.name ?? `chain ${chainId}`;
export const rpcFor = (chainId) => NETWORKS[chainId]?.rpc ?? "";
