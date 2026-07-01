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
| `EXPLORER_DATABASE_URL` / `DATABASE_URL` | Postgres (DO Managed; `…?sslmode=require`). **Use a least-privilege role — see below.** | local dev DB |
| `RPC_881109` / `RPC_710823` / `RPC_104928` / `RPC_563821` | per-network RPC override | SSOT defaults |
| `PORT` / `HOST` | read-API bind | `8788` / `0.0.0.0` |
| `INGEST_INTERVAL_MS` / `INGEST_BATCH` / `RECEIPT_CONCURRENCY` | ingest cadence + bounds | `4000` / `40` / `8` |
| `DATABASE_SSL` / `DATABASE_CA` | force TLS / verify DB cert | derived from URL |
| `DB_STATEMENT_TIMEOUT_MS` | per-connection `statement_timeout` (0 disables) | `15000` |
| `ALLOW_ORIGIN` | CORS origin for the read API | `*` |
| `VERIFY_MAX_BODY_BYTES` | hard cap on the POST `/verify` body (413 beyond) | `614400` |
| `READ_MAX_OFFSET` | cap on `?offset=` for the read routes | `100000` |
| `RL_READ_RPS` / `RL_READ_BURST` | per-IP token bucket for read routes | `20` / `60` |
| `RL_VERIFY_RPS` / `RL_VERIFY_BURST` | tighter per-IP bucket for `/verify` | `0.2` / `5` |
| `MAX_LOG_DATA_BYTES` | truncate a single stored log `data` blob beyond this | `32768` |
| `MAX_LOGS_PER_BLOCK` / `MAX_TRANSFERS_PER_BLOCK` | per-block row caps | `5000` / `5000` |

## Security posture

- **Least-privilege DB role (REQUIRED in production).** The indexer is internet-exposed and needs only
  read + INSERT/UPDATE/DELETE on its own explorer tables. Do NOT point `EXPLORER_DATABASE_URL` at the DO
  cluster superuser (`doadmin`) — a single SQL-execution / dependency / credential flaw would then own
  the whole shared cluster. Provision the dedicated role once with
  [`scripts/explorer-role.sql`](./scripts/explorer-role.sql) and use it. The indexer logs a loud
  `SECURITY` warning (+ a Sentinel `warn`) at startup if it detects it is connected as a superuser.
- **Request hardening.** Every read route is per-IP rate-limited; `/verify` has a second, much tighter
  bucket and a hard request-body cap enforced BEFORE the body is buffered/parsed. `?offset=` is clamped,
  and a `statement_timeout` bounds every query so one pathological read can't pin a pooled client.
- **Ingestion caps.** A single log's `data` blob is truncated past `MAX_LOG_DATA_BYTES`, and per-block
  log/transfer rows are bounded, so a hostile contract on the indexed chain can't drive unbounded storage.
- **Trusted client IP.** Rate-limit keys use `CF-Connecting-IP` (behind Cloudflare) or the rightmost
  (proxy-attested) `X-Forwarded-For` hop, never the client-controlled leftmost hop.

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
