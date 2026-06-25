// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import "../styles.css";

import { mountChrome } from "../lib/chrome.js";
import { wireWaitlist, waitlistForm } from "../lib/brevo.js";
import { wireMotion } from "../lib/motion.js";
import { LINKS, TRISTREAM } from "../lib/content.js";
import { icon, heading, orbClass } from "../lib/ui.js";
import { codeBlock, wireCode, type Snippet } from "../lib/code.js";

/* ----------------------------------------------------------------------------
 * RUN A NODE — Inferno is THE public node app. The page reads as a guided flow:
 *   hook → pick your stream → two ways to run → roles → a second income (AI) →
 *   stake instead → join the waitlist.
 * Exactly ONE hero-aurora (hero) and ONE text-anim word (hero). Count-up on the
 * one designed stat number (the 100,000 stake minimum). Inferno = public; Ember
 * is never surfaced.
 * -------------------------------------------------------------------------- */

const CLI: Snippet = {
  lang: "bash",
  title: "PYRAX CLI — create & run a node",
  code: `# create an isolated node (auto-picks free, non-clashing ports)
pyrax node create my-node --network devnet2

# start it (full node: validates, seals, mines & stakes)
pyrax node start my-node

# run several at once — each is port-isolated
pyrax node create my-node-2 --network testnet
pyrax node list`,
};

// 1) HERO — the hook. ONE animated gradient word ("AI"). Inferno named as the
// public node app, exact framing kept.
const hero = `
<section class="relative overflow-hidden pt-32 pb-12 sm:pt-40">
  <div class="hero-aurora" aria-hidden="true"></div>
  <div class="absolute inset-0 grid-bg opacity-50" aria-hidden="true"></div>
  <div class="container-x relative max-w-3xl reveal">
    <span class="chip"><span class="h-1.5 w-1.5 rounded-full bg-[var(--color-positive)]"></span> Run a node · Inferno</span>
    <h1 class="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Mine, stake, and earn from <span class="brand-text text-anim">AI</span> — all from one app.</h1>
    <p class="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-muted)]"><strong class="text-[var(--color-ink)]">Inferno</strong> is the public desktop node app — the way most people run a full node, pick a mining stream, stake PYRX, and contribute AI compute. One signed install gives you three ways to earn block rewards, plus a second income from NEURAX when your GPU runs paid AI work — say an image job that runs on your idle RTX 3060.</p>
    <div class="mt-7 flex flex-wrap gap-3">
      <a href="#waitlist" class="btn btn-primary">Get notified at launch ${icon("arrow", "h-4 w-4")}</a>
      <a href="${LINKS.docs}" class="btn btn-ghost">Setup guide</a>
      <a href="https://nodes.pyraxchain.com/changelog.html" target="_blank" rel="noopener" class="btn btn-ghost">Changelog ↗</a>
    </div>
  </div>
</section>`;

// 2) PICK YOUR STREAM — TriStream, with a lead-note tying earning together.
const streams = `
<section class="section container-x">
  ${heading("Pick your stream", "Three ways to earn — TriStream", "Block rewards split roughly evenly across the three streams, so no single approach is left behind. Pick the one that fits your hardware — and a capable GPU on Stream B can stack a second income from NEURAX on top.")}
  <p class="reveal lead-note mx-auto mt-8 max-w-2xl text-sm sm:text-base">
    Mining isn't winner-take-all here. The reward split is roughly even across all three streams, so an ASIC, a gaming GPU, or a staked validator each earns its share — and Stream B owners can also take paid AI jobs for income that has nothing to do with finding a block.
  </p>
  <div class="mt-10 grid gap-5 lg:grid-cols-3">
    ${TRISTREAM.map(
      (s) => `
      <article class="reveal card card-hover p-6">
        <div class="${orbClass("brand")}">${icon(s.icon, "h-5 w-5")}</div>
        <h3 class="mt-4 text-lg font-semibold">${s.name}</h3>
        <p class="mt-2 text-sm font-medium text-[var(--color-brand-soft)]">${s.algo}</p>
        <p class="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">${s.who}</p>
      </article>`,
    ).join("")}
  </div>
</section>`;

// 3) TWO WAYS TO RUN — Inferno desktop vs the CLI (kept with the code block).
const runways = `
<section class="section container-x">
  ${heading("Two ways to run", "One-click, or scripted", "Inferno is the public desktop app for everyone; the CLI is for power users and multi-node operators who want to script the same node from a terminal.")}
  <div class="mt-10 grid gap-6 lg:grid-cols-2 lg:items-start">
    <div class="reveal card p-7">
      <div class="${orbClass("brand")}">${icon("server", "h-5 w-5")}</div>
      <h3 class="mt-4 text-lg font-semibold">Inferno Node — the desktop app</h3>
      <p class="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">A signed, self-updating GUI that runs a full node, the three-stream miner, staking, and the AI-compute worker. It auto-discovers peers via the live directory, with an optional remote portal so you can reach your node from anywhere.</p>
      <ol class="mt-5 space-y-2.5 text-sm text-[var(--color-muted)]">
        ${[
          ["Install", "Download the signed installer for your OS and open it."],
          ["Create a node", "The setup picks free, non-clashing ports for you — no config to write."],
          ["It's live", "Start the node from the dashboard; it finds peers and begins syncing on its own."],
        ]
          .map(
            (s, i) => `<li class="flex gap-3"><span class="${orbClass("brand")} shrink-0 !h-7 !w-7 !text-xs font-bold">${i + 1}</span><span><strong class="text-[var(--color-ink)]">${s[0]}.</strong> ${s[1]}</span></li>`,
          )
          .join("")}
      </ol>
      <a href="#waitlist" class="btn btn-primary mt-6">Get notified ${icon("arrow", "h-4 w-4")}</a>
    </div>
    <div class="reveal">
      <div class="card p-7">
        <div class="${orbClass("bolt")}">${icon("terminal", "h-5 w-5")}</div>
        <h3 class="mt-4 text-lg font-semibold">PYRAX CLI — terminal & servers</h3>
        <p class="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">Create and run multiple nodes, each auto-isolated to free ports. Install via cargo, Homebrew, Scoop or the installer script (see the docs).</p>
      </div>
      ${codeBlock(CLI)}
    </div>
  </div>
</section>`;

// 4) NODE ROLES — EXACTLY Full / Relay / Verifier, exact descriptions kept.
const roles = `
<section class="section container-x">
  ${heading("Node roles", "Pick what fits your hardware & bandwidth", "Every node plays one of three roles. You don't have to mine to be useful — relaying and verifying keep the network fast and honest.")}
  <div class="mt-10 grid gap-4 sm:grid-cols-3">
    ${[
      ["Full", "Validates, seals, mines and stakes — the only role that produces blocks. The default. Wants mining hardware (an ASIC or GPU) or staked PYRX, plus a steady connection, and earns you a share of the block rewards.", "cube"],
      ["Relay", "Carries gossip + mixnet traffic for others. Wants bandwidth and uptime more than compute — ideal on a well-connected server — and keeps the mesh fast for everyone.", "globe"],
      ["Verifier", "Checks proofs and state without sealing. Light on resources — runs on modest hardware — and helps keep the network honest without any mining gear.", "check"],
    ]
      .map((x) => `<article class="reveal card p-6"><div class="${orbClass("violet")}">${icon(x[2] as string, "h-5 w-5")}</div><h3 class="mt-4 text-base font-semibold">${x[0]}</h3><p class="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">${x[1]}</p></article>`)
      .join("")}
  </div>
  <p class="reveal mx-auto mt-5 max-w-2xl text-center text-xs text-[var(--color-faint)]">Discovery is automatic via <a href="${LINKS.peers}" class="link-underline font-semibold text-[var(--color-brand-soft)]">peers.pyraxchain.com</a>; a hosted remote portal (a per-node subdomain) lets you reach your node's dashboard from anywhere.</p>
</section>`;

// 5) A SECOND INCOME — the AI earning block. Four honest sub-points kept; the
// four AI facts tightened into a 2×2 of richer prose tiles.
const AI_FACTS: [string, string][] = [
  ["VRAM is king", "More VRAM means bigger models and a higher pay tier — capacity, not clock speed, is what the marketplace rewards."],
  ["Idle-only", "Contention-aware scheduling soaks up wasted capacity, so AI jobs run only when your card would otherwise sit idle."],
  ["Verified", "The network only pays for work it can prove is real — redundant runs, fraud-proofs and attestation back every payout."],
  ["Escrowed", "The requester's payment is locked on-chain before you start, so the job is always funded before your GPU does any work."],
];
const ai = `
<section class="section container-x">
  <div class="grid gap-10 lg:grid-cols-2 lg:items-center">
    <div class="reveal">
      <span class="chip">A second income</span>
      <h2 class="mt-4 text-3xl font-bold tracking-tight">Your GPU earns from AI work — not just blocks.</h2>
      <p class="mt-4 leading-relaxed text-[var(--color-muted)]">Stream B is wired so a capable GPU can take paid AI jobs from the NEURAX marketplace. Requesters pay into on-chain escrow; you run verified work and get paid out of it. You're <strong class="text-[var(--color-ink)]">choosing</strong> paid AI work — never taxed for it, never charged to run it.</p>
      <ul class="mt-5 space-y-2 text-sm text-[var(--color-muted)]">
        ${[
          "Single-card jobs that fit your VRAM run great — even on riser rigs (the slow load is one-time; inference stays on the card).",
          "Pay scales with measured capability × actual utilization — a benchmark on register, not the label on the box.",
          "A reputation score (uptime, honesty, latency) nudges your rate over time.",
          "Idle-only and escrowed: jobs use spare capacity, and payment is locked on-chain before you start.",
        ]
          .map((t) => `<li class="flex gap-2">${icon("check", "h-4 w-4 text-[var(--color-positive)] shrink-0 mt-0.5")}<span>${t}</span></li>`)
          .join("")}
      </ul>
    </div>
    <div class="reveal grid grid-cols-1 gap-3 sm:grid-cols-2">
      ${AI_FACTS.map(
        (x) => `<div class="card p-5"><div class="text-sm font-semibold">${x[0]}</div><p class="mt-1.5 text-xs leading-snug text-[var(--color-muted)]">${x[1]}</p></div>`,
      ).join("")}
    </div>
  </div>
</section>`;

// 6) STAKE INSTEAD — Stream C. The 100,000 minimum counts up.
const staking = `
<section class="section container-x">
  <div class="card relative overflow-hidden p-8 sm:p-12">
    <div class="absolute inset-0 grid-bg opacity-50" aria-hidden="true"></div>
    <div class="relative grid gap-6 sm:grid-cols-3 sm:items-center">
      <div class="reveal sm:col-span-2">
        <span class="chip">Stream C · staking</span>
        <h2 class="mt-4 text-2xl font-bold tracking-tight">No mining hardware? Stake and help finalize blocks.</h2>
        <p class="mt-3 leading-relaxed text-[var(--color-muted)]">Lock at least <strong class="text-[var(--color-ink)]">100,000 PYRX</strong> and run a validator on a normal, reliable server — no ASIC or GPU required. Staked coins secure the chain and leave circulation while they do, with a 7-day unbonding period when you withdraw.</p>
      </div>
      <div class="reveal text-center">
        <div class="text-4xl font-extrabold brand-text"><span data-count="100000" data-format="plain">0</span></div>
        <div class="mt-1 text-sm text-[var(--color-muted)]">minimum PYRX to validate</div>
      </div>
    </div>
  </div>
</section>`;

// 7) THE CLOSING CTA — the page's single big closing gradient moment.
const cta = `
<section id="waitlist" class="section container-x">
  <div class="card relative overflow-hidden p-8 text-center sm:p-14">
    <div class="absolute inset-0 grid-bg opacity-60" aria-hidden="true"></div>
    <div class="absolute -inset-x-10 -top-24 h-48 blur-3xl" aria-hidden="true" style="background: radial-gradient(closest-side, color-mix(in oklab, var(--color-brand) 35%, transparent), transparent);"></div>
    <div class="relative reveal">
      <span class="chip">Be early</span>
      <h2 class="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Be first to run Inferno</h2>
      <p class="mx-auto mt-4 max-w-xl text-[var(--color-muted)]">Join the waitlist and we'll let you know the moment the node app is ready to download — no spam, no price promises.</p>
      <div class="mt-7">${waitlistForm()}</div>
    </div>
  </div>
</section>`;

const main = document.getElementById("main");
if (main) main.innerHTML = hero + streams + runways + roles + ai + staking + cta;
mountChrome("Network");
wireWaitlist();
wireCode();
wireMotion();
