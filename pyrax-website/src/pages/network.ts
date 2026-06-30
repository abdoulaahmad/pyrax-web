// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import "../styles.css";

import { mountChrome } from "../lib/chrome.js";
import { LINKS, NETWORK_FEATURES, NETWORKS } from "../lib/content.js";
import { icon, heading, featureCard, orbClass } from "../lib/ui.js";

// A compact key→value spec list used in the deep sections.
const specs = (rows: [string, string][]) => `
  <dl class="mt-5 divide-y divide-[var(--color-line-soft)] rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
    ${rows
      .map(
        ([k, v]) => `
      <div class="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <dt class="text-sm font-semibold text-[var(--color-ink)]">${k}</dt>
        <dd class="text-sm text-[var(--color-muted)] sm:text-right">${v}</dd>
      </div>`,
      )
      .join("")}
  </dl>`;

const hero = `
<section class="relative overflow-hidden pt-32 pb-12 sm:pt-40">
  <div class="hero-aurora" aria-hidden="true"></div>
  <div class="absolute inset-0 grid-bg opacity-50"></div>
  <div class="container-x relative max-w-3xl reveal">
    <span class="chip">The base layer</span>
    <h1 class="mt-5 t-h1">A <span class="brand-text text-anim">GhostDAG</span> Layer-1, private by default.</h1>
    <p class="mt-5 max-w-2xl t-lead text-[var(--color-muted)]">PYRAX is its own base network: a blockDAG that orders parallel work fairly, three mining streams that secure it together, shielded-by-default transactions, three contract VMs, and an onion-routed, bootstrapless mesh underneath. Here's how each piece actually works.</p>
    <div class="mt-7 flex flex-wrap gap-3">
      <a href="/architecture.html" class="btn btn-primary">Architecture deep-dive ${icon("arrow", "h-4 w-4")}</a>
      <a href="/security.html" class="btn btn-ghost">Security & audits</a>
    </div>
  </div>
</section>`;

const overview = `
<section class="section container-x pt-6">
  <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    ${NETWORK_FEATURES.map(featureCard).join("")}
  </div>
</section>`;

// A CSS diagram: 3-4 parallel block lanes (blue-scored) feed into ONE ordered
// selected-parent chain — so the reader SEES "many lanes, one fair history".
const dagLanes = ["Lane 1", "Lane 2", "Lane 3", "Lane 4"];
const dagChain = [
  ["B₀", "genesis"],
  ["B₁", "selected"],
  ["B₂", "selected"],
  ["B₃", "tip"],
];
const dagDiagram = `
<div class="reveal mb-12 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 sm:p-7">
  <p class="text-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">Many lanes, one fair history</p>
  <div class="mt-6 grid gap-6 lg:grid-cols-[0.9fr_auto_1.1fr] lg:items-center">
    <div>
      <p class="mb-3 text-center text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[var(--color-faint)]">Parallel blocks</p>
      <div class="grid gap-2.5">
        ${dagLanes
          .map(
            (l) => `
        <div class="diagram-node diagram-node-brand !flex-row !items-center !justify-center !gap-2 !py-2">
          <span class="dn-title">${l}</span>
          <span class="dn-sub">block lane</span>
        </div>`,
          )
          .join("")}
      </div>
    </div>
    <div class="flex items-center justify-center lg:flex-col" aria-hidden="true">
      <span class="diagram-link !min-w-[3rem] lg:hidden"></span>
      <div class="hidden lg:grid lg:gap-2.5">
        ${dagLanes.map(() => `<span class="diagram-link !min-w-[2.5rem]"></span>`).join("")}
      </div>
      <span class="diagram-link !min-w-[3rem] lg:hidden"></span>
    </div>
    <div>
      <p class="mb-3 text-center text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[var(--color-faint)]">One ordered selected-parent chain</p>
      <div class="flex flex-wrap items-center justify-center gap-x-1 gap-y-3">
        ${dagChain
          .map(
            ([t, s], i) => `
          <span class="diagram-node !py-2" style="border-color: color-mix(in oklab, var(--color-bolt) 45%, var(--color-line));">
            <span class="dn-title font-mono">${t}</span>
            <span class="dn-sub">${s}</span>
          </span>
          ${i < dagChain.length - 1 ? `<span class="diagram-link !min-w-[1rem] !max-w-[1.75rem]"></span>` : ""}`,
          )
          .join("")}
      </div>
    </div>
  </div>
  <p class="mt-6 text-center text-xs leading-relaxed text-[var(--color-muted)]">
    Honestly-produced parallel blocks are <strong class="text-[var(--color-ink)]">included by the blue set</strong>, not orphaned — then GhostDAG topologically orders the whole graph along the selected-parent chain into one history every node agrees on.
  </p>
</div>`;
const ghostdag = `
<section id="ghostdag" class="section container-x scroll-mt-28">
  ${dagDiagram}
  <div class="grid gap-10 lg:grid-cols-2 lg:items-start">
    <div class="reveal">
      <span class="chip">GhostDAG · consensus</span>
      <h2 class="mt-4 t-h2">Many lanes, ordered into one fair history.</h2>
      <p class="mt-4 leading-relaxed text-[var(--color-muted)]">Blocks form a <strong class="text-[var(--color-ink)]">DAG, not a single-file chain</strong>. GhostDAG picks a well-connected <strong class="text-[var(--color-ink)]">"blue set"</strong> of blocks using a k-cluster rule, then topologically orders the whole graph — so honestly-produced parallel blocks are <strong class="text-[var(--color-ink)]">included, not orphaned</strong>. Each block's <code class="text-[var(--color-muted)]">parents[0]</code> is its selected parent.</p>
      <p class="mt-3 leading-relaxed text-[var(--color-muted)]"><strong class="text-[var(--color-ink)]">blue_score</strong> counts the blue blocks in a block's past; <strong class="text-[var(--color-ink)]">blue_work</strong> accumulates their proof-of-work. Fork choice is the <strong class="text-[var(--color-ink)]">heaviest blue work, constrained by finality</strong> — so a peer can never forge fork-choice weight, even on a parentless block.</p>
    </div>
    <div class="reveal">
      ${specs([
        ["Structure", "blockDAG — parallel blocks, GhostDAG k-cluster ordering"],
        ["Fork choice", "Heaviest blue_work, finality-constrained"],
        ["Selected parent", "parents[0]; coloring recomputed + verified on ingest"],
        ["Throughput target", "≥ 500,000 TPS aggregate (bench-gated — see below)"],
        ["Proven", "Converges across a live multi-node mesh"],
      ])}
    </div>
  </div>
  <div class="reveal mt-6 flex items-start gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
    ${icon("pulse", "h-5 w-5 text-[var(--color-brand-soft)] shrink-0")}
    <p class="t-body text-[var(--color-muted)]"><strong class="text-[var(--color-ink)]">Honesty on the number:</strong> 500k <em>sustained</em> is beyond every production chain today. It's an <strong class="text-[var(--color-ink)]">aggregate</strong> goal realized progressively (DAG parallelism + parallel execution + L2/L3 rollups), with a high L1 floor — and it's <strong class="text-[var(--color-ink)]">gated by <code>pyrax-bench</code></strong>. We publish the methodology and never quote a number we can't reproduce.</p>
  </div>
</section>`;

const streamCards = [
  {
    name: "Stream A — ASIC",
    icon: "asic",
    algo: "Dual BLAKE3 + SHA-256 proof-of-work",
    rows: [
      ["Hash", "BLAKE3 + SHA-256 (dual)"],
      ["Block target", "60-second cadence"],
      ["Retarget", "Every 2016 blocks"],
      ["For", "ASIC-class hardware"],
    ] as [string, string][],
  },
  {
    name: "Stream B — GPU / CPU",
    icon: "gpu",
    algo: "KAWPOW (GPU) · RandomX (CPU) — wired to AI earning",
    rows: [
      ["GPU algo", "KAWPOW (memory-hard)"],
      ["CPU algo", "RandomX"],
      ["Bonus", "Capable GPUs can also take paid AI jobs"],
      ["For", "Mainstream gaming GPUs & many-core CPUs"],
    ] as [string, string][],
  },
  {
    name: "Stream C — Staking",
    icon: "stake",
    algo: "Proof-of-stake + BFT finality",
    rows: [
      ["Min stake", "100,000 PYRX"],
      ["Unbonding", "7-day delay"],
      ["Finality", "BLS-aggregated, >2/3"],
      ["Slashing", "Equivocation & downtime (burned)"],
    ] as [string, string][],
  },
];

const tristream = `
<section id="tristream" class="section container-x scroll-mt-28">
  ${heading("TriStream mining", "Three unrelated mechanisms, secured together", "PYRAX deliberately combines ASIC PoW, GPU/CPU PoW and proof-of-stake. To capture the chain you'd have to dominate all three at once — that's 51%-resistance through diversity. Block rewards split evenly, one third to each stream.")}
  <p class="reveal lead-note mx-auto mt-10 max-w-2xl text-sm sm:text-base">
    <strong class="text-[var(--color-ink)]">The why:</strong> an attacker can only rewrite history by out-producing ASICs <em>and</em> GPUs/CPUs <em>and</em> stake simultaneously. Each stream below uses unrelated hardware and math, so dominating one buys you nothing.
  </p>
  <div class="mt-8 grid gap-5 lg:grid-cols-3">
    ${streamCards
      .map(
        (s) => `
      <article class="reveal card p-6">
        <div class="${orbClass("brand")}">${icon(s.icon, "h-5 w-5")}</div>
        <h3 class="mt-4 t-h3">${s.name}</h3>
        <p class="mt-2 text-sm font-medium text-[var(--color-brand-soft)]">${s.algo}</p>
        ${specs(s.rows)}
      </article>`,
      )
      .join("")}
  </div>
  <div class="reveal mt-6 grid gap-4 sm:grid-cols-2">
    <div class="card p-6">
      <div class="${orbClass("bolt")}">${icon("stake", "h-5 w-5")}</div>
      <h3 class="mt-4 t-h3">PoS finality (Stream C)</h3>
      <p class="mt-2 t-body text-[var(--color-muted)]">Validators vote with <strong class="text-[var(--color-ink)]">BLS-aggregated</strong> signatures; a block is final once a <strong class="text-[var(--color-ink)]">>2/3</strong> majority signs it. Conflicting votes are <strong class="text-[var(--color-ink)]">slashable equivocation</strong>. Finality constrains fork choice, so a finalized prefix can't be reorged.</p>
    </div>
    <div class="card p-6">
      <div class="${orbClass("brand")}">${icon("streams", "h-5 w-5")}</div>
      <h3 class="mt-4 t-h3">Even reward split</h3>
      <p class="mt-2 t-body text-[var(--color-muted)]">Each block's reward is split <strong class="text-[var(--color-ink)]">one-third to each stream</strong> — so ASIC owners, GPU/CPU miners and stakers all have a real place. (See the <a href="/token.html#emissions" class="font-semibold text-[var(--color-brand-soft)]">emissions schedule</a> for the per-block numbers.)</p>
    </div>
  </div>
</section>`;

const privacy = `
<section id="privacy" class="section relative overflow-hidden scroll-mt-28">
  <div class="absolute inset-0" style="background: radial-gradient(48rem 26rem at 18% 30%, color-mix(in oklab, var(--color-bolt) 12%, transparent), transparent 60%);"></div>
  <div class="container-x relative">
    ${heading("Shielded by default", "Sender, receiver and amount — hidden by the math", "The default transaction is private, using zero-knowledge proofs with no trusted setup. Transparent transactions exist when you explicitly want them.")}
    <div class="mt-12 grid gap-8 lg:grid-cols-2 lg:items-start">
      <div class="reveal">
        <h3 class="t-h3">How a shielded transfer proves itself</h3>
        <p class="mt-3 leading-relaxed text-[var(--color-muted)]">State is a growing <strong class="text-[var(--color-ink)]">note-commitment Merkle tree</strong> plus a <strong class="text-[var(--color-ink)]">nullifier set</strong>. A shielded transfer carries a single ZK proof that — without revealing anything — settles four claims in order:</p>
        <div class="flow-rail mt-5">
          ${[
            ["Membership", "The spent notes <strong class='text-[var(--color-ink)]'>exist</strong> in the tree — proven against a known anchor, never naming them."],
            ["Nullifiers", "Their <strong class='text-[var(--color-ink)]'>nullifiers</strong> are correctly derived and <strong class='text-[var(--color-ink)]'>previously unseen</strong> — so no note can be double-spent."],
            ["Value balance", "<strong class='text-[var(--color-ink)]'>Inputs equal outputs plus fee</strong> — value is conserved without disclosing any amount."],
            ["Well-formed", "The new output notes are <strong class='text-[var(--color-ink)]'>well-formed</strong> and spendable only by their intended recipients."],
          ]
            .map(
              ([t, d], i) => `
          <div class="flow-step">
            <span class="flow-num">${i + 1}</span>
            <div class="flow-body">
              <div class="flow-title">${t}</div>
              <p class="flow-desc">${d}</p>
            </div>
          </div>`,
            )
            .join("")}
        </div>
      </div>
      <div class="reveal">
        ${specs([
          ["Proof system", "Plonky2 · no trusted setup"],
          ["Default", "Shielded; transparent is the explicit exception"],
          ["Prover", "Wallet-side — the spending key never leaves the wallet"],
          ["Node's role", "Verify only (there is no key-taking RPC)"],
          ["Anti-DoS", "A burned fee gates proof submission"],
        ])}
        <div class="mt-5 flex items-start gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] p-4">
          ${icon("shield", "h-5 w-5 text-[var(--color-bolt-bright)] shrink-0")}
          <p class="text-xs leading-relaxed text-[var(--color-muted)]"><strong class="text-[var(--color-ink)]">The hard gate:</strong> the shielded pool is end-to-end real and mainnet-hardened, but it stays <strong class="text-[var(--color-ink)]">dev/testnet-grade until a formal external ZK-security audit</strong>. Two real bugs were already caught and fixed in review — a critical fork-choice bypass and a high prover overflow. <a href="/security.html" class="font-semibold text-[var(--color-brand-soft)]">More on security →</a></p>
        </div>
      </div>
    </div>
  </div>
</section>`;

const mesh = `
<section id="mesh" class="section container-x scroll-mt-28">
  ${heading("ISP-resistant networking", "No central boot server. No off-switch.", "Nodes find each other through several decentralized methods, and file/media sharing rides an onion-routed mixnet — so an ISP sees that encrypted traffic moves, but not what it is or who's talking.")}
  <div class="mt-12 grid gap-8 lg:grid-cols-2 lg:items-start">
    <div class="reveal">
      <h3 class="t-h3">Onion mixnet</h3>
      <p class="mt-3 leading-relaxed text-[var(--color-muted)]">Real <strong class="text-[var(--color-ink)]">Sphinx</strong> packets over the Ristretto group: each relay learns only the <strong class="text-[var(--color-ink)]">next hop</strong>, packets are <strong class="text-[var(--color-ink)]">unlinkable across hops</strong>, and <strong class="text-[var(--color-ink)]">cover traffic is indistinguishable on the wire</strong> from real traffic. A <code class="text-[var(--color-muted)]">MixPolicy</code> of Off / OptIn / AlwaysOn controls participation.</p>
      <div class="mt-5 flex flex-wrap items-center gap-x-1 gap-y-2" role="img" aria-label="Onion path: you to relay to relay to destination, each hop learns only the next hop">
        ${[
          ["You", "wrap all hops"],
          ["Relay", "next hop only"],
          ["Relay", "next hop only"],
          ["Dest", "unwraps last"],
        ]
          .map(
            ([t, s], i, arr) => `
        <span class="diagram-node ${i === 0 || i === arr.length - 1 ? "diagram-node-bolt" : ""} !py-2">
          <span class="dn-title">${t}</span>
          <span class="dn-sub">${s}</span>
        </span>
        ${i < arr.length - 1 ? `<span class="diagram-link !min-w-[0.9rem] !max-w-[1.5rem]" aria-hidden="true"></span>` : ""}`,
          )
          .join("")}
      </div>
      ${specs([
        ["Packet format", "Sphinx · Ristretto group"],
        ["Relay knowledge", "Next hop only · unlinkable"],
        ["Cover traffic", "Indistinguishable from real onions"],
        ["File chunking", "BLAKE3-addressed · ChaCha20-Poly1305 per-file keys"],
        ["Chunk size", "448 B → exactly one 508-byte Sphinx onion · content-blind relays"],
      ])}
    </div>
    <div class="reveal">
      <h3 class="t-h3">Bootstrapless discovery</h3>
      <p class="mt-3 leading-relaxed text-[var(--color-muted)]">There's <strong class="text-[var(--color-ink)]">no project-operated bootstrap server</strong> to seize or shut down. Nodes discover peers through mDNS on the LAN, a Kademlia DHT random-walk, peer-exchange, a signed community-maintained seed list, and DHT rendezvous.</p>
      ${specs([
        ["Discovery", "mDNS · Kademlia DHT · peer-exchange · signed seed list · rendezvous"],
        ["Transport", "Noise + Yamux over TCP & QUIC"],
        ["Gossip", "GossipSub v1.1"],
        ["Peer table", "Bounded — max 128 peers"],
        ["Live registry", "peers.pyraxchain.com (real-time, per network)"],
      ])}
      <a href="${LINKS.peers}" class="btn btn-ghost mt-5">See live peers ${icon("pulse", "h-4 w-4")}</a>
    </div>
  </div>
</section>`;

const networks = `
<section class="section container-x">
  ${heading("Four networks, one road to mainnet", "Pre-mainnet — built and tested, audit-gated", "One codebase runs all four. Chain IDs are shown in decimal; the public dev network today is the Pyrax Forge Network. The shared AI-compute pool (4,000,000,000 PYRX) is pre-funded on every network.")}
  <div class="reveal mt-10 card overflow-x-auto !p-0">
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
            <td class="p-4"><div class="font-semibold text-[var(--color-ink)]">${n.name}</div><div class="text-xs text-[var(--color-faint)]">${n.note}</div></td>
            <td class="p-4 font-mono text-[var(--color-bolt-bright)]">${n.chainId}</td>
            <td class="p-4 text-[var(--color-muted)]">${n.blockTime}</td>
            <td class="p-4">${n.faucet ? `<span class="text-[var(--color-positive)]">✓ 500 PYRX/claim</span>` : `<span class="text-[var(--color-faint)]">—</span>`}</td>
            <td class="p-4"><span class="chip !px-2 !py-0.5 !text-[0.6rem]">${n.status}</span></td>
          </tr>`,
        ).join("")}
      </tbody>
    </table>
  </div>
  <p class="mt-4 text-xs text-[var(--color-faint)]">The faucet drips on the test networks only (12-hour cooldown) — never on the Pyrax One Network, which activates only after the external audit gate.</p>
</section>`;

const main = document.getElementById("main");
if (main) main.innerHTML = hero + overview + ghostdag + tristream + privacy + mesh + networks;
mountChrome("Network");
