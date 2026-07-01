// SPDX-License-Identifier: LicenseRef-Proprietary
//
// English strings for the remaining hardcoded copy on the home page (`index.astro`) and the
// live-stats widget (`LiveStats.tsx`). Flat lowerCamelCase keys; each maps 1:1 to a
// t("homeExtra.<key>", "<English>") call. English is the source of truth — other locales fall back
// to these values key-by-key.
export const homeExtra = {
  // techStats labels
  techStatMaxSupply: 'Max supply (hard cap)',
  techStatVms: 'EVM · WASM · Cairo',
  techStatSealLanes: 'TriStream seal lanes',
  techStatNetworks: 'Seed · Forge · Rise · One',
  techStatRecursiveProof: 'L3 recursive proof',
  techStatOpenCore: 'open-core protocol',

  // techCards (title + description)
  techCard1T: 'GhostDAG blockDAG',
  techCard1D: 'A multi-parent web of blocks ordered by GhostDAG (k-cluster blue set), so honest parallel work is included, not orphaned.',
  techCard2T: 'TriStream mining',
  techCard2D: 'Three streams over five seal lanes — BLAKE3 + SHA-256d (ASIC), kHeavyHash + Argon2id (GPU/CPU), and BLS proof-of-stake finality.',
  techCard3T: 'Shielded by default',
  techCard3D: 'Every transfer hides sender, receiver, and amount with plonky2 proofs — no trusted setup, and the circuit is default-on today.',
  techCard4T: 'Multi-VM L2 + ZK-rollup L3',
  techCard4D: 'EVM (revm), WASM (wasmtime), and Cairo with cross-VM calls; a recursive ZK-rollup folds thousands of proofs into one.',
  techCard5T: 'Bootstrapless & ISP-resistant',
  techCard5D: 'No company-run starter server; traffic rides an onion Sphinx mixnet so an on-path observer sees only uniform encrypted flows.',
  techCard6T: 'Audit-gated to mainnet',
  techCard6D: 'Formal invariants, a documented threat model, and a single external audit of consensus + ZK + bridge before PYRAX One.',

  // tech showcase header
  techEyebrow: 'Built, not planned',
  techHeading: 'A real, tested Layer-1 — today',
  techParagraph: 'One binary, four chainspecs: a faithful simulation on real primitives, with the production consensus path wired end-to-end and gated to mainnet by external audit.',
  readWhitepaper: 'Read the whitepaper →',
  learnMore: 'Learn more →',

  // NEURAX section
  neuraxHeading: 'Idle GPUs become a verifiable compute market',
  neuraxParagraph: 'The same hardware that mines Stream B runs paid AI and compute jobs, settled on-chain and priced at a fixed 8 PYRX per compute unit. A four-rung verification ladder — redundancy, fraud proofs, interactive dispute, and TEE attestation — replaces blind trust with cryptographic proof.',
  neuraxHowItWorks: 'How NEURAX works',
  neuraxIndustries: 'AI & compute industries →',
  neuraxTile1L: 'per compute unit (1 RTX-4090-hour)',
  neuraxTile2L: 'PYRX AI-compute pool',
  neuraxTile3L: 'verification ladder',
  neuraxTile4L: 'local-first baseline GPU',

  // industries teaser
  businessTypes: 'business types',

  // final CTA
  investorsTitle: 'For investors',
  investorsBody: 'An interactive, animated deck — the vision, the technology, the tokenomics, and the ask.',
  openPitchDeck: 'Open the pitch deck →',

  // LiveStats widget
  labelBlockHeight: 'Block height',
  labelConnectedPeers: 'Connected peers',
  labelLiveTps: 'Live TPS',
  labelFinality: 'Finality',
  subBlueScore: 'blue score',
  subFinal: 'final',
  subOffline: 'offline',
  subP2pMesh: 'P2P mesh',
  subTarget: 'target',
  subStreamC: 'Stream C · >2/3 stake',
  statusLive: 'live',
  statusAwaitingRpc: 'awaiting RPC',
};
