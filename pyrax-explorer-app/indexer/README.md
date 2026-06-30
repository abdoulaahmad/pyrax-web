<!-- SPDX-License-Identifier: LicenseRef-Proprietary -->

# PYRAX Explorer Indexer

The ingestion + read service behind the explorer's history, search and registries.
It walks each RPC-wired network, persists blocks (with GhostDAG **blue score**, emission
**stream** A/B/C and **seal lane**), transactions, receipt logs and ERC-20/721 token
transfers into PostgreSQL, verifies contract source with `solc`, and pushes a realtime
WebSocket frame per freshly-indexed block.

The SSR explorer app (`../src/server/indexer.ts`) reads the **same Postgres** directly and
prefers it for history/search; this service owns ingestion + verification + the realtime feed.

## Run

```bash
npm install
# point at a node + the explorer Postgres (see env below)
npm start          # read API on :8788 (+ /api/ws) and the ingest worker
npm run ingest     # ingest worker only (no HTTP)
```

## Environment

| Var | Purpose | Default |
| --- | --- | --- |
| `EXPLORER_DATABASE_URL` / `DATABASE_URL` | Postgres (DO Managed; `…?sslmode=require`) | local dev DB |
| `RPC_881109` / `RPC_710823` / `RPC_104928` / `RPC_563821` | per-network RPC override | SSOT defaults |
| `PORT` / `HOST` | read-API bind | `8788` / `0.0.0.0` |
| `INGEST_INTERVAL_MS` / `INGEST_BATCH` / `RECEIPT_CONCURRENCY` | ingest cadence + bounds | `4000` / `40` / `8` |
| `DATABASE_SSL` / `DATABASE_CA` | force TLS / verify DB cert | derived from URL |
| `ALLOW_ORIGIN` | CORS origin for the read API | `*` |

## Schema (per `chain_id`)

`blocks` (+ `blue_score`, `stream`, `seal_algo`) · `txns` (+ `tx_type`) · `logs` · `transfers` ·
`tokens` · `contracts` · `sync_state` · `chain_meta`.

## Resilience

- **Genesis-reset self-heal** — if a disposable network is wiped + re-genesised (block 1 hash
  diverges), the chain's rows are wiped and re-indexed from 0 so old + new data never mix.
- **Reorg guard** — a stored tip whose hash no longer matches the chain re-anchors `REORG_DEPTH`
  blocks back.
- **Realtime + poll** — a `newHeads` subscription drives sub-second ingest; the interval poll is
  the gap-filling safety net.

Only Ethereum/Transparent-shaped txs appear in the eth block tx array, so indexed `tx_type` is
`ethereum`; the native PYRAX envelope types (shielded/escrow/stake/gov) are not eth-shaped and are
surfaced from PYRAX-native RPC, not indexed here.
