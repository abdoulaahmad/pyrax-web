// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
import "../styles.css";

import { mountChrome } from "../lib/chrome.js";
import { SECURITY_POINTS } from "../lib/content.js";
import { icon, featureCard, heading } from "../lib/ui.js";

/* ----------------------------------------------------------------------------
 * SECURITY & AUDITS — the honesty page. Blue (bolt) is the dominant ramp.
 * One guided argument: the non-negotiable rule → how we already prove it
 * (adversarial review + real bugs caught) → the six honest commitments →
 * the ordered gate to genesis as a visual flow → the full roadmap.
 * Exactly ONE hero-aurora (hero), ONE text-anim word (hero), ONE grad-ring
 * focal card (the gate), flow-rail is static, no count-up.
 * -------------------------------------------------------------------------- */

// HERO — the hook. ONE animated gradient word ("honest", bolt ramp).
const hero = `
<section class="relative overflow-hidden pt-32 pb-10 sm:pt-40">
  <div class="hero-aurora" aria-hidden="true"></div>
  <div class="absolute inset-0 grid-bg opacity-50" aria-hidden="true"></div>
  <div class="container-x relative max-w-3xl reveal">
    <span class="chip">Security &amp; audits</span>
    <h1 class="mt-5 t-h1">We earn trust by being <span class="bolt-text text-anim">honest</span> about the gate.</h1>
    <p class="mt-5 max-w-2xl t-lead text-[var(--color-muted)]">Real privacy, real adversarial review, and one non-negotiable rule. We would rather ship slowly and tell you exactly what is and isn't proven than make a promise the cryptography hasn't earned yet.</p>
  </div>
</section>`;

// THE ONE RULE — the honesty centerpiece, a prominent bridge (not just a card).
const rule = `
<section class="container-x">
  <div class="reveal lead-note lead-note-bolt max-w-3xl text-base sm:text-lg">
    The one rule everything else bends to: <strong class="text-[var(--color-ink)]">the shielded layer does not protect real money until an independent external ZK-security audit clears it.</strong>
    Until then privacy is dev/testnet-grade, on purpose — usable, exercised, and adversarially tested, but never asked to guard funds it hasn't been vetted to guard. No date is committed to that audit; it clears when it clears.
  </div>
</section>`;

// PROOF IT'S NOT JUST WORDS — the two real bugs, given a prominent home.
const proof = `
<section class="section container-x pt-10">
  <div class="reveal grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
    <div>
      <span class="chip">Proof, not promises</span>
      <h2 class="mt-4 t-h2">Adversarial review that has actually <span class="bolt-text">caught bugs</span>.</h2>
      <p class="mt-4 leading-relaxed text-[var(--color-muted)]">
        Every subsystem gets independent red-team passes — the point is to break it before an attacker does. That work isn't decorative: it has already found and fixed serious issues that would have been catastrophic on a live chain. Two of them are worth naming, because concrete beats reassuring.
      </p>
    </div>
    <div class="grid gap-3">
      <div class="card flex items-start gap-3 p-5">
        <span class="icon-orb icon-orb-bolt shrink-0 !h-10 !w-10">${icon("shield", "h-5 w-5")}</span>
        <div class="min-w-0">
          <div class="text-sm font-semibold text-[var(--color-ink)]">Critical · fork-choice bypass</div>
          <p class="mt-1 t-body text-[var(--color-muted)]">A flaw that could have let an attacker steer block ordering — found and fixed before it ever touched a real network.</p>
        </div>
      </div>
      <div class="card flex items-start gap-3 p-5">
        <span class="icon-orb icon-orb-bolt shrink-0 !h-10 !w-10">${icon("lock", "h-5 w-5")}</span>
        <div class="min-w-0">
          <div class="text-sm font-semibold text-[var(--color-ink)]">High · prover overflow</div>
          <p class="mt-1 t-body text-[var(--color-muted)]">An overflow in the proving path that adversarial testing surfaced and closed — exactly the class of bug the external ZK audit exists to gate against.</p>
        </div>
      </div>
    </div>
  </div>
</section>`;

// THE SIX COMMITMENTS — the existing SECURITY_POINTS feature cards (good as-is).
const points = `
<section class="section container-x pt-4">
  ${heading(
    "How we operate",
    "Six commitments that don't move",
    "Each of these is a standing rule, not a milestone. They cover what's already real, what's deliberately gated, and the numbers we refuse to inflate.",
  )}
  <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    ${SECURITY_POINTS.map((p) => featureCard({ title: p.title, desc: p.desc, icon: p.icon, tone: "bolt" })).join("")}
  </div>
</section>`;

// THE ORDERED GATE — six steps as a VERTICAL flow-rail (the variant that draws the
// gradient connectors, so the ordered path is literally visible); the page's ONE grad-ring card.
const GATE: { t: string; d: string }[] = [
  { t: "Fuzzing", d: "Differential + property fuzzing across the core." },
  { t: "Crypto & circuit audits", d: "The ZK circuits + cryptography, independently reviewed." },
  { t: "External review", d: "Consensus + privacy, audited end to end." },
  { t: "Incentivized testnet", d: "A public, adversarial, rewarded testnet." },
  { t: "Bug bounty", d: "Open, ongoing, paid disclosure." },
  { t: "Genesis", d: "Mainnet — only after the above." },
];
const path = `
<section class="section container-x">
  <div class="reveal grad-ring rounded-[1.4rem] p-1">
    <div class="card relative overflow-hidden rounded-[1.3rem] p-8 sm:p-12">
      <div class="absolute inset-0 grid-bg opacity-50" aria-hidden="true"></div>
      <div class="relative">
        <div class="max-w-2xl">
          <span class="chip">The mainnet gate</span>
          <h2 class="mt-4 t-h2">The ordered path to genesis</h2>
          <p class="mt-3 leading-relaxed text-[var(--color-muted)]">Each step gates the next, and nothing skips the line — follow it down to genesis. There is no committed date — genesis happens when this is done, not before.</p>
        </div>
        <ol class="flow-rail mt-9 max-w-xl">
          ${GATE.map(
            (s, i) => `
            <li class="flow-step">
              <span class="flow-num" aria-hidden="true">${i + 1}</span>
              <div class="flow-body">
                <div class="flow-title">${s.t}</div>
                <p class="flow-desc">${s.d}</p>
              </div>
            </li>`,
          ).join("")}
        </ol>
        <p class="mt-9 max-w-2xl border-t border-[var(--color-line)] pt-6 t-body text-[var(--color-muted)]">
          Why the order matters: an audit is only as good as the code it reviews, a testnet only finds what real users hit, and a bounty only works on a system that's already hard to break. Front-loading the easy steps would just move risk to where it costs the most — your money.
        </p>
      </div>
    </div>
  </div>
  <div class="mt-8 text-center reveal">
    <a href="/roadmap.html" class="btn btn-ghost">See the full roadmap ${icon("arrow", "h-4 w-4")}</a>
  </div>
</section>`;

const main = document.getElementById("main");
if (main) main.innerHTML = hero + rule + proof + points + path;
mountChrome("Resources");
