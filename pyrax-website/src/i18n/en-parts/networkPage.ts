// SPDX-License-Identifier: LicenseRef-Proprietary
//
// English strings for the /network page (the four networks + roadmap). Flat lowerCamelCase keys;
// each maps 1:1 to a t("networkPage.<key>", "<English>") call on the page. English is the
// source of truth — other locales fall back to these values key-by-key.
export const networkPage = {
  eyebrow: 'The network',
  headingLead: 'One binary,',
  headingFlame: 'four networks',
  subtitle: 'The node ships exactly four chainspecs. Seed is a permanent simulation; Forge, Rise, and One share the real Production consensus, differing only by launch order and audit gating. A production chain-id can never fake instant-seal.',

  role1: 'Permanent developer sandbox — a byte-identical simulation on real primitives with play-money and a welcome faucet. It never becomes mainnet; it stays a sandbox forever.',
  role2: 'Closed public alpha on the real Production consensus, launched with three seeded genesis validators. The first network where the production path runs for outside testers.',
  role3: 'The official public testnet — incentivized and audit-facing, with a testnet emission ramp. The dress rehearsal for mainnet.',
  role4: 'Mainnet. The genesis ceremony is pending the external audit gate — no faucet, no dev keys, real value.',

  statusOnline: 'Online',
  statusConnecting: 'Connecting',
  statusNotYetLive: 'Not yet live',

  statHeight: 'height',
  statPeers: 'peers',
  statTpsNow: 'tps now',

  liveFiguresCaption: "Live figures are read from each network's public RPC at page load. A network that isn't reachable shows honest status — never fabricated numbers.",

  roadmapEyebrow: 'Roadmap',
  roadmapHeading: 'The path to mainnet',
  roadmapSubtitle: 'Deliberate and audit-gated. Each network de-risks the next; nothing carrying real value ships before the external audit clears.',

  roadmap1P: 'Now',
  roadmap1Title: 'PYRAX Seed is live',
  roadmap1Body: 'A faithful simulation of the full protocol — GhostDAG, shielded pool, multi-VM contracts, PYRAX Compute — running today as a permanent developer sandbox.',
  roadmap2P: 'Next',
  roadmap2Title: 'PYRAX Forge · closed alpha',
  roadmap2Body: 'The production consensus path (real 5-lane TriStream + BLS finality) opens to invited testers with seeded validators.',
  roadmap3P: 'Then',
  roadmap3Title: 'PYRAX Rise · public testnet',
  roadmap3Body: 'Open, incentivized testnet with the emission ramp — the audit-facing rehearsal, load-tested in the open.',
  roadmap4P: 'Gate',
  roadmap4Title: 'External audit',
  roadmap4Body: 'Comprehensive independent audits of consensus, multi-VM execution, and bridge contracts. Nothing reaches mainnet before clearing.',
  roadmap5P: 'Launch',
  roadmap5Title: 'PYRAX One · mainnet',
  roadmap5Body: 'The genesis ceremony, the 50B hard cap enforced in consensus, and real value — after the gate.',

  ctaExplore: 'Explore Seed live →',
  ctaRunNode: 'Run a node',
  ctaHowItWorks: 'How it works',
};
