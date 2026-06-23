// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
// Transaction detail (?hash=) — RPC-first (full receipt + logs) with an indexer fallback (no logs).

import { mountShell } from "../lib/shell.js";
import { subscribe, getSelectedNetwork } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";
import { apiTx, isIndexed } from "../lib/api.js";
import { pageHead, card, kv, loading, errorPanel, offlinePanel, copyable, mono, badge, addrLink, blockLink, wireCopy } from "../lib/widgets.js";
import { toPyrx, toSpark, commas, hexToInt, hexToBig, qp, escapeHtml } from "../lib/format.js";
import * as rpc from "../lib/rpc.js";

const main = mountShell("");
let chainId = getSelectedNetwork().chainId;
const hash = qp("hash");

type Log = { address: string; topics: string[]; data: string; logIndex: number };
type TxView = {
  hash: string; status: number | null; block_number: number | null; from: string; to: string | null;
  created: string | null; value: string; nonce: number; gas: number; gasPrice: string | null;
  gasUsed: number | null; effGasPrice: string | null; input: string; logs: Log[];
};

function fromRpc(t: rpc.RpcTx, r: rpc.RpcReceipt | null): TxView {
  return {
    hash: t.hash, status: r && r.status != null ? hexToInt(r.status) : null,
    block_number: t.blockNumber ? hexToInt(t.blockNumber) : null, from: t.from, to: t.to,
    created: r?.contractAddress ?? null, value: hexToBig(t.value).toString(), nonce: hexToInt(t.nonce),
    gas: hexToInt(t.gas), gasPrice: t.gasPrice ? hexToBig(t.gasPrice).toString() : t.maxFeePerGas ? hexToBig(t.maxFeePerGas).toString() : null,
    gasUsed: r ? hexToInt(r.gasUsed) : null, effGasPrice: r?.effectiveGasPrice ? hexToBig(r.effectiveGasPrice).toString() : null,
    input: t.input || "0x",
    logs: (r?.logs ?? []).map((l) => ({ address: l.address, topics: l.topics, data: l.data, logIndex: hexToInt(l.logIndex) })),
  };
}

function feeLine(v: TxView): string {
  if (v.gasUsed != null && v.effGasPrice) {
    const fee = BigInt(v.gasUsed) * BigInt(v.effGasPrice);
    return `${toPyrx(fee, 8)} PYRX  ·  ${commas(v.gasUsed)} gas @ ${toSpark(BigInt(v.effGasPrice))} spark`;
  }
  return "—";
}

function logsHtml(logs: Log[]): string {
  if (!logs.length) return "";
  return `<h2 class="expl-section-title">Event logs (${logs.length})</h2>` + logs
    .map(
      (l) => card(
        `<div style="font-size:.8rem"><div><strong>#${l.logIndex}</strong> &nbsp; ${addrLink(l.address, false)}</div>
         <div style="margin-top:.5rem;color:var(--color-faint)">topics</div>
         ${l.topics.map((t, i) => `<div class="expl-mono" style="word-break:break-all">[${i}] ${escapeHtml(t)}</div>`).join("")}
         <div style="margin-top:.5rem;color:var(--color-faint)">data</div>
         <div class="expl-mono" style="word-break:break-all">${escapeHtml(l.data)}</div></div>`,
        "expl-log",
      ),
    )
    .join("");
}

function render(v: TxView): string {
  const status = v.status === 1 ? badge("Success", "positive") : v.status === 0 ? badge("Failed", "negative") : badge("Pending / unknown", "amber");
  const toRow = v.to ? addrLink(v.to, false) : v.created ? `${badge("Contract created", "violet")} ${addrLink(v.created, false)}` : badge("Contract creation", "violet");
  const detail = card(
    [
      kv("Transaction hash", copyable(v.hash)),
      kv("Status", status),
      kv("Block", v.block_number != null ? blockLink(v.block_number) : "pending"),
      kv("From", addrLink(v.from, false)),
      kv("To", toRow),
      kv("Value", `${toPyrx(BigInt(v.value || "0"), 8)} PYRX`),
      kv("Transaction fee", feeLine(v)),
      kv("Gas limit / price", `${commas(v.gas)}${v.gasPrice ? ` @ ${toSpark(BigInt(v.gasPrice))} spark` : ""}`),
      kv("Nonce", String(v.nonce)),
      kv("Input data", v.input && v.input !== "0x" ? `<div class="expl-mono" style="word-break:break-all;max-height:9rem;overflow:auto">${escapeHtml(v.input)}</div>` : mono("0x (none)")),
    ].join(""),
  );
  return pageHead("Transaction", "") + detail + logsHtml(v.logs);
}

async function load(): Promise<void> {
  const net = getSelectedNetwork();
  if (!hash) {
    main.innerHTML = pageHead("Transaction") + errorPanel("No transaction hash specified.");
    return;
  }
  main.innerHTML = pageHead("Transaction") + loading();
  try {
    if (!net.rpc && !(await isIndexed(net.chainId))) {
      main.innerHTML = pageHead("Transaction") + offlinePanel(net.name);
      return;
    }
    let view: TxView | null = null;
    if (net.rpc) {
      const [tx, rc] = await Promise.all([rpc.getTx(hash), rpc.getReceipt(hash).catch(() => null)]);
      if (tx) view = fromRpc(tx, rc);
    }
    if (!view && (await isIndexed(net.chainId))) {
      try {
        const t = await apiTx(net.chainId, hash);
        view = {
          hash: t.hash, status: t.status, block_number: t.block_number, from: t.from_addr, to: t.to_addr,
          created: t.contract_created, value: t.value, nonce: t.nonce, gas: t.gas, gasPrice: t.gas_price,
          gasUsed: null, effGasPrice: null, input: "0x", logs: [],
        };
      } catch {
        /* not found in indexer either */
      }
    }
    main.innerHTML = view ? render(view) : pageHead("Transaction") + errorPanel(`Transaction not found on ${net.name}.`);
    wireCopy(main);
  } catch (e) {
    main.innerHTML = pageHead("Transaction") + errorPanel((e as Error).message);
  }
}

void load();
subscribe((s: NetSnapshot) => {
  if (s.selected.chainId !== chainId) { chainId = s.selected.chainId; void load(); }
});
