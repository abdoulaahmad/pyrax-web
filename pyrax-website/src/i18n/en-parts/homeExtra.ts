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
  techCard1T: 'GhostDAG',
  techCard1D: 'A multi-parent web of blocks ordered by GhostDAG (k-cluster blue set), so honest parallel work is included, not orphaned.',
  techCard2T: 'TriStream mining',
  techCard2D: 'Three streams over five seal lanes — BLAKE3 + SHA-256d (ASIC), kHeavyHash + Argon2id (GPU/CPU), and BLS proof-of-stake finality.',
  techCard3T: 'Opt-in shielded transfers',
  techCard3D: 'Transparent by default for universal exchange and tooling compatibility, with optional zero-knowledge shielded transfers and viewing keys when confidentiality is needed.',
  techCard4T: 'Multi-VM L2 + ZK-rollup L3',
  techCard4D: 'EVM (revm), WASM (wasmtime), and Cairo with cross-VM calls; a recursive ZK-rollup folds thousands of proofs into one.',
  techCard5T: 'Multi-language dApp support',
  techCard5D: 'Write smart contracts in Solidity, Rust, Vyper, or Cairo with unified JSON-RPC tooling, full EVM equivalence, and native WebAssembly execution.',
  techCard6T: 'Verifiable AI & GPU compute',
  techCard6D: 'An on-chain decentralized marketplace turning GPU hardware into verified compute for AI inference, training, and rendering with trustless escrow settlement.',

  // tech showcase header
  techEyebrow: '02 / The Architecture',
  techHeading: 'A next-generation Layer-1 in the making',
  techParagraph: 'Architected from the ground up for high throughput, opt-in privacy, and verifiable GPU compute.',
  readWhitepaper: 'Read the whitepaper →',
  learnMore: 'Learn more →',

  // PYRAX Compute / GPU Marketplace section
  computeEyebrow: '03 / PYRAX Compute · GPU Marketplace',
  computeHeading: 'Verifiable GPU compute. Decentralized on-chain.',
  computeParagraph: 'PYRAX Compute turns global GPU hardware into an open, verifiable marketplace. Run AI inference, fine-tuning, and rendering settled on-chain through cryptographic execution receipts — replacing centralized cloud monopolies with permissionless, escrow-backed compute.',
  computeHowItWorks: 'Explore PYRAX Compute',
  computeIndustries: 'Mining & compute architecture →',
  computeTile1L: 'metered compute units settled on-chain',
  computeTile2L: 'trustless on-chain job settlement',
  computeTile3L: 'verification & dispute ladder',
  computeTile4L: 'distributed provider network',

  // Legacy aliases
  neuraxHeading: 'Idle GPUs become a verifiable compute market',
  neuraxParagraph: 'The same hardware that mines Stream B runs paid AI and compute jobs, settled on-chain and priced at a fixed 8 PYRX per compute unit. A four-rung verification ladder — redundancy, fraud proofs, interactive dispute, and TEE attestation — replaces blind trust with cryptographic proof.',
  neuraxHowItWorks: 'How NEURAX works',
  neuraxIndustries: 'AI & compute industries →',
  neuraxTile1L: 'metered compute units settled on-chain',
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
