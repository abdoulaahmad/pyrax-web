// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import "../styles.css";

import { mountChrome } from "../lib/chrome.js";
import { wireMotion } from "../lib/motion.js";
import { LINKS, TOKEN_FACTS, TOKEN_ALLOCATION, TOKEN_UTILITY, FEE_SPLIT } from "../lib/content.js";
import { icon, heading, orbClass } from "../lib/ui.js";

const bar = (parts: { label: string; pct: number; tone: string }[]) => `
  <div class="flex h-5 w-full overflow-hidden rounded-full border border-[var(--color-line)]">
    ${parts.map((p) => `<div style="width:${p.pct}%; background:${p.tone}" title="${p.label} — ${p.pct}%"></div>`).join("")}
  </div>
  <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
    ${parts.map((p) => `<span class="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)]"><span class="h-2.5 w-2.5 rounded-sm" style="background:${p.tone}"></span>${p.label} <strong class="text-[var(--color-ink)]">${p.pct}%</strong></span>`).join("")}
  </div>`;

// "Where every fee goes" — the source legs reuse the consensus-frozen FEE_SPLIT shares
// (and their destination labels), so this visual can never drift from the bars above it.
const FEE_FLOWS: { from: string; sub: string; tone: string; to: { label: string; pct: number; tone: string }[] }[] = [
  { from: "Base fee", sub: "floats with demand", tone: "diagram-node-brand", to: FEE_SPLIT.base },
  { from: "Priority tip", sub: "optional, set by sender", tone: "diagram-node-bolt", to: FEE_SPLIT.tip },
];

const hero = `
<section class="relative overflow-hidden pt-32 pb-12 sm:pt-40">
  <div class="hero-aurora" aria-hidden="true"></div>
  <div class="absolute inset-0 grid-bg opacity-50"></div>
  <div class="container-x relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
    <div class="reveal">
      <span class="chip">PYRX · utility token</span>
      <h1 class="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">A fair-launch coin you <span class="brand-text text-anim">use</span> — bounded forever.</h1>
      <p class="mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-muted)]">PYRX (18 decimals) has a hard 50-billion cap, capped halving mining, a usage-driven burn, and a high public float. It's the fuel of the network — not a stake in someone else's profit.</p>
    </div>
    <div class="reveal relative mx-auto aspect-square w-56" data-parallax="0.08">
      <div class="absolute inset-4 rounded-full blur-2xl" aria-hidden="true" style="background: radial-gradient(closest-side, color-mix(in oklab, var(--color-gold) 45%, transparent), transparent 70%);"></div>
      <img src="/logo-coin.svg" alt="The PYRX phoenix coin" class="relative h-full w-full animate-float object-contain" />
    </div>
  </div>
</section>`;

// TOKEN_FACTS → designed stat-blocks. Each fact's headline number counts up where the value
// is a clean number; "~54%" stays static text because it is an approximate figure. The short
// title is the head; the verbatim content.ts label is kept as the "why it matters" sub-clause.
const FACT_HEAD: Record<string, string> = {
  "50,000,000,000": "Hard supply cap",
  "$0.0025": "Genesis price",
  "~54%": "Circulating at launch",
  "12.5B": "Lifetime mining cap",
  "25%": "Base fee burned",
  "$125M": "Genesis FDV",
};
const factNum = (value: string): string => {
  if (value === "50,000,000,000")
    return `<span data-count="50000000000" data-format="plain">0</span>`;
  if (value === "12.5B") return `<span data-count="12500000000" data-dp="1">0</span>`;
  if (value === "25%") return `<span data-count="25" data-suffix="%" data-format="plain">0</span>`;
  if (value === "$125M") return `<span data-count="125000000" data-prefix="$" data-dp="0">0</span>`;
  // "$0.0025" (sub-1 value the k/M/B formatter would round to $0) and "~54%" (approximate)
  // stay static so the exact locked figures always display precisely.
  return value;
};
const supply = `
<section id="supply" class="section container-x scroll-mt-28">
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    ${TOKEN_FACTS.map(
      (f) => `
      <div class="reveal stat-block">
        <span class="stat-num brand-text">${factNum(f.value)}</span>
        <div class="stat-label">${FACT_HEAD[f.value] ?? f.label}</div>
        <p class="stat-why">${f.label}</p>
      </div>`,
    ).join("")}
  </div>
  <div class="reveal mt-6 flex items-start gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
    ${icon("scale", "h-5 w-5 text-[var(--color-brand-soft)] shrink-0")}
    <p class="text-sm leading-relaxed text-[var(--color-muted)]">We cut the planned max supply <strong class="text-[var(--color-ink)]">in half — from 100B to a hard, permanent 50B cap</strong>. The fair-launch shape didn't change (half still goes to the public at genesis); we simply shrank the whole pie, so each PYRX is a bigger slice of a smaller, fixed total. <em>This is about supply structure, not a price prediction — fewer total tokens does not automatically mean a higher price.</em></p>
  </div>
</section>`;

const utility = `
<section id="utility" class="section container-x scroll-mt-28">
  ${heading("What PYRX is for", "A tool you consume — gas, compute, stake, govern", "PYRX carries no equity, no dividend and no promise of profit from the team's efforts. It exists to be used.")}
  <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
    ${TOKEN_UTILITY.map(
      (u) => `
      <article class="reveal card p-6">
        <div class="${orbClass("bolt")}">${icon(u.icon, "h-5 w-5")}</div>
        <h3 class="mt-4 text-base font-semibold">${u.title}</h3>
        <p class="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">${u.desc}</p>
      </article>`,
    ).join("")}
  </div>
</section>`;

const distribution = `
<section id="distribution" class="section container-x scroll-mt-28">
  ${heading("Distribution & vesting", "High public float, insiders locked", "Total 50,000,000,000 PYRX across six pools (genesis FDV ≈ $125M). About 54% — ≈ 27.1B — is liquid at launch; the rest is locked or earned over time.")}
  <p class="reveal lead-note mx-auto mt-8 max-w-2xl text-sm sm:text-base">This bar is the whole token in one picture. Half goes straight to the public at genesis, mining mints another quarter slowly over years, and the smallest sliver — team and advisors — is the most locked, on a 12-month cliff then a 36-month vest. The people building it wait the longest.</p>
  <div class="mt-10 reveal">${bar(TOKEN_ALLOCATION.map((a) => ({ label: a.label, pct: a.pct, tone: a.tone })))}</div>
  <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    ${TOKEN_ALLOCATION.map(
      (a) => `
      <div class="reveal card p-5">
        <div class="flex items-center gap-2">
          <span class="h-3 w-3 rounded-sm" style="background:${a.tone}"></span>
          <span class="text-sm font-semibold">${a.label}</span>
          <span class="ml-auto text-sm font-bold text-[var(--color-ink)]">${a.amount}</span>
        </div>
        <p class="mt-2 text-xs leading-snug text-[var(--color-muted)]">${a.note}</p>
      </div>`,
    ).join("")}
  </div>
  <div class="reveal mt-6 grid gap-4 sm:grid-cols-3">
    ${[
      ["≈ 27.1B", "Initial circulating at launch (~54%)"],
      ["25B", "Genesis — unlocked at launch, no vesting"],
      ["2.5B", "Team & advisors — 12-mo cliff, then 36-mo linear vest"],
    ]
      .map((x) => `<div class="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5"><div class="text-xl font-bold brand-text">${x[0]}</div><div class="mt-1 text-xs text-[var(--color-muted)]">${x[1]}</div></div>`)
      .join("")}
  </div>
</section>`;

const emissions = `
<section id="emissions" class="section container-x scroll-mt-28">
  ${heading("Emissions & scarcity", "Capped halving — supply that tightens with use", "Mining is bounded, not infinite: rewards halve on a fixed schedule and stop at a hard lifetime cap, after which the chain runs on fees alone. Paired with the burn, lockups and vesting, every lever points one way — toward a smaller, scarcer float as the network grows.")}
  <div class="mt-12 grid gap-10 lg:grid-cols-2">
    <div class="reveal">
      <span class="chip">Block rewards</span>
      <h2 class="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">Capped, halving — then fees-only.</h2>
      <ul class="mt-5 space-y-3 text-sm leading-relaxed text-[var(--color-muted)]">
        ${[
          "<strong class='text-[var(--color-ink)]'>300 PYRX per block</strong> at start — roughly 100 to each of the three streams.",
          "<strong class='text-[var(--color-ink)]'>Halving every 21,000,000 blocks</strong> (~4 years at the ~6-second mainnet block time).",
          "A <strong class='text-[var(--color-ink)]'>hard 12.5B lifetime cap</strong> from mining. Once issued (~26 years), the chain is fees-only — no endless inflation.",
          "On Testnet only, rewards ramp 5% → 100% over ~60 days to attract early miners. Mainnet pays full from the start.",
        ]
          .map((t) => `<li class="flex gap-2">${icon("check", "h-4 w-4 text-[var(--color-positive)] shrink-0 mt-0.5")}<span>${t}</span></li>`)
          .join("")}
      </ul>
    </div>
    <div class="reveal">
      <span class="chip">Scarcity mechanics</span>
      <h2 class="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">A supply that tightens with use.</h2>
      <div class="mt-5 grid gap-3">
        ${[
          ["Hard 50B cap", "No infinite inflation — total supply is bounded forever."],
          ["25% fee burn", "A quarter of every transaction's base fee is permanently burned — the more usage, the more PYRX destroyed."],
          ["Staking lockups", "Validators lock 100,000+ PYRX (7-day unbonding) — staked coins leave circulation."],
          ["Vesting & metering", "Team and AI-pool tokens stay off the market until earned; unspent AI-pool funds roll back to the DAO."],
        ]
          .map((x) => `<div class="card p-4"><div class="text-sm font-semibold">${x[0]}</div><p class="mt-1 text-xs text-[var(--color-muted)]">${x[1]}</p></div>`)
          .join("")}
      </div>
    </div>
  </div>
</section>`;

const fees = `
<section id="fees" class="section container-x scroll-mt-28">
  ${heading("Fee market", "EIP-1559, producer-forward — and consensus-frozen", "Every transaction pays a base fee (which floats with demand) plus an optional priority tip. The splits are locked in the consensus rules; the 25% base-fee burn is the usage-driven deflationary lever.")}
  <p class="reveal lead-note mx-auto mt-8 max-w-2xl text-sm sm:text-base">Read the base-fee split as the deflation engine: a full <strong class="text-[var(--color-ink)]">25% of every base fee is permanently burned</strong>, so the more the network is used, the more PYRX is destroyed. The tip simply pays the producer who did the work. Both ratios are frozen in consensus — no one can re-cut them later.</p>
  <div class="mt-10 grid gap-8 lg:grid-cols-2">
    <div class="reveal card p-7">
      <div class="flex items-center gap-3"><span class="${orbClass("brand")}">${icon("flame", "h-5 w-5")}</span><h3 class="text-lg font-semibold">Base fee</h3></div>
      <p class="mt-2 text-sm text-[var(--color-muted)]">Burned + treasury + DAO.</p>
      <div class="mt-5">${bar(FEE_SPLIT.base)}</div>
    </div>
    <div class="reveal card p-7">
      <div class="flex items-center gap-3"><span class="${orbClass("bolt")}">${icon("bolt", "h-5 w-5")}</span><h3 class="text-lg font-semibold">Priority tip</h3></div>
      <p class="mt-2 text-sm text-[var(--color-muted)]">Rewards the block producer first.</p>
      <div class="mt-5">${bar(FEE_SPLIT.tip)}</div>
    </div>
  </div>
  <div class="reveal mt-8 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 sm:p-7">
    <p class="text-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">Where every fee goes</p>
    <div class="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-[auto_1fr] sm:items-center">
      ${FEE_FLOWS.map(
        (f) => `
        <div class="diagram-node ${f.tone} mx-auto w-full max-w-[14rem] sm:mx-0 sm:w-auto sm:min-w-[9rem]">
          <span class="dn-title">${f.from}</span>
          <span class="dn-sub">${f.sub}</span>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          ${f.to
            .map(
              (d, i) => `
              ${i > 0 ? `<span class="hidden text-xs text-[var(--color-faint)] sm:inline">+</span>` : ""}
              <span class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)]"><span class="h-2 w-2 rounded-sm" style="background:${d.tone}"></span>${d.pct}% ${d.label}</span>`,
            )
            .join("")}
        </div>`,
      ).join("")}
    </div>
  </div>
  <p class="reveal mt-4 text-xs text-[var(--color-faint)]">Block gas limit is 30,000,000. The base fee retargets deterministically off the selected parent — a peer can't forge it.</p>
</section>`;

const staking = `
<section id="staking" class="section container-x scroll-mt-28">
  <div class="grid gap-10 lg:grid-cols-2 lg:items-center">
    <div class="reveal">
      <span class="chip">Stream C · staking</span>
      <h2 class="mt-4 text-3xl font-bold tracking-tight">Lock PYRX, finalize blocks, earn — or get slashed.</h2>
      <p class="mt-4 leading-relaxed text-[var(--color-muted)]">Validators secure finality with their stake. Honest work earns; provable faults are slashed and the slashed amount is burned.</p>
    </div>
    <div class="reveal">
      <dl class="divide-y divide-[var(--color-line-soft)] rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
        ${[
          ["Minimum stake", "100,000 PYRX"],
          ["Unbonding delay", "7 days"],
          ["Finality threshold", "BLS-aggregated, > 2/3 of stake"],
          ["Slashing — double-sign", "5% (burned)"],
          ["Slashing — downtime", "1% (burned)"],
        ]
          .map(([k, v]) => `<div class="flex items-baseline justify-between gap-6 p-4"><dt class="text-sm font-semibold text-[var(--color-ink)]">${k}</dt><dd class="text-sm text-[var(--color-muted)]">${v}</dd></div>`)
          .join("")}
      </dl>
    </div>
  </div>
</section>`;

// The genesis card is the page's ONE grad-ring focal point. Its four tiles count up.
const GENESIS_TILES: { num: string; label: string }[] = [
  { num: `<span data-count="50000000" data-prefix="$" data-dp="0">0</span>`, label: "Fixed genesis raise" },
  { num: `<span data-count="20000000000" data-dp="0">0</span>`, label: "PYRX purchased at genesis" },
  { num: `<span data-count="25" data-prefix="+" data-suffix="%" data-format="plain">0</span>`, label: "Bonus (5B) — unlocked, no vesting" },
  { num: `<span data-count="125000000" data-prefix="$" data-dp="0">0</span>`, label: "Genesis fully-diluted valuation" },
];
const genesis = `
<section id="genesis" class="section container-x scroll-mt-28">
  <div class="reveal grad-ring rounded-2xl p-1">
    <div class="card relative overflow-hidden rounded-[calc(1rem-1px)] p-8 sm:p-12">
      <div class="absolute -top-20 right-0 h-40 w-40 blur-3xl" aria-hidden="true" style="background: radial-gradient(closest-side, color-mix(in oklab, var(--color-brand) 40%, transparent), transparent);"></div>
      <div class="relative grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <span class="chip">Genesis</span>
          <h2 class="mt-4 text-3xl font-bold tracking-tight"><span class="brand-text">$0.0025</span> — funding the build, not an investment pitch.</h2>
          <p class="mt-4 leading-relaxed text-[var(--color-muted)]">At $0.0025, a clean <strong class="text-[var(--color-ink)]">$50,000,000 genesis raise</strong> sells exactly 20,000,000,000 PYRX — round, clean math, and an affordable entry that fits the fair-launch philosophy. The 25% bonus is a launch utility allocation, explicitly not an investment return.</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          ${GENESIS_TILES.map(
            (x) =>
              `<div class="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4"><div class="text-xl font-bold brand-text">${x.num}</div><div class="mt-1 text-xs text-[var(--color-muted)]">${x.label}</div></div>`,
          ).join("")}
        </div>
      </div>
    </div>
  </div>
</section>`;

const classification = `
<section id="classification" class="section container-x scroll-mt-28">
  ${heading("Utility, not a security", "Built for the CFTC commodity/utility lane", "Whether a token is a “security” (SEC) or a “commodity/utility” (CFTC) changes how it can be sold, who can buy it, where it lists, and how we can talk about it. PYRX is built and offered as a utility token.")}
  <div class="mt-12 grid gap-5 lg:grid-cols-2">
    <article class="reveal card p-7">
      <div class="${orbClass("brand")}">${icon("check", "h-5 w-5")}</div>
      <h3 class="mt-4 text-lg font-semibold">Why we list as a utility</h3>
      <ul class="mt-3 space-y-2 text-sm leading-relaxed text-[var(--color-muted)]">
        <li><strong class="text-[var(--color-ink)]">Broad, permissionless access</strong> — usable by the general public worldwide, without accredited-investor gates.</li>
        <li><strong class="text-[var(--color-ink)]">Real spot listings</strong> — mainstream exchanges list utility/commodity tokens on normal spot markets.</li>
        <li><strong class="text-[var(--color-ink)]">It matches reality</strong> — PYRX genuinely is a tool you consume on a live, decentralized network.</li>
      </ul>
    </article>
    <article class="reveal card p-7">
      <div class="${orbClass("bolt")}">${icon("scale", "h-5 w-5")}</div>
      <h3 class="mt-4 text-lg font-semibold">How this shapes pricing</h3>
      <ul class="mt-3 space-y-2 text-sm leading-relaxed text-[var(--color-muted)]">
        <li>We market <strong class="text-[var(--color-ink)]">utility, not price</strong> — no predictions, no return promises, no market-cap targets.</li>
        <li>The genesis price is <strong class="text-[var(--color-ink)]">funding + access</strong>; the 25% bonus is a launch utility allocation, not a return.</li>
        <li>At listing, utility status lets PYRX pursue ordinary spot listings — subject to each exchange's KYC/AML and each country's rules.</li>
      </ul>
    </article>
  </div>
  <p class="reveal mx-auto mt-8 max-w-3xl rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 text-center text-xs leading-relaxed text-[var(--color-faint)]">
    <strong class="text-[var(--color-muted)]">Honest caveat (zero-misinformation is the rule):</strong> this is how PYRAX is designed and how we think about it — not legal advice, and not a guarantee of how any regulator or court will ultimately classify the token. The U.S. rules dividing CFTC and SEC authority are still being finalized, and other countries have their own regimes. PYRAX is built for the utility/commodity lane and intends to comply with applicable law in every market.
  </p>
</section>`;

const addresses = `
<section class="section container-x">
  <div class="card p-7 reveal">
    <h3 class="text-lg font-bold">Reserved system addresses</h3>
    <p class="mt-2 text-sm text-[var(--color-muted)]">Protocol-owned, credit-only accounts seeded at genesis — identical across all five networks. The fee split and the AI-compute pool pay into these sinks directly, so every destination above exists on-chain from block 0.</p>
    <div class="mt-5 grid gap-3 sm:grid-cols-2">
      ${[
        ["PYRAX Treasury", "0x…0200", "Collects the base-fee 50% + tip 20%; funds the AI-compute pool once the network is revenue-positive."],
        ["DAO Treasury", "0x…0201", "Collects the base-fee 25% + tip 10%; the community-governed treasury for grants and operations."],
        ["Faucet", "0x…0202", "Dispenses test PYRX on the faucet-enabled networks — test value only, never mainnet."],
        ["AI-Compute Pool (4B PYRX)", "0x…0203", "Meters the 4B allocation out to pay verified NEURAX compute providers early; unspent funds roll back to the DAO."],
      ]
        .map((x) => `<div class="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3"><div class="flex items-center justify-between gap-3"><span class="text-sm font-semibold">${x[0]}</span><code class="font-mono text-sm text-[var(--color-bolt-bright)]">${x[1]}</code></div><p class="mt-1.5 text-xs leading-snug text-[var(--color-muted)]">${x[2]}</p></div>`)
        .join("")}
    </div>
  </div>
  <div class="mt-8 text-center reveal"><a href="${LINKS.docs}" class="btn btn-primary">Tokenomics reference & docs ${icon("arrow", "h-4 w-4")}</a></div>
</section>`;

const main = document.getElementById("main");
if (main) main.innerHTML = hero + supply + utility + distribution + emissions + fees + staking + genesis + classification + addresses;
mountChrome("Token");
wireMotion();
