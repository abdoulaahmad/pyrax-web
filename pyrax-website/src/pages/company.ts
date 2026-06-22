// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import "../styles.css";

import { mountChrome } from "../lib/chrome.js";
import { SITE, LINKS } from "../lib/content.js";
import { icon, heading } from "../lib/ui.js";

const hero = `
<section class="relative overflow-hidden pt-32 pb-12 sm:pt-40">
  <div class="hero-aurora" aria-hidden="true"></div>
  <div class="absolute inset-0 grid-bg opacity-50"></div>
  <div class="container-x relative max-w-3xl reveal">
    <span class="chip">Company</span>
    <h1 class="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Built in the open, stress-tested <span class="brand-text text-anim">hard</span>.</h1>
    <p class="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--color-muted)]">PYRAX is trying to build the whole city — not just the roads. A fast private base layer, full Ethereum compatibility, and a working decentralized AI marketplace, tied together so each reinforces the others. The private Layer-1 settles and shields the work, the same Ethereum tooling you already use deploys on top of it, and NEURAX turns idle GPUs into a compute network the chain pays for — three legs that only stand because of one another.</p>
  </div>
</section>`;

const about = `
<section class="section container-x">
  <p class="reveal lead-note mb-10 max-w-2xl text-sm sm:text-base">
    How we operate, in four rules we hold ourselves to. They are the reason the rest of this site reads the way it does — claims backed by code, not slogans.
  </p>
  <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
    ${[
      ["No hype", "Every claim here is based on ratified design and code we've built and tested. Where something is a WIP or a DAO decision, we say so."],
      ["Adversarially reviewed", "Each piece gets multiple independent red-team passes that try to break the design — then we fix what's real."],
      ["Audit-gated", "The privacy/ZK layer must clear an external security audit before mainnet. We won't turn it on for real money until it's vetted."],
      ["Community-owned", "Fair-launch distribution, a high public float, and a DAO that governs the treasury and tunable parameters."],
    ]
      .map((x) => `<article class="reveal card p-6"><h3 class="text-base font-semibold">${x[0]}</h3><p class="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">${x[1]}</p></article>`)
      .join("")}
  </div>
</section>`;

const ama = `
<section id="ama" class="section container-x">
  ${heading("AMA & FAQ", "Your tough questions, answered straight", "We answer the hard ones — including why we don't make price or market-cap predictions.")}
  <p class="reveal lead-note mx-auto mt-8 max-w-2xl text-sm sm:text-base">
    A few of the questions we get most often are below, answered as plainly as we can. The full community AMA — with every question and the long-form answers — lives in the docs.
  </p>
  <div class="mt-10 grid gap-4 lg:grid-cols-2">
    ${[
      ["Is the tokenomics finalized?", "Yes — finalized and coded. The block-reward schedule, the 12.5B mining cap, the 50B total supply, and the fee split are consensus-frozen."],
      ["Why $0.0025 genesis?", "A clean $50M raise sells exactly 20B PYRX, it's an affordable fair-launch entry, and genesis participants get a high public float."],
      ["Can my GPU rig do AI jobs?", "Often yes — single-card jobs that fit your VRAM run great. Sharded/large jobs want fast PCIe + a good CPU. More VRAM = more jobs."],
      ["Will every project be vetted?", "The base layer stays open and permissionless (like Ethereum). Official support and funding are curated and vetted. Always DYOR."],
      ["Top-20 in two years?", "We don't make price or market-cap predictions. Rank is an outcome of shipping something genuinely useful — that's our focus."],
      ["Are miners charged for AI jobs?", "Never. AI work is an earning opportunity. Requesters pay into escrow; providers run verified work and get paid out of it."],
    ]
      .map((x) => `<article class="reveal card p-6"><h3 class="text-base font-semibold text-[var(--color-ink)]">${x[0]}</h3><p class="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">${x[1]}</p></article>`)
      .join("")}
  </div>
</section>`;

const swatch = (name: string, v: string, use: string) =>
  `<div class="reveal"><div class="h-16 rounded-xl border border-[var(--color-line)]" style="background:${v}"></div><div class="mt-2 text-xs font-semibold">${name}</div><div class="text-[0.7rem] text-[var(--color-faint)]">${v}</div><div class="mt-1 text-[0.68rem] leading-snug text-[var(--color-muted)]">${use}</div></div>`;

// One-line guidance per logo variant: when to reach for each mark.
const LOGOS: [string, string, string][] = [
  ["Horizontal", "/logo-horizontal.svg", "Default lockup for headers, docs and wide spaces."],
  ["Coin", "/logo-coin.svg", "The phoenix mark alone — app icons, avatars, favicons and tight squares."],
  ["Vertical", "/logo-vertical.svg", "Stacked lockup for centered layouts, splash screens and posters."],
];

const brand = `
<section id="brand" class="section container-x">
  ${heading("Brand", "Logos & palette", "Please use the official marks as provided, unmodified. The phoenix is PYRAX.")}
  <div class="mt-10 grid gap-5 sm:grid-cols-3">
    ${LOGOS.map(
      ([t, src, use]) => `
      <div class="reveal card grid place-items-center gap-3 p-8 text-center">
        <img src="${src}" alt="PYRAX ${t}" class="h-20 w-auto" />
        <p class="text-xs leading-snug text-[var(--color-muted)]">${use}</p>
        <a href="${src}" download class="text-xs font-semibold text-[var(--color-brand-soft)]">Download ${t} ↓</a>
      </div>`,
    ).join("")}
  </div>
  <div class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
    ${swatch("Orange", "#f58622", "Brand core — primary CTAs and the dominant fire accent.")}${swatch("Amber", "#f5a623", "Soft mid-tone — links, icon orbs and hover detail.")}${swatch("Gold", "#fcd03d", "Top of the fire ramp — gradient highlights, never as solid fill.")}${swatch("Bolt", "#3981c0", "Secondary / developer accent — the blue wing ramp.")}${swatch("Violet", "#7c5cff", "Reserved for NEURAX only — never elsewhere.")}${swatch("Background", "#050609", "The near-black field everything sits on (foreground ink is #f7f9fd).")}
  </div>
  <div class="mt-6 grid gap-4 sm:grid-cols-2">
    <div class="reveal card p-6">
      <h3 class="text-base font-semibold">Where each color goes</h3>
      <p class="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">Orange is the brand core — primary buttons and the dominant fire accent. Bolt blue is the secondary, developer-facing accent. Violet is reserved for NEURAX and appears nowhere else. Gold and amber are ramp tones for gradients and detail, not standalone fills.</p>
    </div>
    <div class="reveal card p-6">
      <h3 class="text-base font-semibold">Clear space & don'ts</h3>
      <p class="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">Keep clear space around the mark of at least the height of the phoenix's head, and place it on the near-black background or a plain dark surface. Don't recolor, rotate, stretch, add effects, or swap the fire and blue ramps. Use the files as provided.</p>
    </div>
  </div>
</section>`;

const contact = `
<section class="section container-x">
  <div class="card relative overflow-hidden p-8 text-center sm:p-14">
    <div class="absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 blur-3xl" style="background: radial-gradient(closest-side, color-mix(in oklab, var(--color-brand) 35%, transparent), transparent);"></div>
    <div class="relative reveal">
      <h2 class="text-3xl font-bold tracking-tight">Get in touch</h2>
      <p class="mx-auto mt-3 max-w-lg text-[var(--color-muted)]">Questions, partnerships, or press — we read everything.</p>
      <a href="mailto:${SITE.email}" class="btn btn-primary mt-6">${SITE.email}</a>
      <div class="mt-6 flex justify-center gap-2">
        ${[["x", LINKS.x], ["discord", LINKS.discord], ["telegram", LINKS.telegram], ["github", LINKS.github]]
          .map(([n, h]) => `<a href="${h}" aria-label="${n}" class="grid h-10 w-10 place-items-center rounded-lg border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-brand)] transition">${icon(n as string, "h-4 w-4")}</a>`)
          .join("")}
      </div>
    </div>
  </div>
</section>`;

const main = document.getElementById("main");
if (main) main.innerHTML = hero + about + ama + brand + contact;
mountChrome("Resources");
