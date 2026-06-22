// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
// Verify contract — submit Solidity source; the indexer compiles it with the exact solc and matches
// the on-chain bytecode, then stores the verified source + ABI.

import { mountShell } from "../lib/shell.js";
import { subscribe, getSelectedNetwork } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";
import { apiVerify, isIndexed } from "../lib/api.js";
import { pageHead, card, badge, offlinePanel, emptyPanel } from "../lib/widgets.js";
import { escapeHtml, qp } from "../lib/format.js";

const main = mountShell("verify");
let chainId = getSelectedNetwork().chainId;

const field = (label: string, name: string, placeholder = "", value = ""): string => `
  <div style="margin-bottom:.8rem"><label class="expl-stat-label">${label}</label>
  <input data-f="${name}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" class="expl-search-input"
    style="display:block;width:100%;margin-top:.3rem;padding:.55rem;border:1px solid var(--color-line);border-radius:.5rem;background:var(--color-bg-2);color:var(--color-ink)"></div>`;

function frame(): void {
  const net = getSelectedNetwork();
  main.innerHTML = pageHead("Verify contract", `Verify a deployed contract's source on ${net.name}.`) + `<div data-gate></div>`;
  void gate();
}

async function gate(): Promise<void> {
  const net = getSelectedNetwork();
  const el = main.querySelector("[data-gate]");
  if (!el) return;
  if (!(await isIndexed(net.chainId))) {
    el.innerHTML = net.rpc ? emptyPanel("Verification requires the indexer (it compiles + compares bytecode), which isn't running for this network.") : offlinePanel(net.name);
    return;
  }
  el.innerHTML =
    card(`
      ${field("Contract address", "address", "0x… (40 hex)", qp("a"))}
      ${field("Contract name", "contractName", "e.g. MyToken")}
      ${field("Compiler version", "compilerVersion", "e.g. 0.8.28+commit.7893614a")}
      <div style="display:flex;gap:1.5rem;margin-bottom:.8rem;align-items:center">
        <label style="display:flex;gap:.4rem;align-items:center;font-size:.85rem"><input type="checkbox" data-f="optimization"> Optimization</label>
        <div style="flex:1">${"".length === 0 ? "" : ""}<label class="expl-stat-label">Runs</label><input data-f="runs" value="200" class="expl-search-input" style="display:block;width:8rem;margin-top:.3rem;padding:.5rem;border:1px solid var(--color-line);border-radius:.5rem;background:var(--color-bg-2)"></div>
      </div>
      <label class="expl-stat-label">Solidity source (flattened, single file)</label>
      <textarea data-f="source" rows="16" class="expl-mono" placeholder="// SPDX-License-Identifier: MIT&#10;pragma solidity ^0.8.0;&#10;contract MyToken { … }" style="display:block;width:100%;margin:.3rem 0 .9rem;padding:.7rem;border:1px solid var(--color-line);border-radius:.5rem;background:var(--color-bg-2);color:var(--color-ink)"></textarea>
      <button data-go class="expl-search-btn" style="border:0;cursor:pointer">Compile & verify</button>
      <div data-out style="margin-top:1rem"></div>
    `);
  wire();
}

function val(name: string): string {
  return main.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-f="${name}"]`)?.value.trim() ?? "";
}

function wire(): void {
  main.querySelector<HTMLButtonElement>("[data-go]")?.addEventListener("click", async () => {
    const net = getSelectedNetwork();
    const out = main.querySelector("[data-out]");
    if (!out) return;
    const body = {
      address: val("address"),
      contractName: val("contractName"),
      compilerVersion: val("compilerVersion"),
      optimization: main.querySelector<HTMLInputElement>('[data-f="optimization"]')?.checked ?? false,
      runs: Number(val("runs")) || 200,
      source: val("source"),
    };
    if (!body.address || !body.contractName || !body.compilerVersion || !body.source) {
      out.innerHTML = card(`<span style="color:var(--color-negative)">Fill in the address, contract name, compiler version and source.</span>`);
      return;
    }
    out.innerHTML = card(`<span class="expl-spinner" style="display:inline-block;vertical-align:middle"></span> Compiling with solc ${escapeHtml(body.compilerVersion)} and matching on-chain bytecode…`);
    try {
      const r = await apiVerify(net.chainId, body);
      if (r.ok) {
        out.innerHTML = card(`<div>${badge("Verified", "positive")} <strong>${escapeHtml(r.name ?? body.contractName)}</strong> matches the on-chain bytecode. <a class="expl-more" href="/contract.html?a=${body.address}">View contract →</a></div>`);
      } else {
        out.innerHTML = card(`<div style="color:var(--color-negative)"><strong>Not verified.</strong> ${escapeHtml(r.error ?? "bytecode mismatch")}</div>${(r.details ?? []).length ? `<pre class="expl-mono" style="margin-top:.6rem;white-space:pre-wrap;color:var(--color-muted);font-size:.78rem">${escapeHtml((r.details ?? []).join("\n"))}</pre>` : ""}`);
      }
    } catch (e) {
      out.innerHTML = card(`<span style="color:var(--color-negative)">Request failed: ${escapeHtml((e as Error).message)}</span>`);
    }
  });
}

frame();
subscribe((s: NetSnapshot) => {
  if (s.selected.chainId !== chainId) { chainId = s.selected.chainId; frame(); }
});
