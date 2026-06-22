// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import "../styles.css";

import { mountChrome } from "../lib/chrome.js";
import { USE_CASES } from "../lib/content.js";
import { icon, orbClass } from "../lib/ui.js";

/* ----------------------------------------------------------------------------
 * USE CASES — was the thinnest page on the site (hero + one flat card grid).
 * The substance pass: a 2–3 sentence narrative hero lead that connects the three
 * superpowers to outcomes, a lead-note bridge, and every card enriched from a
 * one-liner into a backed two-sentence claim with a concrete grounded "for
 * example" clause. Cards are grouped under two mini-headings for narrative flow.
 * Motion: ONE hero-aurora + ONE text-anim word only (no count-up, no parallax).
 * -------------------------------------------------------------------------- */

// Page-local enrichment, keyed to the shared USE_CASES titles. We keep the
// canonical title / audience / icon from content.ts and only add (a) a second
// explanatory sentence and (b) one concrete, locked-fact "for example" clause —
// without editing the shared content module.
const ENRICH: Record<string, { extra: string; eg: string; group: "use" | "build" }> = {
  "Private payments": {
    extra:
      "Every balance and transfer is shielded by default, so privacy isn't a feature you remember to switch on — it's the resting state of the chain.",
    eg: "For example, you can pay a contractor with sender, receiver and amount hidden, then hand an auditor a view key to make that one payment fully transparent — privacy and disclosure on your terms.",
    group: "use",
  },
  "Run decentralized AI locally": {
    extra:
      "NEURAX is a real local-first multimodal AI — chat, code, images, audio, video and immersive spatial sound — that runs on hardware you already own instead of someone else's cloud.",
    eg: "For example, on an RTX 3060 baseline your prompts stay on your machine; only when a job outgrows your card does it reach the verified marketplace, where idle GPUs run the work.",
    group: "use",
  },
  "Anonymous file & media": {
    extra:
      "Files and live media move as fixed-size, padded onions across the mixnet, so traffic looks uniform on the wire and no single relay learns both ends of a transfer.",
    eg: "For example, a 448-byte chunk becomes a 508-byte Sphinx onion over Ristretto, and each relay only ever learns the next hop — never who you are or what you sent.",
    group: "use",
  },
  "Build dApps": {
    extra:
      "Deploy with the Ethereum tooling you already use — and reach beyond it with two more virtual machines when you need them. EVM, WASM and Cairo all share one 32-byte state overlay.",
    eg: "For example, an EVM contract can call a Cairo contract in the same transaction, because the VM is auto-detected from the code's magic bytes and cross-VM calls are first-class.",
    group: "build",
  },
  "Earn from idle hardware": {
    extra:
      "Block rewards split across three independent mining streams, so a wide range of hardware can participate — and the same GPU that mines can also sell AI compute. PYRX you stake helps secure the chain.",
    eg: "For example, run TriStream mining, stake PYRX to validate, or sell spare GPU time to the NEURAX marketplace at 8 PYRX per compute unit — three ways to earn from one machine.",
    group: "build",
  },
};

const hero = `
<section class="relative overflow-hidden pt-32 pb-10 sm:pt-40">
  <div class="hero-aurora" aria-hidden="true"></div>
  <div class="absolute inset-0 grid-bg opacity-50"></div>
  <div class="container-x relative max-w-3xl reveal">
    <span class="chip">Use cases</span>
    <h1 class="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">What you can <span class="brand-text text-anim">do</span> with PYRAX.</h1>
    <p class="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-muted)]">
      PYRAX is three superpowers in one network: a shielded-by-default base layer, a real decentralized AI compute marketplace, and full Ethereum compatibility. Together they turn private money, AI on your own GPU, and programmable apps into one stack instead of three disconnected products. Here's what each unlocks — and a concrete example of each in practice.
    </p>
  </div>
</section>`;

// A single article card from a USE_CASES entry + its local enrichment.
const useCard = (u: { title: string; desc: string; audience: string; icon: string }, tone: string) => {
  const e = ENRICH[u.title];
  return `
    <article class="reveal card card-hover flex flex-col p-7">
      <div class="flex items-start justify-between gap-4">
        <div class="${orbClass(tone)} !h-12 !w-12">${icon(u.icon, "h-6 w-6")}</div>
        <span class="chip !px-2.5 !py-0.5">${u.audience}</span>
      </div>
      <h3 class="mt-5 text-xl font-bold">${u.title}</h3>
      <p class="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">${u.desc} ${e ? e.extra : ""}</p>
      ${
        e
          ? `<p class="mt-3 border-l-2 border-[color-mix(in_oklab,var(--color-brand)_45%,var(--color-line))] pl-3 text-sm leading-relaxed text-[var(--color-muted)]">${e.eg}</p>`
          : ""
      }
    </article>`;
};

const useIt = USE_CASES.filter((u) => ENRICH[u.title]?.group === "use");
const buildEarn = USE_CASES.filter((u) => ENRICH[u.title]?.group === "build");

const grid = `
<section class="section container-x pt-4">
  <p class="reveal lead-note mb-10 max-w-2xl text-base">
    PYRAX is three capabilities — private value, AI compute, and programmable apps — woven into one network. Here's what each one unlocks, grounded in how the system actually works.
  </p>

  <div class="reveal flex items-center gap-3">
    <span class="${orbClass("brand")} !h-9 !w-9">${icon("shield", "h-4 w-4")}</span>
    <h2 class="text-2xl font-bold tracking-tight sm:text-3xl">Use it</h2>
  </div>
  <p class="reveal mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-muted)]">
    For people who want private money, local AI, and anonymous sharing — no contracts to write.
  </p>
  <div class="mt-6 grid gap-5 sm:grid-cols-2">
    ${useIt.map((u, i) => useCard(u, i === 1 ? "violet" : "brand")).join("")}
  </div>

  <div class="reveal mt-16 flex items-center gap-3">
    <span class="${orbClass("bolt")} !h-9 !w-9">${icon("code", "h-4 w-4")}</span>
    <h2 class="text-2xl font-bold tracking-tight sm:text-3xl">Build &amp; earn</h2>
  </div>
  <p class="reveal mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-muted)]">
    For developers and hardware owners who want to ship apps and turn idle silicon into income.
  </p>
  <div class="mt-6 grid gap-5 sm:grid-cols-2">
    ${buildEarn.map((u, i) => useCard(u, i === 0 ? "bolt" : "violet")).join("")}
  </div>

  <div class="mt-14 flex flex-wrap justify-center gap-3 reveal">
    <a href="/build.html" class="btn btn-primary">Start building ${icon("arrow", "h-4 w-4")}</a>
    <a href="/neurax.html" class="btn btn-ghost">Explore NEURAX</a>
    <a href="/node.html" class="btn btn-ghost">Run a node</a>
  </div>
</section>`;

const main = document.getElementById("main");
if (main) main.innerHTML = hero + grid;
mountChrome("Resources");
