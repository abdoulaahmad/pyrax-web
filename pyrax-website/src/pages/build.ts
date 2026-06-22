// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import "../styles.css";

import { mountChrome } from "../lib/chrome.js";
import { LINKS, NETWORKS, PRECOMPILES, RPC_GROUPS, LIMITS } from "../lib/content.js";
import { icon, orbClass } from "../lib/ui.js";
import {
  codeBlock,
  tabbed,
  wireCode,
  EX_BUILD_NODE,
  EX_ADD_METAMASK,
  EX_VIEM_CLIENT,
  EX_HARDHAT,
  EX_FOUNDRY,
  EX_COUNTER_SOL,
  EX_FOUNDRY_DEPLOY,
  EX_VIEM_DEPLOY,
  EX_ETHERS_DEPLOY,
  EX_RUST_CONTRACT,
  EX_RUST_CARGO,
  EX_RUST_BUILD,
  EX_AS_CONTRACT,
  EX_TINYGO_CONTRACT,
  EX_CAIRO,
  EX_CAIRO_BUILD,
  EX_RPC_CHAINID,
  EX_RPC_BLOCK,
  EX_CREATE2,
  EX_NEURAX_ROUTE,
  EX_NEURAX_GATEWAY,
} from "../lib/code.js";

const sec = (id: string, eyebrow: string, title: string, lead: string, body: string) => `
  <section id="${id}" class="reveal scroll-mt-28 border-t border-[var(--color-line-soft)] py-12 first:border-0 first:pt-0">
    <span class="chip">${eyebrow}</span>
    <h2 class="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">${title}</h2>
    ${lead ? `<p class="mt-3 max-w-2xl leading-relaxed text-[var(--color-muted)]">${lead}</p>` : ""}
    <div class="mt-6">${body}</div>
  </section>`;

const TOC = [
  ["getting-started", "Getting started"],
  ["networks", "Networks & endpoints"],
  ["solidity", "Solidity (EVM)"],
  ["wasm", "WASM contracts"],
  ["cairo", "Cairo contracts"],
  ["rpc", "JSON-RPC"],
  ["create2", "Cross-VM & CREATE2"],
  ["neurax", "NEURAX SDKs"],
  ["reference", "Reference"],
  ["examples", "Worked examples"],
];

// A tiny horizontal step-rail teaser: the whole developer journey on one line, so
// a newcomer sees the path before the dense reference sections begin.
const JOURNEY: [string, string][] = [
  ["Build a node", "#getting-started"],
  ["Connect a wallet", "#getting-started"],
  ["Deploy", "#solidity"],
  ["Call over RPC", "#rpc"],
  ["Add NEURAX", "#neurax"],
];
const journeyRail = `
  <div class="mt-8 flex flex-wrap items-center gap-x-1 gap-y-3">
    ${JOURNEY.map(
      ([t, h], i) => `
      <a href="${h}" class="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] transition hover:border-[color-mix(in_oklab,var(--color-brand)_40%,var(--color-line))] hover:text-[var(--color-ink)]">
        <span class="font-mono text-[0.65rem] text-[var(--color-brand-soft)]">${String(i + 1).padStart(2, "0")}</span>${t}
      </a>
      ${i < JOURNEY.length - 1 ? `<span class="diagram-link !min-w-[0.9rem] !max-w-[1.75rem]" aria-hidden="true"></span>` : ""}`,
    ).join("")}
  </div>`;

const hero = `
<section class="relative overflow-hidden pt-32 pb-8 sm:pt-40">
  <div class="hero-aurora" aria-hidden="true"></div>
  <div class="absolute inset-0 grid-bg opacity-50"></div>
  <div class="container-x relative reveal">
    <span class="chip">Build on PYRAX</span>
    <h1 class="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">The developer docs — with <span class="brand-text text-anim">real code</span>, in your language.</h1>
    <p class="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--color-muted)]">PYRAX is EVM-compatible, so your Ethereum tools work unchanged — and you can also ship WASM (Rust, AssemblyScript, TinyGo) and Cairo, with contracts that call each other across VMs. Pick a path:</p>
    <div class="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      ${[
        ["Solidity / EVM", "#solidity", "code"],
        ["WASM", "#wasm", "chip"],
        ["Cairo", "#cairo", "cube"],
        ["JSON-RPC", "#rpc", "terminal"],
        ["NEURAX", "#neurax", "spark"],
      ]
        .map(
          ([t, h, ic]) => `<a href="${h}" class="card card-hover flex items-center gap-3 p-4"><span class="${orbClass("brand")} !h-10 !w-10">${icon(ic as string, "h-5 w-5")}</span><span class="text-sm font-semibold">${t}</span></a>`,
        )
        .join("")}
    </div>
    <p class="lead-note mt-8 max-w-2xl text-sm sm:text-base">
      The path is the same in every language: <strong class="text-[var(--color-ink)]">run a node</strong>, point your <strong class="text-[var(--color-ink)]">tooling</strong> at it, <strong class="text-[var(--color-ink)]">deploy</strong> a contract to any of the three VMs, <strong class="text-[var(--color-ink)]">call</strong> it over JSON-RPC, then <strong class="text-[var(--color-ink)]">add AI</strong> with NEURAX. Each section below is one step of that journey.
    </p>
    ${journeyRail}
  </div>
</section>`;

const gettingStarted = sec(
  "getting-started",
  "Step 1",
  "Run a node, connect a wallet",
  "Build the node from source and run a dev node with a JSON-RPC endpoint, then point your tooling at it. (Or grab the one-click Inferno Node — see Run a Node.)",
  codeBlock(EX_BUILD_NODE) +
    `<p class="mt-6 text-sm font-semibold text-[var(--color-muted)]">Connect your tooling to it:</p>` +
    tabbed([
      { label: "MetaMask", snippet: EX_ADD_METAMASK },
      { label: "viem", snippet: EX_VIEM_CLIENT },
      { label: "Hardhat", snippet: EX_HARDHAT },
      { label: "Foundry", snippet: EX_FOUNDRY },
    ]),
);

const networks = sec(
  "networks",
  "Reference",
  "Networks & endpoints",
  "Five networks share one codebase. Chain IDs are shown in decimal; the public dev network today is Devnet2. The faucet drips 500 PYRX per claim (12-hour cooldown) on the test networks — never on Mainnet.",
  `<div class="card overflow-x-auto !p-0">
    <table class="w-full text-left text-sm">
      <thead class="text-[var(--color-faint)]">
        <tr class="border-b border-[var(--color-line)]">
          <th class="p-4 font-semibold">Network</th>
          <th class="p-4 font-semibold">Chain ID</th>
          <th class="p-4 font-semibold">Block time</th>
          <th class="p-4 font-semibold">Faucet</th>
          <th class="p-4 font-semibold">Status</th>
        </tr>
      </thead>
      <tbody>
        ${NETWORKS.map(
          (n) => `
          <tr class="border-b border-[var(--color-line-soft)] last:border-0">
            <td class="p-4 font-semibold text-[var(--color-ink)]">${n.name}</td>
            <td class="p-4 font-mono text-[var(--color-bolt-bright)]">${n.chainId}</td>
            <td class="p-4 text-[var(--color-muted)]">${n.blockTime}</td>
            <td class="p-4">${n.faucet ? `<span class="text-[var(--color-positive)]">✓</span>` : `<span class="text-[var(--color-faint)]">—</span>`}</td>
            <td class="p-4"><span class="chip !px-2 !py-0.5 !text-[0.6rem]">${n.status}</span></td>
          </tr>`,
        ).join("")}
      </tbody>
    </table>
  </div>
  <p class="mt-4 text-xs text-[var(--color-faint)]">A local dev node serves HTTP + WebSocket JSON-RPC on one socket, e.g. <code class="text-[var(--color-muted)]">http://127.0.0.1:8545</code>.</p>`,
);

const solidity = sec(
  "solidity",
  "EVM",
  "Deploy a Solidity contract",
  "Drop-in EVM via revm — your existing Solidity, Hardhat, Foundry, viem and ethers all work unchanged. Here's the canonical counter, deployed and called two ways (Foundry and viem), plus an ethers v6 value transfer for reference.",
  codeBlock(EX_COUNTER_SOL) +
    `<p class="mt-6 text-sm font-semibold text-[var(--color-muted)]">Deploy + call it two ways — then a plain value transfer for reference:</p>` +
    tabbed([
      { label: "Foundry / cast", snippet: EX_FOUNDRY_DEPLOY },
      { label: "viem", snippet: EX_VIEM_DEPLOY },
      { label: "ethers v6 (transfer)", snippet: EX_ETHERS_DEPLOY },
    ]) +
    `<p class="mt-3 text-xs text-[var(--color-faint)]">The Foundry and viem tabs deploy + call the counter above; the ethers v6 tab is a plain PYRX value transfer, not a third counter deploy.</p>`,
);

const wasm = sec(
  "wasm",
  "WASM",
  "WASM contracts — Rust, AssemblyScript, TinyGo",
  "Compile to a WASM module exposing deploy() + call() against the pyrax-contract-sdk host ABI. The VM is auto-detected from the code's magic bytes (\\0asm → WASM). The same counter, in three languages:",
  tabbed([
    { label: "Rust", snippet: EX_RUST_CONTRACT },
    { label: "AssemblyScript", snippet: EX_AS_CONTRACT },
    { label: "TinyGo", snippet: EX_TINYGO_CONTRACT },
  ]) +
    `<p class="mt-6 text-sm font-semibold text-[var(--color-muted)]">The Rust crate config + build:</p>` +
    codeBlock(EX_RUST_CARGO) +
    codeBlock(EX_RUST_BUILD),
);

const cairo = sec(
  "cairo",
  "Cairo",
  "Cairo contracts",
  "STARK-provable execution via cairo-vm — the bytecode is prefixed with the Cairo code magic so the L1 auto-routes it to the Cairo VM.",
  codeBlock(EX_CAIRO) +
    `<p class="mt-3 text-xs text-[var(--color-faint)]">Cairo is the one VM not shown as the counter here: this minimal provable program highlights Cairo's STARK-friendly arithmetic. On-chain Cairo contracts reach state through Starknet-style storage_read / storage_write syscalls, the same 32-byte storage model the EVM and WASM counters use.</p>` +
    codeBlock(EX_CAIRO_BUILD),
);

const rpc = sec(
  "rpc",
  "JSON-RPC",
  "Call the chain over JSON-RPC",
  "A full Ethereum-style JSON-RPC surface (read/state, native eth txs, blocks/receipts/logs, EIP-1559 fee methods, log filters, and eth_subscribe over WebSocket) plus native pyrax_* methods. A few raw calls:",
  codeBlock(EX_RPC_CHAINID) + codeBlock(EX_RPC_BLOCK),
);

const create2 = sec(
  "create2",
  "Advanced",
  "Cross-VM calls & CREATE2",
  "Contracts make value-bearing, any↔any calls across the three VMs (EIP-150 63/64 gas, STATICCALL-correct, depth-capped) — an EVM contract can even be deployed from a WASM or Cairo factory. CREATE2 (EIP-1014) gives deterministic addresses across all VMs:",
  codeBlock(EX_CREATE2),
);

const neurax = sec(
  "neurax",
  "NEURAX",
  "Build with NEURAX",
  "Use decentralized AI from code two ways: the node's route command (which delegates to the real scheduler, so a local decision is exactly what the network would decide), or the OpenAI-compatible gateway. Models are referenced by their NEURAX brand ids.",
  codeBlock(EX_NEURAX_ROUTE) +
    `<p class="mt-6 text-sm font-semibold text-[var(--color-muted)]">An OpenAI-compatible gateway (the SDK surface is illustrative — see the docs for the exact API):</p>` +
    codeBlock(EX_NEURAX_GATEWAY),
);

const reference = sec(
  "reference",
  "Reference",
  "Precompiles, RPC methods & limits",
  "The pieces you'll reach for — system precompiles (callable from every VM), a representative JSON-RPC surface, and the execution limits + engine versions.",
  `<div class="grid gap-6 lg:grid-cols-2">
    <div>
      <h3 class="text-sm font-semibold text-[var(--color-muted)]">System precompiles <span class="text-[var(--color-faint)]">(0x…01xx · all VMs)</span></h3>
      <div class="mt-3 space-y-2">
        ${PRECOMPILES.map((p) => `<div class="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"><code class="font-mono text-sm text-[var(--color-bolt-bright)]">${p.name}</code><span class="text-right text-xs text-[var(--color-muted)]">${p.fn}</span></div>`).join("")}
      </div>
    </div>
    <div>
      <h3 class="text-sm font-semibold text-[var(--color-muted)]">Execution limits & engines</h3>
      <dl class="mt-3 divide-y divide-[var(--color-line-soft)] rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
        ${LIMITS.map(([k, v]) => `<div class="flex items-baseline justify-between gap-4 p-3.5"><dt class="text-sm font-semibold text-[var(--color-ink)]">${k}</dt><dd class="text-right text-sm text-[var(--color-muted)]">${v}</dd></div>`).join("")}
      </dl>
    </div>
  </div>
  <h3 class="mt-8 text-sm font-semibold text-[var(--color-muted)]">JSON-RPC methods</h3>
  <div class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    ${RPC_GROUPS.map((g) => `<div class="card p-5"><div class="text-sm font-semibold">${g.group}</div><div class="mt-2 flex flex-wrap gap-1.5">${g.methods.map((m) => `<code class="rounded bg-[var(--color-elevated)] px-1.5 py-0.5 font-mono text-[0.7rem] text-[var(--color-muted)]">${m}</code>`).join("")}</div></div>`).join("")}
  </div>
  <p class="mt-4 text-xs text-[var(--color-faint)]">The full reference — the WASM host ABI, Cairo syscalls, every precompile's exact I/O, the bridge ABI, complete gas tables and error codes — lives in the <a href="${LINKS.docs}" class="font-semibold text-[var(--color-brand-soft)]">developer docs</a>.</p>`,
);

const examples = sec(
  "examples",
  "Recap",
  "One counter, four languages, three VMs",
  "The same persistent counter runs in Solidity, Rust, AssemblyScript and TinyGo across the EVM and WASM VMs — proving the multi-VM story end to end. (The Cairo sample is a minimal provable program rather than the counter.) The complete references (the WASM host ABI, Cairo syscalls, every precompile, the bridge ABI, gas tables, and error codes) live in the full docs.",
  `<div class="flex flex-wrap gap-3">
    <a href="${LINKS.docs}" class="btn btn-primary">${icon("book", "h-4 w-4")} Full developer docs</a>
    <a href="/node.html" class="btn btn-ghost">Run a node</a>
    <a href="${LINKS.explorer}" class="btn btn-ghost">Block explorer</a>
  </div>`,
);

const body = `
<div class="container-x grid gap-10 pb-8 lg:grid-cols-[15rem_1fr]">
  <aside class="hidden lg:block">
    <nav class="sticky top-28 space-y-1" aria-label="On this page">
      <div class="px-3 pb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--color-faint)]">On this page</div>
      ${TOC.map(([id, label]) => `<a href="#${id}" class="block rounded-lg px-3 py-1.5 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-elevated)] hover:text-[var(--color-ink)]">${label}</a>`).join("")}
    </nav>
  </aside>
  <div class="min-w-0">
    ${gettingStarted}${networks}${solidity}${wasm}${cairo}${rpc}${create2}${neurax}${reference}${examples}
  </div>
</div>`;

const main = document.getElementById("main");
if (main) main.innerHTML = hero + body;
mountChrome("Develop");
wireCode();
