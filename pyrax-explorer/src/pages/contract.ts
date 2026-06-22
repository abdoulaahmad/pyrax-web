// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
// Contract detail (?a=) — bytecode + verified source/ABI + a working READ interface (view/pure calls
// via web3_sha3 selectors + eth_call). Write functions are listed with the generated calldata; signing
// needs a connected wallet (a later integration).

import { mountShell } from "../lib/shell.js";
import { subscribe, getSelectedNetwork } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";
import { apiContract, isIndexed, type IdxContract } from "../lib/api.js";
import { pageHead, card, loading, errorPanel, offlinePanel, emptyPanel, badge, copyable, wireCopy } from "../lib/widgets.js";
import { escapeHtml, qp, isAddress, hexToBig } from "../lib/format.js";
import * as rpc from "../lib/rpc.js";

const main = mountShell("");
let chainId = getSelectedNetwork().chainId;
const addr = qp("a").toLowerCase();

type AbiInput = { name?: string; type: string };
type AbiFn = { type: string; name?: string; stateMutability?: string; constant?: boolean; inputs?: AbiInput[]; outputs?: AbiInput[] };

const utf8ToHex = (s: string): string =>
  "0x" + Array.from(new TextEncoder().encode(s)).map((b) => b.toString(16).padStart(2, "0")).join("");
const sigOf = (fn: AbiFn): string => `${fn.name}(${(fn.inputs ?? []).map((i) => i.type).join(",")})`;
const isRead = (fn: AbiFn): boolean => fn.type === "function" && (fn.stateMutability === "view" || fn.stateMutability === "pure" || fn.constant === true);
const isWrite = (fn: AbiFn): boolean => fn.type === "function" && !isRead(fn);

async function selector(sig: string): Promise<string> {
  const h = await rpc.rpc<string>("web3_sha3", [utf8ToHex(sig)]);
  return h.slice(0, 10);
}
function encodeArg(type: string, v: string): string {
  if (type === "address") return v.replace(/^0x/, "").toLowerCase().padStart(64, "0").slice(-64);
  if (/^(u?int)\d*$/.test(type)) return BigInt(v || "0").toString(16).padStart(64, "0");
  if (type === "bool") return (v === "true" || v === "1" ? "1" : "0").padStart(64, "0");
  throw new Error(`unsupported input type "${type}" — use the RPC playground for complex calls`);
}
function decodeAscii(h: string): string {
  let s = "";
  for (let i = 0; i < h.length; i += 2) {
    const c = parseInt(h.slice(i, i + 2), 16);
    if (c > 0) s += String.fromCharCode(c);
  }
  return s.replace(/[^\x20-\x7e]/g, "");
}
function decodeOutputs(outs: AbiInput[], ret: string): string {
  const h = (ret || "").replace(/^0x/, "");
  if (!h) return "(no data)";
  if (outs.length === 1 && outs[0]?.type === "string") {
    const len = parseInt(h.slice(64, 128) || "0", 16);
    return JSON.stringify(decodeAscii(h.slice(128, 128 + len * 2)));
  }
  if (!outs.length) return "0x" + h;
  return outs
    .map((o, i) => {
      const word = h.slice(i * 64, (i + 1) * 64);
      let v: string;
      if (o.type === "address") v = "0x" + word.slice(24);
      else if (o.type === "bool") v = hexToBig("0x" + word) ? "true" : "false";
      else if (/^(u?int)\d*$/.test(o.type)) v = hexToBig("0x" + word).toString();
      else v = "0x" + word;
      return `${o.name || o.type}: ${v}`;
    })
    .join("  ·  ");
}

function fnRow(fn: AbiFn, idx: number): string {
  const inputs = (fn.inputs ?? [])
    .map((inp, i) => `<input data-arg="${idx}-${i}" placeholder="${escapeHtml(inp.name || inp.type)} (${escapeHtml(inp.type)})" class="expl-search-input" style="margin:.2rem .3rem .2rem 0;padding:.4rem;border:1px solid var(--color-line);border-radius:.4rem;background:var(--color-bg-2);font-size:.82rem">`)
    .join("");
  return `<div class="expl-card" style="margin-bottom:.6rem">
    <div style="font-weight:600;font-family:var(--font-mono);font-size:.85rem">${escapeHtml(fn.name ?? "")}(${(fn.inputs ?? []).map((i) => escapeHtml(i.type)).join(", ")})</div>
    <div style="margin-top:.4rem">${inputs}<button data-call="${idx}" class="expl-search-btn" style="border:0;cursor:pointer;font-size:.8rem;padding:.4rem .8rem">Query</button></div>
    <div data-res="${idx}" class="expl-mono" style="margin-top:.4rem;font-size:.82rem;color:var(--color-bolt-bright);word-break:break-all"></div>
  </div>`;
}

function wireReads(fns: AbiFn[]): void {
  main.querySelectorAll<HTMLButtonElement>("[data-call]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.call);
      const fn = fns[idx];
      const res = main.querySelector<HTMLElement>(`[data-res="${idx}"]`);
      if (!fn || !res) return;
      res.textContent = "…";
      try {
        const sel = await selector(sigOf(fn));
        let data = sel;
        (fn.inputs ?? []).forEach((inp, i) => {
          const v = main.querySelector<HTMLInputElement>(`[data-arg="${idx}-${i}"]`)?.value.trim() ?? "";
          data += encodeArg(inp.type, v);
        });
        const ret = await rpc.ethCall(addr, data);
        res.textContent = decodeOutputs(fn.outputs ?? [], ret);
      } catch (e) {
        res.textContent = "Error: " + (e as Error).message;
      }
    });
  });
}

function renderVerified(c: IdxContract): string {
  let abi: AbiFn[] = [];
  try {
    abi = JSON.parse(c.abi) as AbiFn[];
  } catch {
    /* keep empty */
  }
  const reads = abi.filter(isRead);
  const writes = abi.filter(isWrite);
  const readHtml = reads.length
    ? reads.map((fn, i) => fnRow(fn, i)).join("")
    : emptyPanel("No read-only (view/pure) functions in the ABI.");
  const writeHtml = writes.length
    ? card(
        `<p style="font-size:.82rem;color:var(--color-muted);margin-bottom:.5rem">Writing requires a connected wallet (coming with the wallet integration). The functions:</p>` +
          writes.map((fn) => `<div class="expl-mono" style="font-size:.82rem">${escapeHtml(sigOf(fn))}</div>`).join(""),
      )
    : "";
  return (
    `<h2 class="expl-section-title">Read contract</h2>${readHtml}` +
    (writeHtml ? `<h2 class="expl-section-title">Write contract</h2>${writeHtml}` : "") +
    `<h2 class="expl-section-title">Source — ${escapeHtml(c.name)}</h2>` +
    card(`<pre class="expl-mono" style="white-space:pre-wrap;word-break:break-word;max-height:32rem;overflow:auto;font-size:.78rem">${escapeHtml(c.source)}</pre>`) +
    `<h2 class="expl-section-title">ABI</h2>` +
    card(`<pre class="expl-mono" style="white-space:pre-wrap;word-break:break-word;max-height:18rem;overflow:auto;font-size:.78rem">${escapeHtml(c.abi)}</pre>`)
  );
}

async function load(): Promise<void> {
  const net = getSelectedNetwork();
  if (!isAddress(addr)) {
    main.innerHTML = pageHead("Contract") + errorPanel("Not a valid contract address.");
    return;
  }
  main.innerHTML = pageHead("Contract") + loading();
  try {
    const indexed = await isIndexed(net.chainId);
    if (!net.rpc && !indexed) {
      main.innerHTML = pageHead("Contract") + offlinePanel(net.name);
      return;
    }
    const code = net.rpc ? await rpc.getCode(addr).catch(() => "0x") : "0x";
    const isContract = !!code && code !== "0x";
    let verified: IdxContract | null = null;
    if (indexed) {
      try { verified = await apiContract(net.chainId, addr); } catch { /* none */ }
    }

    const head = pageHead(verified ? verified.name : "Contract", "", `<a class="expl-more" href="/address.html?a=${addr}">Account view →</a>`);
    const idLine = card(`<div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">${isContract ? badge("Contract", "violet") : badge("No code", "negative")}${verified ? badge("Source verified", "positive") : badge("Unverified", "amber")}${copyable(addr)}</div>`);

    let body: string;
    if (verified) {
      body = renderVerified(verified);
    } else if (isContract) {
      body =
        card(`<p style="font-size:.85rem;color:var(--color-muted)">This contract isn't verified yet. <a class="expl-more" href="/verify.html?a=${addr}">Verify its source →</a></p>`) +
        `<h2 class="expl-section-title">Bytecode</h2>` +
        card(`<div class="expl-mono" style="word-break:break-all;max-height:20rem;overflow:auto;font-size:.78rem">${escapeHtml(code)}</div>`);
    } else {
      body = emptyPanel(net.rpc ? "There's no contract code at this address (it may be an account or an undeployed address)." : "Connect to this network's RPC to read the bytecode.");
    }

    main.innerHTML = head + idLine + body;
    if (verified) {
      let abi: AbiFn[] = [];
      try { abi = JSON.parse(verified.abi) as AbiFn[]; } catch { /* */ }
      wireReads(abi.filter(isRead));
    }
    wireCopy(main);
  } catch (e) {
    main.innerHTML = pageHead("Contract") + errorPanel((e as Error).message);
  }
}

void load();
subscribe((s: NetSnapshot) => {
  if (s.selected.chainId !== chainId) { chainId = s.selected.chainId; void load(); }
});
