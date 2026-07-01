// SPDX-License-Identifier: LicenseRef-Proprietary
//
// English strings for the Industries section template chrome across the three Astro pages
// (industries/index.astro, industries/[category].astro, industries/[category]/[business].astro).
// Flat lowerCamelCase keys, one per wrapped string. Category/business names, taglines, blurbs,
// hooks, and all `contentFor` rich content are DATA and stay inline — not translated here.
export const industriesUi = {
  // index.astro
  eyebrow: 'Industries',
  h1Lead: 'PYRAX blockchain solutions for ',
  h1Highlight: 'every industry',
  subtitleCategories: 'categories',
  subtitleBusinessTypes: 'business types.',
  subtitleTail: ' Each with current market projections, concrete PYRAX integrations, and buildathon-ready dApp ideas.',
  allTen: 'All 10 →',

  // [category].astro
  allIndustries: '← All industries',
  cardCta: 'Financials · integrations · dApps →',

  // [category]/[business].astro
  breadcrumbIndustries: 'Industries',
  onPyrax: 'on PYRAX',
  marketSizeLabel: 'Market size',
  projectionLabel: 'Projection',
  theMarket: 'The market',
  sourcePrefix: 'Source:',
  figuresNote: 'Figures are indicative and provided for context.',
  whatsBroken: "What's broken today",
  howPyraxTransforms: 'How PYRAX transforms it',
  solutionsSubtitle: 'Concrete network elements mapped to this business.',
  buildathonTitle: 'Buildathon: dApp ideas',
  buildathonSubtitlePrefix: 'Ship-ready concepts for ',
  buildathonSubtitleSuffix: ' on PYRAX.',
  startBuilding: 'Start building →',
  briefInProgress: 'Detailed brief in progress',
  briefBodyPrefix: ' The full market analysis, PYRAX integration map, and buildathon dApp ideas for ',
  briefBodySuffix: ' are being finalized.',
  backToPrefix: 'Back to ',
  backToSuffix: ' →',
  allCategoryPrefix: 'All ',
};
