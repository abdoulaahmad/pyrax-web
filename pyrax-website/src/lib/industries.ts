// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The Industries taxonomy: 10 categories × 10 business types = 100 detail pages. This file is the
// backbone (slugs, names, hooks, category metadata) for the mega-menu, the /industries hub, each
// /industries/[category] page, and every /industries/[category]/[business] detail page. The rich
// per-business content (market projections, PYRAX integrations, buildathon dApp ideas) lives in
// src/lib/industry-content/ and is keyed by "<category>/<business>".

export interface BusinessType {
  slug: string;
  name: string;
  hook: string; // one line: what PYRAX unlocks for this business type
}

export interface IndustryCategory {
  slug: string;
  name: string;
  tagline: string;
  icon: string;   // key resolved to an inline SVG in the UI
  color: string;  // accent
  blurb: string;
  businesses: BusinessType[];
}

export const CATEGORIES: IndustryCategory[] = [
  {
    slug: "finance-banking", name: "Finance & Banking", tagline: "Programmable, private, instant money",
    icon: "bank", color: "#f58722",
    blurb: "Settlement in seconds, privacy by default, and compliance you can prove — DeFi rails, payments, lending, and capital markets on one chain.",
    businesses: [
      { slug: "retail-banking", name: "Retail Banking", hook: "Shielded accounts, instant transfers, and audited reserves." },
      { slug: "payments-remittances", name: "Payments & Remittances", hook: "Sub-cent cross-border transfers that settle in seconds." },
      { slug: "lending-credit", name: "Lending & Credit", hook: "On-chain collateral, transparent rates, private borrowers." },
      { slug: "capital-markets", name: "Capital Markets", hook: "Tokenized securities with instant, atomic settlement." },
      { slug: "asset-management", name: "Asset Management", hook: "Verifiable funds, private positions, programmable mandates." },
      { slug: "insurance", name: "Insurance", hook: "Parametric policies and instant, oracle-triggered claims." },
      { slug: "trade-finance", name: "Trade Finance", hook: "Letters of credit and invoices as verifiable on-chain assets." },
      { slug: "wealth-management", name: "Wealth Management", hook: "Confidential portfolios with auditor-only viewing keys." },
      { slug: "neobanks", name: "Neobanks & Fintech", hook: "Embed shielded rails and compute into any app." },
      { slug: "cross-border-settlement", name: "Cross-Border Settlement", hook: "24/7 interbank settlement with BLS finality." },
    ],
  },
  {
    slug: "supply-chain-logistics", name: "Supply Chain & Logistics", tagline: "Provenance you can trust, privately",
    icon: "truck", color: "#60b8cc",
    blurb: "Track goods end-to-end with tamper-proof provenance, keep commercial terms confidential, and settle carriers automatically.",
    businesses: [
      { slug: "freight-shipping", name: "Freight & Shipping", hook: "Bills of lading and milestones anchored on-chain." },
      { slug: "warehousing", name: "Warehousing", hook: "Real-time, verifiable inventory with private pricing." },
      { slug: "cold-chain", name: "Cold Chain", hook: "IoT-attested temperature history from farm to shelf." },
      { slug: "provenance-tracking", name: "Provenance Tracking", hook: "Prove origin and authenticity without exposing suppliers." },
      { slug: "customs-trade", name: "Customs & Trade Compliance", hook: "Shareable, auditable trade documents across borders." },
      { slug: "last-mile-delivery", name: "Last-Mile Delivery", hook: "Proof-of-delivery and instant courier settlement." },
      { slug: "procurement", name: "Procurement", hook: "Sealed-bid tenders with verifiable, private auctions." },
      { slug: "fleet-management", name: "Fleet Management", hook: "Telematics, maintenance, and usage-based settlement." },
      { slug: "maritime", name: "Maritime & Ports", hook: "Port calls and container events as a shared ledger." },
      { slug: "air-cargo", name: "Air Cargo", hook: "e-AWB and handling milestones with private rates." },
    ],
  },
  {
    slug: "healthcare-life-sciences", name: "Healthcare & Life Sciences", tagline: "Private data, provable integrity",
    icon: "health", color: "#34d399",
    blurb: "Patient privacy by default, tamper-proof records, and verifiable trials — with viewing keys that let regulators audit without exposing patients.",
    businesses: [
      { slug: "hospitals-providers", name: "Hospitals & Providers", hook: "Patient-controlled records with shielded access." },
      { slug: "pharma-supply", name: "Pharmaceutical Supply", hook: "Serialize drugs and kill counterfeits end-to-end." },
      { slug: "medical-records", name: "Medical Records (EHR)", hook: "Portable, consent-gated, tamper-evident health data." },
      { slug: "clinical-trials", name: "Clinical Trials", hook: "Immutable protocols and verifiable, private results." },
      { slug: "health-insurance", name: "Health Insurance", hook: "Automated, private claims with fraud-resistant proofs." },
      { slug: "telemedicine", name: "Telemedicine", hook: "Encrypted consults and provable prescriptions." },
      { slug: "medical-devices", name: "Medical Devices", hook: "Device provenance, firmware attestation, usage logs." },
      { slug: "genomics", name: "Genomics", hook: "Confidential genomic data with compute-to-data." },
      { slug: "biotech-research", name: "Biotech Research", hook: "Verifiable lab data and IP timestamping." },
      { slug: "mental-health", name: "Mental Health", hook: "Anonymous, private care and outcome tracking." },
    ],
  },
  {
    slug: "gaming-entertainment", name: "Gaming & Entertainment", tagline: "Real ownership, real economies",
    icon: "game", color: "#7c5cff",
    blurb: "500k-TPS scale for real-time economies, true player ownership, private balances, and instant micro-settlement at zero-friction cost.",
    businesses: [
      { slug: "video-games", name: "Video Games", hook: "Player-owned assets and cross-game economies." },
      { slug: "esports", name: "Esports", hook: "Verifiable results, prize escrow, fan tokens." },
      { slug: "virtual-worlds", name: "Virtual Worlds & Metaverse", hook: "On-chain land, identity, and interoperable items." },
      { slug: "in-game-economies", name: "In-Game Economies", hook: "Micro-transactions at 500k TPS, private wallets." },
      { slug: "streaming-media", name: "Streaming Media", hook: "Censorship-resistant streaming over the mixnet CDN." },
      { slug: "ticketing-events", name: "Ticketing & Events", hook: "Anti-scalping tickets with programmable resale." },
      { slug: "music-industry", name: "Music Industry", hook: "Instant royalty splits and fan-direct sales." },
      { slug: "film-tv", name: "Film & Television", hook: "Transparent financing and automated residuals." },
      { slug: "sports-franchises", name: "Sports & Franchises", hook: "Fan engagement, collectibles, and revenue shares." },
      { slug: "gambling-igaming", name: "iGaming", hook: "Provably-fair games with private, instant payouts." },
    ],
  },
  {
    slug: "real-estate-property", name: "Real Estate & Property", tagline: "Liquid, fractional, verifiable",
    icon: "building", color: "#f5a623",
    blurb: "Tokenize property, make ownership fractional and liquid, and keep an immutable land registry — with private valuations and instant settlement.",
    businesses: [
      { slug: "residential-sales", name: "Residential Sales", hook: "Atomic title transfer and escrow in one transaction." },
      { slug: "commercial-property", name: "Commercial Property", hook: "Tokenized leases and automated rent flows." },
      { slug: "property-management", name: "Property Management", hook: "Transparent maintenance and deposit escrow." },
      { slug: "real-estate-investment", name: "Real Estate Investment (REITs)", hook: "Fractional, liquid, compliant on-chain funds." },
      { slug: "mortgage-lending", name: "Mortgage Lending", hook: "Programmable loans with private borrower data." },
      { slug: "construction", name: "Construction", hook: "Milestone-based payments and material provenance." },
      { slug: "land-registry", name: "Land Registry", hook: "Tamper-proof title with government viewing keys." },
      { slug: "fractional-ownership", name: "Fractional Ownership", hook: "Own a fraction of a building, trade it instantly." },
      { slug: "short-term-rentals", name: "Short-Term Rentals", hook: "Trustless bookings, deposits, and reputation." },
      { slug: "proptech", name: "PropTech", hook: "IoT building data and smart-lease automation." },
    ],
  },
  {
    slug: "energy-sustainability", name: "Energy & Sustainability", tagline: "Trustworthy carbon, peer-to-peer power",
    icon: "energy", color: "#34d399",
    blurb: "Peer-to-peer energy trading, verifiable carbon credits that can't be double-counted, and grid coordination at machine speed.",
    businesses: [
      { slug: "power-utilities", name: "Power Utilities", hook: "Real-time metering and automated settlement." },
      { slug: "renewable-energy", name: "Renewable Energy", hook: "Prove green generation with verifiable RECs." },
      { slug: "carbon-markets", name: "Carbon Markets", hook: "Double-spend-proof carbon credits with provenance." },
      { slug: "oil-gas", name: "Oil & Gas", hook: "Custody transfer and emissions attestation." },
      { slug: "ev-charging", name: "EV Charging", hook: "Roaming, machine-to-machine micro-payments." },
      { slug: "grid-management", name: "Grid Management", hook: "Demand-response coordination and settlement." },
      { slug: "water-utilities", name: "Water Utilities", hook: "Usage provenance and quality attestation." },
      { slug: "waste-recycling", name: "Waste & Recycling", hook: "Verifiable circular-economy incentives." },
      { slug: "energy-trading", name: "Energy Trading", hook: "P2P trading with private positions, instant settle." },
      { slug: "esg-reporting", name: "ESG Reporting", hook: "Auditable sustainability data you can't fake." },
    ],
  },
  {
    slug: "government-public-sector", name: "Government & Public Sector", tagline: "Verifiable trust for citizens",
    icon: "gov", color: "#60b8cc",
    blurb: "Self-sovereign identity, end-to-end-verifiable voting, and tamper-proof public records — private for citizens, auditable for oversight.",
    businesses: [
      { slug: "digital-identity", name: "Digital Identity", hook: "Self-sovereign, selective-disclosure credentials." },
      { slug: "voting-elections", name: "Voting & Elections", hook: "End-to-end verifiable, private, coercion-resistant." },
      { slug: "public-records", name: "Public Records", hook: "Immutable registries anyone can verify." },
      { slug: "tax-revenue", name: "Tax & Revenue", hook: "Automated, auditable collection with privacy." },
      { slug: "benefits-welfare", name: "Benefits & Welfare", hook: "Direct, fraud-resistant, dignity-preserving payments." },
      { slug: "smart-cities", name: "Smart Cities", hook: "IoT coordination and transparent budgets." },
      { slug: "defense-security", name: "Defense & Security", hook: "Attested supply chains and secure comms." },
      { slug: "education-public", name: "Public Education", hook: "Verifiable credentials and transparent funding." },
      { slug: "judicial-legal", name: "Judicial & Legal", hook: "Timestamped evidence and tamper-proof records." },
      { slug: "licensing-permits", name: "Licensing & Permits", hook: "Instant, verifiable, self-service issuance." },
    ],
  },
  {
    slug: "retail-commerce", name: "Retail & Commerce", tagline: "Loyalty, authenticity, and instant checkout",
    icon: "cart", color: "#f58722",
    blurb: "Interoperable loyalty, provable authenticity for luxury and brands, and payments that settle instantly with private customer data.",
    businesses: [
      { slug: "ecommerce", name: "E-Commerce", hook: "Instant settlement, private checkout, no chargebacks." },
      { slug: "brick-mortar-retail", name: "Brick-and-Mortar Retail", hook: "Unified loyalty and inventory across stores." },
      { slug: "loyalty-rewards", name: "Loyalty & Rewards", hook: "Interoperable points users actually own." },
      { slug: "luxury-goods", name: "Luxury Goods", hook: "Authenticity certificates that follow the item." },
      { slug: "fashion-apparel", name: "Fashion & Apparel", hook: "Provenance, resale royalties, digital twins." },
      { slug: "food-beverage", name: "Food & Beverage", hook: "Farm-to-table provenance and safety recalls." },
      { slug: "consumer-electronics", name: "Consumer Electronics", hook: "Warranty, resale, and grey-market protection." },
      { slug: "marketplaces", name: "Marketplaces", hook: "Trustless escrow and reputation for any market." },
      { slug: "subscription-commerce", name: "Subscription Commerce", hook: "Programmable, cancel-anytime recurring payments." },
      { slug: "franchising", name: "Franchising", hook: "Automated royalties and transparent unit economics." },
    ],
  },
  {
    slug: "media-art-creator", name: "Media, Art & Creator Economy", tagline: "Creators keep the value",
    icon: "art", color: "#7c5cff",
    blurb: "Direct monetization, enforceable royalties, and censorship-resistant publishing — with the mixnet protecting sources and audiences.",
    businesses: [
      { slug: "digital-art-nfts", name: "Digital Art & NFTs", hook: "Provable scarcity and perpetual creator royalties." },
      { slug: "creator-monetization", name: "Creator Monetization", hook: "Fan-direct payments with no platform cut." },
      { slug: "journalism-news", name: "Journalism & News", hook: "Source protection over the mixnet, tip provenance." },
      { slug: "publishing", name: "Publishing", hook: "Rights management and automated author payouts." },
      { slug: "photography", name: "Photography", hook: "Licensing, provenance, and anti-theft attribution." },
      { slug: "advertising", name: "Advertising", hook: "Verifiable impressions without surveillance." },
      { slug: "influencer-marketing", name: "Influencer Marketing", hook: "Escrowed deals and provable reach." },
      { slug: "collectibles", name: "Collectibles", hook: "Authenticated, tradeable digital and physical items." },
      { slug: "licensing-ip", name: "Licensing & IP", hook: "Timestamped IP and programmable license terms." },
      { slug: "podcasting", name: "Podcasting", hook: "Listener-direct support and portable subscriptions." },
    ],
  },
  {
    slug: "ai-data-compute", name: "AI, Data & Compute", tagline: "Verifiable compute, owned data",
    icon: "chip", color: "#fcd03d",
    blurb: "NEURAX turns idle GPUs into a verifiable compute marketplace, data becomes a private asset, and AI results come with cryptographic proof.",
    businesses: [
      { slug: "ai-inference", name: "AI Inference", hook: "Pay-per-CU inference with verified, private results." },
      { slug: "decentralized-compute", name: "Decentralized Compute", hook: "Rent idle GPUs; proofs replace blind trust." },
      { slug: "data-marketplaces", name: "Data Marketplaces", hook: "Sell access, not data, via compute-to-data." },
      { slug: "machine-learning-ops", name: "ML Ops & Training", hook: "Distributed training with staked, audited workers." },
      { slug: "iot-devices", name: "IoT & Devices", hook: "Machine identity and micro-payments at scale." },
      { slug: "cybersecurity", name: "Cybersecurity", hook: "Tamper-proof logs and decentralized threat intel." },
      { slug: "cloud-storage", name: "Cloud & Storage", hook: "Encrypted, content-addressed, censorship-resistant." },
      { slug: "scientific-computing", name: "Scientific Computing", hook: "Verifiable results for research at grant scale." },
      { slug: "edge-computing", name: "Edge Computing", hook: "Local-first AI on consumer GPUs, settled on-chain." },
      { slug: "synthetic-data", name: "Synthetic Data", hook: "Privacy-preserving datasets with provenance." },
    ],
  },
];

export const categoryBySlug = (slug: string): IndustryCategory | undefined => CATEGORIES.find((c) => c.slug === slug);
export const businessBySlug = (cat: string, biz: string): BusinessType | undefined =>
  categoryBySlug(cat)?.businesses.find((b) => b.slug === biz);
export const TOTAL_INDUSTRIES = CATEGORIES.reduce((a, c) => a + c.businesses.length, 0); // 100
