// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
// RPC playground — send a raw JSON-RPC request to the selected network's node and inspect the response.

import { mountShell } from "../lib/shell.js";
import { subscribe, getSelectedNetwork } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";
import { pageHead, card, offlinePanel } from "../lib/widgets.js";
import { escapeHtml } from "../lib/format.js";
import * as rpc from "../lib/rpc.js";

const main = mountShell("rpc");
let chainId = getSelectedNetwork().chainId;

const METHODS: { m: string; p: string }[] = [
  { m: "eth_blockNumber", p: "[]" },
  { m: "eth_chainId", p: "[]" },
  { m: "eth_gasPrice", p: "[]" },
  { m: "net_peerCount", p: "[]" },
  { m: "web3_clientVersion", p: "[]" },
  { m: "eth_getBlockByNumber", p: '["latest", false]' },
  { m: "eth_getBalance", p: '["0x0000000000000000000000000000000000000000", "latest"]' },
  { m: "eth_getTransactionByHash", p: '["0x..."]' },
  { m: "eth_getTransactionReceipt", p: '["0x..."]' },
  { m: "eth_getCode", p: '["0x...", "latest"]' },
  { m: "eth_getTransactionCount", p: '["0x...", "latest"]' },
  { m: "eth_call", p: '[{"to":"0x...","data":"0x"}, "latest"]' },
  { m: "eth_feeHistory", p: '["0x5", "latest", [25,50,75]]' },
];

function frame(): void {
  const net = getSelectedNetwork();
  if (!net.rpc) {
    main.innerHTML = pageHead("RPC playground") + offlinePanel(net.name);
    return;
  }
  main.innerHTML =
    pageHead("RPC playground", `Send raw JSON-RPC to ${net.name} (${net.rpc}).`) +
    card(`
      <label class="expl-stat-label">Method</label>
      <select data-m class="expl-search-input" style="display:block;width:100%;margin:.35rem 0 .9rem;padding:.55rem;border:1px solid var(--color-line);border-radius:.5rem;background:var(--color-bg-2)">
        ${METHODS.map((x) => `<option value="${x.m}">${x.m}</option>`).join("")}
      </select>
      <label class="expl-stat-label">Params (JSON array)</label>
      <textarea data-p rows="3" class="expl-mono" style="display:block;width:100%;margin:.35rem 0 .9rem;padding:.6rem;border:1px solid var(--color-line);border-radius:.5rem;background:var(--color-bg-2);color:var(--color-ink)">[]</textarea>
      <button data-send class="expl-search-btn" style="border:0;cursor:pointer">Send request</button>
      <pre data-out class="expl-mono" style="margin-top:1rem;padding:1rem;background:var(--color-bg-2);border:1px solid var(--color-line);border-radius:.6rem;overflow:auto;max-height:28rem;white-space:pre-wrap;word-break:break-word"></pre>
    `);
  wire();
}

function wire(): void {
  const sel = main.querySelector<HTMLSelectElement>("[data-m]");
  const params = main.querySelector<HTMLTextAreaElement>("[data-p]");
  const out = main.querySelector<HTMLElement>("[data-out]");
  const btn = main.querySelector<HTMLButtonElement>("[data-send]");
  sel?.addEventListener("change", () => {
    const found = METHODS.find((x) => x.m === sel.value);
    if (found && params) params.value = found.p;
  });
  btn?.addEventListener("click", async () => {
    if (!out || !sel) return;
    let parsed: unknown[];
    try {
      parsed = JSON.parse(params?.value || "[]");
      if (!Array.isArray(parsed)) throw new Error("params must be a JSON array");
    } catch (e) {
      out.textContent = "Invalid params JSON: " + (e as Error).message;
      return;
    }
    out.textContent = "…";
    try {
      const res = await rpc.rpc(sel.value, parsed);
      out.innerHTML = escapeHtml(JSON.stringify(res, null, 2));
    } catch (e) {
      out.textContent = "Error: " + (e as Error).message;
    }
  });
}

frame();
subscribe((s: NetSnapshot) => {
  if (s.selected.chainId !== chainId) { chainId = s.selected.chainId; frame(); }
});
