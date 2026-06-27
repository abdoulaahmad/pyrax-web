// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import "../styles.css";

import { mountChrome, DOMAINS, icon, heading, featureCard } from "@pyrax/shared";
import { NODE_REQS, LINKS, NODES_SEARCH } from "../lib/content.js";

const WHY = [
  { icon: "shield", title: "Strengthen the network", desc: "Every node independently validates the chain and relays traffic privately. More nodes = a more decentralized, censorship-resistant PYRAX." },
  { icon: "bolt", title: "Earn PYRX", desc: "Mine across the three streams (ASIC, GPU/CPU, staking) and contribute idle GPU to NEURAX AI jobs — all from one node." },
  { icon: "globe", title: "No port-forwarding", desc: "Nodes discover peers automatically (mDNS + Kademlia DHT + signed seed lists) and reach each other through the directory + mixnet — even behind NAT." },
];

const STEPS = [
  { n: 1, title: "Get the node app", body: "Download the desktop node app for your OS, or grab the <code>pyrax-node</code> CLI binary. The app supervises the node, miner, and compute sidecars for you." },
  { n: 2, title: "Pick a network", body: "Choose the network to join (Internal Devnet to experiment, or a public network once live). The node fetches peers and starts syncing automatically." },
  { n: 3, title: "Start the node", body: "Hit Start (or run the binary). It discovers peers, downloads the DAG, and begins validating. Watch it appear on the dashboard globe." },
  { n: 4, title: "Mine / stake / earn (optional)", body: "Turn on TriStream mining or stake to run a validator. Toggle NEURAX compute to rent your GPU to AI jobs and earn PYRX." },
];

function view(): string {
  return `
  <section class="container-x pt-28 pb-10 sm:pt-32">
    <div class="mx-auto max-w-3xl text-center">
      <span class="chip">${icon("server", "h-3.5 w-3.5")} Run a node</span>
      <h1 class="mt-5 t-h1">Run a PYRAX node.</h1>
      <p class="mt-5 t-lead text-[var(--color-muted)]">
        Join a 100% decentralized network in minutes. Validate the chain, relay privately, mine three ways, and rent your GPU to NEURAX — from one app.
      </p>
      <div class="mt-7 flex flex-wrap justify-center gap-3">
        <a href="${LINKS.main}/node.html" target="_blank" rel="noopener" class="btn btn-primary">${icon("download", "h-4 w-4")} Get the node app ↗</a>
        <a href="/changelog.html" class="btn btn-ghost">${icon("book", "h-4 w-4")} Changelog</a>
        <a href="${LINKS.docs}" target="_blank" rel="noopener" class="btn btn-ghost">Node docs ↗</a>
      </div>
    </div>
  </section>

  <section class="container-x py-12">
    ${heading("Why run one", "Three good reasons", "")}
    <div class="mt-10 grid gap-4 sm:grid-cols-3">
      ${WHY.map(featureCard).join("")}
    </div>
  </section>

  <section class="container-x py-12">
    ${heading("Setup", "Four steps to live", "")}
    <ol class="mx-auto mt-10 max-w-3xl space-y-4">
      ${STEPS.map(
        (s) => `
        <li class="reveal card p-5 sm:p-6">
          <div class="flex gap-4">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--color-brand)_18%,transparent)] font-bold text-[var(--color-brand-soft)]">${s.n}</span>
            <div>
              <h3 class="t-h3">${s.title}</h3>
              <p class="mt-1 t-body text-[var(--color-muted)]">${s.body}</p>
            </div>
          </div>
        </li>`,
      ).join("")}
    </ol>
  </section>

  <section class="container-x py-12">
    ${heading("Hardware", "What you need", "A baseline node runs comfortably on modest hardware. Mining + AI compute reward stronger machines.")}
    <div class="mt-10 grid gap-4 lg:grid-cols-3">
      ${NODE_REQS.map(
        (r) => `
        <article class="reveal card p-6">
          <h3 class="t-h3">${r.tier}</h3>
          <dl class="mt-4 space-y-2 text-sm">
            <div class="flex justify-between gap-3"><dt class="text-[var(--color-faint)]">CPU / GPU</dt><dd class="text-right font-medium">${r.cpu}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-[var(--color-faint)]">RAM</dt><dd class="font-medium">${r.ram}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-[var(--color-faint)]">Disk</dt><dd class="font-medium">${r.disk}</dd></div>
          </dl>
          <p class="mt-4 t-small leading-relaxed text-[var(--color-faint)]">${r.note}</p>
        </article>`,
      ).join("")}
    </div>
  </section>

  <section class="container-x py-12">
    <div class="card grad-ring p-8 text-center sm:p-12">
      <h2 class="t-h2">Want to expose a public RPC?</h2>
      <p class="mx-auto mt-3 max-w-xl text-[var(--color-muted)] leading-relaxed">
        Run a node on a small cloud droplet with <code>--rpc-bind 0.0.0.0 --rpc-cors</code> and it becomes a public, CORS-enabled gateway —
        the same kind of node that powers this status page. Anyone can run one; the chain doesn't depend on any single RPC.
      </p>
      <div class="mt-6 flex flex-wrap justify-center gap-3">
        <a href="/" class="btn btn-primary">See the live network</a>
        <a href="${LINKS.docs}" target="_blank" rel="noopener" class="btn btn-ghost">RPC docs ↗</a>
      </div>
    </div>
  </section>`;
}

mountChrome({ navOrigin: DOMAINS.site, searchEntries: NODES_SEARCH });
const main = document.getElementById("main");
if (main) main.innerHTML = view();
