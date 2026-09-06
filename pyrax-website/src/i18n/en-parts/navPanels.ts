// SPDX-License-Identifier: LicenseRef-Proprietary
//
// English strings for the mega-menu panels (MegaNav.tsx) and the site footer (Footer.astro).
// Flat lowerCamelCase keys, one per wrapped string. Names that already resolve via nav.* keys
// (e.g. t("nav.explorer")) are NOT duplicated here; industry CATEGORY names/taglines are DATA.
export const navPanels = {
  // ProductsPanel — item descriptions
  productsExplorerDesc: 'GhostDAG blocks, shielded pool, multi-VM contracts.',
  productsNodesDesc: 'Run an Inferno node, join the mesh, earn rewards.',
  productsDevnetDesc: 'The closed-alpha tester portal for PYRAX Forge.',
  productsWalletDesc: 'Shielded + transparent, keys never leave your device.',
  // ProductsPanel — feature card
  productsFeatureEyebrow: 'Network',
  productsFeatureTitle: 'One binary, four networks',
  productsFeatureBody: 'Seed, Forge, Rise, and One — a faithful simulation on real primitives, gated to mainnet by external audit.',
  productsFeatureLink: 'Explore the network →',

  // IndustriesPanel
  industriesTitle: 'PYRAX for every industry',
  industriesBody: '10 categories · 100 business types · projections + buildathon dApp ideas.',

  // TechnologyPanel — item names + descriptions
  techConsensusName: 'GhostDAG + TriStream',
  techConsensusDesc: 'A DAG ordered by GhostDAG; three streams, five seal lanes.',
  techPrivacyName: 'Private by default',
  techPrivacyDesc: 'Shielded transfers with no-trusted-setup ZK proofs.',
  techVmsName: 'Multi-VM (EVM/WASM/Cairo)',
  techVmsDesc: 'Three virtual machines, cross-VM calls, one chain.',
  techNeuraxName: 'NEURAX compute market',
  techNeuraxDesc: 'Verifiable, on-chain-settled AI & GPU compute.',
  techSecurityName: 'Security & audits',
  techSecurityDesc: 'Formal invariants, threat model, external audit gate.',
  techWhitepaperName: 'Whitepaper v4',
  techWhitepaperDesc: 'The full technical + plain-English papers.',

  // DevelopersPanel — item descriptions
  devDocsDesc: 'Guides, RPC reference, SDK.',
  devWhitepaperDesc: 'Technical + plain-English v4.',
  devGithubDesc: 'Apache-2.0 protocol, node & SDK.',
  devTokenDesc: 'Tokenomics: 50B cap, emissions, fees.',
  // DevelopersPanel — feature card
  devFeatureEyebrow: 'Investors',
  devFeatureTitle: 'See the pitch',
  devFeatureBody: 'An interactive, animated investor deck — the vision, the tech, the tokenomics, the ask.',
  devFeatureLink: 'Open the deck →',

  // Footer — link labels not already covered by nav.* keys
  footerRoadmap: 'Roadmap',
  footerSecurity: 'Security',
};
