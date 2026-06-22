// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import "../styles.css";

import { mountChrome } from "../lib/chrome.js";
import { ROADMAP } from "../lib/content.js";
import { icon } from "../lib/ui.js";

/* ----------------------------------------------------------------------------
 * ROADMAP — honest, dateless, and PHASE-FREE. A guided narrative:
 *   the hook (built in the open) → what it means → the live status board
 *   (Shipped / In progress / Planned, verbatim) → the NEURAX status →
 *   the ordered mainnet gate as a vertical flow-rail (each step gates the next).
 * Exactly ONE hero-aurora (hero) and ONE text-anim word ("honestly"). The
 * flow-rail is static by design. No count-up, no dates, no price predictions.
 * -------------------------------------------------------------------------- */

type Item = { title: string; desc: string };
const group = (title: string, tone: string, items: Item[]) => `
  <div class="reveal">
    <div class="flex items-center gap-2.5">
      <span class="h-2.5 w-2.5 rounded-full" style="background:${tone}; box-shadow:0 0 12px ${tone}"></span>
      <h3 class="text-lg font-bold tracking-tight">${title}</h3>
      <span class="text-sm text-[var(--color-faint)]">${items.length}</span>
    </div>
    <div class="mt-4 space-y-3">
      ${items.map((it) => `<div class="card p-5"><div class="text-sm font-semibold text-[var(--color-ink)]">${it.title}</div><p class="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">${it.desc}</p></div>`).join("")}
    </div>
  </div>`;

// 1) HERO — the hook. ONE animated gradient word ("honestly"). A narrative
// lead-note follows, unpacking what "pre-mainnet, built in the open" means.
const hero = `
<section class="relative overflow-hidden pt-32 pb-10 sm:pt-40">
  <div class="hero-aurora" aria-hidden="true"></div>
  <div class="absolute inset-0 grid-bg opacity-50"></div>
  <div class="container-x relative max-w-3xl reveal">
    <span class="chip"><span class="h-1.5 w-1.5 rounded-full bg-[var(--color-gold)]"></span> Pre-mainnet · built in the open</span>
    <h1 class="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Built in the open, status-tracked <span class="brand-text text-anim">honestly</span>.</h1>
    <p class="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--color-muted)]">An enormous amount is built and tested on our internal networks; the road to mainnet is hardening plus an external privacy/ZK audit. We <strong class="text-[var(--color-ink)]">don't commit dates</strong> and we don't make price predictions — here's exactly where things stand.</p>
    <p class="lead-note mt-7 max-w-2xl text-sm sm:text-base">
      <strong class="text-[var(--color-ink)]">"Built in the open"</strong> means the hard parts already exist and run — the chain, the privacy layer, the three VMs, and the NEURAX substrate are coded and tested, not promised. What stands between here and a public mainnet is a single, ordered gate: <strong class="text-[var(--color-ink)]">hardening, then an independent external privacy/ZK audit</strong>. Until that clears, the privacy layer stays dev/testnet-grade and protects no real money.
    </p>
  </div>
</section>`;

// 2) THE STATUS BOARD — Shipped / In progress / Planned, verbatim from ROADMAP.
// Counts stay (no count-up). A one-line bridge frames how to read the columns.
const board = `
<section class="section container-x pt-4">
  <p class="reveal lead-note mb-8 max-w-3xl text-sm sm:text-base">
    Three honest columns: what is <strong class="text-[var(--color-ink)]">shipped</strong> and tested today, what is actively <strong class="text-[var(--color-ink)]">in progress</strong>, and what is <strong class="text-[var(--color-ink)]">planned</strong> next. Nothing here carries a date — it moves between columns when the work is real.
  </p>
  <div class="grid gap-8 lg:grid-cols-3">
    ${group("Shipped", "var(--color-positive)", ROADMAP.shipped)}
    ${group("In progress", "var(--color-gold)", ROADMAP.inProgress)}
    ${group("Planned", "var(--color-bolt)", ROADMAP.planned)}
  </div>
</section>`;

// 3) NEURAX STATUS — the same three-state, colored-dot language as the board,
// applied to NEURAX. Facts are kept exact to the locked NEURAX status: substrate
// live; Copilot + gateway building; ML/data platform, agentic Copilot, TEE,
// AI-security audit next. A short "why it matters" beat closes it. PHASE-FREE.
type NeuraxItem = string;
const neuraxCol = (title: string, tone: string, items: NeuraxItem[]) => `
  <div class="reveal">
    <div class="flex items-center gap-2.5">
      <span class="h-2.5 w-2.5 rounded-full" style="background:${tone}; box-shadow:0 0 12px ${tone}"></span>
      <h3 class="text-base font-bold tracking-tight">${title}</h3>
    </div>
    <ul class="mt-3 space-y-1.5 text-sm leading-relaxed text-[var(--color-muted)]">
      ${items.map((it) => `<li class="flex gap-2"><span class="mt-2 h-1 w-1 shrink-0 rounded-full" style="background:${tone}"></span><span>${it}</span></li>`).join("")}
    </ul>
  </div>`;
const NEURAX_LIVE: NeuraxItem[] = [
  "On-chain escrow + the 4B AI-compute pool",
  "The VRAM/tier scheduler + the model registry",
  "The verification ladder",
  "Image generation + GPU pooling",
  "Audio, NEURAX Spatial + honest-degraded video",
  "The NEURAX-Local runtime + the in-app tab",
];
const NEURAX_BUILDING: NeuraxItem[] = [
  "The PYRAX Copilot (local coding copilot)",
  "The gateway into the on-chain escrow path",
];
const NEURAX_NEXT: NeuraxItem[] = [
  "The ML + data platform",
  "The full agentic Copilot",
  "Sealed Trusted-tier compute (TEE)",
  "An external AI-security audit",
];
const neurax = `
<section id="neurax" class="section container-x scroll-mt-28">
  <div class="card relative overflow-hidden p-8 sm:p-10">
    <div class="absolute inset-0" style="background: radial-gradient(40rem 20rem at 80% 0%, color-mix(in oklab, var(--color-violet) 14%, transparent), transparent 60%);"></div>
    <div class="relative">
      <div class="reveal max-w-3xl">
        <span class="chip">NEURAX</span>
        <h2 class="mt-4 text-2xl font-bold tracking-tight">NEURAX status — the substrate is live</h2>
        <p class="mt-3 leading-relaxed text-[var(--color-muted)]">The AI layer follows the same three honest states as the chain: what runs today, what's actively building, and what comes next.</p>
      </div>
      <div class="mt-8 grid gap-8 sm:grid-cols-3">
        ${neuraxCol("Live now", "var(--color-positive)", NEURAX_LIVE)}
        ${neuraxCol("Building now", "var(--color-gold)", NEURAX_BUILDING)}
        ${neuraxCol("Next", "var(--color-bolt)", NEURAX_NEXT)}
      </div>
      <p class="reveal lead-note mt-8 max-w-3xl text-sm sm:text-base">
        <strong class="text-[var(--color-ink)]">Why it matters:</strong> the on-chain escrow, the compute pool and the verification ladder already run — so the moment the marketplace gateway lands, paid AI work routes through a settlement path the network proves is real, not a promise.
      </p>
    </div>
  </div>
</section>`;

// 4) THE MAINNET GATE — the ordered, gating sequence as a vertical flow-rail so
// the ORDER is visually unmistakable: each step must clear before the next.
// Step text is kept exact to the locked gate sequence.
type GateStep = { title: string; desc: string };
const GATE: GateStep[] = [
  {
    title: "Fuzzing",
    desc: "Continuous, automated fuzz testing across the consensus, execution and privacy code paths to surface edge cases before humans review them.",
  },
  {
    title: "Cryptography & circuit audits",
    desc: "Independent review of the zero-knowledge circuits and the cryptographic primitives the shielded pool depends on.",
  },
  {
    title: "External consensus + privacy review",
    desc: "An outside team reviews the GhostDAG consensus and the privacy design end to end — the privacy layer stays dev/testnet-grade until this clears.",
  },
  {
    title: "Incentivized public testnet",
    desc: "An open, incentivized testnet that puts the whole system under real, adversarial public load before any value is at stake.",
  },
  {
    title: "Bug bounty",
    desc: "A standing bug-bounty program so independent researchers are paid to break it — one last open invitation to find what we missed.",
  },
  {
    title: "Mainnet genesis",
    desc: "Genesis happens only after every step above is cleared. No date is committed anywhere — we decline dated promises.",
  },
];
const gateRail = GATE.map(
  (s, i) => `
  <div class="flow-step reveal">
    <span class="flow-num" aria-hidden="true">${i + 1}</span>
    <div class="flow-body">
      <div class="flow-title">${s.title}</div>
      <p class="flow-desc">${s.desc}</p>
    </div>
  </div>`,
).join("");
const gate = `
<section class="section container-x">
  <div class="card relative overflow-hidden p-8 sm:p-12">
    <div class="absolute inset-0 grid-bg opacity-50" aria-hidden="true"></div>
    <div class="relative">
      <div class="reveal mx-auto max-w-2xl text-center">
        <div class="icon-orb mx-auto !h-14 !w-14">${icon("shield", "h-7 w-7")}</div>
        <h2 class="mt-5 text-2xl font-bold tracking-tight">The mainnet gate</h2>
        <p class="mt-3 leading-relaxed text-[var(--color-muted)]">Mainnet genesis is not a date — it's the end of an ordered gate. Each step below must clear before the next begins, and the privacy layer stays dev/testnet-grade until the external ZK-security audit passes. <strong class="text-[var(--color-ink)]">No date is committed anywhere.</strong></p>
      </div>
      <div class="flow-rail mx-auto mt-10 max-w-2xl">
        ${gateRail}
      </div>
      <div class="reveal mt-10 flex flex-wrap justify-center gap-3">
        <a href="/security.html" class="btn btn-primary">${icon("shield", "h-4 w-4")} Security &amp; audits</a>
        <a href="#neurax" class="btn btn-ghost">Where it stands ${icon("arrow", "h-4 w-4")}</a>
      </div>
    </div>
  </div>
</section>`;

const main = document.getElementById("main");
if (main) main.innerHTML = hero + board + neurax + gate;
mountChrome("Resources");
