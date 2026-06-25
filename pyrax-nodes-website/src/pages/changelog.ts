// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// The PYRAX node + desktop-app changelog, served at nodes.pyraxchain.com/changelog.html.
// APP / NODE changes ONLY — website/infrastructure changes are intentionally excluded.
// Each release appends a new entry at the top (newest first); keep it human-readable +
// user-facing (what changed for an operator), not raw commit messages.

import "../styles.css";

import { mountChrome, DOMAINS, icon } from "@pyrax/shared";
import { NODES_SEARCH, LINKS } from "../lib/content.js";

interface Release {
  version: string;
  date: string;
  title: string;
  sections: { label: string; items: string[] }[];
}

const RELEASES: Release[] = [
  {
    version: "0.2.3",
    date: "2026-06-25",
    title: "Real peer-to-peer mesh — nodes connect to each other, not just the seed",
    sections: [
      {
        label: "Networking",
        items: [
          "Nodes now form a true mesh instead of all funnelling onto the seed. Each node actively discovers other peers over the DHT and connects to many of them, filling toward its 128-peer limit — so your dashboard peer count climbs past 1.",
          "Closest-first, NAT-aware connections — a node prefers nearby peers and reaches home nodes behind routers through PYRAX's relay with hole-punching, so two home nodes can connect directly to each other (not only to the public seed).",
          "Faster peering — discovery and dialing now run on a tight 5-7s cycle, so the mesh fills in seconds.",
        ],
      },
    ],
  },
  {
    version: "0.2.2",
    date: "2026-06-25",
    title: "Mine to your wallet, reliable portals & a branded offline page",
    sections: [
      {
        label: "Mining & rewards",
        items: [
          "New one-tap “Mine to my wallet” switch on every node — turn it on and the node mines with your wallet as the reward address, so you earn block rewards directly to your wallet on Internal Devnet 1.0.",
          "Your own transactions now confirm — a mining node seals the transactions you send from its wallet (a non-mining node accepts them but never seals them), so your activity actually lands on-chain and shows on the explorer.",
          "The switch sets the reward address and enables mining together, then restarts the node so it takes effect immediately — no separate steps. Mining stays off by default for network stability.",
        ],
      },
      {
        label: "Connectivity & portals",
        items: [
          "Reliable node-portal tunnel — completing the move to PYRAX's own relay, every node now registers dependably and its portal is reachable at https://<id>.nodes.pyraxchain.com (fixes new nodes that could previously hang while connecting).",
          "Branded “node offline” page — visiting a portal whose node is briefly offline now shows a clean PYRAX page that auto-refreshes when the node comes back, instead of a generic error.",
        ],
      },
    ],
  },
  {
    version: "0.2.1",
    date: "2026-06-25",
    title: "NAT traversal, smarter peering, honest versioning & node control",
    sections: [
      {
        label: "Networking",
        items: [
          "True inbound connectivity behind NAT — nodes now use AutoNAT + Circuit Relay v2 + DCUtR hole-punching, so a home node accepts incoming peers instead of being outbound-only.",
          "Closest-peer-first connections — your node prefers nearby, low-latency peers and branches out to fill its 128-peer limit, instead of every node funnelling onto the seed/RPC.",
          "Self-hosted node-portal tunnel — each node's web portal is reachable worldwide at https://<id>.nodes.pyraxchain.com through PYRAX's own relay (no third-party tunnel).",
        ],
      },
      {
        label: "Reliability & sync",
        items: [
          "Honest sync status — a node never reports “synced” at a partial height; it shows synced only once it has confirmed the real network tip.",
          "Automatic recovery — a node that diverges or lands on an incompatible chain self-heals (wipes + re-syncs) back onto the live network.",
          "Quieter logs — blocks from old/foreign chains are now ignored quietly instead of flooding the log with consensus-fault errors.",
        ],
      },
      {
        label: "Versioning & node control",
        items: [
          "Real version reporting — the node banner now shows the actual build version (it was always reporting v0.1.0).",
          "Protocol-version gate — a node on an out-of-date protocol is disconnected and cannot rejoin until the app/CLI is updated; the app shows a clear “update required” notice.",
          "Remote kill switch (operators/admins) — an out-of-date or misbehaving node can be taken offline and kept off (overriding auto-start) until it updates to the current release.",
        ],
      },
      {
        label: "App & dashboard",
        items: [
          "Newly created nodes auto-start and appear on the dashboard right away, with live peer counts.",
          "Blockchain storage now shows the real on-disk chain-data size and the actual data location for your install (never an assumed C:\\ path), updating in realtime.",
          "Marketing-quality network globe — sharper rendering, smoother connection arcs, bottom-centered controls, and crisp branded social-media screenshots.",
        ],
      },
      {
        label: "Network",
        items: [
          "Fresh chain — the network was re-genesised to a clean block 0. Update to v0.2.1 and follow the in-app prompt to wipe old data for a clean start (your keys/wallet are yours to keep or reset via the guide).",
        ],
      },
    ],
  },
];

function releaseCard(r: Release): string {
  return `
  <article class="reveal card p-6 sm:p-8">
    <div class="flex flex-wrap items-center gap-3">
      <span class="chip">v${r.version}</span>
      <span class="text-sm text-[var(--color-faint)]">${r.date}</span>
    </div>
    <h2 class="mt-3 text-xl font-bold sm:text-2xl">${r.title}</h2>
    <div class="mt-6 grid gap-6 sm:grid-cols-2">
      ${r.sections
        .map(
          (s) => `
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-wide text-[var(--color-brand-soft)]">${s.label}</h3>
          <ul class="mt-2 space-y-2 text-sm leading-relaxed text-[var(--color-muted)]">
            ${s.items
              .map(
                (it) =>
                  `<li class="flex gap-2"><span class="mt-1 text-[var(--color-brand)]">${icon("check", "h-4 w-4")}</span><span>${it}</span></li>`,
              )
              .join("")}
          </ul>
        </div>`,
        )
        .join("")}
    </div>
  </article>`;
}

function view(): string {
  return `
  <section class="container-x pt-28 pb-10 sm:pt-32">
    <div class="mx-auto max-w-3xl text-center">
      <span class="chip">${icon("book", "h-3.5 w-3.5")} Changelog</span>
      <h1 class="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Node &amp; app changelog.</h1>
      <p class="mt-5 text-lg leading-relaxed text-[var(--color-muted)]">
        What's new in the PYRAX desktop node app + the <code>pyrax-node</code> / CLI. Newest first.
      </p>
      <div class="mt-7 flex flex-wrap justify-center gap-3">
        <a href="${LINKS.main}/node.html" target="_blank" rel="noopener" class="btn btn-primary">${icon("download", "h-4 w-4")} Get the latest ↗</a>
        <a href="/run.html" class="btn btn-ghost">Run a node</a>
      </div>
    </div>
  </section>

  <section class="container-x py-10">
    <div class="mx-auto max-w-3xl space-y-6">
      ${RELEASES.map(releaseCard).join("")}
    </div>
  </section>`;
}

mountChrome({ navOrigin: DOMAINS.site, searchEntries: NODES_SEARCH });
const main = document.getElementById("main");
if (main) main.innerHTML = view();
