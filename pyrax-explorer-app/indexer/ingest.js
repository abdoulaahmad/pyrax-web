// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The ingest worker: for each RPC-wired network, walk new blocks, persist blocks + transactions +
// receipts/logs, and decode ERC-20 / ERC-721 Transfer events. Enriches each block with its PYRAX
// GhostDAG stream + seal lane (via pyrax_dagRecent, by blue score). Handles shallow reorgs by
// re-anchoring when a stored tip hash no longer matches the chain. Runs on an interval; also
// runnable standalone.

import { EventEmitter } from "node:events";
import { rpc, hexToInt, hexToBigStr, mapLimit, dagStreamMap, deriveSeal } from "./rpc.js";
import * as db from "./db.js";
import { report as sentinel } from "./sentinel.js";
import { enabledNetworks, INGEST_INTERVAL_MS, INGEST_BATCH, RECEIPT_CONCURRENCY, MAX_LOGS_PER_BLOCK, MAX_TRANSFERS_PER_BLOCK } from "./config.js";
import { capLogData } from "./caps.js";

// Realtime feed: emits a `block` event for every freshly-indexed block. The HTTP
// server relays these to connected browsers over WebSocket so the explorer UI updates
// the instant a block lands — no polling, no 8-second jumps, no gaps.
export const events = new EventEmitter();
events.setMaxListeners(0);

// ---- ingest progress (head-freshness / lag oracle) -------------------------
// Per-network liveness so /api/health can tell a STUCK ingest from a healthy one. Each successful tick
// records the chain head, the last block we've indexed, and the wall-clock time it last ADVANCED. A tick
// that runs but indexes nothing new does NOT reset `lastAdvanceAt`, so a wedged ingest (RPC returns a
// head we can never catch up to, a DB that keeps failing to write) shows a growing `staleMs` even though
// the process is alive. Exposed via ingestProgress(); consumed by index.js → GET /api/health.
const progress = new Map(); // chainId -> { head, indexed, lastAdvanceAt, lastTickAt, lastError }
const now = () => Date.now();
function markTick(chainId, head, indexed, err) {
  const prev = progress.get(chainId) || { head: 0, indexed: -1, lastAdvanceAt: now(), lastTickAt: 0, lastError: null };
  const advanced = Number.isFinite(indexed) && indexed > prev.indexed;
  progress.set(chainId, {
    head: Number.isFinite(head) ? head : prev.head,
    indexed: Number.isFinite(indexed) ? indexed : prev.indexed,
    lastAdvanceAt: advanced ? now() : prev.lastAdvanceAt,
    lastTickAt: now(),
    lastError: err ? String(err).slice(0, 200) : null,
  });
}

/** Snapshot of per-network ingest liveness for GET /api/health. `lagBlocks` = head − indexed (how far
 *  behind the tip we are). `staleMs` = ms since indexing last ADVANCED (grows without bound if wedged).
 *  A consumer flags a network unhealthy when lagBlocks stays high AND staleMs exceeds a threshold. */
export function ingestProgress() {
  const t = now();
  const nets = {};
  for (const [chainId, p] of progress) {
    const lagBlocks = Number.isFinite(p.head) && Number.isFinite(p.indexed) ? Math.max(0, p.head - p.indexed) : null;
    nets[chainId] = {
      head: p.head,
      indexed: p.indexed,
      lagBlocks,
      staleMs: t - p.lastAdvanceAt,
      lastTickAgoMs: p.lastTickAt ? t - p.lastTickAt : null,
      lastError: p.lastError,
    };
  }
  return nets;
}

// keccak256("Transfer(address,address,uint256)")
const TRANSFER_SIG = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const REORG_DEPTH = 32;

const lc = (s) => (typeof s === "string" ? s.toLowerCase() : s);
const topicAddr = (t) => (t && t.length >= 42 ? "0x" + t.slice(-40).toLowerCase() : null);

async function ingestBlock(chainId, url, blk, streams) {
  const number = hexToInt(blk.number);
  const blockTime = hexToInt(blk.timestamp);
  const txs = Array.isArray(blk.transactions) ? blk.transactions : [];

  // The eth block `number` equals the GhostDAG blue score. The real stream comes from
  // pyrax_dagRecent (by blue score); the seal lane is reconstructed from the stream via the
  // authoritative lane_algo rule. A non-PYRAX node (no pyrax_dagRecent) leaves these null.
  const stream = streams.get(number) ?? null;
  const block = {
    chain_id: chainId, number, hash: lc(blk.hash), parent_hash: lc(blk.parentHash), miner: lc(blk.miner),
    timestamp: blockTime, gas_used: hexToInt(blk.gasUsed), gas_limit: hexToInt(blk.gasLimit),
    base_fee: blk.baseFeePerGas ? hexToBigStr(blk.baseFeePerGas) : null, tx_count: txs.length, size: hexToInt(blk.size),
    blue_score: number, stream, seal_algo: stream ? deriveSeal(stream, number) : null,
  };

  const txnRows = [], logRows = [], xferRows = [], tokenRows = [];
  const receipts = txs.length
    ? await mapLimit(txs, RECEIPT_CONCURRENCY, (t) => rpc(url, "eth_getTransactionReceipt", [t.hash]).catch(() => null))
    : [];

  txs.forEach((t, i) => {
    const r = receipts[i];
    const input = t.input || "0x";
    txnRows.push({
      chain_id: chainId, hash: lc(t.hash), block_number: number, block_time: blockTime,
      tx_index: hexToInt(t.transactionIndex), from_addr: lc(t.from), to_addr: lc(t.to),
      value: hexToBigStr(t.value), gas: hexToInt(t.gas),
      gas_price: t.gasPrice ? hexToBigStr(t.gasPrice) : t.maxFeePerGas ? hexToBigStr(t.maxFeePerGas) : null,
      status: r && r.status != null ? hexToInt(r.status) : null, nonce: hexToInt(t.nonce),
      input_size: input.length > 2 ? (input.length - 2) / 2 : 0, method_id: input.length >= 10 ? input.slice(0, 10) : null,
      contract_created: r && r.contractAddress ? lc(r.contractAddress) : null,
      // Only Ethereum- and Transparent-shaped txs appear in the eth block tx array; the native
      // PYRAX envelope types (shielded/escrow/stake/gov) are not eth-shaped and never surface here.
      tx_type: "ethereum",
    });
    if (r && Array.isArray(r.logs)) {
      for (const log of r.logs) {
        // Bound the per-block log/transfer row count so a spam-emitting tx can't drive an unbounded
        // bundle (write-amplification / storage blowup). Excess logs in a pathological block are dropped.
        if (logRows.length >= MAX_LOGS_PER_BLOCK) break;
        const li = hexToInt(log.logIndex);
        const topics = log.topics || [];
        logRows.push({
          chain_id: chainId, tx_hash: lc(t.hash), log_index: li, block_number: number, address: lc(log.address),
          topic0: lc(topics[0] ?? null), topic1: lc(topics[1] ?? null), topic2: lc(topics[2] ?? null),
          topic3: lc(topics[3] ?? null), data: capLogData(log.data),
        });
        if (topics[0] && lc(topics[0]) === TRANSFER_SIG && topics.length >= 3 && xferRows.length < MAX_TRANSFERS_PER_BLOCK) {
          const erc721 = topics.length === 4; // indexed tokenId ⇒ 4 topics
          xferRows.push({
            chain_id: chainId, tx_hash: lc(t.hash), log_index: li, block_number: number, block_time: blockTime,
            token: lc(log.address), from_addr: topicAddr(topics[1]), to_addr: topicAddr(topics[2]),
            amount: erc721 ? hexToBigStr(topics[3]) : hexToBigStr(log.data), kind: erc721 ? "erc721" : "erc20",
          });
          tokenRows.push({ chain_id: chainId, address: lc(log.address), kind: erc721 ? "erc721" : "erc20", name: null, symbol: null, decimals: null, first_block: number });
        }
      }
    }
  });

  try {
    await db.writeBlockBundle({ block, txns: txnRows, logs: logRows, transfers: xferRows, tokens: tokenRows });
  } catch (e) {
    // A DB write failure is a genuine indexer fault — persistence is the indexer's whole job. Report it
    // (deduped/throttled/scrubbed) and re-throw so the caller's tick sees the error and doesn't advance
    // the sync cursor past an unwritten block.
    sentinel(`${chainId}: block write failed at #${number}`, `writeBlockBundle #${number}: ${e?.message ?? e}`, "error");
    throw e;
  }
  // Realtime push: tell subscribers a block landed (relayed to browsers over WS).
  events.emit("block", {
    chainId, number, hash: block.hash, parentHash: block.parent_hash, miner: block.miner,
    timestamp: blockTime, txCount: block.tx_count, gasUsed: block.gas_used, stream: block.stream, sealAlgo: block.seal_algo,
  });
}

// Self-heal on a chain RESET: if the chain's genesis (block 0) hash no longer
// matches what we indexed under, the disposable network was wiped + re-genesised, so
// the stored data is from a DEAD chain. Wipe ALL of this chain's rows and re-index
// from scratch — old + new data can never mix. Returns true if it reset.
async function reconcileGenesis(chainId, url) {
  // Detect a chain RESET (a disposable network wiped + re-genesised) and re-index from
  // scratch so old + new data never mix. We compare EARLY block hashes against the live
  // chain. CRUCIAL: block 0 (genesis) is DETERMINISTIC from the chainspec, so every
  // re-genesis of the same network produces the IDENTICAL block 0 — comparing it alone
  // can't catch a reset. Block 1 is the first MINED block, so it differs on every
  // re-genesis; comparing it catches a reset even when the genesis allocation is
  // unchanged. We probe block 1 first, then fall back to block 0 (covers an actual
  // genesis/allocation change).
  for (const probe of [1, 0]) {
    const hx = "0x" + probe.toString(16);
    const live = await rpc(url, "eth_getBlockByNumber", [hx, false]).catch(() => null);
    const liveHash = live && typeof live.hash === "string" ? live.hash.toLowerCase() : null;
    if (!liveHash) continue; // chain too short for this probe (or node unreachable) — try next
    const indexed = await db.blockHashAt(chainId, probe);
    if (indexed && indexed.toLowerCase() !== liveHash) {
      console.warn(
        `[ingest] ${chainId}: block ${probe} diverged (${indexed.slice(0, 10)}… → ${liveHash.slice(0, 10)}…) — chain was reset; wiping + re-indexing from 0`,
      );
      await db.wipeChain(chainId);
      await db.setGenesisHash(chainId, liveHash);
      return true;
    }
  }
  return false;
}

async function ingestNetwork(net) {
  const { chainId, rpc: url } = net;
  // Detect + recover from a chain reset BEFORE walking blocks (so we never append
  // new-chain blocks onto dead-chain history).
  await reconcileGenesis(chainId, url);
  const head = hexToInt(await rpc(url, "eth_blockNumber"));
  if (!Number.isFinite(head)) return null;
  let last = await db.getSyncState(chainId);
  // Record liveness even when we're already caught up (last >= head): the tip is fresh and there's
  // simply nothing new to index, which must read as HEALTHY (staleMs keeps resetting because `indexed`
  // tracks the head), not as a stuck ingest.
  if (last >= head) { markTick(chainId, head, head, null); return null; }

  // Reorg guard: if our stored tip hash no longer matches the chain, re-anchor a few blocks back.
  if (last >= 0) {
    const onchain = await rpc(url, "eth_getBlockByNumber", ["0x" + last.toString(16), false]).catch(() => null);
    const stored = await db.blockHashAt(chainId, last);
    if (onchain && stored && lc(onchain.hash) !== lc(stored)) {
      const back = Math.max(0, last - REORG_DEPTH);
      await db.rollbackFrom(chainId, back);
      await db.setSyncState(chainId, back - 1);
      last = back - 1;
    }
  }

  // One pyrax_dagRecent fetch per tick gives the stream for the recent (tip) window the batch
  // covers; older blocks outside the window simply index without a stream.
  const streams = await dagStreamMap(url, 512);

  const from = last + 1;
  const to = Math.min(head, from + INGEST_BATCH - 1);
  let indexed = last; // highest block actually persisted this network (for the freshness oracle)
  for (let n = from; n <= to; n++) {
    const blk = await rpc(url, "eth_getBlockByNumber", ["0x" + n.toString(16), true]).catch(() => null);
    if (!blk) break;
    await ingestBlock(chainId, url, blk, streams);
    await db.setSyncState(chainId, n);
    indexed = n;
  }
  // Feed the freshness oracle: head is the chain tip; `indexed` is what we've actually persisted. If a
  // batch caps below head we're behind but advancing (healthy); if `indexed` never moves across ticks
  // while head climbs, staleMs grows and /api/health flags the network.
  markTick(chainId, head, indexed, null);
  return { chainId, from, to, head };
}

// Realtime accelerator: subscribe to the node's `newHeads` over WebSocket so a new
// block triggers an immediate ingest (sub-second) instead of waiting for the poll
// tick. Best-effort + self-reconnecting; if the node doesn't serve subscriptions the
// interval poll still keeps the chain indexed (no realtime, but no gaps either).
function subscribeHeads(net, onHead) {
  const wsUrl = net.rpc.replace(/^http/i, "ws"); // http→ws, https→wss (same host/port)
  let alive = true;
  let backoff = 1000;
  const connect = () => {
    if (!alive) return;
    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      return void setTimeout(connect, backoff);
    }
    ws.addEventListener("open", () => {
      backoff = 1000;
      ws.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_subscribe", params: ["newHeads"] }));
      console.log(`[ingest] ${net.chainId}: subscribed to newHeads over WebSocket (realtime)`);
    });
    ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
        if (msg.method === "eth_subscription" && msg.params?.result) onHead();
      } catch {
        /* ignore non-JSON / unrelated frames */
      }
    });
    const reconnect = () => {
      if (!alive) return;
      backoff = Math.min(backoff * 2, 30_000);
      setTimeout(connect, backoff);
    };
    ws.addEventListener("close", reconnect);
    ws.addEventListener("error", () => {
      try {
        ws.close();
      } catch {
        /* already closing */
      }
    });
  };
  connect();
  return () => {
    alive = false;
  };
}

let timer = null;
export async function startIngest() {
  await db.init();
  const nets = enabledNetworks();
  if (!nets.length) {
    console.log("[ingest] no networks with an RPC wired — nothing to index");
    return;
  }
  console.log("[ingest] indexing:", nets.map((n) => `${n.name} (${n.chainId})`).join(", "));
  let running = false;
  let again = false;
  const tick = async () => {
    if (running) {
      again = true; // a head arrived mid-tick — run once more right after
      return;
    }
    running = true;
    do {
      again = false;
      for (const net of nets) {
        try {
          const r = await ingestNetwork(net);
          if (r && r.to >= r.from) console.log(`[ingest] ${net.chainId}: ${r.from}..${r.to} / head ${r.head}`);
        } catch (e) {
          console.warn(`[ingest] ${net.chainId} error: ${e.message}`);
          // Record the failing tick for the freshness oracle (does NOT advance lastAdvanceAt, so a
          // persistently-failing network accrues staleMs) and report it (deduped/throttled/scrubbed).
          markTick(net.chainId, NaN, NaN, e?.message ?? e);
          sentinel(`${net.chainId}: ingest tick failed`, `ingestNetwork(${net.chainId}): ${e?.message ?? e}`, "error");
        }
      }
    } while (again);
    running = false;
  };
  void tick();
  // Poll is the safety net (fills any gap a dropped subscription misses); the WS
  // subscription is the realtime fast-path.
  timer = setInterval(() => void tick(), INGEST_INTERVAL_MS);
  for (const net of nets) subscribeHeads(net, () => void tick());
}
export function stopIngest() {
  if (timer) clearInterval(timer);
}

// Standalone: `node ingest.js` (no double-start when imported by index.js).
if (process.argv[1]?.endsWith("ingest.js")) startIngest();
