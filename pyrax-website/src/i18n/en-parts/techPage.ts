// SPDX-License-Identifier: LicenseRef-Proprietary
export const techPage = {
  // Sub-navigation
  subConsensus: "Consensus",
  subPrivacy: "Privacy",
  subVms: "Virtual machines",
  subCompute: "PYRAX Compute",
  subNeurax: "PYRAX Compute",
  subNetwork: "Network",
  subSecurity: "Security",

  // Seal-lane table rows
  lane1Hw: "ASIC / specialized",
  lane2Hw: "ASIC",
  lane3Hw: "Commodity GPU",
  lane4Lane: "Argon2id (memory-hard)",
  lane4Hw: "Commodity CPU",
  lane5Lane: "BLS proof-of-stake",
  lane5Hw: "Staked validators",

  // Virtual machines
  vm1Desc: "Full Ethereum equivalence — Solidity/Vyper, the complete eth_* JSON-RPC, filters, subscriptions, precompiles, CREATE2, and EIP-1559.",
  vm2Desc: "Rust-first smart contracts compiled to WebAssembly — sandboxed, fast, and metered by the same gas market.",
  vm3Engine: "STARK-provable",
  vm3Desc: "The Cairo VM for provable computation, so heavy logic can be proven off-chain and verified on-chain.",

  // Transaction types
  tx1: "Shielded",
  tx2: "Transparent",
  tx3: "Ethereum",
  tx4: "Escrow",
  tx5: "Stake",
  tx6: "Governance",

  // Page meta
  metaTitle: "Technology — PYRAX™ Network",
  metaDescription: "How PYRAX works: a GhostDAG sealed by three streams over five lanes, BLS proof-of-stake finality, shielded-by-default privacy, a multi-VM execution layer, a bootstrapless ISP-resistant network, and an audit-gated path to mainnet.",

  // Hero
  heroEyebrow: "Technology",
  heroTitlePre: "A Layer-1 that is ",
  heroTitleParallel: "parallel",
  heroTitleMid: ", ",
  heroTitlePrivate: "private",
  heroTitlePost: ", and provable",
  heroLede: "One binary, four chainspecs. A DAG that includes honest parallel work instead of orphaning it, transfers that are shielded by default, three virtual machines, and an onion Sphinx mixnet — with a single external audit standing between the code and mainnet.",

  // Consensus
  consensusEyebrow: "01 · Consensus",
  consensusTitle: "GhostDAG + TriStream",
  consensusLede1: "PYRAX orders a ",
  consensusLedeDAG: "DAG",
  consensusLede2: ", not a single chain. GhostDAG's k-cluster rule selects a \"blue set\" of well-connected blocks and orders everything relative to a selected-parent chain — so honest blocks mined in parallel are ",
  consensusLedeIncluded: "included and rewarded",
  consensusLede3: ", not orphaned. That is what lets throughput scale without sacrificing the security of proof-of-work.",

  // Seal-lane table headings
  lanesCardTitle: "Three streams · five seal lanes",
  lanesColStream: "Stream",
  lanesColSealLane: "Seal lane",
  lanesColHardware: "Hardware",

  // BLS finality card
  finalityTitle: "BLS-aggregated PoS finality",
  finalityBody1: "Proof-of-work gives probabilistic ordering; ",
  finalityStreamC: "Stream C",
  finalityBody2: " adds deterministic finality. Validators bond a minimum ",
  finalityBody3: " and vote with BLS12-381 signatures that aggregate — hundreds compress to one. A block is ",
  finalityFinal: "final once attestations cover > 2/3 of staked weight",
  finalityBody4: ", and finality overrides work.",

  // 51%-resistance card
  resistTitle: "51%-resistance across three resources",
  resistBody1: "Rewriting history would require a majority of ",
  resistBody2: " and ",
  resistBody3: " hashpower and a ",
  resistSupermajority: "staked supermajority",
  resistBody4: " — three uncorrelated supply chains at once — while GhostDAG colors withheld branches red and reverting a finalized block is a slashable offense (5% burn + 10% reporter bounty).",

  // Privacy
  privacyEyebrow: "02 · Privacy",
  privacyTitle: "Shielded by default",
  privacyLede1: "On every production network the default transfer is ",
  privacyLedeShielded: "Shielded",
  privacyLede2: " — transparent is the explicit special case, enforced at the type level. A shielded transaction reveals no sender, no receiver, and no per-note amount.",
  privacyCard1Title: "Notes, not balances",
  privacyCard1Desc: "State is a set of notes in a depth-32 note-commitment Merkle tree plus a nullifier set. Spending reveals a nullifier — never which commitment it came from.",
  privacyCard2Title: "No trusted setup",
  privacyCard2Desc: "Poseidon-over-Goldilocks proofs with a plonky2-style backend. There is no toxic-waste ceremony to trust, and the circuit is default-on today.",
  privacyCard3Title: "Auditable by choice",
  privacyCard3Desc: "Viewing keys grant read-only visibility to an auditor or regulator without ever exposing the ability to spend — private for users, provable for oversight.",
  privacyCalloutLead: "Recursive aggregation reconciles privacy with scale:",
  privacyCalloutBody: " thousands of shielded proofs fold into one recursive proof, so a validator performs roughly a single verification per batch. A flat 100-base-unit shielded fee is burned per transfer as anti-DoS.",

  // Virtual machines section
  vmsEyebrow: "03 · Virtual machines",
  vmsTitle: "Three VMs, cross-VM calls, one chain",
  vmsLede: "Deploy in the language and toolchain you already know. All three virtual machines share one state, one gas market, and can call each other — and a recursive ZK-rollup layer folds thousands of proofs into one.",
  txTypesTitle: "Six transaction types, one ledger",
  txTypesBody: "Escrow (Lock / Refund / Release / Drip / Split), Stake (Bond / Unbond / Withdraw / Slash), and Governance (Propose / Vote) are first-class transaction kinds — not bolted-on contracts.",

  // PYRAX Compute (retained for i18n dictionary compatibility)
  computeEyebrow: "04 · PYRAX Compute",
  neuraxEyebrow: "04 · PYRAX Compute",
  computeTitle: "Verifiable AI & GPU compute",
  neuraxTitle: "Verifiable AI & GPU compute",
  computeLede1: "The same GPUs that mine Stream B run paid AI and compute jobs, funded by on-chain escrow and priced at a fixed ",
  neuraxLede1: "The same GPUs that mine Stream B run paid AI and compute jobs, funded by on-chain escrow and priced at a fixed ",
  computeLedePrice: "8 PYRX per compute unit",
  neuraxLedePrice: "8 PYRX per compute unit",
  computeLede2: ". Instead of trusting a provider's word, results climb a four-rung verification ladder.",
  neuraxLede2: ". Instead of trusting a provider's word, results climb a four-rung verification ladder.",
  computeLadder1: "Redundant re-execution across independent providers",
  neuraxLadder1: "Redundant re-execution across independent providers",
  computeLadder2: "Fraud proofs that pin the single divergent step",
  neuraxLadder2: "Fraud proofs that pin the single divergent step",
  computeLadder3: "Interactive dispute — a bisection game to that step",
  neuraxLadder3: "Interactive dispute — a bisection game to that step",
  computeLadder4: "TEE attestation for hardware-sealed execution",
  neuraxLadder4: "TEE attestation for hardware-sealed execution",
  computeStat1Label: "per compute unit (1 reference-GPU-hour)",
  neuraxStat1Label: "per compute unit (1 reference-GPU-hour)",
  computeStat2Label: "AI-compute pool · ~70M/month budget",
  neuraxStat2Label: "AI-compute pool · ~70M/month budget",
  computeStat3Label: "one on-chain ComputeReceipt per verified job",
  neuraxStat3Label: "one on-chain ComputeReceipt per verified job",
  computeStat4Label: "local-first baseline; ShardedExecutor pools GPUs",
  neuraxStat4Label: "local-first baseline; ShardedExecutor pools GPUs",
  computeCta: "Explore AI & compute use cases →",
  neuraxCta: "Explore AI & compute use cases →",

  // Network
  networkEyebrow: "04 · Network",
  networkTitle: "Bootstrapless & ISP-resistant",
  networkLede: "There is no company-run starter server that can be seized or blocked. Peers discover each other through a decentralized mesh, and traffic can ride an onion Sphinx mixnet so an on-path observer — including an ISP — sees only uniform, encrypted flows.",
  networkCard1Title: "No bootstrap authority",
  networkCard1Desc: "Discovery is peer-to-peer with a relay directory and Kademlia routing. Nothing central to shut off.",
  networkCard2Title: "Onion Sphinx mixnet",
  networkCard2Desc: "Layered encryption with cover traffic hides who is talking to whom — metadata privacy, not just payload privacy.",
  networkCard3Title: "Anonymous carriage",
  networkCard3Desc: "A pull-based want/have engine moves files and media over the mixnet with reply-route loop guards and bounded reassembly.",

  // Security
  securityEyebrow: "05 · Security",
  securityTitle: "Audit-gated to mainnet",
  securityLede: "PYRAX is open-core: the protocol, node, and SDK are public. The supply cap is enforced in consensus, the fee split is frozen, and a single external audit of consensus, ZK, and the bridge stands between the code and PYRAX One.",
  securityCard1Title: "Formal invariants",
  securityCard1Desc: "Supply, finality, and nullifier-set invariants asserted in code and tested.",
  securityCard2Title: "Documented threat model",
  securityCard2Desc: "51% across three resources, rogue-key defense, DoS bounds, mempool caps.",
  securityCard3Title: "External audit gate",
  securityCard3Desc: "Consensus + ZK + bridge audited by an independent firm before mainnet.",
  securityCard4Title: "Open-core",
  securityCard4Desc: "Apache-2.0 protocol — verify the claims on this page in the source.",

  // Footer CTAs
  ctaWhitepaper: "Read the whitepaper →",
  ctaNetworks: "The four networks",
  ctaExplorer: "Open the explorer",
};
