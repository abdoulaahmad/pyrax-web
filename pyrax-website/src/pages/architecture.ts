// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import "../styles.css";

import { mountChrome } from "../lib/chrome.js";
import { LINKS, VMS } from "../lib/content.js";
import { icon, heading, orbClass } from "../lib/ui.js";

/* ----------------------------------------------------------------------------
 * ARCHITECTURE — a guided read down the stack:
 *   hero hook → the layer stack as a real vertical diagram → execution = consensus
 *   (with a cross-VM overlay diagram) → scaling levers → node roles.
 * Exactly ONE hero-aurora (hero), ONE text-anim word (hero). Diagrams are static.
 * -------------------------------------------------------------------------- */

// 1) HERO — the hook. ONE animated gradient word ("parallelism").
const hero = `
<section class="relative overflow-hidden pt-32 pb-10 sm:pt-40">
  <div class="hero-aurora" aria-hidden="true"></div>
  <div class="absolute inset-0 grid-bg opacity-50"></div>
  <div class="container-x relative max-w-3xl reveal">
    <span class="chip">Architecture</span>
    <h1 class="mt-5 t-h1">A layered system, built for <span class="brand-text text-anim">parallelism</span>.</h1>
    <p class="mt-5 max-w-2xl t-lead text-[var(--color-muted)]">GhostDAG at the base, multi-VM execution inside block application, a ZK-rollup above, and an onion mesh beneath — every layer chosen to scale throughput while keeping privacy and verifiability intact.</p>
  </div>
</section>`;

// 2) THE LAYER STACK — a real top-to-bottom vertical diagram (Apps → libp2p mesh).
// Each layer is a diagram-node, color-coded to match its per-layer tone; the
// `nodeTone` picks the closest diagram-node variant (brand/bolt/violet); the exact
// accent colour stays as the left border + dot for full fidelity. Labels/descriptions
// are kept verbatim.
type Layer = { title: string; desc: string; accent: string; nodeTone: string };
const layers: Layer[] = [
  { title: "Apps & wallets", desc: "Inferno Node · PYRAX Wallet · dApps & NEURAX clients", accent: "var(--color-brand)", nodeTone: "diagram-node-brand" },
  { title: "L3 — recursive ZK rollup", desc: "plonky2 batch proofs finalize bridge batches (planned)", accent: "var(--color-violet)", nodeTone: "diagram-node-violet" },
  { title: "L2 — multi-VM execution", desc: "EVM · WASM · Cairo, executed inside L1 block application", accent: "var(--color-bolt)", nodeTone: "diagram-node-bolt" },
  { title: "L1 — GhostDAG consensus", desc: "TriStream mining + BLS PoS finality; shielded-by-default state", accent: "var(--color-gold)", nodeTone: "diagram-node-brand" },
  { title: "Privacy mixnet", desc: "onion-routed Sphinx packets with cover traffic", accent: "var(--color-bolt-bright)", nodeTone: "diagram-node-bolt" },
  { title: "libp2p mesh", desc: "bootstrapless: mDNS · Kademlia DHT · peer-exchange · signed seed list", accent: "var(--color-positive)", nodeTone: "diagram-node" },
];
const stack = `
<section class="section container-x pt-4">
  ${heading("The layer stack", "From your app down to the wire", "Apps sit on a ZK-rollup L3, over multi-VM L2 execution, over the GhostDAG L1 — all carried by a private, bootstrapless mesh.")}
  <div class="reveal mx-auto mt-10 flex max-w-xl flex-col items-stretch">
    ${layers
      .map(
        (l, i) => `
      <div class="diagram-node ${l.nodeTone} w-full !flex-row !items-center !gap-4 !text-left" style="border-left:3px solid ${l.accent}">
        <span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background:${l.accent}" aria-hidden="true"></span>
        <span class="min-w-0">
          <span class="dn-title block !text-sm">${l.title}</span>
          <span class="dn-sub block !text-xs !text-[var(--color-muted)]">${l.desc}</span>
        </span>
      </div>
      ${i < layers.length - 1 ? `<span class="diagram-link-v mx-auto my-1.5" aria-hidden="true"></span>` : ""}`,
      )
      .join("")}
  </div>
  <p class="reveal mx-auto mt-6 max-w-xl text-center text-xs leading-relaxed text-[var(--color-faint)]">
    Top to bottom: your apps call into the VMs, which execute inside the GhostDAG L1, whose traffic is carried privately by the mixnet over the libp2p mesh.
  </p>
</section>`;

// 3) EXECUTION = CONSENSUS — prose + a small cross-VM overlay diagram showing how
// EVM / WASM / Cairo all share one 32-byte state overlay (which is how cross-VM
// calls work). The engines note is kept verbatim.
const crossVmDiagram = `
<div class="reveal mt-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 sm:p-6">
  <p class="text-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">How cross-VM calls work</p>
  <div class="mt-5 flex items-stretch justify-center gap-3 sm:gap-4">
    <div class="diagram-node diagram-node-brand min-w-[5rem] flex-1"><span class="dn-title">EVM</span><span class="dn-sub">revm</span></div>
    <div class="diagram-node diagram-node-bolt min-w-[5rem] flex-1"><span class="dn-title">WASM</span><span class="dn-sub">wasmtime</span></div>
    <div class="diagram-node diagram-node-violet min-w-[5rem] flex-1"><span class="dn-title">Cairo</span><span class="dn-sub">cairo-vm</span></div>
  </div>
  <div class="flex items-center justify-center gap-12 sm:gap-20">
    <span class="diagram-link-v my-2" aria-hidden="true"></span>
    <span class="diagram-link-v my-2" aria-hidden="true"></span>
    <span class="diagram-link-v my-2" aria-hidden="true"></span>
  </div>
  <div class="mx-auto max-w-xs">
    <div class="diagram-node !w-full" style="border-color:color-mix(in oklab, var(--color-gold) 42%, var(--color-line))">
      <span class="dn-title">Shared 32-byte state overlay</span>
      <span class="dn-sub">one address space, read + write across every VM</span>
    </div>
  </div>
  <p class="mt-4 text-center text-xs leading-relaxed text-[var(--color-muted)]">
    All three engines read and write the same 32-byte slots, so a contract in one VM can call a contract in another in-chain.
  </p>
</div>`;
const execModel = `
<section class="section container-x">
  <div class="grid gap-10 lg:grid-cols-2 lg:items-center">
    <div class="reveal">
      <span class="chip">Execution = consensus</span>
      <h2 class="mt-4 t-h2">A contract is an Account — re-executed by every node.</h2>
      <p class="mt-4 leading-relaxed text-[var(--color-muted)]">CREATE and CALL run <strong class="text-[var(--color-ink)]">inside L1 block application</strong>, so every node re-executes identically — execution <em>is</em> consensus. The VM is <strong class="text-[var(--color-ink)]">auto-detected from the code's magic bytes</strong> (<code class="text-[var(--color-muted)]">\\0asm</code> → WASM, <code class="text-[var(--color-muted)]">\\0CAIRO</code> → Cairo, otherwise EVM), and all three share one 32-byte state overlay — which is how contracts call each other across VMs.</p>
      ${crossVmDiagram}
    </div>
    <div class="reveal">
      <div class="grid gap-4 sm:grid-cols-3">
        ${VMS.map((v) => `<div class="card p-5"><div class="text-xl font-extrabold brand-text">${v.name}</div><p class="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">${v.desc}</p></div>`).join("")}
      </div>
      <p class="mt-4 text-xs text-[var(--color-faint)]">Engines: <strong class="text-[var(--color-muted)]">revm 22</strong> (EVM, always-on) · <strong class="text-[var(--color-muted)]">wasmtime 33</strong> (WASM) · <strong class="text-[var(--color-muted)]">cairo-vm 2.5</strong> (Cairo). Phase 10 is complete — 65 suites, 351 tests, fmt + clippy clean. System precompiles (BRIDGE, BLAKE3, SHA256, KECCAK256, ECRECOVER, CHAIN_CONTEXT, SHIELDED_VIEW) are callable from every VM.</p>
    </div>
  </div>
</section>`;

// 4) SCALING LEVERS — the 8 cards, plus a lead-note bridging the 500k aggregate.
// `target` marks levers not yet shipped, verified against the SSOT scaling table:
// shipped → DAG parallelism (pyrax-dag), Parallel execution (pyrax-state, Block-STM),
// Fast networking (pyrax-p2p QUIC + RS erasure). Bench-gated honesty is the posture itself.
// target → L3 of the rollup stack (L2 done, L3 batch-proof not yet settled on L1),
// recursive proof aggregation (ZK succinct path not yet implemented), DA sampling + light
// clients (early — no block data_commitment / share gossip yet), GPU/ASIC proving (lands
// with the Plonky2 snark circuit). Consistent with the bench-gated honesty framing.
type Lever = { title: string; desc: string; target?: boolean };
const leverList: Lever[] = [
  { title: "DAG parallelism", desc: "Many block lanes produced + ordered in parallel, not orphaned." },
  { title: "Parallel execution", desc: "Block-STM-style concurrent transaction execution (fuzzed identical to sequential)." },
  { title: "Fast networking", desc: "QUIC transport + erasure-coded block propagation." },
  { title: "Bench-gated honesty", desc: "pyrax-bench publishes the methodology; no number we can't reproduce." },
  { title: "L3 recursive rollup", desc: "L2 execution is live; the L3 ZK rollup will batch the bulk of throughput and settle one proof to L1.", target: true },
  { title: "Recursive proof aggregation", desc: "Folding many shielded proofs into one — the private-throughput lever.", target: true },
  { title: "DA sampling + light clients", desc: "Verify availability without downloading everything, keeping consumer hardware viable.", target: true },
  { title: "Hardware-accelerated proving", desc: "GPU/ASIC proving to shorten the ZK critical path.", target: true },
];
const targetPill = `<span class="ml-2 inline-flex shrink-0 items-center rounded-full border border-[color-mix(in_oklab,var(--color-bolt)_40%,var(--color-line))] bg-[color-mix(in_oklab,var(--color-bolt)_12%,var(--color-elevated))] px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-[var(--color-bolt-bright)]">Target</span>`;
const levers = `
<section class="section container-x">
  ${heading("Scaling levers", "How the 500k+ TPS aggregate is approached", "It's an aggregate goal realized progressively as each lever lands — and every published number is gated by a reproducible benchmark.")}
  <p class="reveal lead-note mx-auto mt-8 max-w-2xl text-sm sm:text-base">
    The 500k+ figure is an <strong class="text-[var(--color-ink)]">aggregate</strong>, not a single-shard headline — it adds up across the levers below and is approached progressively as each lands. Levers marked ${targetPill} are still targets, not shipped; every number we publish has to be reproducible on <code class="text-[var(--color-muted)]">pyrax-bench</code> first.
  </p>
  <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    ${leverList
      .map(
        (l) => `<div class="reveal card p-5"${l.target ? ' style="border-color:color-mix(in oklab, var(--color-bolt) 28%, var(--color-line))"' : ""}><div class="flex items-start justify-between gap-2"><span class="text-sm font-semibold">${l.title}</span>${l.target ? targetPill : ""}</div><p class="mt-1 text-xs leading-snug text-[var(--color-muted)]">${l.desc}</p></div>`,
      )
      .join("")}
  </div>
</section>`;

// 5) NODE ROLES — kept EXACTLY Full / Relay / Verifier with the exact descriptions.
// Light framing only: each role gets a tone + a one-word "weight" tag so the grid reads
// as a hierarchy (the only block-producer down to light verification), not three flat
// cards. Full is the default and the sole sealer, so it carries the brand accent + a tag.
type Role = { name: string; desc: string; icon: string; tone: string; tag: string; lead?: boolean };
const roles: Role[] = [
  { name: "Full", desc: "Validates, seals, mines and stakes — the only role that produces blocks. The default.", icon: "cube", tone: "", tag: "Produces blocks · default", lead: true },
  { name: "Relay", desc: "Carries gossip + mixnet traffic for others — great for a well-connected server.", icon: "globe", tone: "bolt", tag: "Carries traffic" },
  { name: "Verifier", desc: "Checks proofs and state without sealing — light on resources.", icon: "check", tone: "violet", tag: "Light verification" },
];
const nodes = `
<section class="section container-x">
  ${heading("Node roles", "Run what your hardware supports", "Only Full nodes produce blocks; Relay and Verifier let lighter hardware still contribute.")}
  <div class="mt-8 grid gap-4 sm:grid-cols-3">
    ${roles
      .map(
        (r) => `<article class="reveal card p-6"${r.lead ? ' style="border-color:color-mix(in oklab, var(--color-brand) 30%, var(--color-line))"' : ""}><div class="flex items-center justify-between"><div class="${orbClass(r.tone)}">${icon(r.icon, "h-5 w-5")}</div><span class="chip !px-2 !py-0.5 !text-[0.58rem]">${r.tag}</span></div><h3 class="mt-4 t-h3">${r.name}</h3><p class="mt-2 t-body text-[var(--color-muted)]">${r.desc}</p></article>`,
      )
      .join("")}
  </div>
  <div class="mt-8 text-center reveal">
    <a href="${LINKS.docs}" class="btn btn-primary">Read the docs ${icon("arrow", "h-4 w-4")}</a>
    <a href="/security.html" class="btn btn-ghost ml-2">Security & audits</a>
  </div>
</section>`;

const main = document.getElementById("main");
if (main) main.innerHTML = hero + stack + execModel + levers + nodes;
mountChrome("Network");
