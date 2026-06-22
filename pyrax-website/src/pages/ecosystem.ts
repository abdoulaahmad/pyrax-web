// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import "../styles.css";

import { mountChrome } from "../lib/chrome.js";
import { ECOSYSTEM } from "../lib/content.js";
import { icon, heading, orbClass } from "../lib/ui.js";

const hero = `
<section class="relative overflow-hidden pt-32 pb-10 sm:pt-40">
  <div class="hero-aurora" aria-hidden="true"></div>
  <div class="absolute inset-0 grid-bg opacity-50"></div>
  <div class="container-x relative max-w-3xl reveal">
    <span class="chip">Ecosystem</span>
    <h1 class="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Everything that makes <span class="brand-text text-anim">PYRAX</span> run.</h1>
    <p class="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--color-muted)]">PYRAX isn't a single app — it's a stack. The apps you download to run and use the network, the hosted services that keep it discoverable and observable, and the tooling that helps you build and represent it. This is the whole thing in one place, so you always know what to reach for and where it lives.</p>
  </div>
</section>`;

// Card-href overrides for THIS page only (content.ts is shared and unchanged).
// The PYRAX Wallet entry in ECOSYSTEM points at the docs root; on this "what do I
// reach for" page the sensible destination is the docs "Connect a wallet" guide.
const hrefFor = (e: { name: string; href: string }) =>
  e.name === "PYRAX Wallet" ? "/docs.html#/getting-started" : e.href;

const groupOf = (kind: string) => ECOSYSTEM.filter((e) => e.kind === kind);
const grid = (kind: string) => `
  <div class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    ${groupOf(kind)
      .map(
        (e) => `
      <a href="${hrefFor(e)}" class="reveal card card-hover group flex flex-col p-6">
        <div class="flex items-center justify-between">
          <span class="${orbClass(kind === "Service" ? "bolt" : kind === "Tooling" ? "violet" : "brand")}">${icon(e.icon, "h-5 w-5")}</span>
          <span class="chip !px-2 !py-0.5 !text-[0.6rem]">${e.kind}</span>
        </div>
        <h3 class="mt-4 text-lg font-semibold">${e.name}</h3>
        <p class="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">${e.desc}</p>
        <span class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-soft)]">Open ${icon("arrow", "h-4 w-4")}</span>
      </a>`,
      )
      .join("")}
  </div>`;

const sections = `
<section class="section container-x pt-4 space-y-14">
  <div>${heading("Downloads", "Run PYRAX yourself", "Free, signed, self-updating apps. Inferno Node is the public node app — one click to run a full node, mine all three streams, stake, and contribute AI compute — and the PYRAX Wallet travels with you across extension, desktop and mobile on a shared core.")}${grid("Download")}</div>
  <div>${heading("Services", "The network's living infrastructure", "Hosted helpers that keep PYRAX discoverable and observable — so a fresh node finds peers, you can watch the chain, and the network never depends on any single point of trust.")}${grid("Service")}</div>
  <div>${heading("Tooling", "Build & represent the brand", "The reference and assets you reach for when you build on PYRAX or talk about it — so what you ship looks and reads like the real thing.")}${grid("Tooling")}</div>
</section>`;

// GUIDANCE — pay off the hero's promise ("so you always know what to reach for").
// A compact "which one do I reach for?" comparison across the three real download
// products (Inferno Node · PYRAX Wallet · PYRAX CLI). Every line is grounded in
// content.ts ECOSYSTEM + the node page's canonical framing — nothing invented.
const CHOOSE: { name: string; when: string; what: string; href: string; icon: string; tone: string }[] = [
  {
    name: "Inferno Node",
    when: "You want to run the network the easy way.",
    what: "The one-click desktop app — run a full node, mine the three streams, stake, and contribute AI compute, with signed installers and self-updating.",
    href: "/node.html",
    icon: "server",
    tone: "brand",
  },
  {
    name: "PYRAX Wallet",
    when: "You just want to hold and move PYRX.",
    what: "One wallet across browser extension, desktop and mobile on a shared core — your recovery phrase is the portable identity. No node required.",
    href: "/docs.html#/getting-started",
    icon: "coin",
    tone: "bolt",
  },
  {
    name: "PYRAX CLI",
    when: "You're a power user or run servers.",
    what: "Create and run nodes from the terminal — multi-node, auto-isolated ports. The same node, scripted: create, list, status, start, remove, logs.",
    href: "/build.html#getting-started",
    icon: "terminal",
    tone: "violet",
  },
];
const choose = `
<section class="section container-x">
  ${heading(
    "What to reach for",
    "Inferno Node, the Wallet, or the CLI?",
    "Three apps cover three jobs. Want to run the network? Reach for Inferno Node. Just holding PYRX? The Wallet is all you need. Scripting nodes on a server? Use the CLI — they all talk to the same network.",
  )}
  <div class="mt-10 grid gap-5 lg:grid-cols-3">
    ${CHOOSE.map(
      (c) => `
      <a href="${c.href}" class="reveal card card-hover group flex flex-col p-6">
        <div class="flex items-center gap-3">
          <span class="${orbClass(c.tone)}">${icon(c.icon, "h-5 w-5")}</span>
          <h3 class="text-lg font-semibold">${c.name}</h3>
        </div>
        <p class="mt-4 text-sm font-semibold text-[var(--color-brand-soft)]">${c.when}</p>
        <p class="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">${c.what}</p>
        <span class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-soft)]">Open ${icon("arrow", "h-4 w-4")}</span>
      </a>`,
    ).join("")}
  </div>
  <p class="reveal mx-auto mt-6 max-w-2xl text-center text-xs text-[var(--color-faint)]">Not sure? Most people start with Inferno Node for running the network and the Wallet for everyday balances — the CLI is there when you want to script it.</p>
</section>`;

const domains = `
<section class="section container-x">
  <p class="reveal lead-note mb-6 max-w-2xl text-sm sm:text-base">
    Everything is split across three clear homes — the brand, the network's services, and the docs — so it's always obvious where something lives and what it's for.
  </p>
  <div class="card p-8 reveal">
    <h3 class="text-lg font-bold">Where everything lives</h3>
    <p class="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">One domain, clear roles — no sprawl, no guessing.</p>
    <div class="mt-5 grid gap-4 sm:grid-cols-3">
      ${[
        ["pyraxchain.com", "This site + the brand"],
        ["pyraxchain.com", "Hosted services — peers, sync, node portals, directory"],
        ["pyraxchain.com/docs", "The full developer documentation"],
      ]
        .map((d) => `<div class="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5"><div class="font-mono text-sm font-semibold text-[var(--color-bolt-bright)]">${d[0]}</div><p class="mt-1 text-xs text-[var(--color-muted)]">${d[1]}</p></div>`)
        .join("")}
    </div>
  </div>
</section>`;

const main = document.getElementById("main");
if (main) main.innerHTML = hero + sections + choose + domains;
mountChrome("Resources");
