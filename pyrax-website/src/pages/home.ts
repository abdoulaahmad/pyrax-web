// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import "../styles.css";

import { mountChrome } from "../lib/chrome.js";
import { wireWaitlist, waitlistForm } from "../lib/brevo.js";
import { mountLiveStats } from "../lib/stats.js";
import { wireMotion } from "../lib/motion.js";
import { mountCarousel, wireCountdown } from "../lib/carousel.js";
import {
  LINKS,
  FORGE_LAUNCH_ISO,
  NETWORK_FEATURES,
  NEURAX_PILLARS,
  NEURAX_MODALITIES,
  TOKEN_FACTS,
  TOKEN_UTILITY,
  WHY_AI,
  ECOSYSTEM,
} from "../lib/content.js";
import { icon, heading, featureCard, orbClass } from "../lib/ui.js";

/* ----------------------------------------------------------------------------
 * HOME — the flagship, guided top-to-bottom storyline:
 *   hook → proof it's live → the problem → PYRAX's answer → how it works →
 *   built-and-tested honesty → NEURAX flagship → the token → why it matters →
 *   get involved.
 * Exactly ONE hero-aurora (hero), ONE text-anim word (hero), ONE grad-ring focal
 * card (token stats), count-up on the designed numbers, subtle parallax on hero art.
 * -------------------------------------------------------------------------- */

// 1) HERO CAROUSEL — auto-cycling flagship slides: PYRAX · Pyrax Forge Network (with a live launch
// countdown) · Genesis Sponsorship · NEURAX. ONE hero-aurora for the whole section; each slide
// has one text-anim word. Slide 1 keeps the count-up stats (it's the visible-at-load slide).
const SLIDES = 4;
const titleCls = "hero-title mt-5 t-h1";
const ledeCls = "hero-lede mt-6 max-w-xl t-lead text-[var(--color-muted)]";
const slideWrap = (n: number, label: string, inner: string) => `
  <div data-slide role="group" aria-roledescription="slide" aria-label="${n} of ${SLIDES}: ${label}" class="carousel-slide${n === 1 ? " is-active" : ""}" aria-hidden="${n === 1 ? "false" : "true"}">
    <div class="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">${inner}</div>
  </div>`;

const slidePyrax = slideWrap(
  1,
  "PYRAX",
  `
    <div>
      <span class="chip"><span class="h-1.5 w-1.5 rounded-full bg-[var(--color-positive)]"></span> Pre-mainnet · built in the open</span>
      <h1 class="${titleCls}"><span class="brand-text">Private money.</span><br class="hidden sm:block" /> <span class="bolt-text text-anim">Decentralized AI.</span></h1>
      <p class="${ledeCls}">PYRAX is a shielded-by-default GhostDAG blockchain with three ways to mine, full Ethereum compatibility, and a built-in marketplace — NEURAX — where idle GPUs around the world run AI work and earn PYRX.</p>
      <div class="mt-8 flex flex-wrap gap-3">
        <a href="#waitlist" class="btn btn-primary">Join the waitlist ${icon("arrow", "h-4 w-4")}</a>
        <a href="/neurax.html" class="btn btn-ghost">Meet NEURAX ${icon("spark", "h-4 w-4")}</a>
        <a href="${LINKS.docs}" class="btn btn-ghost">Read the docs</a>
      </div>
      <dl class="hero-trim mt-10 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <div>
          <dt class="text-2xl font-bold tracking-tight brand-text">500k+</dt>
          <dd class="mt-1 text-xs leading-snug text-[var(--color-muted)]">TPS aggregate target</dd>
        </div>
        <div>
          <dt class="text-2xl font-bold tracking-tight" style="background:linear-gradient(100deg,var(--color-gold),var(--color-brand) 58%,var(--color-ember));-webkit-background-clip:text;background-clip:text;color:transparent;"><span data-count="50000000000" data-dp="1">0</span></dt>
          <dd class="mt-1 text-xs leading-snug text-[var(--color-muted)]">PYRX hard supply cap</dd>
        </div>
        <div>
          <dt class="text-2xl font-bold tracking-tight bolt-text"><span data-count="3" data-format="plain">0</span></dt>
          <dd class="mt-1 text-xs leading-snug text-[var(--color-muted)]">mining streams (TriStream)</dd>
        </div>
        <div>
          <dt class="text-2xl font-bold tracking-tight bolt-text"><span data-count="3" data-format="plain">0</span></dt>
          <dd class="mt-1 text-xs leading-snug text-[var(--color-muted)]">contract VMs (EVM·WASM·Cairo)</dd>
        </div>
      </dl>
    </div>
    <div class="hero-art relative mx-auto hidden lg:block">
      <div class="absolute inset-8 rounded-full blur-3xl" aria-hidden="true" style="background: radial-gradient(closest-side, color-mix(in oklab, var(--color-brand) 45%, transparent), transparent 70%);"></div>
      <img src="/logo-coin.svg" alt="The PYRAX phoenix coin" class="animate-float relative h-full w-full object-contain drop-shadow-2xl" />
      <div class="absolute left-0 top-10 glass rounded-xl px-3 py-2 text-xs font-semibold animate-float" style="animation-delay:-2s">⚡ TriStream mining</div>
      <div class="absolute right-0 top-1/3 glass rounded-xl px-3 py-2 text-xs font-semibold animate-float" style="animation-delay:-4s">🛡️ Shielded by default</div>
      <div class="absolute bottom-12 left-6 glass rounded-xl px-3 py-2 text-xs font-semibold animate-float" style="animation-delay:-1s">🧠 NEURAX on your GPU</div>
    </div>`,
);

const slideDevnet = slideWrap(
  2,
  "Pyrax Forge Network — now recruiting",
  `
    <div>
      <span class="chip"><span class="h-1.5 w-1.5 rounded-full bg-[var(--color-positive)] animate-pulse-glow"></span> Pyrax Forge Network · Now recruiting</span>
      <h2 class="${titleCls}">Run your own node.<br class="hidden sm:block" /> <span class="brand-text text-anim">Shape the Pyrax Forge Network.</span></h2>
      <p class="${ledeCls}">Be among the first to shape the future of decentralized technology. Sign up to run your own PYRAX node — no coding required, on a standard home computer.</p>
      <ul class="hero-trim mt-6 flex flex-wrap gap-2.5">
        ${["No coding required", "Standard home computer", "Shape the future of PYRAX"]
          .map((b) => `<li class="chip">${icon("check", "h-3.5 w-3.5 text-[var(--color-positive)]")} ${b}</li>`)
          .join("")}
      </ul>
      <div class="mt-8 flex flex-wrap gap-3">
        <a href="#waitlist" class="btn btn-primary">Sign up for the Pyrax Forge Network ${icon("arrow", "h-4 w-4")}</a>
        <a href="${LINKS.whitepaper}" class="btn btn-ghost">Read the whitepaper</a>
      </div>
    </div>
    <div class="mx-auto w-full max-w-md lg:mx-0">
      <div class="countdown-card grad-ring">
        <div class="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--color-brand-soft)]">See you at the Pyrax Forge Network — launching in</div>
        <div class="mt-5 grid grid-cols-4 gap-2.5">
          ${[
            ["d", "Days"],
            ["h", "Hours"],
            ["m", "Mins"],
            ["s", "Secs"],
          ]
            .map(
              ([k, l]) => `
            <div class="countdown-cell">
              <div class="countdown-num" data-cd-${k}>00</div>
              <div class="countdown-label">${l}</div>
            </div>`,
            )
            .join("")}
        </div>
        <p class="mt-5 t-body text-[var(--color-muted)]">Foundational pioneers run the network on day one. No coding — just a standard home computer.</p>
      </div>
    </div>`,
);

// NOTE: Genesis Sponsorship copy is intentionally high-level + accuracy-safe until the real
// campaign details (tiers / benefits / amounts) from pyraxchain.com/genesis-sponsorship are provided.
const slideGenesis = slideWrap(
  3,
  "Genesis Block Sponsorship",
  `
    <div>
      <span class="chip">${icon("flame", "h-3.5 w-3.5 text-[var(--color-brand-soft)]")} Genesis Block Sponsorship</span>
      <h2 class="${titleCls}">Sponsor the <span class="brand-text text-anim">genesis block.</span></h2>
      <p class="${ledeCls}">Back PYRAX from the very first block. The Genesis Sponsorship is your chance to support the launch and stand among the network's founding backers.</p>
      <div class="mt-8 flex flex-wrap gap-3">
        <a href="${LINKS.genesisSponsorship}" class="btn btn-primary">Become a genesis sponsor ${icon("arrow", "h-4 w-4")}</a>
        <a href="/token.html" class="btn btn-ghost">See the tokenomics</a>
      </div>
    </div>
    <div class="mx-auto hidden w-full max-w-md lg:block">
      <div class="genesis-card grad-ring">
        <div class="genesis-block animate-float">
          <span class="genesis-tag">Genesis</span>
          <span class="genesis-num">#0</span>
          <span class="genesis-hash">0x0000…pyrax</span>
        </div>
        <p class="mt-6 text-center t-body text-[var(--color-muted)]">Block zero is minted once. Be part of the network from its very first block.</p>
      </div>
    </div>`,
);

const slideNeurax = slideWrap(
  4,
  "NEURAX AI",
  `
    <div>
      <span class="chip"><span class="h-1.5 w-1.5 rounded-full" style="background:var(--color-violet)"></span> NEURAX · the flagship</span>
      <h2 class="${titleCls}">Real AI on <span class="bolt-text text-anim">your own GPU.</span></h2>
      <p class="${ledeCls}">NEURAX is a local-first multimodal AI — chat, code, images, audio, video and spatial sound on a consumer RTX 3060 — with a verified marketplace where idle GPUs everywhere run AI work and earn PYRX.</p>
      <div class="mt-8 flex flex-wrap gap-3">
        <a href="/neurax.html" class="btn btn-primary">Meet NEURAX ${icon("spark", "h-4 w-4")}</a>
        <a href="/node.html" class="btn btn-ghost">Earn from your GPU ${icon("gpu", "h-4 w-4")}</a>
      </div>
      <div class="hero-trim mt-6 flex flex-wrap gap-2">
        ${["Text & code", "Image", "Audio", "Video", "Spatial", "Embeddings"].map((m) => `<span class="chip">${m}</span>`).join("")}
      </div>
    </div>
    <div class="hero-art relative mx-auto hidden lg:block">
      <div class="absolute inset-10 rounded-full blur-3xl" aria-hidden="true" style="background: radial-gradient(closest-side, color-mix(in oklab, var(--color-violet) 45%, transparent), transparent 70%);"></div>
      <div class="neurax-orb animate-float">${icon("chip", "h-24 w-24")}</div>
      <div class="absolute left-0 top-12 glass rounded-xl px-3 py-2 text-xs font-semibold animate-float" style="animation-delay:-2s">🧠 Local-first on a 3060</div>
      <div class="absolute right-0 top-1/3 glass rounded-xl px-3 py-2 text-xs font-semibold animate-float" style="animation-delay:-4s">⚡ 8 PYRX / CU</div>
      <div class="absolute bottom-14 left-6 glass rounded-xl px-3 py-2 text-xs font-semibold animate-float" style="animation-delay:-1s">🌐 Earn from idle GPUs</div>
    </div>`,
);

const hero = `
<section class="hero-screen relative overflow-hidden" aria-roledescription="carousel" aria-label="PYRAX highlights" data-carousel>
  <div class="hero-aurora" aria-hidden="true"></div>
  <div class="absolute inset-0 grid-bg opacity-50" aria-hidden="true"></div>
  <div class="container-x relative flex flex-1 flex-col">
    <div class="carousel-viewport flex-1">
      <div class="carousel-track h-full" data-carousel-track>
        ${slidePyrax}${slideDevnet}${slideGenesis}${slideNeurax}
      </div>
    </div>
    <div class="hero-controls mt-6 flex items-center justify-center gap-3">
      <button type="button" class="carousel-arrow" data-prev aria-label="Previous slide">${icon("arrow", "h-4 w-4 rotate-180")}</button>
      <div class="flex items-center gap-1">
        ${["PYRAX", "Pyrax Forge Network", "Genesis Sponsorship", "NEURAX"]
          .map((l) => `<button type="button" class="carousel-dot" data-dot aria-label="Go to ${l}"></button>`)
          .join("")}
      </div>
      <button type="button" class="carousel-arrow" data-next aria-label="Next slide">${icon("arrow", "h-4 w-4")}</button>
      <button type="button" class="carousel-arrow carousel-toggle" data-carousel-toggle aria-label="Pause slideshow" aria-pressed="false">${icon("pause", "h-4 w-4 carousel-ic-pause")}${icon("play", "h-4 w-4 carousel-ic-play")}</button>
    </div>
    <span class="sr-only" aria-live="polite" data-carousel-live></span>
  </div>
</section>`;

// 2) LIVE PROOF — "it's real, right now." Given the same centered section header treatment as the
// rest of the page (eyebrow chip + headline + lead) so the live tiles read as an intentional proof
// beat instead of a stray paragraph. The numbers are pulled live from a running PYRAX network
// (see stats.ts) — never staged.
const live = `
<section class="section container-x">
  <div class="reveal mx-auto max-w-2xl text-center">
    <span class="chip"><span class="h-1.5 w-1.5 rounded-full bg-[var(--color-positive)] animate-pulse-glow"></span> Live network</span>
    <h2 class="mt-4 t-h2">See it running — <span class="brand-text">right now.</span></h2>
    <p class="mt-4 t-lead text-[var(--color-muted)]">
      Every number below is pulled live from a running PYRAX network — real block height, real connected peers, refreshed as each block is sealed. Nothing here is staged. Switch networks in the navbar to watch any of them.
    </p>
  </div>
  <div id="livestats" class="reveal mx-auto mt-10 max-w-5xl"></div>
</section>`;

// 3) THE PROBLEM — the connective beat, given the hero's visual language: a gradient
// highlight headline, tone-varied icon orbs (fire / NEURAX-violet / blue — mirroring the
// three answers below), an index numeral, a sharp "what it costs you" footer per card,
// and a lead-note bridge into the answer.
const PROBLEMS = [
  {
    t: "Pick two of three",
    d: "Most chains force a trade-off: you can be fast, or private, or programmable — rarely all at once.",
    cost: "So privacy gets bolted on last — or never.",
    icon: "scale",
    tone: "brand",
  },
  {
    t: "AI is gatekept",
    d: "The compute behind modern AI sits inside a handful of clouds. Access needs an account, and pricing is set by the few.",
    cost: "And your data leaves your machine.",
    icon: "lock",
    tone: "violet",
  },
  {
    t: "Your hardware idles",
    d: "Millions of capable GPUs sit idle while people rent the same compute back at a markup.",
    cost: "The value flows up — not to the people who own the silicon.",
    icon: "gpu",
    tone: "bolt",
  },
];
const problem = `
<section id="problem" class="section container-x relative overflow-hidden">
  <div class="pointer-events-none absolute inset-x-0 -top-10 mx-auto h-72 max-w-3xl" aria-hidden="true"
       style="background:radial-gradient(40rem 18rem at 50% 0%, color-mix(in oklab, var(--color-ember) 12%, transparent), transparent 70%);"></div>
  <div class="relative">
    ${heading(
      `${icon("scale", "h-3.5 w-3.5")} The problem`,
      `Fast, private, programmable — and <span class="brand-text">AI you actually control.</span>`,
      `Today you get to pick maybe one. Blockchains make you choose between speed, privacy and real programmability — and the compute powering AI is locked behind a few companies. <span class="font-medium text-[var(--color-ink)]">PYRAX was built to refuse both compromises at once.</span>`,
    )}
    <div class="mt-14 grid gap-5 md:grid-cols-3">
      ${PROBLEMS.map(
        (p, i) => `
        <article class="reveal card card-hover group relative flex flex-col p-7">
          <div class="flex items-start justify-between">
            <div class="${orbClass(p.tone)} !h-12 !w-12">${icon(p.icon, "h-6 w-6")}</div>
            <span class="font-display text-4xl font-extrabold leading-none text-[var(--color-line)] transition-colors group-hover:text-[var(--color-brand-soft)]">0${i + 1}</span>
          </div>
          <h3 class="mt-5 t-h3">${p.t}</h3>
          <p class="mt-2 t-body text-[var(--color-muted)]">${p.d}</p>
          <div class="mt-auto flex items-start gap-2 border-t border-[var(--color-line-soft)] pt-4 text-xs font-semibold leading-relaxed text-[var(--color-faint)]">
            ${icon("close", "mt-0.5 h-3.5 w-3.5 flex-none text-[var(--color-negative)]")}<span>${p.cost}</span>
          </div>
        </article>`,
      ).join("")}
    </div>
    <p class="reveal lead-note mx-auto mt-12 max-w-3xl text-base">
      PYRAX refuses the trade-off: a shielded-by-default Layer-1 that's fast <span class="font-semibold text-[var(--color-ink)]">and</span> programmable, with a built-in marketplace that turns the world's idle GPUs into the compute behind AI — owned by the people who run it. <a href="#answer" class="font-semibold text-[var(--color-brand-soft)] link-underline">See how PYRAX answers ${icon("arrow", "inline h-3.5 w-3.5")}</a>
    </p>
  </div>
</section>`;

// 4) PYRAX'S ANSWER — three projects, each desc a full two sentences.
const ANSWER = [
  {
    t: "The Network",
    d: "A shielded-by-default GhostDAG Layer-1 with three independent ways to mine and three contract VMs. Parallel blocks are ordered fairly, privacy is the default not an add-on, and your Ethereum tooling works unchanged.",
    href: "/network.html",
    icon: "lanes",
    tone: "brand",
    cta: "Explore the network",
  },
  {
    t: "NEURAX AI",
    d: "A local-first multimodal AI that runs on a consumer GPU — chat, code, images, audio, video and immersive spatial sound on your own card. When a job is too big it reaches a verified marketplace where idle GPUs run the work and earn PYRX.",
    href: "/neurax.html",
    icon: "chip",
    tone: "violet",
    cta: "Meet NEURAX",
  },
  {
    t: "PYRX Token",
    d: "A fair-launch utility token — gas for every transaction, payment for AI compute, and the stake that secures the chain. A hard 50-billion cap, capped mining emissions, and a usage burn keep supply disciplined and bounded forever.",
    href: "/token.html",
    icon: "coin",
    tone: "bolt",
    cta: "Read the tokenomics",
  },
];
const pillars = `
<section id="answer" class="section container-x scroll-mt-24">
  ${heading(
    "PYRAX's answer",
    "Money, apps, privacy — and a real AI compute network",
    "Most chains do “money + apps.” PYRAX ties together a fast private base layer, full Ethereum compatibility, and a working decentralized AI marketplace so each one reinforces the others.",
  )}
  <div class="mt-12 grid gap-5 md:grid-cols-3">
    ${ANSWER.map(
      (c) => `
      <a href="${c.href}" class="reveal card card-hover group block p-7">
        <div class="${orbClass(c.tone)} !h-12 !w-12">${icon(c.icon, "h-6 w-6")}</div>
        <h3 class="mt-5 t-h3">${c.t}</h3>
        <p class="mt-2 t-body text-[var(--color-muted)]">${c.d}</p>
        <span class="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-soft)]">${c.cta} ${icon("arrow", "h-4 w-4")}</span>
      </a>`,
    ).join("")}
  </div>
</section>`;

// 5) HOW IT WORKS — a one-line layer-stack diagram above the feature grid.
const LAYERS = [
  { t: "Your apps", s: "wallets · dApps · NEURAX", tone: "" },
  { t: "Contract VMs", s: "EVM · WASM · Cairo", tone: "violet" },
  { t: "GhostDAG L1", s: "parallel blocks, fair order", tone: "brand" },
  { t: "Private mesh", s: "shielded state + mixnet", tone: "bolt" },
];
const dnClass = (tone: string) =>
  tone === "brand"
    ? "diagram-node diagram-node-brand"
    : tone === "bolt"
      ? "diagram-node diagram-node-bolt"
      : tone === "violet"
        ? "diagram-node diagram-node-violet"
        : "diagram-node";
const layerDiagram = `
<div class="reveal mt-12 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 sm:p-7">
  <p class="text-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">How the pieces stack</p>
  <div class="mt-5 flex flex-col items-stretch gap-0 sm:flex-row sm:items-center sm:justify-center sm:gap-0">
    ${LAYERS.map(
      (l, i) => `
      <div class="${dnClass(l.tone)} w-full sm:w-auto sm:min-w-[10rem]">
        <span class="dn-title">${l.t}</span>
        <span class="dn-sub">${l.s}</span>
      </div>
      ${
        i < LAYERS.length - 1
          ? `<span class="diagram-link-v mx-auto my-2 sm:mx-2 sm:my-0 sm:!h-[2px] sm:!w-10 sm:!min-h-0 sm:!flex-none" aria-hidden="true"></span>`
          : ""
      }`,
    ).join("")}
  </div>
  <p class="mt-5 text-center text-xs leading-relaxed text-[var(--color-muted)]">
    Your tools sit on top; underneath, a fast DAG-ordered chain settles work and a private mesh moves it — without you changing how you build.
  </p>
</div>`;
const network = `
<section class="section container-x">
  ${heading(
    "How it works",
    "A faster, private kind of blockchain",
    "Parallel blocks fairly ordered, privacy as the default, and the Ethereum tooling you already know — no new learning curve.",
  )}
  ${layerDiagram}
  <div class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    ${NETWORK_FEATURES.map(featureCard).join("")}
  </div>
</section>`;

// 6) BUILT & TESTED — the honesty beat, reframed and placed after the tech.
const statusBanner = `
<section class="container-x">
  <div class="reveal card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-start gap-3">
      <span class="icon-orb !h-10 !w-10 shrink-0">${icon("shield", "h-5 w-5")}</span>
      <div>
        <div class="text-sm font-semibold text-[var(--color-ink)]">Built and tested — honestly, audit-gated</div>
        <p class="mt-0.5 t-body text-[var(--color-muted)]">An enormous amount is already built and tested on our internal networks. The privacy layer must clear an <strong class="text-[var(--color-ink)]">external ZK audit before it protects real money on mainnet</strong> — and we never commit dates or predict price.</p>
      </div>
    </div>
    <div class="flex shrink-0 gap-2">
      <a href="/roadmap.html" class="btn btn-ghost !py-2.5 !text-sm">Roadmap</a>
      <a href="/security.html" class="btn btn-ghost !py-2.5 !text-sm">Security</a>
    </div>
  </div>
</section>`;

// 7) NEURAX FLAGSHIP — pillars + a one-line marketplace lifecycle flow + modality tiles.
const LIFECYCLE = ["Submit", "Escrow", "Match", "Run", "Verify", "Settle"];
const neuraxFlow = `
<div class="reveal mt-8 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 sm:p-6">
  <p class="text-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">Every marketplace job, end to end</p>
  <div class="mt-4 flex flex-wrap items-center justify-center gap-x-1 gap-y-3">
    ${LIFECYCLE.map(
      (s, i) => `
      <span class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-violet)_10%,var(--color-elevated))] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)]">${s}</span>
      ${i < LIFECYCLE.length - 1 ? `<span class="diagram-link !min-w-[1rem] !max-w-[2rem]" aria-hidden="true"></span>` : ""}`,
    ).join("")}
  </div>
  <p class="mt-4 text-center text-xs leading-relaxed text-[var(--color-muted)]">
    Local-first first: your card handles what it can. When a job is too big, payment is escrowed on-chain up front and released only for work the network proves is real.
  </p>
</div>`;
const neurax = `
<section class="section relative overflow-hidden">
  <div class="absolute inset-0" aria-hidden="true" style="background: radial-gradient(50rem 30rem at 80% 20%, color-mix(in oklab, var(--color-violet) 12%, transparent), transparent 60%);"></div>
  <div class="container-x relative">
    ${heading(
      "NEURAX — the flagship",
      "AI that runs on your machine, not someone else's cloud",
      "NEURAX is a real local-first AI: chat, code, images, audio, video and immersive spatial sound on a consumer GPU — reaching the network only when a job is too big for your card.",
    )}
    <div class="mt-12 grid gap-5 lg:grid-cols-3">
      ${NEURAX_PILLARS.map(featureCard).join("")}
    </div>
    ${neuraxFlow}
    <div class="reveal mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      ${NEURAX_MODALITIES.map(
        (m) => `
        <div class="card flex items-start gap-3 p-4">
          <span class="icon-orb icon-orb-violet shrink-0 !h-10 !w-10">${icon(m.icon, "h-5 w-5")}</span>
          <div class="min-w-0">
            <div class="flex items-baseline gap-2">
              <span class="text-sm font-semibold">${m.name}</span>
              <code class="truncate text-[0.7rem] text-[var(--color-faint)]">${m.model}</code>
            </div>
            <p class="mt-1 text-xs leading-snug text-[var(--color-muted)]">${m.blurb}</p>
          </div>
        </div>`,
      ).join("")}
    </div>
    <div class="mt-8 text-center reveal">
      <a href="/neurax.html" class="btn btn-ghost">Explore NEURAX ${icon("arrow", "h-4 w-4")}</a>
    </div>
  </div>
</section>`;

// 8) THE TOKEN — TOKEN_FACTS as count-up stat-blocks, wrapped in the page's ONE grad-ring.
// Map each fact to its count-up rendering; non-clean values stay static text.
const tokenStat = (f: { value: string; label: string }) => {
  const split = f.label.indexOf("—");
  const head = split >= 0 ? f.label.slice(0, split).trim() : f.label;
  const why = split >= 0 ? f.label.slice(split + 1).trim() : f.label;
  let num = `<span class="stat-num brand-text">${f.value}</span>`;
  if (f.value === "50,000,000,000")
    num = `<span class="stat-num brand-text"><span data-count="50000000000" data-format="plain">0</span></span>`;
  else if (f.value === "$0.0025")
    num = `<span class="stat-num brand-text"><span data-count="0.0025" data-prefix="$" data-dp="4">0</span></span>`;
  else if (f.value === "12.5B")
    num = `<span class="stat-num brand-text"><span data-count="12500000000" data-dp="1">0</span></span>`;
  else if (f.value === "25%")
    num = `<span class="stat-num brand-text"><span data-count="25" data-suffix="%" data-format="plain">0</span></span>`;
  else if (f.value === "$125M")
    num = `<span class="stat-num brand-text"><span data-count="125000000" data-prefix="$" data-dp="0">0</span></span>`;
  // "~54%" stays static (approximate value).
  return `
    <div class="stat-block">
      ${num}
      <div class="stat-label">${head}</div>
      <p class="stat-why">${why}</p>
    </div>`;
};
const token = `
<section class="section container-x">
  <div class="grid gap-10 lg:grid-cols-2 lg:items-center">
    <div class="reveal">
      <span class="chip">PYRX · utility token</span>
      <h2 class="mt-4 t-h2">A fair-launch coin you <span class="brand-text">use</span>, not a stake you hold.</h2>
      <p class="mt-4 text-[var(--color-muted)] leading-relaxed">
        PYRX is the fuel of the network — gas for transactions, payment for AI compute, and the stake that secures the chain. A hard 50-billion cap, capped mining, and a fee burn keep supply disciplined and bounded forever.
      </p>
      <p class="lead-note mt-5 text-sm">
        High public float, insiders locked: roughly 54% (≈27.1B) is liquid at launch, while the team vests on a 12-month cliff then 36 months. A $125M genesis FDV with no hidden unlocks.
      </p>
      <div class="mt-6 grid gap-3 sm:grid-cols-2">
        ${TOKEN_UTILITY.map(
          (u) => `
          <div class="flex items-start gap-3">
            <span class="${orbClass("bolt")} shrink-0 !h-9 !w-9">${icon(u.icon, "h-4 w-4")}</span>
            <div><div class="text-sm font-semibold">${u.title}</div><p class="text-xs text-[var(--color-muted)]">${u.desc}</p></div>
          </div>`,
        ).join("")}
      </div>
      <a href="/token.html" class="btn btn-primary mt-7">Read the full tokenomics ${icon("arrow", "h-4 w-4")}</a>
    </div>
    <div class="reveal grad-ring rounded-2xl p-1">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        ${TOKEN_FACTS.map(tokenStat).join("")}
      </div>
    </div>
  </div>
</section>`;

// 9) WHY IT MATTERS — the WHY_AI cards, reframed as "why this matters to you".
const whyAi = `
<section class="section container-x">
  ${heading(
    "Why it matters to you",
    "The most valuable resource of the decade shouldn't belong to four companies",
    "Concentrated AI is expensive, gated, and centrally controlled. NEURAX puts compute on the hardware people already own — and lets value flow to thousands of providers instead of a handful.",
  )}
  <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
    ${WHY_AI.map(
      (w, i) => `
      <div class="reveal card p-6">
        <div class="text-3xl font-extrabold brand-text">${String(i + 1).padStart(2, "0")}</div>
        <h3 class="mt-3 t-h3">${w.title}</h3>
        <p class="mt-2 t-body text-[var(--color-muted)]">${w.desc}</p>
      </div>`,
    ).join("")}
  </div>
</section>`;

// 10a) GET INVOLVED — ecosystem teaser with a bridging sentence.
const ecosystemTeaser = `
<section class="section container-x">
  ${heading(
    "Get involved",
    "Apps, services and tooling — one stack",
    "Ready to use it? Here's the stack — everything you need to use, secure and build on PYRAX, in one place.",
  )}
  <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    ${ECOSYSTEM.slice(0, 6)
      .map(
        (e) => `
      <a href="${e.href}" class="reveal card card-hover flex flex-col p-6">
        <div class="flex items-center justify-between">
          <span class="${orbClass(e.kind === "Service" ? "bolt" : e.kind === "Tooling" ? "violet" : "brand")}">${icon(e.icon, "h-5 w-5")}</span>
          <span class="chip !px-2 !py-0.5 !text-[0.6rem]">${e.kind}</span>
        </div>
        <h3 class="mt-4 t-h3">${e.name}</h3>
        <p class="mt-2 flex-1 t-body text-[var(--color-muted)]">${e.desc}</p>
      </a>`,
      )
      .join("")}
  </div>
  <div class="mt-8 text-center reveal"><a href="/ecosystem.html" class="btn btn-ghost">See the full ecosystem ${icon("arrow", "h-4 w-4")}</a></div>
</section>`;

// 10b) THE CLOSING CTA — the page's single big closing gradient moment.
const cta = `
<section id="waitlist" class="section container-x">
  <div class="card relative overflow-hidden p-8 text-center sm:p-14">
    <div class="absolute inset-0 grid-bg opacity-60" aria-hidden="true"></div>
    <div class="absolute -inset-x-10 -top-24 h-48 blur-3xl" aria-hidden="true" style="background: radial-gradient(closest-side, color-mix(in oklab, var(--color-brand) 35%, transparent), transparent);"></div>
    <div class="relative reveal">
      <span class="chip">Be early</span>
      <h2 class="mx-auto mt-4 max-w-2xl t-h2">Join the waitlist for launch, the node app & NEURAX access</h2>
      <p class="mx-auto mt-4 max-w-xl text-[var(--color-muted)]">No spam, no price promises — just real updates as we approach mainnet and open NEURAX.</p>
      <div class="mt-7">${waitlistForm()}</div>
    </div>
  </div>
</section>`;

const main = document.getElementById("main");
if (main)
  main.innerHTML =
    hero +
    live +
    problem +
    pillars +
    network +
    statusBanner +
    neurax +
    token +
    whyAi +
    ecosystemTeaser +
    cta;

mountChrome("");
wireWaitlist();
const liveEl = document.getElementById("livestats");
if (liveEl) mountLiveStats(liveEl);
wireMotion();
const carouselEl = document.querySelector<HTMLElement>("[data-carousel]");
if (carouselEl) mountCarousel(carouselEl, { interval: 7000 });
wireCountdown(FORGE_LAUNCH_ISO);
