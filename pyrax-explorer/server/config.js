// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Indexer configuration. Networks mirror the explorer/website SSOT (endpoints.ts). Only networks
// with a non-empty RPC are ingested; the rest are simply absent from the indexed data (the frontend
// falls back to a live-RPC read / honest "not live" state). Override any RPC via env (RPC_<chainId>).

export const NETWORKS = {
  881109: { name: "Pyrax Seed Network", rpc: process.env.RPC_881109 ?? "https://pyrax-seed.rpc.pyraxchain.com" },
  710823: { name: "Pyrax Forge Network", rpc: process.env.RPC_710823 ?? "" },
  104928: { name: "Pyrax Rise Network", rpc: process.env.RPC_104928 ?? "" },
  563821: { name: "Pyrax One Network", rpc: process.env.RPC_563821 ?? "" },
};

export const PORT = Number(process.env.PORT ?? 8788);
export const HOST = process.env.HOST ?? "0.0.0.0";

// DigitalOcean Managed PostgreSQL. Production = the cluster's VPC connection string
// (…?sslmode=require); local dev defaults to a throwaway local Postgres.
export const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:dev@localhost:5544/explorer";
export const DATABASE_SSL = /sslmode=require/i.test(DATABASE_URL) || process.env.DATABASE_SSL === "1";
export const DATABASE_CA = process.env.DATABASE_CA ?? ""; // optional PEM to verify the DB server cert

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
