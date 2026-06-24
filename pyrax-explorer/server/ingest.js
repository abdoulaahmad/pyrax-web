// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// The ingest worker: for each RPC-wired network, walk new blocks, persist blocks + transactions +
// receipts/logs, and decode ERC-20 / ERC-721 Transfer events. Handles shallow reorgs by re-anchoring
// when a stored tip hash no longer matches the chain. Runs on an interval; also runnable standalone.

import { EventEmitter } from "node:events";
import { rpc, hexToInt, hexToBigStr, mapLimit } from "./rpc.js";
import * as db from "./db.js";
import { enabledNetworks, INGEST_INTERVAL_MS, INGEST_BATCH, RECEIPT_CONCURRENCY } from "./config.js";

// Realtime feed: emits a `block` event for every freshly-indexed block. The HTTP
// server relays these to connected browsers over WebSocket so the explorer UI updates
// the instant a block lands — no polling, no 8-second jumps, no gaps.
export const events = new EventEmitter();
events.setMaxListeners(0);

// keccak256("Transfer(address,address,uint256)")
const TRANSFER_SIG = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const REORG_DEPTH = 32;

const lc = (s) => (typeof s === "string" ? s.toLowerCase() : s);
const topicAddr = (t) => (t && t.length >= 42 ? "0x" + t.slice(-40).toLowerCase() : null);

async function ingestBlock(chainId, url, blk) {
  const number = hexToInt(blk.number);
  const blockTime = hexToInt(blk.timestamp);
  const txs = Array.isArray(blk.transactions) ? blk.transactions : [];

  const block = {
    chain_id: chainId, number, hash: lc(blk.hash), parent_hash: lc(blk.parentHash), miner: lc(blk.miner),
    timestamp: blockTime, gas_used: hexToInt(blk.gasUsed), gas_limit: hexToInt(blk.gasLimit),
    base_fee: blk.baseFeePerGas ? hexToBigStr(blk.baseFeePerGas) : null, tx_count: txs.length, size: hexToInt(blk.size),
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
    });
    if (r && Array.isArray(r.logs)) {
      for (const log of r.logs) {
        const li = hexToInt(log.logIndex);
        const topics = log.topics || [];
        logRows.push({
          chain_id: chainId, tx_hash: lc(t.hash), log_index: li, block_number: number, address: lc(log.address),
          topic0: lc(topics[0] ?? null), topic1: lc(topics[1] ?? null), topic2: lc(topics[2] ?? null),
          topic3: lc(topics[3] ?? null), data: log.data,
        });
        if (topics[0] && lc(topics[0]) === TRANSFER_SIG && topics.length >= 3) {
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

  await db.writeBlockBundle({ block, txns: txnRows, logs: logRows, transfers: xferRows, tokens: tokenRows });
  // Realtime push: tell subscribers a block landed (relayed to browsers over WS).
  events.emit("block", {
    chainId, number, hash: block.hash, parentHash: block.parent_hash, miner: block.miner,
    timestamp: blockTime, txCount: block.tx_count, gasUsed: block.gas_used,
  });
}

// Self-heal on a chain RESET: if the chain's genesis (block 0) hash no longer
// matches what we indexed under, the disposable network was wiped + re-genesised, so
// the stored data is from a DEAD chain. Wipe ALL of this chain's rows and re-index
// from scratch — old + new data can never mix. Returns true if it reset.
async function reconcileGenesis(chainId, url) {
  const g = await rpc(url, "eth_getBlockByNumber", ["0x0", false]).catch(() => null);
  const onchain = g && typeof g.hash === "string" ? g.hash.toLowerCase() : null;
  if (!onchain) return false; // node unreachable — leave existing data untouched

  const wipe = async (reason) => {
    console.warn(`[ingest] ${chainId}: ${reason} — chain was reset; wiping + re-indexing from 0`);
    await db.wipeChain(chainId);
    await db.setGenesisHash(chainId, onchain);
  };

  // SOURCE OF TRUTH: the block 0 we actually indexed. If it doesn't match the live
  // chain's genesis, our data is from a DEAD chain — wipe it. Checked independently of
  // the recorded hash (a prior run may have recorded a hash that disagrees with the
  // data, which is exactly the stale state this must repair).
  const indexedB0 = await db.blockHashAt(chainId, 0);
  if (indexedB0 && indexedB0.toLowerCase() !== onchain) {
    await wipe(`indexed genesis ${indexedB0.slice(0, 10)}… ≠ chain ${onchain.slice(0, 10)}…`);
    return true;
  }
  // No block 0 indexed yet: fall back to the recorded hash (catches a reset detected
  // before block 0 is re-stored).
  const recorded = await db.getGenesisHash(chainId);
  if (!indexedB0 && recorded && recorded !== onchain) {
    await wipe(`recorded genesis ${recorded.slice(0, 10)}… ≠ chain ${onchain.slice(0, 10)}…`);
    return true;
  }
  if (recorded !== onchain) await db.setGenesisHash(chainId, onchain); // record / re-affirm
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
  if (last >= head) return null;

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

  const from = last + 1;
  const to = Math.min(head, from + INGEST_BATCH - 1);
  for (let n = from; n <= to; n++) {
    const blk = await rpc(url, "eth_getBlockByNumber", ["0x" + n.toString(16), true]).catch(() => null);
    if (!blk) break;
    await ingestBlock(chainId, url, blk);
    await db.setSyncState(chainId, n);
  }
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
