// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import "../styles.css";

import { mountChrome, DOMAINS, NETWORKS, subscribe, icon, heading } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";
import { mountLiveStats } from "../lib/stats.js";
import { mountPeers } from "../lib/peers.js";
import { LINKS, NODES_SEARCH } from "../lib/content.js";

const STATUS_LABEL: Record<string, string> = {
  internal: "Internal",
  public: "Public devnet",
  built: "Built · pre-launch",
  "pre-launch": "Pre-launch",
};

/** One network card (live dot + block height + gated chain ID), updated by the store subscription. */
function netCard(n: (typeof NETWORKS)[number]): string {
  return `
    <article class="reveal card card-hover p-5" data-netcard="${n.chainId}">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="status-dot is-offline" data-card-dot aria-hidden="true"></span>
          <span class="truncate font-semibold">${n.name}</span>
        </div>
        <span class="chip shrink-0">${STATUS_LABEL[n.status] ?? n.status}</span>
      </div>
      <div class="mt-4 flex items-end justify-between">
        <div>
          <div class="text-2xl font-extrabold tabular-nums" data-card-height>—</div>
          <div class="text-xs uppercase tracking-wider text-[var(--color-faint)]" data-card-state>offline</div>
        </div>
        <div class="text-right font-mono text-xs text-[var(--color-muted)]" data-card-id></div>
      </div>
    </article>`;
}

function view(): string {
  return `
  <section class="container-x pt-28 pb-10 sm:pt-32">
    <div class="mx-auto max-w-3xl text-center">
      <span class="chip">Network status · live</span>
      <h1 class="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">The PYRAX network, live.</h1>
      <p class="mt-5 text-lg leading-relaxed text-[var(--color-muted)]">
        Real block height, connected peers, and throughput — polled straight from a running node's JSON-RPC.
        Switch networks in the selector; the numbers below follow your choice.
      </p>
    </div>
    <div class="mx-auto mt-10 max-w-3xl reveal" id="livecard"></div>
  </section>

  <section class="container-x py-12">
    ${heading("All networks", "Every network at a glance", "A green dot means that network is online and actually advancing blocks right now. Chain IDs appear once a public network goes live.")}
    <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" id="netgrid">
      ${NETWORKS.map(netCard).join("")}
    </div>
  </section>

  <section class="container-x py-12">
    ${heading("Decentralized by design", "Live peers", "No central server runs the network — this is just a convenient window into the nodes announcing themselves.")}
    <div class="mt-10 reveal" id="peers"></div>
  </section>

  <section class="container-x py-12">
    <div class="card grad-ring relative overflow-hidden p-8 sm:p-12">
      <div class="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <span class="chip">${icon("server", "h-3.5 w-3.5")} Join the network</span>
          <h2 class="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Run a PYRAX node</h2>
          <p class="mt-4 max-w-xl text-[var(--color-muted)] leading-relaxed">
            A node validates the chain, relays privately, and can mine across three streams to earn PYRX.
            It finds peers on its own — no port-forwarding required.
          </p>
          <div class="mt-6 flex flex-wrap gap-3">
            <a href="/run.html" class="btn btn-primary">${icon("download", "h-4 w-4")} How to run a node</a>
            <a href="${LINKS.docs}" target="_blank" rel="noopener" class="btn btn-ghost">Read the docs ↗</a>
          </div>
        </div>
        <div class="grid gap-2 text-sm">
          ${[
            ["check", "Decentralized peer discovery (mDNS + DHT + seed lists)"],
            ["shield", "Shielded-by-default privacy"],
            ["pulse", "TriStream mining — ASIC · GPU/CPU · staking"],
          ]
            .map(
              ([ic, t]) => `<div class="flex items-center gap-2.5 rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-elevated)] px-3.5 py-2.5">
                ${icon(ic as string, "h-4 w-4 text-[var(--color-brand-soft)]")}<span>${t}</span></div>`,
            )
            .join("")}
        </div>
      </div>
    </div>
  </section>`;
}

function wireNetGrid(): void {
  subscribe((s: NetSnapshot) => {
    document.querySelectorAll<HTMLElement>("[data-netcard]").forEach((card) => {
      const cid = Number(card.dataset.netcard);
      const net = s.networks.find((n) => n.chainId === cid);
      const st = s.all[cid];
      const online = !!st && st.online && st.producing;
      card.querySelector<HTMLElement>("[data-card-dot]")?.classList.toggle("is-offline", !online);
      const h = card.querySelector<HTMLElement>("[data-card-height]");
      if (h) h.textContent = online && Number.isFinite(st?.blockHeight) ? `#${(st!.blockHeight as number).toLocaleString("en-US")}` : "—";
      const state = card.querySelector<HTMLElement>("[data-card-state]");
      if (state) state.textContent = online ? "live · producing" : st?.online ? "syncing" : "offline";
      const idEl = card.querySelector<HTMLElement>("[data-card-id]");
      if (idEl) idEl.textContent = net && net.status !== "internal" && online ? `chain ${cid}` : "";
    });
  });
}

mountChrome({ navOrigin: DOMAINS.site, searchEntries: NODES_SEARCH });
const main = document.getElementById("main");
if (main) main.innerHTML = view();
const livecard = document.getElementById("livecard");
if (livecard) mountLiveStats(livecard);
const peers = document.getElementById("peers");
if (peers) mountPeers(peers);
wireNetGrid();
