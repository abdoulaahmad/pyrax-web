// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import "../styles.css";

import { mountChrome } from "../lib/chrome.js";
import { wireWaitlist, waitlistForm } from "../lib/brevo.js";
import { wireMotion } from "../lib/motion.js";
import { NEURAX_PILLARS, NEURAX_MODALITIES, NEURAX_CATALOG, NEURAX_VERIFY, WHY_AI } from "../lib/content.js";
import { icon, heading, featureCard, orbClass } from "../lib/ui.js";

const hero = `
<section class="relative overflow-hidden pt-32 pb-12 sm:pt-40">
  <div class="hero-aurora" aria-hidden="true"></div>
  <div class="absolute inset-0" aria-hidden="true" style="background: radial-gradient(50rem 30rem at 75% 10%, color-mix(in oklab, var(--color-violet) 16%, transparent), transparent 60%);"></div>
  <div class="container-x relative max-w-3xl reveal">
    <span class="chip">NEURAX · decentralized AI</span>
    <h1 class="mt-5 t-h1">A real AI that runs on <span class="bolt-text text-anim">your machine</span> — backed by a global GPU market.</h1>
    <p class="mt-5 max-w-2xl t-lead text-[var(--color-muted)]">NEURAX is first a usable multimodal + agentic AI that does the work — chat, code, image, audio, video and immersive spatial sound on a consumer GPU. The on-chain marketplace and GPU pooling are the economy and scale-out layer beneath it, not the product itself.</p>
    <div class="mt-7 flex flex-wrap gap-3">
      <a href="#waitlist" class="btn btn-primary">Get early access ${icon("arrow", "h-4 w-4")}</a>
      <a href="/build.html#neurax" class="btn btn-ghost">NEURAX SDKs</a>
    </div>
  </div>
</section>`;

const pillars = `
<section id="local" class="section container-x scroll-mt-28">
  <div class="grid gap-5 lg:grid-cols-3">${NEURAX_PILLARS.map(featureCard).join("")}</div>
  <p class="reveal mt-10 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">What runs where</p>
  <div class="reveal mt-4 grid gap-4 sm:grid-cols-4">
    ${[
      ["≥ 24 GB", "Large", "Full-size models on one big card"],
      ["12 GB", "Baseline", "The RTX 3060 comfort target"],
      ["8 GB", "Lite", "A trimmed pack still runs locally"],
      ["< 8 GB", "CPU", "Small models fall back to the CPU"],
    ]
      .map((x) => `<div class="card p-5 text-center"><div class="text-2xl font-bold brand-text">${x[0]}</div><div class="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-bolt-bright)]">${x[1]}</div><p class="mt-1 text-xs text-[var(--color-muted)]">${x[2]}</p></div>`)
      .join("")}
  </div>
  <p class="reveal mx-auto mt-4 max-w-2xl text-center text-xs text-[var(--color-faint)]">The runtime auto-detects your VRAM and picks the right pack — it <strong class="text-[var(--color-muted)]">downshifts, never up</strong>. The route (Local / Cohort / Network) delegates to the real scheduler, so a local decision is exactly what the network would make.</p>
</section>`;

const modalities = `
<section id="modalities" class="section container-x scroll-mt-28">
  ${heading("Every modality, one stack", "Text & code · Image · Audio · Video · Spatial · Embeddings", "Each modality runs locally where it fits your VRAM, with quality/speed profiles for 8–24 GB cards — and routes to the network when it needs more.")}
  <div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    ${NEURAX_MODALITIES.map(
      (m) => `
      <article class="reveal card card-hover p-6">
        <div class="${orbClass("violet")}">${icon(m.icon, "h-5 w-5")}</div>
        <div class="mt-4 flex items-baseline justify-between gap-2">
          <h3 class="t-h3">${m.name}</h3>
          <code class="text-[0.7rem] text-[var(--color-faint)]">${m.model}</code>
        </div>
        <p class="mt-2 t-body text-[var(--color-muted)]">${m.blurb}</p>
      </article>`,
    ).join("")}
  </div>
</section>`;

const catalog = `
<section id="catalog" class="section container-x scroll-mt-28">
  ${heading("Model catalog", "Open-tier models, with real VRAM floors", "Every NEURAX model has a content-addressed weight set and an honest VRAM floor, so the scheduler can match a job to capable hardware before any bytes move.")}
  <div class="reveal mt-10 card overflow-x-auto !p-0">
    <table class="w-full text-left text-sm">
      <thead class="text-[var(--color-faint)]">
        <tr class="border-b border-[var(--color-line)]">
          <th class="p-4 font-semibold">Model</th>
          <th class="p-4 font-semibold">Modality</th>
          <th class="p-4 font-semibold">VRAM floor</th>
          <th class="p-4 font-semibold">Tier</th>
        </tr>
      </thead>
      <tbody>
        ${NEURAX_CATALOG.map(
          (m) => `
          <tr class="border-b border-[var(--color-line-soft)] last:border-0">
            <td class="p-4"><code class="font-mono text-[var(--color-violet)]" style="color:color-mix(in oklab, var(--color-violet) 75%, white)">${m.id}</code></td>
            <td class="p-4 text-[var(--color-muted)]">${m.modality}</td>
            <td class="p-4 font-mono text-[var(--color-bolt-bright)]">${m.vram}</td>
            <td class="p-4"><span class="chip !px-2 !py-0.5 !text-[0.6rem]">${m.tier}</span></td>
          </tr>`,
        ).join("")}
      </tbody>
    </table>
  </div>
</section>`;

const spatial = `
<section id="spatial" class="section container-x scroll-mt-28">
  <div class="grad-ring rounded-2xl">
  <div class="card relative overflow-hidden p-8 sm:p-12">
    <div class="absolute inset-0 grid-bg opacity-50" aria-hidden="true"></div>
    <div class="relative grid gap-8 lg:grid-cols-2 lg:items-center">
      <div class="reveal">
        <span class="chip">NEURAX Spatial</span>
        <h2 class="mt-4 t-h2">Immersive 3D audio — open and royalty-free.</h2>
        <p class="mt-4 leading-relaxed text-[var(--color-muted)]">Turn any finished mix into an enveloping experience: <strong class="text-[var(--color-ink)]">binaural</strong> HRTF for headphones, plus <strong class="text-[var(--color-ink)]">5.1 and 7.1</strong> surround upmix and ambisonics. It's a deterministic DSP transform — so it's exact-hash verifiable on the marketplace — built entirely on royalty-free tech. (It's <em>not</em> a licensed object-audio format.)</p>
      </div>
      <div class="reveal flex flex-wrap gap-2">
        ${["binaural", "5.1 surround", "7.1 surround", "ambisonics"].map((x) => `<span class="chip !text-xs !text-[var(--color-ink)]">${icon("wave", "h-4 w-4 text-[var(--color-violet)]")} ${x}</span>`).join("")}
      </div>
    </div>
  </div>
  </div>
</section>`;

const flowSteps = [
  ["Submit", "A requester posts a job with its spec, VRAM need and trust tier."],
  ["Escrow", "Payment locks on-chain up front — trustless for both sides."],
  ["Match", "The scheduler picks a capable, least-loaded, idle worker."],
  ["Execute", "The provider runs the job — alone, or as a pooled cohort."],
  ["Verify", "The network proves the work is real (see the ladder below)."],
  ["Settle", "PYRX releases from escrow to the worker — or refunds on failure."],
];
const marketStats: { num: string; label: string; why: string }[] = [
  {
    num: `<span class="stat-num brand-text"><span data-count="4000000000" data-format="plain">0</span> PYRX</span>`,
    label: "AI-compute pool",
    why: "The pool (at 0x…0203) subsidizes provider payouts early — then tapers as real demand grows.",
  },
  {
    num: `<span class="stat-num brand-text"><span data-count="8" data-format="plain">0</span> PYRX / CU</span>`,
    label: "Fixed compute-unit price",
    why: "A CU is the network's normalized unit of GPU work; the rate is DAO-tunable, with no USD peg and no price prediction.",
  },
  {
    num: `<span class="stat-num brand-text"><span data-count="10000" data-format="plain">0</span> PYRX</span>`,
    label: "Per-job drawdown cap",
    why: "A requester can never self-drain the shared pool — the cap bounds every single job.",
  },
];
const marketplace = `
<section id="marketplace" class="section container-x scroll-mt-28">
  ${heading("The compute economy", "Rent it, or earn from it", "Need AI work done? Pay in PYRX. Own a GPU? Run verified jobs and earn PYRX. The lifecycle is escrowed end to end — payment locks before any work starts and releases only for proven results.")}
  <div class="reveal mt-12 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 sm:p-7">
    <p class="text-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">Every marketplace job, end to end</p>
    <div class="flow-rail flow-rail-h mt-6 grid-cols-1 items-start sm:grid-cols-2 lg:grid-cols-6">
      ${flowSteps
        .map(
          ([t, d], i) => `
        <div class="flow-step">
          <span class="flow-num" aria-hidden="true">${i + 1}</span>
          <div class="flow-body">
            <div class="flow-title">${t}</div>
            <p class="flow-desc">${d}</p>
          </div>
        </div>`,
        )
        .join("")}
    </div>
    <p class="mt-5 text-center text-xs leading-relaxed text-[var(--color-muted)]">
      The point of the escrow: neither side has to trust the other. A requester pays only for proven work, a provider can't be stiffed for work it did, and a failed job refunds automatically.
    </p>
  </div>
  <div class="reveal mt-6 grid gap-4 sm:grid-cols-3">
    ${marketStats
      .map(
        (s) => `
      <div class="stat-block">
        ${s.num}
        <div class="stat-label">${s.label}</div>
        <p class="stat-why">${s.why}</p>
      </div>`,
      )
      .join("")}
  </div>
</section>`;

const verify = `
<section id="trust" class="section container-x scroll-mt-28">
  ${heading("Verified — never just trusted", "A ladder of proofs, and three trust tiers", "The network only pays for work it can prove is real. Different job types use different rungs of the ladder.")}
  <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
    ${NEURAX_VERIFY.map(
      (v, i) => `
      <article class="reveal card p-6">
        <div class="text-3xl font-extrabold bolt-text">${String(i + 1).padStart(2, "0")}</div>
        <h3 class="mt-3 t-h3">${v.title}</h3>
        <p class="mt-2 t-body text-[var(--color-muted)]">${v.desc}</p>
      </article>`,
    ).join("")}
  </div>
  <p class="reveal lead-note lead-note-bolt mx-auto mt-8 max-w-2xl text-sm sm:text-base">
    Which rung a job climbs depends on how much assurance it needs. That maps onto three trust tiers — the higher the tier, the stronger the guarantee a provider must offer before the network will route work to it.
  </p>
  <div class="reveal mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
    <span class="text-[var(--color-muted)]">Trust tiers:</span>
    <span class="chip !text-xs !text-[var(--color-ink)]">Open</span>
    <span class="text-[var(--color-faint)]">&lt;</span>
    <span class="chip !text-xs !text-[var(--color-ink)]">Secure</span>
    <span class="text-[var(--color-faint)]">&lt;</span>
    <span class="chip !text-xs !text-[var(--color-ink)]">Trusted (TEE-attested datacenter GPUs)</span>
  </div>
</section>`;

const pooling = `
<section id="pooling" class="section container-x scroll-mt-28">
  <div class="grid gap-10 lg:grid-cols-2 lg:items-center">
    <div class="reveal">
      <span class="chip">GPU pooling</span>
      <h2 class="mt-4 t-h2">Consumer cards, teamed up.</h2>
      <p class="mt-4 leading-relaxed text-[var(--color-muted)]">A model too big for one card? A <strong class="text-[var(--color-ink)]">cohort</strong> of consumer GPUs pools VRAM and shares the work — each member runs a shard, and the partials combine into one verifiable result. It's how a network of 3060s reaches further than any single card.</p>
    </div>
    <div class="reveal card p-6 sm:p-7">
      <p class="text-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">Three consumer cards, one cohort</p>
      <div class="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
        ${[12, 12, 16]
          .map(
            (g, i) => `
          <div class="diagram-node diagram-node-violet min-w-[5rem]">
            <span class="dn-title">GPU ${i + 1}</span>
            <span class="dn-sub">${g} GB</span>
          </div>
          <span class="diagram-link !min-w-[1rem] !max-w-[2.5rem]" aria-hidden="true"></span>`,
          )
          .join("")}
        <div class="diagram-node diagram-node-violet min-w-[7rem]">
          <span class="dn-title">Cohort</span>
          <span class="dn-sub">≈ 40 GB-class</span>
        </div>
      </div>
      <p class="mt-5 text-center text-xs leading-relaxed text-[var(--color-muted)]">
        Each card runs a shard; the partials combine into one verifiable result — so a 40 GB-class model runs on three ordinary GPUs that no single one could hold.
      </p>
    </div>
  </div>
</section>`;

const honest = `
<section class="section container-x">
  <div class="card p-7 reveal">
    <div class="flex items-center gap-3"><span class="${orbClass("brand")}">${icon("check", "h-5 w-5")}</span><h3 class="t-h3">Honest about the hardware</h3></div>
    <p class="mt-2 text-sm text-[var(--color-muted)]">We don't oversell what consumer hardware does today:</p>
    <ul class="mt-4 grid gap-2 t-body text-[var(--color-muted)] sm:grid-cols-2">
      ${[
        "Consumer <strong class='text-[var(--color-ink)]'>video</strong> generation is minutes-per-clip — not real-time.",
        "A WAN-sharded big model runs at roughly <strong class='text-[var(--color-ink)]'>1–5 tokens/sec</strong>.",
        "ZK-ML cannot verify a 7–70B forward pass today — hence the proof ladder + attestation.",
        "The flagship frontier model runs only on <strong class='text-[var(--color-ink)]'>attested Tier-T</strong> hardware.",
      ]
        .map((t) => `<li class="flex gap-2">${icon("check", "h-4 w-4 text-[var(--color-positive)] shrink-0 mt-0.5")}<span>${t}</span></li>`)
        .join("")}
    </ul>
  </div>
</section>`;

const why = `
<section id="why" class="section container-x scroll-mt-28">
  ${heading("Why decentralized AI", "Compute shouldn't belong to four companies", "Concentrated AI is expensive, gated, and centrally controlled. NEURAX puts it on the hardware people already own — censorship-resistant, affordable, and private.")}
  <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
    ${WHY_AI.map(
      (w, i) => `
      <div class="reveal card p-6">
        <div class="text-3xl font-extrabold bolt-text">${String(i + 1).padStart(2, "0")}</div>
        <h3 class="mt-3 t-h3">${w.title}</h3>
        <p class="mt-2 t-body text-[var(--color-muted)]">${w.desc}</p>
      </div>`,
    ).join("")}
  </div>
  <p class="reveal mx-auto mt-8 max-w-2xl text-center t-body text-[var(--color-faint)]">On the environment, honestly: AI compute is energy-intensive and decentralization is no magic fix — but NEURAX uses hardware that already exists and favors idle-only, contention-aware scheduling, soaking up otherwise-wasted capacity instead of demanding new datacenters.</p>
</section>`;

const cta = `
<section id="waitlist" class="section container-x">
  <div class="card relative overflow-hidden p-8 text-center sm:p-14">
    <div class="absolute inset-0 grid-bg opacity-60"></div>
    <div class="relative reveal">
      <h2 class="mx-auto max-w-2xl t-h2">Be first to run NEURAX</h2>
      <p class="mx-auto mt-4 max-w-xl text-[var(--color-muted)]">Join the waitlist for early access to the local AI, the copilot, and the compute marketplace.</p>
      <div class="mt-7">${waitlistForm()}</div>
      <a href="/build.html#neurax" class="mt-5 inline-block text-sm text-[var(--color-faint)] hover:text-[var(--color-ink)]">Or build with the NEURAX SDKs →</a>
    </div>
  </div>
</section>`;

const main = document.getElementById("main");
if (main) main.innerHTML = hero + pillars + modalities + catalog + spatial + marketplace + verify + pooling + honest + why + cta;
mountChrome("NEURAX AI");
wireWaitlist();
wireMotion();
