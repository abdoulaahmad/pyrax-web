// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// The ingest worker: for each RPC-wired network, walk new blocks, persist blocks + transactions +
// receipts/logs, and decode ERC-20 / ERC-721 Transfer events. Handles shallow reorgs by re-anchoring
// when a stored tip hash no longer matches the chain. Runs on an interval; also runnable standalone.

import { rpc, hexToInt, hexToBigStr, mapLimit } from "./rpc.js";
import * as db from "./db.js";
import { enabledNetworks, INGEST_INTERVAL_MS, INGEST_BATCH, RECEIPT_CONCURRENCY } from "./config.js";

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

  db.writeBlockBundle({ block, txns: txnRows, logs: logRows, transfers: xferRows, tokens: tokenRows });
}

async function ingestNetwork(net) {
  const { chainId, rpc: url } = net;
  const head = hexToInt(await rpc(url, "eth_blockNumber"));
  if (!Number.isFinite(head)) return null;
  let last = db.getSyncState(chainId);
  if (last >= head) return null;

  // Reorg guard: if our stored tip hash no longer matches the chain, re-anchor a few blocks back.
  if (last >= 0) {
    const onchain = await rpc(url, "eth_getBlockByNumber", ["0x" + last.toString(16), false]).catch(() => null);
    const stored = db.blockHashAt(chainId, last);
    if (onchain && stored && lc(onchain.hash) !== lc(stored)) {
      const back = Math.max(0, last - REORG_DEPTH);
      db.rollbackFrom(chainId, back);
      db.setSyncState(chainId, back - 1);
      last = back - 1;
    }
  }

  const from = last + 1;
  const to = Math.min(head, from + INGEST_BATCH - 1);
  for (let n = from; n <= to; n++) {
    const blk = await rpc(url, "eth_getBlockByNumber", ["0x" + n.toString(16), true]).catch(() => null);
    if (!blk) break;
    await ingestBlock(chainId, url, blk);
    db.setSyncState(chainId, n);
  }
  return { chainId, from, to, head };
}

let timer = null;
export function startIngest() {
  db.open();
  const nets = enabledNetworks();
  if (!nets.length) {
    console.log("[ingest] no networks with an RPC wired — nothing to index");
    return;
  }
  console.log("[ingest] indexing:", nets.map((n) => `${n.name} (${n.chainId})`).join(", "));
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    for (const net of nets) {
      try {
        const r = await ingestNetwork(net);
        if (r && r.to >= r.from) console.log(`[ingest] ${net.chainId}: ${r.from}..${r.to} / head ${r.head}`);
      } catch (e) {
        console.warn(`[ingest] ${net.chainId} error: ${e.message}`);
      }
    }
    running = false;
  };
  void tick();
  timer = setInterval(() => void tick(), INGEST_INTERVAL_MS);
}
export function stopIngest() {
  if (timer) clearInterval(timer);
}

// Standalone: `node ingest.js` (no double-start when imported by index.js).
if (process.argv[1]?.endsWith("ingest.js")) startIngest();
