// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// SQLite store for the explorer indexer. One DB file, multi-network (every row carries chain_id).
// Synchronous (better-sqlite3) — simple + fast for an ingest worker + read API.

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR } from "./config.js";

let db = null;

export function open() {
  if (db) return db;
  mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(join(DATA_DIR, "explorer.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  migrate(db);
  return db;
}

function migrate(d) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS sync_state (chain_id INTEGER PRIMARY KEY, last_block INTEGER NOT NULL);

    CREATE TABLE IF NOT EXISTS blocks (
      chain_id INTEGER NOT NULL, number INTEGER NOT NULL, hash TEXT NOT NULL, parent_hash TEXT,
      miner TEXT, timestamp INTEGER, gas_used INTEGER, gas_limit INTEGER, base_fee TEXT,
      tx_count INTEGER, size INTEGER,
      PRIMARY KEY (chain_id, number)
    );
    CREATE INDEX IF NOT EXISTS idx_blocks_hash ON blocks(chain_id, hash);

    CREATE TABLE IF NOT EXISTS txns (
      chain_id INTEGER NOT NULL, hash TEXT NOT NULL, block_number INTEGER, block_time INTEGER,
      tx_index INTEGER, from_addr TEXT, to_addr TEXT, value TEXT, gas INTEGER, gas_price TEXT,
      status INTEGER, nonce INTEGER, input_size INTEGER, method_id TEXT, contract_created TEXT,
      PRIMARY KEY (chain_id, hash)
    );
    CREATE INDEX IF NOT EXISTS idx_txns_block ON txns(chain_id, block_number DESC, tx_index DESC);
    CREATE INDEX IF NOT EXISTS idx_txns_from ON txns(chain_id, from_addr, block_number DESC);
    CREATE INDEX IF NOT EXISTS idx_txns_to ON txns(chain_id, to_addr, block_number DESC);

    CREATE TABLE IF NOT EXISTS logs (
      chain_id INTEGER NOT NULL, tx_hash TEXT NOT NULL, log_index INTEGER NOT NULL,
      block_number INTEGER, address TEXT, topic0 TEXT, topic1 TEXT, topic2 TEXT, topic3 TEXT, data TEXT,
      PRIMARY KEY (chain_id, tx_hash, log_index)
    );
    CREATE INDEX IF NOT EXISTS idx_logs_addr ON logs(chain_id, address, block_number DESC);
    CREATE INDEX IF NOT EXISTS idx_logs_topic0 ON logs(chain_id, topic0, block_number DESC);

    CREATE TABLE IF NOT EXISTS transfers (
      chain_id INTEGER NOT NULL, tx_hash TEXT NOT NULL, log_index INTEGER NOT NULL,
      block_number INTEGER, block_time INTEGER, token TEXT, from_addr TEXT, to_addr TEXT,
      amount TEXT, kind TEXT,
      PRIMARY KEY (chain_id, tx_hash, log_index)
    );
    CREATE INDEX IF NOT EXISTS idx_xfer_token ON transfers(chain_id, token, block_number DESC);
    CREATE INDEX IF NOT EXISTS idx_xfer_from ON transfers(chain_id, from_addr, block_number DESC);
    CREATE INDEX IF NOT EXISTS idx_xfer_to ON transfers(chain_id, to_addr, block_number DESC);

    CREATE TABLE IF NOT EXISTS tokens (
      chain_id INTEGER NOT NULL, address TEXT NOT NULL, kind TEXT, name TEXT, symbol TEXT,
      decimals INTEGER, first_block INTEGER,
      PRIMARY KEY (chain_id, address)
    );

    CREATE TABLE IF NOT EXISTS contracts (
      chain_id INTEGER NOT NULL, address TEXT NOT NULL, name TEXT, compiler TEXT,
      optimization INTEGER, runs INTEGER, evm_version TEXT, source TEXT, abi TEXT,
      constructor_args TEXT, verified_at INTEGER,
      PRIMARY KEY (chain_id, address)
    );
  `);
}

// Prepared-statement cache.
const cache = new Map();
const q = (sql) => {
  let s = cache.get(sql);
  if (!s) {
    s = open().prepare(sql);
    cache.set(sql, s);
  }
  return s;
};

// ---- sync state ------------------------------------------------------------------------------
export const getSyncState = (chainId) =>
  q("SELECT last_block FROM sync_state WHERE chain_id = ?").get(chainId)?.last_block ?? -1;
export const setSyncState = (chainId, n) =>
  q("INSERT INTO sync_state(chain_id, last_block) VALUES (?, ?) ON CONFLICT(chain_id) DO UPDATE SET last_block = excluded.last_block").run(chainId, n);

// ---- writes ----------------------------------------------------------------------------------
export const upsertBlock = (b) =>
  q(`INSERT OR REPLACE INTO blocks(chain_id,number,hash,parent_hash,miner,timestamp,gas_used,gas_limit,base_fee,tx_count,size)
     VALUES (@chain_id,@number,@hash,@parent_hash,@miner,@timestamp,@gas_used,@gas_limit,@base_fee,@tx_count,@size)`).run(b);
export const insertTx = (t) =>
  q(`INSERT OR REPLACE INTO txns(chain_id,hash,block_number,block_time,tx_index,from_addr,to_addr,value,gas,gas_price,status,nonce,input_size,method_id,contract_created)
     VALUES (@chain_id,@hash,@block_number,@block_time,@tx_index,@from_addr,@to_addr,@value,@gas,@gas_price,@status,@nonce,@input_size,@method_id,@contract_created)`).run(t);
export const insertLog = (l) =>
  q(`INSERT OR REPLACE INTO logs(chain_id,tx_hash,log_index,block_number,address,topic0,topic1,topic2,topic3,data)
     VALUES (@chain_id,@tx_hash,@log_index,@block_number,@address,@topic0,@topic1,@topic2,@topic3,@data)`).run(l);
export const insertTransfer = (x) =>
  q(`INSERT OR REPLACE INTO transfers(chain_id,tx_hash,log_index,block_number,block_time,token,from_addr,to_addr,amount,kind)
     VALUES (@chain_id,@tx_hash,@log_index,@block_number,@block_time,@token,@from_addr,@to_addr,@amount,@kind)`).run(x);
export const upsertToken = (tk) =>
  q(`INSERT INTO tokens(chain_id,address,kind,name,symbol,decimals,first_block)
     VALUES (@chain_id,@address,@kind,@name,@symbol,@decimals,@first_block)
     ON CONFLICT(chain_id,address) DO UPDATE SET kind=excluded.kind, name=COALESCE(excluded.name,tokens.name),
       symbol=COALESCE(excluded.symbol,tokens.symbol), decimals=COALESCE(excluded.decimals,tokens.decimals)`).run(tk);

/** Reorg rollback: delete everything at or above `number` for a chain. */
export const rollbackFrom = (chainId, number) => {
  const tx = open().transaction((cid, n) => {
    q("DELETE FROM blocks WHERE chain_id=? AND number>=?").run(cid, n);
    q("DELETE FROM txns WHERE chain_id=? AND block_number>=?").run(cid, n);
    q("DELETE FROM logs WHERE chain_id=? AND block_number>=?").run(cid, n);
    q("DELETE FROM transfers WHERE chain_id=? AND block_number>=?").run(cid, n);
  });
  tx(chainId, number);
};
export const blockHashAt = (chainId, number) =>
  q("SELECT hash FROM blocks WHERE chain_id=? AND number=?").get(chainId, number)?.hash ?? null;

/** Atomically write one fully-decoded block + its txns/logs/transfers. */
export function writeBlockBundle({ block, txns, logs, transfers, tokens }) {
  const tx = open().transaction(() => {
    upsertBlock(block);
    for (const t of txns) insertTx(t);
    for (const l of logs) insertLog(l);
    for (const x of transfers) insertTransfer(x);
    for (const tk of tokens) upsertToken(tk);
  });
  tx();
}

// ---- reads -----------------------------------------------------------------------------------
export const stats = (chainId) => ({
  chainId,
  lastBlock: getSyncState(chainId),
  blocks: q("SELECT COUNT(*) c FROM blocks WHERE chain_id=?").get(chainId).c,
  txns: q("SELECT COUNT(*) c FROM txns WHERE chain_id=?").get(chainId).c,
  transfers: q("SELECT COUNT(*) c FROM transfers WHERE chain_id=?").get(chainId).c,
  tokens: q("SELECT COUNT(*) c FROM tokens WHERE chain_id=?").get(chainId).c,
  contracts: q("SELECT COUNT(*) c FROM contracts WHERE chain_id=?").get(chainId).c,
});

export const latestBlocks = (chainId, limit = 25, offset = 0) =>
  q("SELECT * FROM blocks WHERE chain_id=? ORDER BY number DESC LIMIT ? OFFSET ?").all(chainId, limit, offset);
export const blockByNumber = (chainId, n) => q("SELECT * FROM blocks WHERE chain_id=? AND number=?").get(chainId, n);
export const blockByHash = (chainId, h) => q("SELECT * FROM blocks WHERE chain_id=? AND hash=?").get(chainId, h.toLowerCase());
export const txsInBlock = (chainId, n) =>
  q("SELECT * FROM txns WHERE chain_id=? AND block_number=? ORDER BY tx_index ASC").all(chainId, n);

export const latestTxs = (chainId, limit = 25, offset = 0) =>
  q("SELECT * FROM txns WHERE chain_id=? ORDER BY block_number DESC, tx_index DESC LIMIT ? OFFSET ?").all(chainId, limit, offset);
export const txByHash = (chainId, h) => q("SELECT * FROM txns WHERE chain_id=? AND hash=?").get(chainId, h.toLowerCase());
export const txsByAddress = (chainId, addr, limit = 25, offset = 0) =>
  q(`SELECT * FROM txns WHERE chain_id=? AND (from_addr=? OR to_addr=?) ORDER BY block_number DESC, tx_index DESC LIMIT ? OFFSET ?`)
    .all(chainId, addr.toLowerCase(), addr.toLowerCase(), limit, offset);
export const txCountByAddress = (chainId, addr) =>
  q("SELECT COUNT(*) c FROM txns WHERE chain_id=? AND (from_addr=? OR to_addr=?)").get(chainId, addr.toLowerCase(), addr.toLowerCase()).c;

export const transfersByAddress = (chainId, addr, limit = 25, offset = 0) =>
  q(`SELECT * FROM transfers WHERE chain_id=? AND (from_addr=? OR to_addr=?) ORDER BY block_number DESC LIMIT ? OFFSET ?`)
    .all(chainId, addr.toLowerCase(), addr.toLowerCase(), limit, offset);
export const transfersByToken = (chainId, token, limit = 25, offset = 0) =>
  q("SELECT * FROM transfers WHERE chain_id=? AND token=? ORDER BY block_number DESC LIMIT ? OFFSET ?").all(chainId, token.toLowerCase(), limit, offset);

export const tokenInfo = (chainId, addr) => q("SELECT * FROM tokens WHERE chain_id=? AND address=?").get(chainId, addr.toLowerCase());
export const listTokens = (chainId, limit = 50, offset = 0) =>
  q(`SELECT t.*, (SELECT COUNT(*) FROM transfers x WHERE x.chain_id=t.chain_id AND x.token=t.address) AS transfer_count
     FROM tokens t WHERE t.chain_id=? ORDER BY transfer_count DESC LIMIT ? OFFSET ?`).all(chainId, limit, offset);

export const logsQuery = (chainId, { address, topic0, fromBlock, toBlock, limit = 50, offset = 0 }) => {
  const where = ["chain_id=?"];
  const args = [chainId];
  if (address) { where.push("address=?"); args.push(address.toLowerCase()); }
  if (topic0) { where.push("topic0=?"); args.push(topic0.toLowerCase()); }
  if (Number.isFinite(fromBlock)) { where.push("block_number>=?"); args.push(fromBlock); }
  if (Number.isFinite(toBlock)) { where.push("block_number<=?"); args.push(toBlock); }
  args.push(limit, offset);
  return q(`SELECT * FROM logs WHERE ${where.join(" AND ")} ORDER BY block_number DESC, log_index DESC LIMIT ? OFFSET ?`).all(...args);
};

export const contractGet = (chainId, addr) => q("SELECT * FROM contracts WHERE chain_id=? AND address=?").get(chainId, addr.toLowerCase());
export const listContracts = (chainId, limit = 50, offset = 0) =>
  q("SELECT chain_id,address,name,compiler,verified_at FROM contracts WHERE chain_id=? ORDER BY verified_at DESC LIMIT ? OFFSET ?").all(chainId, limit, offset);
export const contractPut = (c) =>
  q(`INSERT OR REPLACE INTO contracts(chain_id,address,name,compiler,optimization,runs,evm_version,source,abi,constructor_args,verified_at)
     VALUES (@chain_id,@address,@name,@compiler,@optimization,@runs,@evm_version,@source,@abi,@constructor_args,@verified_at)`).run(c);
