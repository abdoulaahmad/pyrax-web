// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Indexer configuration. Networks mirror the explorer app's networks SSOT (src/lib/networks.ts) and
// the website endpoints SSOT. Only networks with a non-empty RPC are ingested; the rest are simply
// absent from the indexed data (the SSR app falls back to a live-RPC read, then PYRAX-native sample).
// Override any RPC via env (RPC_<chainId>).

export const NETWORKS = {
  881109: { name: "Pyrax Seed Network", rpc: process.env.RPC_881109 ?? "https://pyrax-seed.rpc.pyraxchain.com" },
  710823: { name: "Pyrax Forge Network", rpc: process.env.RPC_710823 ?? "" },
  104928: { name: "Pyrax Rise Network", rpc: process.env.RPC_104928 ?? "" },
  563821: { name: "Pyrax One Network", rpc: process.env.RPC_563821 ?? "" },
};

export const PORT = Number(process.env.PORT ?? 8788);
export const HOST = process.env.HOST ?? "0.0.0.0";

// DigitalOcean Managed PostgreSQL. Production = the cluster's VPC connection string
// (…?sslmode=require). EXPLORER_DATABASE_URL is preferred so the explorer's DB is distinct
// from other site DBs sharing the same cluster; DATABASE_URL is accepted as a fallback.
export const DATABASE_URL = process.env.EXPLORER_DATABASE_URL ?? process.env.DATABASE_URL ?? "postgres://postgres:dev@localhost:5544/pyrax_explorer";
export const DATABASE_SSL = /sslmode=require/i.test(DATABASE_URL) || process.env.DATABASE_SSL === "1";
export const DATABASE_CA = process.env.DATABASE_CA ?? ""; // optional PEM to verify the DB server cert

// Ingest cadence + bounds (kept modest so a public node isn't hammered).
export const INGEST_INTERVAL_MS = Number(process.env.INGEST_INTERVAL_MS ?? 4000);
export const INGEST_BATCH = Number(process.env.INGEST_BATCH ?? 40); // max blocks ingested per network per tick
export const RECEIPT_CONCURRENCY = Number(process.env.RECEIPT_CONCURRENCY ?? 8);

// Persistence caps so a hostile contract on the indexed chain can't drive unbounded DB growth by
// emitting enormous log `data` blobs across many logs per block.
//   MAX_LOG_DATA_BYTES: a single log's `data` beyond this is truncated (with a marker) before storage.
//   MAX_LOGS_PER_BLOCK / MAX_TRANSFERS_PER_BLOCK: hard row caps written per block bundle.
export const MAX_LOG_DATA_BYTES = Number(process.env.MAX_LOG_DATA_BYTES ?? 32 * 1024);
export const MAX_LOGS_PER_BLOCK = Number(process.env.MAX_LOGS_PER_BLOCK ?? 5000);
export const MAX_TRANSFERS_PER_BLOCK = Number(process.env.MAX_TRANSFERS_PER_BLOCK ?? 5000);

// CORS: which origins may call the read API in the browser. "*" is fine for a public read-only API.
export const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN ?? "*";

// ---- request hardening (public read/verify API) ----------------------------------------------
// The indexer is publicly reachable and co-hosts the ingest worker in-process, so an unbounded body
// read, a pathological OFFSET, or an unthrottled flood can starve its memory / pg pool / event loop.
//
// VERIFY_MAX_BODY_BYTES: hard cap on the POST /verify request body BEFORE it is buffered/parsed (the
//   500 KB source cap in verify.js only runs after the whole body is parsed). Room for a 500 KB source
//   plus JSON envelope/whitespace.
// READ_MAX_OFFSET: cap on ?offset= so a caller can't drive a huge OFFSET scan on the heaviest queries.
// RL_*: per-IP token-bucket rates for the read routes vs. the (far more expensive) verify route.
export const VERIFY_MAX_BODY_BYTES = Number(process.env.VERIFY_MAX_BODY_BYTES ?? 600 * 1024);
export const READ_MAX_OFFSET = Number(process.env.READ_MAX_OFFSET ?? 100_000);
export const RL_READ_RPS = Number(process.env.RL_READ_RPS ?? 20);
export const RL_READ_BURST = Number(process.env.RL_READ_BURST ?? 60);
export const RL_VERIFY_RPS = Number(process.env.RL_VERIFY_RPS ?? 0.2); // ~1 verify / 5s sustained
export const RL_VERIFY_BURST = Number(process.env.RL_VERIFY_BURST ?? 5);
// statement_timeout applied to every pooled connection so one pathological query can't pin a client.
export const DB_STATEMENT_TIMEOUT_MS = Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 15_000);

/** Networks that have an RPC wired (the only ones we ingest). */
export const enabledNetworks = () =>
  Object.entries(NETWORKS)
    .filter(([, n]) => n.rpc)
    .map(([id, n]) => ({ chainId: Number(id), name: n.name, rpc: n.rpc }));

export const networkName = (chainId) => NETWORKS[chainId]?.name ?? `chain ${chainId}`;
export const rpcFor = (chainId) => NETWORKS[chainId]?.rpc ?? "";
