// SPDX-License-Identifier: LicenseRef-Proprietary
// Industry content for the "gaming-entertainment" category (10 business types).
import type { CategoryContent } from "./types";

export const content: CategoryContent = {
  "video-games": {
    overview:
      "Video games are the largest entertainment sector on earth, spanning mobile, console, and PC across free-to-play, premium, and live-service models. The industry is racing toward player-owned economies and interoperable assets, but legacy chains cannot handle the transaction volume of a live game loop. PYRAX's GhostDAG targets 500k TPS with negligible fees, making truly on-chain gameplay, items, and micro-transactions viable for the first time.",
    marketSize: "$187.7B (2024)",
    projection: "$282.3B by 2030 · ~7.1% CAGR",
    source: "Newzoo Global Games Market Report, 2024",
    stats: [
      { label: "Global players", value: "3.4B+" },
      { label: "Mobile share of revenue", value: "~49%" },
      { label: "In-game purchase revenue", value: "$100B+/yr" },
      { label: "Live-service share of playtime", value: "~60%" },
    ],
    painPoints: [
      "Players rent their items: purchases live in publisher databases and vanish when a game sunsets or an account is banned.",
      "Micro-transaction rails carry 30% platform cuts and settlement delays, crushing developer margins on small purchases.",
      "Secondary markets for skins and items are gray, fraud-ridden, and give creators zero cut of resales.",
      "Cheating and bot economies erode trust, and anti-cheat runs as an opaque black box players cannot verify.",
    ],
    solutions: [
      {
        feature: "GhostDAG 500k-TPS DAG",
        how: "Sustains the transaction rate of a live game loop, so inventory changes, crafting, and in-match micro-transactions settle on-chain with negligible fees instead of a publisher ledger.",
      },
      {
        feature: "Multi-VM true ownership (EVM/WASM/Cairo)",
        how: "Items, skins, and characters mint as portable NFTs/assets players actually own and can carry across titles, launchers, and marketplaces, surviving a game's shutdown.",
      },
      {
        feature: "Programmable resale royalties",
        how: "Every skin or item resale routes an enforced royalty split back to the studio and original creators, turning a gray secondary market into a first-party revenue stream.",
      },
      {
        feature: "PYRAX Compute verifiable compute",
        how: "AI anti-cheat and matchmaking run as verifiable compute jobs, so bans and rankings are backed by attestable evidence rather than an opaque server-side call.",
      },
      {
        feature: "Instant BLS finality",
        how: "Battle-pass unlocks, loot grants, and purchases finalize in a single confirmation, so the player sees the reward in-hand with no pending-transaction limbo.",
      },
    ],
    dapps: [
      { name: "SkinVault", desc: "Cross-title skin wallet where cosmetics mint as portable NFTs and follow the player between games.", tags: ["nft", "interoperability"] },
      { name: "LoopMint", desc: "On-chain crafting and loot engine that mints items mid-match at GhostDAG speed with sub-cent fees.", tags: ["gaming", "high-tps"] },
      { name: "FairPlay Attest", desc: "PYRAX Compute-backed anti-cheat that publishes verifiable evidence for every ban and ranking decision.", tags: ["Compute", "anti-cheat"] },
      { name: "RoyaltyForge", desc: "Studio SDK that enforces creator royalty splits on every item resale across marketplaces.", tags: ["royalties", "sdk"] },
      { name: "PassChain", desc: "Battle-pass and progression system where unlocks are player-owned assets with instant finality.", tags: ["live-service", "nft"] },
      { name: "GuildTreasury", desc: "On-chain escrow for guild banks and shared inventories with multi-sig payout rules.", tags: ["escrow", "social"] },
      { name: "ModMarket", desc: "Marketplace for user-generated mods and maps with automatic revenue share to modders.", tags: ["ugc", "marketplace"] },
      { name: "SunsetSafe", desc: "Asset-continuity vault that preserves a shuttered game's items so players keep what they bought.", tags: ["ownership", "preservation"] },
    ],
  },

  esports: {
    overview:
      "Esports has matured into a global spectator sport with franchised leagues, sponsorship deals, and eight-figure prize pools. Its money flows, tournament prize distribution, and player transfers still rely on slow, trust-heavy intermediaries. PYRAX's on-chain escrow and instant finality let prize pools, sponsor payouts, and match results settle transparently and immediately.",
    marketSize: "$4.3B (2024)",
    projection: "$9.3B by 2030 · ~13.8% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global esports audience", value: "~640M" },
      { label: "Sponsorship share of revenue", value: "~60%" },
      { label: "Annual prize money awarded", value: "$250M+" },
      { label: "Peak tournament concurrents", value: "5M+" },
    ],
    painPoints: [
      "Prize-pool disbursement is slow and opaque, with players sometimes waiting months for winnings after a major event.",
      "Sponsorship and revenue-share terms are handshake-heavy, making payout disputes common and hard to audit.",
      "Fan engagement and ticketing rely on centralized platforms that take large cuts and control the audience relationship.",
      "Match-fixing and result integrity are hard to prove, undermining trust in competitive outcomes and betting markets.",
    ],
    solutions: [
      {
        feature: "On-chain escrow prize pools",
        how: "Tournament prize money is locked in escrow and released automatically to placings the moment results finalize, ending months-long payout delays.",
      },
      {
        feature: "Programmable revenue splits",
        how: "Sponsorship and league revenue distribute to orgs, players, and coaches by on-chain rules, so every party can audit their cut in real time.",
      },
      {
        feature: "Instant BLS finality",
        how: "Winnings and sponsor bonuses settle in a single confirmation on stage, letting champions and orgs receive funds before the arena empties.",
      },
      {
        feature: "Provably-fair randomness",
        how: "Bracket seeding, map vetoes, and side selection draw from verifiable on-chain randomness, removing accusations of rigged draws.",
      },
      {
        feature: "PYRAX Compute verifiable compute",
        how: "AI match-integrity analysis flags suspicious play with attestable evidence, giving leagues an auditable basis for anti-corruption rulings.",
      },
    ],
    dapps: [
      { name: "PrizeEscrow", desc: "Tournament treasury that locks the pool and auto-pays placings on final result.", tags: ["escrow", "payouts"] },
      { name: "OrgSplit", desc: "Revenue-share contract distributing sponsorship and winnings across players, coaches, and staff.", tags: ["revenue-split", "teams"] },
      { name: "BracketProof", desc: "Provably-fair seeding and map-veto engine using verifiable on-chain randomness.", tags: ["randomness", "integrity"] },
      { name: "FanPass", desc: "Team fan tokens and season passes with resale royalties flowing back to the org.", tags: ["fan-tokens", "royalties"] },
      { name: "MatchAttest", desc: "PYRAX Compute integrity monitor publishing verifiable evidence for anti-fix rulings.", tags: ["Compute", "anti-cheat"] },
      { name: "PickemPool", desc: "Community prediction pools settled by provably-fair outcomes with instant payouts.", tags: ["prediction", "escrow"] },
      { name: "TransferLedger", desc: "Player-transfer registry with escrowed buyout fees and transparent contract terms.", tags: ["contracts", "transparency"] },
      { name: "SponsorFlow", desc: "Milestone-based sponsor payout streams that release funds as engagement KPIs are hit.", tags: ["sponsorship", "automation"] },
    ],
  },

  "virtual-worlds": {
    overview:
      "Virtual worlds and the metaverse promise persistent, user-owned digital spaces for socializing, commerce, and play. Realizing that vision requires a chain fast enough for thousands of concurrent interactions and cheap enough for constant micro-actions. PYRAX combines GhostDAG throughput, multi-VM asset ownership, and anonymous media carriage to power worlds people truly own and can move through freely.",
    marketSize: "$83.9B (2024)",
    projection: "$507.8B by 2030 · ~35.2% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Active metaverse users", value: "600M+" },
      { label: "Virtual-land & asset spend", value: "$2B+/yr" },
      { label: "Enterprise metaverse projects", value: "1,000s" },
      { label: "Gen Z socializing in-world", value: "~40%" },
    ],
    painPoints: [
      "Virtual land and avatars are locked to single platforms, so users cannot port their identity or property elsewhere.",
      "High-frequency world interactions (movement, trades, emotes) overwhelm slow chains and rack up prohibitive fees.",
      "Platform operators can censor, delete, or de-monetize creators' spaces at will, with no recourse.",
      "Creator economies leak value to platform cuts, and resale royalties on virtual goods are rarely enforced.",
    ],
    solutions: [
      {
        feature: "Multi-VM true ownership (EVM/WASM/Cairo)",
        how: "Land parcels, avatars, and wearables mint as portable assets users own across worlds, so identity and property are never trapped in one platform.",
      },
      {
        feature: "GhostDAG 500k-TPS DAG",
        how: "Handles the constant stream of in-world micro-actions and trades at negligible fees, so a bustling world stays responsive instead of grinding on gas.",
      },
      {
        feature: "Sphinx mixnet + anonymous media carriage",
        how: "Streams world assets, textures, and voice over a censorship-resistant carriage layer, so no operator can silence or de-platform a creator's space.",
      },
      {
        feature: "Programmable resale royalties",
        how: "Every secondary sale of land or wearables pays enforced royalties to the original creator, keeping value inside the creator economy.",
      },
      {
        feature: "Shielded transfers",
        how: "Private balances and shielded purchases let users trade high-value virtual property without broadcasting their net worth to the whole world.",
      },
    ],
    dapps: [
      { name: "ParcelDeed", desc: "Cross-world land registry where parcels mint as portable, royalty-bearing deeds.", tags: ["virtual-land", "nft"] },
      { name: "AvatarPort", desc: "Interoperable avatar and wearables wallet that follows the user between metaverses.", tags: ["identity", "interoperability"] },
      { name: "WorldStream", desc: "Sphinx-carried asset and voice streaming that keeps worlds censorship-resistant.", tags: ["sphinx", "streaming"] },
      { name: "BuilderRoyalty", desc: "Creator SDK enforcing resale royalties on every virtual good sold in-world.", tags: ["royalties", "creators"] },
      { name: "TickTrade", desc: "High-frequency in-world marketplace settling trades at GhostDAG speed and sub-cent cost.", tags: ["high-tps", "marketplace"] },
      { name: "ShieldedEstate", desc: "Private property vault for shielded purchase and transfer of premium parcels.", tags: ["shielded", "privacy"] },
      { name: "EventHall", desc: "Ticketed virtual venues with on-chain escrow and instant settlement for hosts.", tags: ["events", "escrow"] },
      { name: "DAOtropolis", desc: "On-chain governance for community-owned districts and shared world treasuries.", tags: ["dao", "governance"] },
    ],
  },

  "in-game-economies": {
    overview:
      "In-game economies now rival small nations in volume, moving currencies, resources, and tradable items among millions of players daily. Running these economies on-chain demands extreme throughput and near-zero fees, which legacy chains cannot deliver. PYRAX's GhostDAG is built for exactly this: real-time economies with micro-transactions at negligible cost and instant settlement.",
    marketSize: "$96.8B (2024)",
    projection: "$174.6B by 2030 · ~10.4% CAGR",
    source: "Statista Digital Market Insights, 2024",
    stats: [
      { label: "Annual virtual-goods spend", value: "$96B+" },
      { label: "Players making purchases", value: "1B+" },
      { label: "Avg. daily in-game transactions", value: "billions" },
      { label: "Secondary-market item volume", value: "$50B+/yr" },
    ],
    painPoints: [
      "Closed economies trap value: players cannot cash out, and currencies are worthless the moment a game ends.",
      "Payment rails and platform cuts make small purchases unprofitable, forcing artificial bundling and pay-to-win design.",
      "Item duplication, gold-farming, and RMT fraud are rampant and hard to police in centralized ledgers.",
      "Sinks and faucets are hidden from players, breeding distrust when economies inflate or crash unexpectedly.",
    ],
    solutions: [
      {
        feature: "GhostDAG 500k-TPS DAG",
        how: "Powers real-time economies where every trade, drop, and micro-transaction settles on-chain with negligible fees, no bundling hacks required.",
      },
      {
        feature: "Multi-VM assets (EVM/WASM/Cairo)",
        how: "In-game currencies and resources become real, ownable tokens players can hold, trade, and cash out, giving virtual value a durable floor.",
      },
      {
        feature: "Instant BLS finality",
        how: "Trades and marketplace orders finalize in a single confirmation, so a player never worries whether a sale actually went through.",
      },
      {
        feature: "Provably-fair randomness",
        how: "Loot drops, gacha pulls, and reward crates draw from verifiable on-chain randomness, so players can confirm the advertised odds are honest.",
      },
      {
        feature: "PYRAX Compute verifiable compute",
        how: "AI economy-health monitoring detects gold-farming and duplication rings with attestable evidence, keeping the ledger trustworthy.",
      },
    ],
    dapps: [
      { name: "GoldMint", desc: "On-chain game currency with transparent sinks, faucets, and real cash-out.", tags: ["tokens", "economy"] },
      { name: "DropProof", desc: "Provably-fair loot and gacha engine that publishes verifiable drop odds.", tags: ["randomness", "loot"] },
      { name: "TradePost", desc: "High-frequency item marketplace with instant finality and sub-cent fees.", tags: ["marketplace", "high-tps"] },
      { name: "EconWatch", desc: "PYRAX Compute-backed economy monitor flagging duplication and gold-farming rings.", tags: ["Compute", "anti-fraud"] },
      { name: "ResourceForge", desc: "Craftable, tradable resource tokens that persist across a studio's game portfolio.", tags: ["assets", "crafting"] },
      { name: "CashOut", desc: "Player-owned currency bridge letting earnings settle to spendable value.", tags: ["cash-out", "wallet"] },
      { name: "SinkDash", desc: "Transparent economy dashboard exposing faucets and sinks to build player trust.", tags: ["analytics", "transparency"] },
      { name: "EscrowTrade", desc: "Trustless P2P item trades with on-chain escrow to eliminate scam swaps.", tags: ["escrow", "p2p"] },
    ],
  },

  "streaming-media": {
    overview:
      "Streaming media dominates how the world watches video and listens to audio, but the model concentrates power and revenue in a few platforms that set payout rates and can de-platform at will. PYRAX's Sphinx mixnet and anonymous media carriage enable censorship-resistant streaming, while micro-payments and instant finality let creators monetize directly. Viewers get privacy; creators get paid per view without a middleman cut.",
    marketSize: "$674.3B (2024)",
    projection: "$1.9T by 2030 · ~19.3% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global streaming subscriptions", value: "1.8B+" },
      { label: "Avg. daily streaming hours", value: "~3.1 hrs" },
      { label: "Creator payout leakage", value: "30–50%" },
      { label: "Ad-supported streaming growth", value: "20%+/yr" },
    ],
    painPoints: [
      "Platforms take 30–50% of creator revenue and unilaterally set the payout rate per stream.",
      "Content and creators can be demonetized or de-platformed with no transparency or appeal.",
      "Micro-payments per view or per minute are impossible on legacy rails, forcing bundled subscriptions.",
      "Viewer data is harvested and sold, with no privacy for what people watch or listen to.",
    ],
    solutions: [
      {
        feature: "Sphinx mixnet + anonymous media carriage",
        how: "Delivers video and audio over a censorship-resistant CDN layer, so no gatekeeper can throttle, de-platform, or surveil a creator's stream.",
      },
      {
        feature: "GhostDAG micro-payments",
        how: "Enables true pay-per-view and pay-per-minute streaming at negligible fees, freeing creators from all-or-nothing subscription bundles.",
      },
      {
        feature: "Instant BLS finality",
        how: "Creator earnings settle in real time as viewers watch, replacing 30–60 day payout cycles with immediate cash flow.",
      },
      {
        feature: "Shielded transfers",
        how: "Viewers pay privately, so what a person streams stays confidential instead of feeding a data-harvesting ad engine.",
      },
      {
        feature: "Programmable royalty splits",
        how: "Revenue automatically divides among creators, collaborators, and rights-holders per on-chain rules on every view.",
      },
    ],
    dapps: [
      { name: "StreamPay", desc: "Pay-per-minute video streaming with GhostDAG micro-payments and instant creator settlement.", tags: ["micro-payments", "streaming"] },
      { name: "SphinxTube", desc: "Censorship-resistant video host carried over the Sphinx mixnet.", tags: ["sphinx", "censorship-resistant"] },
      { name: "SplitCast", desc: "Automatic revenue splitting across creators and collaborators per view.", tags: ["royalties", "revenue-split"] },
      { name: "PrivateWatch", desc: "Shielded viewer payments that keep watch history off ad networks.", tags: ["shielded", "privacy"] },
      { name: "TipStream", desc: "Live-tipping and super-chat rails with sub-cent fees and instant payout.", tags: ["tipping", "live"] },
      { name: "ClipMarket", desc: "Licensable clip marketplace with enforced royalties on reuse and remix.", tags: ["licensing", "royalties"] },
      { name: "CreatorVault", desc: "Direct fan-subscription vault where creators own the audience relationship.", tags: ["subscriptions", "creators"] },
      { name: "EdgeCarry", desc: "Community CDN nodes rewarded for relaying media over anonymous carriage.", tags: ["cdn", "sphinx"] },
    ],
  },

  "ticketing-events": {
    overview:
      "Live-event ticketing is plagued by scalping, fraud, and opaque fees that alienate fans and starve artists and venues of resale value. On-chain tickets with enforced resale royalties and price caps solve this at the protocol level. PYRAX pairs multi-VM NFT tickets with programmable resale rules and instant finality to make anti-scalping ticketing practical at stadium scale.",
    marketSize: "$78.9B (2024)",
    projection: "$134.6B by 2030 · ~9.3% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global live-event attendance", value: "billions/yr" },
      { label: "Tickets lost to fraud", value: "12%+" },
      { label: "Scalper markup on hot events", value: "up to 700%" },
      { label: "Secondary ticket market", value: "$25B+" },
    ],
    painPoints: [
      "Scalping and bots corner inventory, then resell at brutal markups that fans pay and artists never see.",
      "Counterfeit and duplicated tickets cause turned-away fans and chargeback losses at the gate.",
      "Resale value flows entirely to scalpers and platforms; artists and venues capture none of the secondary market.",
      "Ticketing fees are opaque and stacked, with service charges sometimes exceeding face value.",
    ],
    solutions: [
      {
        feature: "Multi-VM NFT tickets (EVM/WASM/Cairo)",
        how: "Each ticket is a unique, verifiable asset that cannot be counterfeited or duplicated, eliminating gate fraud and chargebacks.",
      },
      {
        feature: "Programmable resale royalties & price caps",
        how: "On-chain rules cap resale prices and route a royalty to the artist and venue on every resale, gutting scalper margins while keeping value with creators.",
      },
      {
        feature: "Instant BLS finality",
        how: "Transfers and entry validation finalize instantly at the gate, so scanning and reselling happen in real time without a pending state.",
      },
      {
        feature: "GhostDAG throughput",
        how: "Handles a stadium's worth of simultaneous drops and gate scans without congestion or spiking fees during an on-sale rush.",
      },
      {
        feature: "Provably-fair randomness",
        how: "Fair on-sale lotteries and queue ordering use verifiable randomness, giving real fans a genuine shot against bot armies.",
      },
    ],
    dapps: [
      { name: "TrueTicket", desc: "NFT tickets with enforced resale caps and artist royalties baked in.", tags: ["nft", "anti-scalping"] },
      { name: "GatePass", desc: "Instant-finality gate scanning that validates and transfers tickets in real time.", tags: ["access", "finality"] },
      { name: "FairQueue", desc: "Provably-fair on-sale lottery that gives verified fans priority over bots.", tags: ["randomness", "fairness"] },
      { name: "ResaleFloor", desc: "Regulated resale marketplace where every trade honors price caps and royalty splits.", tags: ["resale", "royalties"] },
      { name: "VenueSplit", desc: "Automatic revenue distribution across artist, promoter, and venue on primary and secondary sales.", tags: ["revenue-split", "events"] },
      { name: "PerkPass", desc: "Token-gated fan perks and VIP experiences bound to ticket ownership.", tags: ["token-gating", "loyalty"] },
      { name: "RefundEscrow", desc: "On-chain escrow that auto-refunds fans if an event is canceled.", tags: ["escrow", "refunds"] },
      { name: "CollectStub", desc: "Post-event commemorative ticket stubs that live on as collectible NFTs.", tags: ["collectibles", "nft"] },
    ],
  },

  "music-industry": {
    overview:
      "The music business is booming on streaming, yet artists still wait months for opaque royalty payments split through a maze of intermediaries. On-chain royalty splits and micro-payments pay every rights-holder instantly and transparently. PYRAX enables per-stream payouts, transparent residual splits, and censorship-resistant distribution so artists own their audience and their income.",
    marketSize: "$28.6B (2024)",
    projection: "$49.5B by 2030 · ~9.6% CAGR",
    source: "IFPI / Grand View Research, 2024",
    stats: [
      { label: "Global recorded-music revenue", value: "$28.6B" },
      { label: "Streaming share of revenue", value: "~67%" },
      { label: "Paid streaming subscribers", value: "750M+" },
      { label: "Typical royalty payout delay", value: "3–6 months" },
    ],
    painPoints: [
      "Royalties pass through labels, distributors, and collection societies, taking months and leaking value at each hop.",
      "Songwriter and producer splits are tracked in spreadsheets, causing disputes and unpaid or misattributed royalties.",
      "Per-stream payouts are fractions of a cent, and legacy rails cannot pay contributors that finely.",
      "Platforms control distribution and can demonetize or bury artists with no transparency.",
    ],
    solutions: [
      {
        feature: "Programmable royalty splits",
        how: "Songwriter, producer, and label shares are encoded on-chain and paid automatically on every stream or sale, ending spreadsheet disputes.",
      },
      {
        feature: "GhostDAG micro-payments",
        how: "Fractional per-stream payouts settle at negligible fees, so every contributor is paid precisely for each listen in real time.",
      },
      {
        feature: "Instant BLS finality",
        how: "Artists receive earnings as streams happen rather than waiting a quarterly royalty cycle, transforming cash flow for independent musicians.",
      },
      {
        feature: "Sphinx mixnet + anonymous media carriage",
        how: "Tracks distribute over a censorship-resistant carriage layer, so no platform can silently bury or de-monetize an artist.",
      },
      {
        feature: "Multi-VM NFTs",
        how: "Master rights, limited releases, and fan collectibles mint as ownable assets, letting artists sell directly and enforce resale royalties.",
      },
    ],
    dapps: [
      { name: "SplitSheet", desc: "On-chain royalty-split registry that auto-pays every contributor per stream.", tags: ["royalties", "revenue-split"] },
      { name: "StreamCoin", desc: "Per-stream micro-payment rail settling fractional payouts instantly.", tags: ["micro-payments", "streaming"] },
      { name: "MasterMint", desc: "Fractionalized master-rights tokens that pay holders a share of income.", tags: ["rights", "nft"] },
      { name: "SphinxRadio", desc: "Censorship-resistant music distribution over the Sphinx mixnet.", tags: ["sphinx", "distribution"] },
      { name: "DropVinyl", desc: "Limited digital and physical release drops with enforced resale royalties.", tags: ["collectibles", "royalties"] },
      { name: "FanFund", desc: "Direct fan-funding and pre-order escrow that releases funds on delivery.", tags: ["escrow", "crowdfunding"] },
      { name: "SyncMarket", desc: "Licensing marketplace for sync placements with instant, transparent payouts.", tags: ["licensing", "payouts"] },
      { name: "TipMic", desc: "Live-performance tipping with sub-cent fees and instant artist settlement.", tags: ["tipping", "live"] },
    ],
  },

  "film-tv": {
    overview:
      "Film and television move enormous budgets through opaque waterfalls where residuals and participations are notoriously slow and disputed. On-chain financing, escrow, and residual splits make production budgets and profit participation transparent and automatic. PYRAX brings programmable royalty waterfalls, escrowed financing, and censorship-resistant distribution to an industry hungry for accountability.",
    marketSize: "$253.8B (2024)",
    projection: "$390.6B by 2030 · ~7.5% CAGR",
    source: "PwC Global Entertainment & Media Outlook, 2024",
    stats: [
      { label: "Global film & TV revenue", value: "$253.8B" },
      { label: "SVOD subscriptions worldwide", value: "1.8B+" },
      { label: "US residuals paid annually", value: "$2.5B+" },
      { label: "Avg. residual settlement delay", value: "months" },
    ],
    painPoints: [
      "Profit-participation waterfalls are opaque, and 'Hollywood accounting' hides revenue from participants.",
      "Residuals to writers, actors, and crew are slow to calculate and frequently disputed or delayed.",
      "Independent film financing is fragmented, with capital locked and payouts contingent on trust in producers.",
      "Distribution is gatekept by platforms that can bury or geo-block content and control the audience.",
    ],
    solutions: [
      {
        feature: "Programmable royalty & residual splits",
        how: "Revenue waterfalls run as on-chain contracts, paying investors, guilds, and crew their exact residuals automatically and auditably.",
      },
      {
        feature: "On-chain escrow financing",
        how: "Production budgets are escrowed and released against verifiable milestones, giving investors transparency instead of blind trust.",
      },
      {
        feature: "Instant BLS finality",
        how: "Residual and participation payments settle immediately on each revenue event, ending the months-long wait for a residual check.",
      },
      {
        feature: "Sphinx mixnet + anonymous media carriage",
        how: "Enables censorship-resistant, geo-unrestricted distribution so filmmakers reach audiences platforms would otherwise gatekeep.",
      },
      {
        feature: "Multi-VM NFTs",
        how: "Fractional film-financing tokens and collectible releases let fans invest in and own a stake in productions with transparent upside.",
      },
    ],
    dapps: [
      { name: "WaterfallDAO", desc: "Transparent profit-participation waterfall that auto-pays every tier of investors and crew.", tags: ["royalties", "transparency"] },
      { name: "SlateFund", desc: "Escrowed film-financing platform releasing capital against production milestones.", tags: ["escrow", "financing"] },
      { name: "ResidualPay", desc: "Automatic residual engine settling guild and crew payments on each revenue event.", tags: ["residuals", "payouts"] },
      { name: "IndieMint", desc: "Fractional-ownership tokens letting fans co-finance independent films.", tags: ["nft", "crowdfunding"] },
      { name: "SphinxScreen", desc: "Censorship-resistant, geo-unrestricted film distribution over the Sphinx mixnet.", tags: ["sphinx", "distribution"] },
      { name: "RightsLedger", desc: "On-chain rights and licensing registry that clears usage and pays holders instantly.", tags: ["rights", "licensing"] },
      { name: "PremiereDrop", desc: "Token-gated premieres and collectible releases tied to a title's launch.", tags: ["token-gating", "collectibles"] },
      { name: "AuditReel", desc: "Immutable revenue ledger that ends Hollywood-accounting disputes for participants.", tags: ["audit", "accounting"] },
    ],
  },

  "sports-franchises": {
    overview:
      "Professional sports franchises are multi-billion-dollar brands built on fan loyalty, media rights, and live attendance. Fan engagement, ticketing, and merchandising still leak value to intermediaries and offer fans no true ownership. PYRAX gives franchises fan tokens, anti-scalping ticketing, and transparent revenue splits, deepening the fan relationship while capturing secondary-market value.",
    marketSize: "$512.1B (2024)",
    projection: "$826.0B by 2030 · ~8.3% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global sports market", value: "$512.1B" },
      { label: "Sports media-rights spend", value: "$60B+/yr" },
      { label: "Licensed sports merchandise", value: "$30B+/yr" },
      { label: "Franchise fan tokens issued", value: "100+" },
    ],
    painPoints: [
      "Fans have no ownership stake or lasting connection beyond passive spectating and merch purchases.",
      "Ticketing scalpers and counterfeit tickets siphon revenue that franchises and fans should keep.",
      "Merchandise and collectibles are widely counterfeited, diluting brand value and fan trust.",
      "Sponsorship and revenue-sharing arrangements are opaque and slow to reconcile across partners.",
    ],
    solutions: [
      {
        feature: "Multi-VM fan tokens & NFTs",
        how: "Franchises issue fan tokens and verifiable collectibles that grant perks, voting, and true ownership, turning spectators into stakeholders.",
      },
      {
        feature: "Anti-scalping NFT ticketing",
        how: "Season tickets and gameday passes carry enforced resale caps and royalties, keeping secondary value with the club and real fans.",
      },
      {
        feature: "Programmable revenue splits",
        how: "Sponsorship, media, and merch revenue distribute to partners and players by transparent on-chain rules, ending slow reconciliation.",
      },
      {
        feature: "Instant BLS finality",
        how: "Merch drops, ticket transfers, and fan-token rewards settle instantly, so gameday commerce keeps pace with the crowd.",
      },
      {
        feature: "Provably-fair randomness",
        how: "Fan giveaways, seat upgrades, and collectible drops use verifiable randomness, guaranteeing draws are demonstrably fair.",
      },
    ],
    dapps: [
      { name: "FanStake", desc: "Franchise fan tokens granting perks, polls, and a genuine ownership feeling.", tags: ["fan-tokens", "engagement"] },
      { name: "SeasonPass", desc: "NFT season tickets with resale caps and royalties flowing back to the club.", tags: ["nft", "anti-scalping"] },
      { name: "GearAuth", desc: "Merch authenticity NFTs that verify licensed gear and kill counterfeits.", tags: ["authentication", "merch"] },
      { name: "MomentDrop", desc: "Officially licensed highlight and collectible drops with provably-fair distribution.", tags: ["collectibles", "randomness"] },
      { name: "RevShare", desc: "Transparent sponsorship and media-rights revenue splitter across partners.", tags: ["revenue-split", "sponsorship"] },
      { name: "PredictHome", desc: "Fan prediction games with escrowed pools and instant, provably-fair payouts.", tags: ["prediction", "escrow"] },
      { name: "PerkGate", desc: "Token-gated stadium experiences and VIP access tied to fan-token holdings.", tags: ["token-gating", "loyalty"] },
      { name: "PlayerBond", desc: "Athlete-backed collectibles and revenue-share tokens for direct fan support.", tags: ["athletes", "nft"] },
    ],
  },

  "gambling-igaming": {
    overview:
      "iGaming (online casinos, sportsbooks, and lotteries) is a fast-growing sector where trust in fairness and payout reliability is everything. Provably-fair randomness and on-chain escrow give players cryptographic proof that games are honest and winnings are guaranteed. PYRAX delivers verifiable randomness, instant payouts, and shielded balances to make iGaming transparent, fast, and private.",
    marketSize: "$97.2B (2024)",
    projection: "$186.4B by 2030 · ~11.5% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global iGaming revenue", value: "$97.2B" },
      { label: "Online-sports-betting share", value: "~40%" },
      { label: "Mobile share of wagers", value: "~65%" },
      { label: "Regulated markets worldwide", value: "80+" },
    ],
    painPoints: [
      "Players cannot verify that games are fair; RNG and house edge are opaque black boxes.",
      "Withdrawals are slow and sometimes withheld, eroding trust that winnings will actually be paid.",
      "Bankrolls and betting activity are exposed, offering players no financial privacy.",
      "Cross-border payments and KYC friction make deposits and payouts costly and slow.",
    ],
    solutions: [
      {
        feature: "Provably-fair randomness",
        how: "Every deal, spin, and roll draws from verifiable on-chain randomness, letting any player cryptographically confirm the outcome was not manipulated.",
      },
      {
        feature: "On-chain escrow payouts",
        how: "Bets and jackpots are held in escrow and released automatically on a verified result, guaranteeing winners are paid without operator discretion.",
      },
      {
        feature: "Instant BLS finality",
        how: "Deposits and withdrawals finalize in a single confirmation, replacing multi-day payout holds with immediate settlement.",
      },
      {
        feature: "Shielded transfers",
        how: "Private balances and shielded wagers keep a player's bankroll and betting activity confidential instead of on a public feed.",
      },
      {
        feature: "GhostDAG throughput",
        how: "Sustains high-frequency in-play betting and slot spins at negligible fees, so a busy sportsbook never chokes during a big event.",
      },
    ],
    dapps: [
      { name: "ProvablyFair", desc: "Verifiable RNG engine that publishes a cryptographic proof for every game outcome.", tags: ["randomness", "fairness"] },
      { name: "InstantCashier", desc: "Escrowed deposit and withdrawal rail with single-confirmation payouts.", tags: ["escrow", "payouts"] },
      { name: "ShieldedBet", desc: "Private wagering wallet that keeps bankroll and bet history confidential.", tags: ["shielded", "privacy"] },
      { name: "LivePool", desc: "High-frequency in-play sportsbook settling wagers at GhostDAG speed.", tags: ["sports-betting", "high-tps"] },
      { name: "JackpotVault", desc: "Progressive-jackpot escrow that auto-pays the verified winner in full.", tags: ["jackpot", "escrow"] },
      { name: "FairLotto", desc: "Transparent on-chain lottery with provably-fair draws and instant prizes.", tags: ["lottery", "randomness"] },
      { name: "ResponsibleLedger", desc: "On-chain self-exclusion and limit controls for verifiable responsible gaming.", tags: ["compliance", "safety"] },
      { name: "AffiliateSplit", desc: "Transparent affiliate and rake revenue-sharing paid out in real time.", tags: ["revenue-split", "affiliates"] },
    ],
  },
};

