// SPDX-License-Identifier: LicenseRef-Proprietary
//
// English strings for the interactive investor pitch deck. Flat lowerCamelCase keys, one per
// wrapped visible string. Pure figures ($50,000,000, 8 PYRX, 50B, slide numbers) and data pulled
// from tokenomics.ts / industries.ts / networks.ts are NOT included here — they stay inline.
export const pitch = {
  // cover slide
  coverTitlePre: 'The blockchain built like the ',
  coverTitleFlame: 'future demands',
  coverSubtitle: 'Private by default. Parallel by design. Verifiable by proof. A from-scratch Layer-1 with a built-in market for AI compute.',
  coverInvestorDeck: 'Investor Deck',
  coverConfidential: 'Confidential',

  // kickers
  kickerProblem: 'The problem',
  kickerSolution: 'The solution',
  kickerTechnology: 'The technology',
  kickerMarket: 'Why now',
  kickerCompliance: 'The moat',
  kickerCompute: 'The wedge',
  kickerNeurax: 'The wedge',
  kickerTraction: 'Traction',
  kickerTokenomics: 'Tokenomics',
  kickerRoadmap: 'Roadmap',
  kickerAsk: 'The ask',

  // problem slide
  problemTitle: 'Public blockchains force a false choice',
  problemCard1Title: 'Privacy or transparency',
  problemCard1Desc: "Transparent chains leak your entire financial life. Bolt-on privacy is an afterthought regulators can't audit.",
  problemCard2Title: 'Speed or security',
  problemCard2Desc: 'Linear chains orphan honest work to stay safe, capping throughput far below what real applications need.',
  problemCard3Title: 'Decentralized in name only',
  problemCard3Desc: 'Most networks lean on company-run bootstrap servers and privileged keys — single points of failure and control.',

  // solution slide
  solutionTitle: 'PYRAX refuses the trade-off',
  solutionBody: 'A GhostDAG for parallel throughput, shielded-by-default privacy with auditor viewing keys, three virtual machines, and a bootstrapless onion mixnet — enforced as invariants in the lowest-level types.',
  solutionCard1Title: 'Parallel',
  solutionCard1Desc: 'GhostDAG includes honest work instead of orphaning it.',
  solutionCard2Title: 'Private',
  solutionCard2Desc: 'Every transfer hides sender, receiver, amount — by default.',
  solutionCard3Title: 'Decentralized',
  solutionCard3Desc: 'No bootstrap server. ISP-resistant Sphinx mixnet.',
  solutionCard4Title: 'Verifiable',
  solutionCard4Desc: 'Open-core, audit-gated, proofs over promises.',

  // technology slide
  techTitle: 'One binary, a whole stack',
  techCard1Title: 'GhostDAG + TriStream',
  techCard1Desc: 'Three streams over five seal lanes — ASIC, GPU, CPU — plus BLS proof-of-stake finality.',
  techCard2Title: 'Shielded by default',
  techCard2Desc: 'Orchard-style notes and recursive zk-SNARKs with no trusted setup; viewing keys for oversight.',
  techCard3Title: 'Multi-VM L2 + ZK-rollup L3',
  techCard3Desc: 'EVM, WASM, and Cairo with cross-VM calls; thousands of proofs fold into one.',
  techCard4Title: 'Sphinx onion mixnet',
  techCard4Desc: 'Bootstrapless peer routing and uniform packet encryption ensure zero network-level metadata leakage.',
  techFootnotePre: '51%-resistance across ',
  techFootnoteEmph: 'three uncorrelated resources',
  techFootnotePost: ' at once — ASIC + GPU/CPU hashpower and a staked supermajority — with finality that makes reverting a slashable offense.',

  // market slide
  marketTitle: 'Multi-trillion-dollar markets, one chain',
  marketBodyPre: 'PYRAX ships direct playbooks for ',
  marketBodyMid: ' business types across ',
  marketBodyPost: ' industries — each with market projections, concrete integrations, and buildathon dApp ideas.',
  marketRef1Label: 'Tokenized real-world assets by 2030',
  marketRef1Source: 'BCG',
  marketRef2Label: 'AI market by 2030',
  marketRef2Source: 'Statista / Grand View',
  marketRef3Label: 'Global digital payments by 2030',
  marketRef3Source: 'Statista',
  marketRef4Label: 'Business types PYRAX maps directly',
  marketRef4Source: 'This site',

  // compliance slide
  complianceTitle: 'Enterprise privacy & compliance',
  complianceBody: 'Shielded pools hide amounts, senders, and receivers by default — while cryptographic viewing keys enable selective, read-only disclosure for audits and regulatory oversight without compromising spending keys.',
  complianceTile1Label: 'zero-setup SNARK circuits',
  complianceTile2Label: 'default-on shielded transfers',
  complianceTile3Label: 'selective cryptographic compliance',
  complianceTile4Label: 'amount, sender & receiver hidden',
  complianceFooter: 'True financial privacy built for enterprises: confidential operations on-chain without failing compliance, tax, or AML audits.',

  // compute / neurax slide (retained for i18n compatibility)
  computeTitle: 'PYRAX Compute — verifiable compute',
  neuraxTitle: 'PYRAX Compute — verifiable compute',
  computeBody: 'The same GPUs that secure the chain run paid AI and compute jobs. A four-rung verification ladder replaces blind trust — and the demand is exploding.',
  neuraxBody: 'The same GPUs that secure the chain run paid AI and compute jobs. A four-rung verification ladder replaces blind trust — and the demand is exploding.',
  computeTile1Label: 'per compute unit (fixed)',
  neuraxTile1Label: 'per compute unit (fixed)',
  computeTile2Label: 'bootstrap compute pool',
  neuraxTile2Label: 'bootstrap compute pool',
  computeTile3Label: 'verification ladder',
  neuraxTile3Label: 'verification ladder',
  computeTile4Label: 'local-first baseline GPU',
  neuraxTile4Label: 'local-first baseline GPU',
  computeFooter: 'A crypto-economic AI-compute network that pays providers in the same token that secures consensus — a self-reinforcing flywheel.',
  neuraxFooter: 'A crypto-economic AI-compute network that pays providers in the same token that secures consensus — a self-reinforcing flywheel.',

  // traction slide
  tractionTitle: 'Built, not planned',
  tractionBody: 'The v4 whitepaper describes a system that is substantially implemented and tested — running today as a faithful simulation on real primitives, with the production consensus path wired end-to-end.',
  builtLabel1: 'networks from one Rust binary',
  builtLabel2: 'EVM · WASM · Cairo, cross-VM',
  builtLabel3: 'TPS design target (GhostDAG)',
  builtLabel4: 'shielded by default, no trusted setup',
  builtLabel5: 'industry playbooks + dApp ideas',
  builtLabel6: 'node, wallet, CLI, explorer — live',

  // tokenomics slide
  tokenomicsTitle: 'A fixed 50B supply, frozen rules',
  tokenomicsHardCap: 'hard cap',
  tokenomicsGenesisSuffix: '/PYRX genesis',
  tokenomicsBaseFeePre: 'Base fee ',
  tokenomicsBaseFeePost: '% burned',
  tokenomicsFeeSplit: 'Fee split frozen forever',

  // roadmap slide
  roadmapTitle: 'Audit-gated to mainnet',
  roadmapLive: 'LIVE',
  roadmapPlanned: 'PLANNED',
  roadmapGateLabel: 'The gate:',
  roadmapGateBody: 'a single external audit of consensus, ZK circuits, and the bridge. Nothing carrying real value ships before it clears.',

  // ask slide
  askTitle: 'Fund the launch of PYRAX One',
  askGenesisEvent: 'Genesis event',
  askGenesisBody: '20B PYRX at $0.0025, plus a 25% utility bonus (5B PYRX) — participants receive 25B in network access and compute credits. Never framed as an investment return.',
  askUseOfFunds: 'Use of funds',
  askFund1: 'External audit + mainnet genesis ceremony',
  askFund2: 'Ecosystem, liquidity & buildathon grants',
  askFund3: 'Developer grants, privacy tooling & ecosystem incubation',
  askFund4: 'Core protocol, apps, and global team',
  askEmailButton: 'invest@pyrax.org',
  askLiveButton: 'See it live',

  // controls
  ctrlPrev: 'Prev',
  ctrlNext: 'Next',
  ctrlPrevAria: 'Previous slide',
  ctrlNextAria: 'Next slide',
};
