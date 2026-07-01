// SPDX-License-Identifier: LicenseRef-Proprietary
// Industry content for the "retail-commerce" category (10 business types). Filled by content pass.
import type { CategoryContent } from "./types";

export const content: CategoryContent = {
  "ecommerce": {
    overview:
      "E-commerce moves trillions in online sales yet still leans on card networks, payment processors, and marketplaces that skim fees, hold funds for days, and expose buyer data at every hop. PYRAX gives online retailers an instantly-final, shielded checkout rail with no chargebacks and near-zero fees, plus verifiable product provenance and privacy-preserving personalization that never surveils the shopper.",
    marketSize: "$6.3T (2024)",
    projection: "$12.0T by 2030 · ~11.6% CAGR",
    source: "Statista Digital Market Insights, 2024",
    stats: [
      { label: "Global e-commerce sales", value: "$6.3T" },
      { label: "E-commerce share of retail", value: "~21%" },
      { label: "Avg. cart-abandonment rate", value: "70%" },
      { label: "Global chargeback losses", value: "$117B" },
    ],
    painPoints: [
      "Payment processors and card networks take 2-4% per order and hold settlement for days.",
      "Chargebacks and friendly fraud reverse completed sales and cost merchants billions annually.",
      "Checkout exposes card, address, and identity data to a chain of processors and acquirers.",
      "Personalization depends on invasive tracking that erodes trust and triggers privacy regulation.",
    ],
    solutions: [
      {
        feature: "Shielded ZK checkout + BLS finality",
        how: "Payment settles peer-to-peer in one block with amounts and buyer identity hidden - no card data to leak, no processor float, and no chargeback reversals to fight, since a shielded settlement is irreversible.",
      },
      {
        feature: "Multi-VM NFT product certificates",
        how: "Each item ships with an on-chain certificate proving authenticity and origin, so shoppers verify a listing is genuine before buying and the cert follows the product into resale.",
      },
      {
        feature: "GhostDAG blockDAG (500k-TPS target)",
        how: "Parallel throughput absorbs flash-sale and holiday peaks - millions of orders per hour - without congestion pricing or checkout timeouts.",
      },
      {
        feature: "NEURAX verifiable AI recommendations",
        how: "Product recommendations run on cryptographically verifiable compute against data the shopper controls, delivering personalization without harvesting a behavioral profile.",
      },
      {
        feature: "Sphinx mixnet private advertising",
        how: "Ads and retargeting route through network-layer mixing so campaigns reach relevant audiences without linking a person to their browsing and purchase history.",
      },
    ],
    dapps: [
      { name: "ShieldCheckout", desc: "Drop-in shielded checkout widget that settles orders in one block with no card data, no processor, and no chargeback exposure.", tags: ["Shielded", "Finality"] },
      { name: "CertifyCart", desc: "Attaches a multi-VM NFT authenticity certificate to every SKU so buyers verify origin before purchase and it transfers on resale.", tags: ["NFT", "EVM"] },
      { name: "PrivateRec", desc: "NEURAX recommendation engine that personalizes on shopper-owned data with a verifiable-compute proof and zero tracking.", tags: ["NEURAX", "Shielded"] },
      { name: "FlashScale", desc: "Flash-sale order pipeline built on GhostDAG parallelism to clear millions of micro-orders without congestion.", tags: ["GhostDAG", "EVM"] },
      { name: "AdMix", desc: "Mixnet-routed advertising exchange that targets by cohort without surveilling individuals.", tags: ["Mixnet", "Privacy"] },
      { name: "ReturnEscrow", desc: "On-chain escrow that holds payment until a delivery or return window closes, releasing funds atomically.", tags: ["Escrow", "EVM"] },
      { name: "ReviewProof", desc: "Verified-purchase review registry where only wallets that paid for an item can post, killing fake reviews.", tags: ["EVM", "Reputation"] },
      { name: "MicroTip", desc: "Sub-cent creator and affiliate payouts streamed per conversion via GhostDAG micro-payments.", tags: ["GhostDAG", "Finality"] },
    ],
  },

  "brick-mortar-retail": {
    overview:
      "Physical retail still drives the majority of sales but pays interchange on every card swipe, waits on nightly batch settlement, and struggles to unify online and in-store inventory. PYRAX turns the point of sale into an instantly-final, low-fee rail with shielded payments, on-chain provenance for high-value goods, and portable loyalty that works whether a customer shops in the aisle or online.",
    marketSize: "$23.9T (2024)",
    projection: "$32.8T by 2030 · ~5.4% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global retail sales", value: "$23.9T" },
      { label: "In-store share of retail", value: "~79%" },
      { label: "Avg. card interchange", value: "1.5-3.5%" },
      { label: "Annual retail shrink", value: "$142B" },
    ],
    painPoints: [
      "Interchange and processing fees erode already-thin in-store margins on every transaction.",
      "Nightly batch settlement leaves a day of card float and reconciliation before cash arrives.",
      "Inventory, loyalty, and payments are siloed across POS, online, and third-party systems.",
      "Counterfeit and grey-market goods slip into shelves without verifiable provenance.",
    ],
    solutions: [
      {
        feature: "BLS finality at the point of sale",
        how: "A tap or scan settles in one block with irreversible finality, so the merchant has spendable value instantly instead of waiting on batch clearing and interchange netting.",
      },
      {
        feature: "Shielded ZK payments",
        how: "In-store payments hide amount and customer identity while a scoped viewing key gives the retailer's finance team the reconciliation view it needs.",
      },
      {
        feature: "Multi-VM NFT provenance certificates",
        how: "High-value shelf goods carry an authenticity certificate a customer can scan in-aisle to confirm the item is genuine and not diverted grey-market stock.",
      },
      {
        feature: "Interoperable user-owned loyalty points",
        how: "Loyalty balances live in the shopper's wallet as real, ownable points that redeem identically in-store and online and can be pooled across partner brands.",
      },
      {
        feature: "GhostDAG micro-payments",
        how: "Sub-cent, high-frequency transactions support in-store tipping, micro-rewards, and per-item cashback without fee overhead swamping the amount.",
      },
    ],
    dapps: [
      { name: "TapFinal", desc: "POS payment app that settles each swipe in one block with BLS finality and no interchange or batch delay.", tags: ["Finality", "EVM"] },
      { name: "ShelfCert", desc: "In-aisle scan-to-verify authenticity certificates for high-value or age-restricted goods.", tags: ["NFT", "Provenance"] },
      { name: "OmniPoints", desc: "Wallet-native loyalty that earns and redeems identically across register, app, and web.", tags: ["Loyalty", "EVM"] },
      { name: "ShrinkTrace", desc: "On-chain custody log for high-shrink SKUs from receiving dock to register to cut theft and diversion.", tags: ["Provenance", "WASM"] },
      { name: "ShieldTill", desc: "Shielded in-store payments with a compliance viewing key for the store's accounting desk.", tags: ["Shielded", "Finality"] },
      { name: "AisleCash", desc: "Per-item micro-cashback streamed to the shopper's wallet at checkout via GhostDAG.", tags: ["GhostDAG", "Loyalty"] },
      { name: "StockSync", desc: "Unified on-chain inventory ledger reconciling in-store and online stock in real time.", tags: ["EVM", "Oracle"] },
      { name: "GiftMint", desc: "Programmable gift cards minted on-chain that never expire silently and are transferable and verifiable.", tags: ["EVM", "Loyalty"] },
    ],
  },

  "loyalty-rewards": {
    overview:
      "Loyalty programs sit on billions in unredeemed points that customers cannot own, move, or trade, while brands carry the liability and shoppers lose value to breakage. PYRAX makes loyalty points real, user-owned, and interoperable assets that redeem across brands, settle instantly, and stay private, turning a stranded liability into a liquid, engaging currency.",
    marketSize: "$8.6B (2024)",
    projection: "$28.7B by 2030 · ~22.3% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Loyalty management market", value: "$8.6B" },
      { label: "Value of unredeemed points", value: "$100B+" },
      { label: "Avg. program breakage", value: "10-20%" },
      { label: "Consumers in 5+ programs", value: "67%" },
    ],
    painPoints: [
      "Points are non-transferable ledger entries the customer never truly owns.",
      "Breakage strands tens of billions in value that expires unused each year.",
      "Programs are siloed - points from one brand are worthless everywhere else.",
      "Central point ledgers can be devalued or clawed back with no customer recourse.",
    ],
    solutions: [
      {
        feature: "Interoperable user-owned loyalty points",
        how: "Points are on-chain tokens the customer holds in their own wallet - transferable, provably scarce, and redeemable across any participating brand in a shared coalition.",
      },
      {
        feature: "BLS finality for instant redemption",
        how: "Earning and redeeming clear in one block, so a point earned at checkout is immediately spendable elsewhere with no pending or reconciliation window.",
      },
      {
        feature: "Multi-VM programmable rewards",
        how: "Tiering, expiry, bonus multipliers, and cross-brand exchange rates are encoded in transparent smart contracts instead of opaque program terms.",
      },
      {
        feature: "Shielded ZK balances",
        how: "A member's point balance and redemption history stay private on-chain, with a viewing key for the program operator's own analytics and audit.",
      },
      {
        feature: "NEURAX verifiable personalization",
        how: "Reward offers are targeted by verifiable AI on member-controlled data, so a customer gets relevant perks without the brand assembling a surveillance profile.",
      },
    ],
    dapps: [
      { name: "PointVault", desc: "Wallet-native loyalty balances the customer truly owns, transfers, and redeems across a brand coalition.", tags: ["Loyalty", "EVM"] },
      { name: "CoalitionSwap", desc: "Cross-brand point exchange with programmable, on-chain conversion rates and instant settlement.", tags: ["Loyalty", "Finality"] },
      { name: "TierEngine", desc: "Smart-contract tiering and multiplier logic that is transparent and can't be silently changed.", tags: ["EVM", "Gov"] },
      { name: "NoBreakage", desc: "Points issued as durable on-chain tokens that never expire without an explicit, auditable rule.", tags: ["Loyalty", "WASM"] },
      { name: "PerkMatch", desc: "NEURAX offer engine that personalizes rewards on member-owned data with a verifiable-compute proof.", tags: ["NEURAX", "Shielded"] },
      { name: "GiftBridge", desc: "Converts loyalty points to and from gift cards and stablecoin value in one atomic transaction.", tags: ["Escrow", "EVM"] },
      { name: "RewardStream", desc: "Streams micro-rewards per interaction (visit, referral, review) via GhostDAG micro-payments.", tags: ["GhostDAG", "Loyalty"] },
      { name: "ClaimProof", desc: "Verified-action rewards where only wallets that provably completed an action can claim, blocking fraud.", tags: ["EVM", "Reputation"] },
    ],
  },

  "luxury-goods": {
    overview:
      "Luxury depends entirely on authenticity, scarcity, and brand control, yet loses billions to counterfeits and a grey market it cannot see. PYRAX binds each luxury item to a multi-VM NFT certificate that proves it is genuine, follows the product through every resale, and pays the brand a programmable royalty on secondary sales - all while keeping the owner's identity and purchase private.",
    marketSize: "$369B (2024)",
    projection: "$531B by 2030 · ~6.3% CAGR",
    source: "Statista Consumer Market Insights, 2024",
    stats: [
      { label: "Global personal luxury market", value: "$369B" },
      { label: "Luxury resale market", value: "$50B" },
      { label: "Counterfeit goods trade", value: "$460B" },
      { label: "Consumers wanting proof", value: "60%+" },
    ],
    painPoints: [
      "Counterfeits erode brand equity and divert hundreds of billions in sales.",
      "Brands have no visibility into or revenue from a fast-growing resale market.",
      "Paper certificates and holograms are easily forged and lost.",
      "High-net-worth buyers want discretion but current provenance systems expose ownership.",
    ],
    solutions: [
      {
        feature: "Multi-VM NFT authenticity certificates",
        how: "Every item is minted with a tamper-proof certificate binding serial, materials, and origin to the physical product, so a buyer can verify authenticity instantly and forgeries become worthless.",
      },
      {
        feature: "Certificate follows the item + resale royalties",
        how: "The cert transfers with the product on every resale and encodes a programmable royalty, so the brand earns automatically each time the piece changes hands in the secondary market.",
      },
      {
        feature: "Shielded ownership and transfers",
        how: "Ownership and purchase amounts are ZK-shielded, giving discreet clients privacy while a viewing key still lets the brand verify a certificate's chain of custody.",
      },
      {
        feature: "GhostDAG-scale provenance events",
        how: "Service, repair, and authentication events append to the item's on-chain history at scale, building a complete, verifiable lifetime record for each piece.",
      },
      {
        feature: "NEURAX verifiable authentication AI",
        how: "AI authentication of images and materials produces a verifiable proof attached to the certificate, so a resale platform can trust the grade without re-inspecting.",
      },
    ],
    dapps: [
      { name: "GenuineTag", desc: "Mints a tamper-proof NFT certificate bound to each luxury item's serial and materials for instant verification.", tags: ["NFT", "Provenance"] },
      { name: "ResaleRoyalty", desc: "Encodes a programmable brand royalty that auto-pays on every certified secondary-market resale.", tags: ["EVM", "NFT"] },
      { name: "DiscreetOwn", desc: "Shielded ownership records that keep the collector private while preserving verifiable provenance.", tags: ["Shielded", "NFT"] },
      { name: "LifeLog", desc: "Append-only service, repair, and authentication history for each piece across its lifetime.", tags: ["Provenance", "WASM"] },
      { name: "AuthAI", desc: "NEURAX visual authenticator that grades an item and attaches a verifiable proof to its certificate.", tags: ["NEURAX", "ZK"] },
      { name: "VaultBox", desc: "Custody and insurance registry linking a physical vault or authenticator to the on-chain certificate.", tags: ["Escrow", "EVM"] },
      { name: "GreyGuard", desc: "Grey-market detector that flags certificates surfacing in unauthorized channels.", tags: ["Provenance", "Oracle"] },
      { name: "CollectorClub", desc: "Certificate-gated membership and drops for verified owners of a maison's authenticated pieces.", tags: ["NFT", "Loyalty"] },
    ],
  },

  "fashion-apparel": {
    overview:
      "Fashion and apparel battle counterfeits, opaque supply chains, and a resale boom brands cannot capture, all under rising pressure to prove sustainability claims. PYRAX gives each garment a digital passport - a multi-VM NFT certificate proving origin and materials, following it into resale with royalties, and anchoring farm-to-fiber provenance that customers and regulators can verify.",
    marketSize: "$1.84T (2024)",
    projection: "$2.37T by 2030 · ~4.3% CAGR",
    source: "Statista Fashion Market Insights, 2024",
    stats: [
      { label: "Global apparel market", value: "$1.84T" },
      { label: "Fashion resale market", value: "$197B" },
      { label: "Counterfeit apparel trade", value: "$450B" },
      { label: "Consumers wanting traceability", value: "73%" },
    ],
    painPoints: [
      "Counterfeit apparel and accessories flood online and offline channels.",
      "Supply chains are opaque, making sustainability and labor claims unverifiable.",
      "Brands earn nothing from a rapidly growing peer-to-peer resale market.",
      "Digital product passport mandates require per-item traceability many brands can't produce.",
    ],
    solutions: [
      {
        feature: "Multi-VM NFT digital product passports",
        how: "Each garment is minted with a certificate carrying material composition, factory, and origin, satisfying digital-product-passport mandates and letting shoppers verify a piece is authentic.",
      },
      {
        feature: "Certificate follows the item + resale royalties",
        how: "The passport transfers on resale and pays the brand a programmable royalty, turning the secondary market from lost revenue into a recurring stream.",
      },
      {
        feature: "Farm-to-fiber provenance via eth_getProof",
        how: "Cotton, wool, and recycled-material sourcing events are anchored on-chain and independently provable, so sustainability and fair-labor claims can be verified rather than trusted.",
      },
      {
        feature: "Shielded ZK checkout",
        how: "Direct-to-consumer sales settle privately with instant finality and no chargebacks, protecting both margin and customer data.",
      },
      {
        feature: "NEURAX verifiable styling AI",
        how: "Size and style recommendations run on verifiable compute over shopper-owned measurements, cutting returns without building an invasive profile.",
      },
    ],
    dapps: [
      { name: "ThreadPass", desc: "Mints a digital product passport per garment with materials, factory, and origin for instant authenticity checks.", tags: ["NFT", "Provenance"] },
      { name: "Reworn", desc: "Peer-to-peer resale marketplace where the passport transfers and pays the brand a royalty automatically.", tags: ["NFT", "Escrow"] },
      { name: "FiberTrace", desc: "Farm-to-fiber provenance anchoring sourcing events with independently verifiable eth_getProof.", tags: ["Provenance", "Oracle"] },
      { name: "FitAI", desc: "NEURAX size-and-fit recommender on shopper-owned measurements to cut returns, with a compute proof.", tags: ["NEURAX", "Shielded"] },
      { name: "DropShield", desc: "Shielded limited-drop checkout that clears in one block with anti-bot, verified-buyer gating.", tags: ["Shielded", "Finality"] },
      { name: "GreenClaim", desc: "Verifiable sustainability-claim registry mapping certifications to on-chain sourcing evidence.", tags: ["Provenance", "EVM"] },
      { name: "WearRewards", desc: "Loyalty tied to owned passports, unlocking perks and drops for verified garment owners.", tags: ["Loyalty", "NFT"] },
      { name: "SwapCircle", desc: "Clothing swap and rental escrow with condition tracking and deposit release on return.", tags: ["Escrow", "WASM"] },
    ],
  },

  "food-beverage": {
    overview:
      "Food and beverage brands face razor-thin margins, frequent recalls, and consumers demanding proof of where their food comes from. PYRAX anchors farm-to-table provenance that any party can verify with eth_getProof, turns recalls into a targeted, minutes-not-weeks operation, and settles payments to suppliers instantly with shielded, chargeback-free transfers.",
    marketSize: "$9.1T (2024)",
    projection: "$12.4T by 2030 · ~5.3% CAGR",
    source: "Statista Market Insights, 2024",
    stats: [
      { label: "Global food & beverage market", value: "$9.1T" },
      { label: "Food traceability market", value: "$21B" },
      { label: "Annual cost of foodborne illness", value: "$15.6B" },
      { label: "Food fraud losses", value: "$40B" },
    ],
    painPoints: [
      "Recalls are slow and over-broad because provenance data is fragmented across paper and silos.",
      "Food fraud and mislabeling (origin, organic, halal) are hard to detect and prove.",
      "Suppliers wait 30-90 days for payment, straining farm and producer cash flow.",
      "Consumers increasingly demand verifiable sourcing and sustainability claims.",
    ],
    solutions: [
      {
        feature: "Farm-to-table provenance via eth_getProof",
        how: "Every handoff - farm, processor, distributor, shelf - is anchored on-chain and independently provable, so a shopper or auditor can trace an item's full journey without trusting a single database.",
      },
      {
        feature: "Targeted recalls on a shared ledger",
        how: "Because each lot's chain of custody is on-chain, a contaminated batch is traced to exact stores and shipments in minutes, replacing blanket recalls that destroy safe inventory.",
      },
      {
        feature: "Shielded ZK supplier payments + BLS finality",
        how: "Supplier invoices settle in one block on delivery confirmation with amounts kept private, freeing farmer and producer cash flow instead of net-60 terms.",
      },
      {
        feature: "Multi-VM certificates for claims",
        how: "Organic, halal, fair-trade, and cold-chain certifications are minted as verifiable certificates bound to the lot, making fraud detectable and claims provable.",
      },
      {
        feature: "IoT oracle cold-chain monitoring",
        how: "Temperature and location sensors write to the ledger so a cold-chain breach is recorded immutably and can auto-trigger a payment hold or quality flag.",
      },
    ],
    dapps: [
      { name: "FarmTrace", desc: "Farm-to-table provenance where each custody handoff is anchored and verifiable via eth_getProof.", tags: ["Provenance", "Oracle"] },
      { name: "RecallSnap", desc: "Lot-level recall tool that pinpoints affected shipments and stores in minutes, not weeks.", tags: ["Provenance", "EVM"] },
      { name: "PayOnDelivery", desc: "Shielded supplier settlement that clears in one block on delivery confirmation to unlock producer cash flow.", tags: ["Shielded", "Finality"] },
      { name: "ClaimCert", desc: "Mints organic, halal, and fair-trade certificates bound to each lot for provable, fraud-resistant claims.", tags: ["NFT", "Provenance"] },
      { name: "ColdWatch", desc: "IoT cold-chain oracle recording temperature and location, auto-flagging breaches.", tags: ["Oracle", "WASM"] },
      { name: "MenuProof", desc: "Restaurant-facing sourcing display letting diners scan a dish to see verified ingredient origins.", tags: ["Provenance", "EVM"] },
      { name: "HarvestFund", desc: "On-chain crop pre-financing and escrow tied to verified delivery milestones.", tags: ["Escrow", "EVM"] },
      { name: "TasteRewards", desc: "Wallet-native loyalty for cafes and brands with cross-venue points and instant redemption.", tags: ["Loyalty", "GhostDAG"] },
    ],
  },

  "consumer-electronics": {
    overview:
      "Consumer electronics contend with rampant counterfeits, warranty fraud, and a growing second-hand market where authenticity is impossible to verify. PYRAX binds each device to a multi-VM NFT certificate for authenticity and warranty, records provenance and repair history that transfers on resale, and settles high-volume sales instantly with shielded, chargeback-free payments.",
    marketSize: "$1.1T (2024)",
    projection: "$1.5T by 2030 · ~6.0% CAGR",
    source: "Statista Consumer Electronics, 2024",
    stats: [
      { label: "Global consumer electronics market", value: "$1.1T" },
      { label: "Refurbished electronics market", value: "$85B" },
      { label: "Counterfeit electronics trade", value: "$169B" },
      { label: "Annual warranty-fraud losses", value: "$25B" },
    ],
    painPoints: [
      "Counterfeit and fake-branded devices and components are widespread and dangerous.",
      "Warranty fraud and grey-market imports cost manufacturers billions.",
      "Second-hand buyers can't verify authenticity, warranty status, or repair history.",
      "High-value online orders are prime targets for chargeback and payment fraud.",
    ],
    solutions: [
      {
        feature: "Multi-VM NFT authenticity + warranty certificates",
        how: "Each device is minted with a certificate binding serial, model, and warranty terms, so buyers verify a unit is genuine and its warranty is real before purchase.",
      },
      {
        feature: "Certificate follows the item on resale",
        how: "Ownership, warranty, and repair history transfer with the device in the refurbished market, giving second-hand buyers a trustworthy, complete record.",
      },
      {
        feature: "Shielded ZK checkout + BLS finality",
        how: "High-value orders settle in one irreversible block with no card data exposed and no chargeback risk, protecting merchants from payment fraud on big-ticket items.",
      },
      {
        feature: "Provenance via eth_getProof",
        how: "Component sourcing and distribution are anchored on-chain and provable, exposing grey-market diversion and conflict-mineral gaps.",
      },
      {
        feature: "NEURAX verifiable diagnostics AI",
        how: "AI grading of a used device's condition produces a verifiable proof attached to its certificate, so refurbished listings carry a trusted, tamper-proof grade.",
      },
    ],
    dapps: [
      { name: "DeviceCert", desc: "Mints an authenticity-and-warranty certificate per device bound to its serial and model.", tags: ["NFT", "Provenance"] },
      { name: "WarrantyChain", desc: "On-chain warranty that transfers with the device and auto-validates claims against its terms.", tags: ["EVM", "NFT"] },
      { name: "RefurbGrade", desc: "NEURAX diagnostic grader that attaches a verifiable condition proof to a used device's certificate.", tags: ["NEURAX", "ZK"] },
      { name: "SecureBuy", desc: "Shielded high-value checkout with one-block finality and zero chargeback exposure.", tags: ["Shielded", "Finality"] },
      { name: "PartsTrace", desc: "Component provenance anchoring sourcing via eth_getProof to expose grey-market diversion.", tags: ["Provenance", "Oracle"] },
      { name: "RepairLog", desc: "Append-only repair and service history that follows the device across owners.", tags: ["Provenance", "WASM"] },
      { name: "TradeInEscrow", desc: "Trade-in and buyback escrow releasing payment on verified device condition.", tags: ["Escrow", "EVM"] },
      { name: "EolReward", desc: "End-of-life recycling rewards paid to owners who return devices to certified processors.", tags: ["Loyalty", "Provenance"] },
    ],
  },

  "marketplaces": {
    overview:
      "Online marketplaces intermediate trust between strangers, but that trust costs high take rates, held escrow, and platforms that own the reputation graph. PYRAX moves escrow, settlement, and reputation on-chain so buyers and sellers transact trustlessly with instant finality, portable reputation, and no chargebacks - a marketplace where the platform is a protocol, not a rent-seeking middleman.",
    marketSize: "$4.3T (2024)",
    projection: "$8.1T by 2030 · ~11.1% CAGR",
    source: "eMarketer, 2024",
    stats: [
      { label: "Global marketplace GMV", value: "$4.3T" },
      { label: "Share of online retail via marketplaces", value: "~67%" },
      { label: "Typical marketplace take rate", value: "10-30%" },
      { label: "Buyers citing trust as barrier", value: "48%" },
    ],
    painPoints: [
      "High take rates and payment fees extract 10-30% of every transaction.",
      "Escrow and disputes are slow, opaque, and controlled entirely by the platform.",
      "Seller reputation is locked to one platform and can be lost or manipulated.",
      "Chargebacks and fraud shift risk onto honest sellers.",
    ],
    solutions: [
      {
        feature: "On-chain escrow + BLS finality",
        how: "Funds lock in a transparent escrow contract and release atomically on delivery or dispute resolution, settling in one irreversible block with no platform float.",
      },
      {
        feature: "Portable on-chain reputation",
        how: "Seller and buyer reputation is a wallet-bound, tamper-proof record that a participant carries across any marketplace, ending platform lock-in.",
      },
      {
        feature: "Shielded ZK payments (no chargebacks)",
        how: "Payments settle privately and irreversibly, so honest sellers are protected from friendly-fraud chargebacks and buyer data isn't harvested.",
      },
      {
        feature: "GhostDAG micro-payments",
        how: "Sub-cent fees make low-value and micro-item marketplaces viable, and support per-transaction platform fees measured in fractions of a percent.",
      },
      {
        feature: "NEURAX verifiable trust scoring",
        how: "Fraud and quality scoring runs on verifiable compute, so a listing's risk grade or a dispute outcome can be proven fair rather than dictated by a black-box platform.",
      },
    ],
    dapps: [
      { name: "TrustEscrow", desc: "Protocol-level escrow that locks and releases funds atomically on delivery or resolution.", tags: ["Escrow", "Finality"] },
      { name: "RepGraph", desc: "Portable, wallet-bound reputation that sellers and buyers carry across any marketplace.", tags: ["Reputation", "EVM"] },
      { name: "OpenBazaar", desc: "Peer-to-peer marketplace where the platform is a smart contract with sub-percent fees.", tags: ["EVM", "GhostDAG"] },
      { name: "DisputeDAO", desc: "Decentralized dispute resolution with staked arbiters and transparent, on-chain outcomes.", tags: ["Gov", "Escrow"] },
      { name: "ShieldPay", desc: "Shielded marketplace settlement with instant finality and no chargeback exposure.", tags: ["Shielded", "Finality"] },
      { name: "FraudScore", desc: "NEURAX listing-and-buyer risk engine emitting a verifiable proof with each score.", tags: ["NEURAX", "Reputation"] },
      { name: "MicroMart", desc: "Micro-item marketplace made viable by GhostDAG sub-cent payment rails.", tags: ["GhostDAG", "EVM"] },
      { name: "VerifyList", desc: "Provenance-linked listings where goods carry an authenticity certificate the buyer can check.", tags: ["NFT", "Provenance"] },
    ],
  },

  "subscription-commerce": {
    overview:
      "Subscription commerce depends on recurring billing that breaks constantly - failed cards, involuntary churn, and disputes - while giving customers little control. PYRAX replaces card-on-file with programmable recurring payments the user authorizes and can cancel anytime, settling each cycle instantly and privately with no chargebacks, and metering usage-based plans down to the block.",
    marketSize: "$593B (2024)",
    projection: "$1.65T by 2030 · ~18.5% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Subscription economy market", value: "$593B" },
      { label: "Avg. involuntary churn", value: "20-40%" },
      { label: "Failed-payment recovery cost", value: "$118B" },
      { label: "Consumers with 3+ subscriptions", value: "70%" },
    ],
    painPoints: [
      "Failed and expired cards drive high involuntary churn every billing cycle.",
      "Chargebacks and disputes on recurring charges erode revenue and trust.",
      "Customers lack transparency and easy, on-their-terms cancellation.",
      "Usage-based and metered billing is hard to price and settle accurately.",
    ],
    solutions: [
      {
        feature: "Programmable recurring payments",
        how: "A subscription is a smart contract the user pre-authorizes; each cycle debits automatically with no card to expire, and the user can cancel unilaterally on-chain at any time.",
      },
      {
        feature: "BLS finality + shielded ZK settlement",
        how: "Each billing cycle settles in one irreversible block with amounts private, eliminating recurring-charge chargebacks and dunning overhead.",
      },
      {
        feature: "GhostDAG usage-metered billing",
        how: "Streaming, per-block metering lets usage-based plans charge exactly for consumption in real time instead of estimating monthly.",
      },
      {
        feature: "Multi-VM plan logic",
        how: "Tiers, trials, proration, pauses, and upgrades are encoded in transparent contracts, so billing behavior is predictable and auditable to the customer.",
      },
      {
        feature: "NEURAX verifiable churn/personalization",
        how: "Retention offers and plan recommendations run on verifiable compute over customer-owned data, improving fit without surveilling subscribers.",
      },
    ],
    dapps: [
      { name: "AutoRenew", desc: "User-authorized recurring-payment contract with no card to expire and one-tap on-chain cancellation.", tags: ["EVM", "Finality"] },
      { name: "MeterStream", desc: "Usage-based billing that meters consumption per block and settles in real time via GhostDAG.", tags: ["GhostDAG", "EVM"] },
      { name: "ShieldSub", desc: "Shielded subscription settlement clearing each cycle privately with no chargebacks.", tags: ["Shielded", "Finality"] },
      { name: "PlanForge", desc: "Programmable tiers, trials, and proration encoded in transparent, auditable contracts.", tags: ["WASM", "EVM"] },
      { name: "PauseKit", desc: "Customer-controlled pause, downgrade, and resume logic executed on-chain.", tags: ["EVM", "Gov"] },
      { name: "ChurnAI", desc: "NEURAX retention engine personalizing win-back offers on subscriber-owned data with a proof.", tags: ["NEURAX", "Shielded"] },
      { name: "BoxDrop", desc: "Subscription-box logistics linking each cycle's shipment to on-chain fulfillment and delivery proof.", tags: ["Provenance", "Escrow"] },
      { name: "GiftSub", desc: "Prepaid, transferable gift subscriptions minted on-chain and redeemable by the recipient.", tags: ["NFT", "EVM"] },
    ],
  },

  "franchising": {
    overview:
      "Franchising scales a brand across independent operators, but royalty collection, brand-standard enforcement, and financial transparency between franchisor and franchisee are chronically manual and contested. PYRAX automates royalty and fee flows as programmable recurring payments, settles them instantly, and puts sales and compliance data on a shared ledger both sides can trust without exposing each franchisee's raw numbers.",
    marketSize: "$3.1T (2024)",
    projection: "$4.4T by 2030 · ~5.9% CAGR",
    source: "Statista / IFA, 2024",
    stats: [
      { label: "Global franchise economic output", value: "$3.1T" },
      { label: "Typical royalty rate", value: "4-12%" },
      { label: "U.S. franchise establishments", value: "~830K" },
      { label: "Disputes over royalty/reporting", value: "High" },
    ],
    painPoints: [
      "Royalty and marketing-fund collection is manual, delayed, and frequently disputed.",
      "Franchisors lack real-time, trustworthy visibility into franchisee sales.",
      "Brand-standard and supply compliance is hard to verify across many locations.",
      "Franchisees resist sharing raw financials that reveal competitive detail.",
    ],
    solutions: [
      {
        feature: "Programmable royalty payments",
        how: "Royalties and marketing-fund contributions are computed and remitted automatically as a percentage of on-chain sales each period, ending manual invoicing and collection disputes.",
      },
      {
        feature: "Shielded sales with viewing keys",
        how: "Each franchisee's sales are ZK-shielded, but a scoped viewing key gives the franchisor exactly the aggregate it needs for royalties and audit without exposing full transaction detail.",
      },
      {
        feature: "BLS finality for fee settlement",
        how: "Royalty and supply payments settle in one irreversible block, giving the franchisor predictable, instant cash flow instead of chasing net-terms remittances.",
      },
      {
        feature: "Provenance for brand-standard supply",
        how: "Approved-supplier purchases are anchored on-chain, so the franchisor can verify each location sources compliant inputs rather than off-brand substitutes.",
      },
      {
        feature: "Interoperable brand-wide loyalty",
        how: "A single user-owned loyalty program spans every franchised location, so points earned at one operator redeem at any other with instant, on-chain reconciliation between owners.",
      },
    ],
    dapps: [
      { name: "RoyaltyFlow", desc: "Auto-computes and remits royalties and marketing fees as a share of on-chain sales each period.", tags: ["EVM", "Finality"] },
      { name: "ShieldBooks", desc: "Shielded franchisee sales with a franchisor viewing key scoped to royalty and audit aggregates.", tags: ["Shielded", "Reputation"] },
      { name: "StandardProof", desc: "Anchors approved-supplier purchases on-chain to verify brand-standard compliance per location.", tags: ["Provenance", "Oracle"] },
      { name: "BrandPoints", desc: "One user-owned loyalty program redeemable across every franchised location.", tags: ["Loyalty", "EVM"] },
      { name: "FeeSettle", desc: "One-block settlement of royalty and supply payments for predictable franchisor cash flow.", tags: ["Finality", "EVM"] },
      { name: "FranchiseDAO", desc: "Transparent governance for marketing-fund allocation voted on by contributing franchisees.", tags: ["Gov", "EVM"] },
      { name: "OpenLedgerFC", desc: "Shared, privacy-preserving reporting dashboard both franchisor and franchisee can trust.", tags: ["Shielded", "WASM"] },
      { name: "TerritoryNFT", desc: "Franchise-territory and unit rights minted as transferable, verifiable on-chain certificates.", tags: ["NFT", "Escrow"] },
    ],
  },
};
