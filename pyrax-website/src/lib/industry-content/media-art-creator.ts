// SPDX-License-Identifier: LicenseRef-Proprietary
// Industry content for the "media-art-creator" category (10 business types). Filled by content pass.
import type { CategoryContent } from "./types";

export const content: CategoryContent = {
  "digital-art-nfts": {
    overview:
      "Digital art and NFTs let creators mint, sell, and license original work as verifiable on-chain assets, but the first cycle was crippled by broken royalties, wash trading, and marketplaces that quietly stopped honoring creator fees. PYRAX fixes the economics at the protocol layer: royalties are enforced by multi-VM NFT contracts that follow every resale forever, provenance is cryptographically provable via eth_getProof, and fans pay artists directly with instant BLS finality and no marketplace cut.",
    marketSize: "$2.4B (2024)",
    projection: "$13.8B by 2030 · ~29% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "NFT art market (2024)", value: "$2.4B" },
      { label: "Typical marketplace take rate", value: "2.5%-15%" },
      { label: "Creator royalties unpaid after 2023", value: "$1B+ est." },
      { label: "Active digital-art wallets", value: "3M+" },
    ],
    painPoints: [
      "Marketplaces made creator royalties optional, so artists lost their cut on the secondary market where most value accrues.",
      "Platforms take 2.5%-15% of every primary sale and control discovery, listings, and payouts.",
      "Plagiarism and copy-minting flood collections with fakes that are hard to distinguish from the original.",
      "Provenance breaks across marketplaces, so a buyer cannot prove an on-chain work is the artist's genuine mint.",
    ],
    solutions: [
      {
        feature: "Multi-VM NFT contracts (EVM / WASM / Cairo)",
        how: "Royalty logic is written into the token contract itself and enforced at transfer time, so the artist's percentage is deducted and paid on every resale on any compliant venue - royalties become perpetual and unavoidable, not a marketplace courtesy.",
      },
      {
        feature: "BLS proof-of-stake finality",
        how: "A collector's payment settles to the artist directly in one irreversible block with no marketplace escrow or payout delay, so 100% of the sale price (minus a tiny protocol fee) reaches the creator instantly.",
      },
      {
        feature: "Provenance proofs via eth_getProof",
        how: "Any buyer can generate a cryptographic proof of the mint transaction, original creator address, and full ownership chain, making counterfeit and copy-minted collections trivially distinguishable from the authentic work.",
      },
      {
        feature: "PYRAX Compute authenticity attestation",
        how: "Verifiable AI checks a submitted image against the artist's on-chain catalog to flag copy-mints and deepfaked derivatives, and attaches a signed authenticity attestation that travels with the token.",
      },
      {
        feature: "GhostDAG micro-tips (500k-TPS target)",
        how: "Fans send sub-cent tips and pay-per-view unlocks at social-media scale, letting artists monetize sketches, drops, and process reels without gas friction pricing out small transactions.",
      },
    ],
    dapps: [
      { name: "RoyaltyForever", desc: "NFT minting studio whose contracts enforce the creator's royalty on every future resale, on-chain, with no way for a marketplace to strip it.", tags: ["EVM", "Royalties"] },
      { name: "ProofOfMint", desc: "Provenance explorer that produces a shareable eth_getProof certificate of original authorship and full ownership history for any token.", tags: ["Provenance", "eth_getProof"] },
      { name: "GenuineGuard", desc: "PYRAX Compute authenticity scanner that flags copy-mints and deepfaked derivatives before they list and attests originals.", tags: ["Compute", "Authenticity"] },
      { name: "DirectDrop", desc: "Artist-owned drop platform that sells editions fan-to-artist with instant finality and zero platform commission.", tags: ["Finality", "Direct-pay"] },
      { name: "TipCanvas", desc: "Micro-tipping overlay for process reels and sketches, settling sub-cent appreciation payments via GhostDAG.", tags: ["Micro-tips", "GhostDAG"] },
      { name: "SplitStudio", desc: "Collaborative mint contract that auto-splits primary and royalty income across every co-creator by set share.", tags: ["EVM", "Royalties"] },
      { name: "PatronPass", desc: "Shielded patronage passes that grant private supporters early access and unlockable art without exposing their identity.", tags: ["Shielded", "WASM"] },
      { name: "CairoCanvas", desc: "Fully on-chain generative art rendered by Cairo contracts, so the artwork itself is verifiable and cannot rot on off-chain storage.", tags: ["Cairo", "Generative"] },
    ],
  },

  "creator-monetization": {
    overview:
      "The creator economy pays out billions, but almost all of it flows through a handful of platforms that set the take rate, hold funds for weeks, demonetize without appeal, and own the audience relationship. PYRAX rebuilds monetization as a direct rail: fans pay creators peer-to-peer with instant BLS finality and no platform middleman cut, subscriptions and tips stream on-chain, and the creator - not an algorithm - controls access and payouts.",
    marketSize: "$250B (2024)",
    projection: "$1.07T by 2034 · ~16% CAGR",
    source: "Goldman Sachs Research, 2024",
    stats: [
      { label: "Creator economy size (2024)", value: "$250B" },
      { label: "Full-time creators worldwide", value: "50M+" },
      { label: "Typical platform take rate", value: "20%-45%" },
      { label: "Payout hold time", value: "up to 60 days" },
    ],
    painPoints: [
      "Platforms skim 20%-45% of creator income and can change the split unilaterally.",
      "Payouts are held for weeks, starving creators of working capital they have already earned.",
      "Demonetization and shadow-banning cut income with no transparency or recourse.",
      "The platform owns the follower graph, so a creator who leaves loses their audience and revenue overnight.",
    ],
    solutions: [
      {
        feature: "BLS proof-of-stake finality",
        how: "Tips, subscriptions, and pay-per-view purchases settle from fan to creator in one irreversible block, so income arrives instantly with no platform-controlled 30-60 day hold and no middleman commission.",
      },
      {
        feature: "GhostDAG micro-tips (500k-TPS target)",
        how: "Parallel throughput supports millions of sub-cent tips and per-second streaming payments, letting a creator monetize a single comment, clip, or livestream minute at internet scale.",
      },
      {
        feature: "Multi-VM subscription contracts (EVM / WASM)",
        how: "Recurring membership, tiered access, and revenue splits with collaborators are enforced by transparent contracts the creator owns - no platform can throttle, freeze, or reprice them.",
      },
      {
        feature: "Shielded-by-default patronage",
        how: "Fans can support creators privately with ZK-shielded payments, protecting supporters of sensitive or niche work while the creator still receives verifiable, spendable income.",
      },
      {
        feature: "Portable on-chain audience graph",
        how: "Memberships and follower relationships are tokens the creator holds, so the audience and its revenue move with them across any app instead of being locked to one platform.",
      },
    ],
    dapps: [
      { name: "DirectFans", desc: "Membership platform where fans subscribe directly to creators with instant settlement and zero platform commission.", tags: ["Finality", "Direct-pay"] },
      { name: "StreamTip", desc: "Per-second streaming payments during livestreams, metered by GhostDAG so a viewer pays only for the minutes they watch.", tags: ["Micro-tips", "GhostDAG"] },
      { name: "TierGate", desc: "Token-gated content tiers governed by an EVM contract the creator fully controls, immune to platform demonetization.", tags: ["EVM", "Access"] },
      { name: "PatronPrivate", desc: "Shielded patronage wallet that lets supporters back sensitive creators without revealing who they are.", tags: ["Shielded", "ZK"] },
      { name: "SplitCrew", desc: "Automatic revenue-split contract that pays editors, co-hosts, and collaborators their share on every payment.", tags: ["WASM", "Splits"] },
      { name: "AudienceKey", desc: "Portable follower graph as on-chain memberships that a creator carries across any front-end app.", tags: ["EVM", "Portable"] },
      { name: "UnlockDrop", desc: "Pay-to-unlock storefront for one-off content, courses, and downloads with sub-cent fees and no chargebacks.", tags: ["Micro-tips", "Escrow"] },
      { name: "CreatorAdvance", desc: "On-chain revenue-based advance where a creator borrows against verifiable future subscription streams.", tags: ["EVM", "Finance"] },
    ],
  },

  "journalism-news": {
    overview:
      "Journalism runs on trust, sources, and a funding model that platform intermediaries have hollowed out - while surveillance and censorship increasingly threaten reporters and whistleblowers. PYRAX gives newsrooms two things at once: a direct, uncensorable reader-funding rail with instant finality, and the Sphinx mixnet plus anonymous file carriage so sources can transmit documents and tips without exposing their identity, location, or timing to any adversary.",
    marketSize: "$430B (2024)",
    projection: "$580B by 2030 · ~5.1% CAGR",
    source: "PwC Global Entertainment & Media Outlook, 2024",
    stats: [
      { label: "Global news media revenue", value: "$430B" },
      { label: "Journalists jailed (2024)", value: "360+" },
      { label: "Digital news reader-revenue share", value: "~50%" },
      { label: "Ad-revenue lost to platforms", value: "$40B+/yr" },
    ],
    painPoints: [
      "Source anonymity is fragile - metadata, device fingerprints, and payment trails expose whistleblowers even when content is encrypted.",
      "Payment processors and app stores can deplatform outlets, cutting reader funding for political or economic reasons.",
      "Platform algorithms and ad networks captured the revenue that once funded reporting.",
      "Censorship and takedowns erase published stories, and readers cannot verify what was altered after the fact.",
    ],
    solutions: [
      {
        feature: "Sphinx mixnet + anonymous file carriage",
        how: "Sources submit documents and tips through network-layer mixing that hides origin, destination, and timing, so a whistleblower's identity and location are protected even against traffic analysis - true source protection at the transport layer.",
      },
      {
        feature: "Censorship-resistant on-chain publishing",
        how: "Story hashes and archival copies are committed on-chain where no processor, host, or government can silently delete or alter them, and readers can prove a published piece was not tampered with after the fact.",
      },
      {
        feature: "BLS-final reader funding",
        how: "Readers pay outlets and individual reporters directly with instant finality and no processor able to freeze the account, so a controversial story cannot be defunded by cutting off payments.",
      },
      {
        feature: "GhostDAG micro-payments (500k-TPS target)",
        how: "Per-article and per-minute micropayments let readers pay a few cents for a single story instead of a full subscription, reviving pay-per-read journalism at scale.",
      },
      {
        feature: "PYRAX Compute authenticity attestation vs deepfakes",
        how: "Verifiable AI attests that a photo, video, or quote is the newsroom's original capture, and flags synthetic or manipulated media, giving readers a cryptographic basis to trust what they see.",
      },
    ],
    dapps: [
      { name: "SecureDrop2", desc: "Anonymous source-submission portal routing documents through the Sphinx mixnet with no metadata trail back to the whistleblower.", tags: ["Mixnet", "Source-protection"] },
      { name: "PermaStory", desc: "Censorship-resistant publishing that commits each article's hash on-chain so it cannot be silently deleted or edited.", tags: ["Publishing", "Provenance"] },
      { name: "PayPerRead", desc: "Micro-payment paywall charging a few cents per article via GhostDAG instead of forcing a full subscription.", tags: ["Micro-tips", "GhostDAG"] },
      { name: "ReporterFund", desc: "Direct reader-to-journalist funding with instant finality that no payment processor can freeze.", tags: ["Finality", "Direct-pay"] },
      { name: "TruthAttest", desc: "PYRAX Compute attestation service that signs original newsroom media and flags deepfaked or altered versions.", tags: ["Compute", "Authenticity"] },
      { name: "AnonTip", desc: "Encrypted tip line where sources carry files anonymously and reporters reply through a shielded reply route.", tags: ["Mixnet", "Shielded"] },
      { name: "CorrectionLog", desc: "On-chain revision history that proves exactly what changed in a story and when, restoring editorial transparency.", tags: ["Provenance", "eth_getProof"] },
      { name: "NewsCoop", desc: "Reader-owned newsroom cooperative that governs funding and editorial priorities through transparent on-chain votes.", tags: ["Gov", "EVM"] },
    ],
  },

  "publishing": {
    overview:
      "Book and digital publishing still routes most of a title's revenue through distributors and retailers, delays author royalty statements by six to twelve months, and leaves authors exposed to opaque accounting and platform-level censorship. PYRAX pays authors directly with instant finality, encodes perpetual resale royalties into every digital edition via multi-VM NFT contracts, and offers censorship-resistant carriage so banned or politically sensitive works stay publishable anywhere.",
    marketSize: "$142B (2024)",
    projection: "$188B by 2030 · ~4.8% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global book publishing market", value: "$142B" },
      { label: "Author royalty on retail e-book", value: "~25%" },
      { label: "Royalty statement delay", value: "6-12 months" },
      { label: "Self-published titles / year", value: "2.6M+" },
    ],
    painPoints: [
      "Authors wait six to twelve months for royalty statements and cannot audit the sales they are based on.",
      "Distributors and retailers capture the majority of a title's cover price.",
      "Digital editions can be revoked, altered, or delisted by the platform that hosts them.",
      "Secondary sales of digital books return nothing to the author.",
    ],
    solutions: [
      {
        feature: "BLS-final author royalties",
        how: "Every sale settles the author's share instantly and directly, replacing the six-to-twelve-month statement cycle with real-time, auditable, on-chain royalty income.",
      },
      {
        feature: "Perpetual resale royalties (EVM / WASM / Cairo)",
        how: "Each digital edition is an NFT whose contract pays the author a percentage on every secondary sale, so a resold e-book or audiobook keeps earning for its creator forever.",
      },
      {
        feature: "Censorship-resistant carriage",
        how: "Banned, embargoed, or politically sensitive works are distributed through anonymous file carriage that no store or government can delist, keeping the text permanently available to readers.",
      },
      {
        feature: "Programmable license terms",
        how: "Territory, translation, lending, and time-limited rights are encoded as on-chain license contracts, so a publisher grants and revokes specific usage rights transparently and automatically.",
      },
      {
        feature: "Provenance proofs via eth_getProof",
        how: "First-edition and signed-copy claims are backed by verifiable mint proofs, letting collectors and libraries confirm authenticity and edition without a trusted intermediary.",
      },
    ],
    dapps: [
      { name: "InkRoyalty", desc: "Direct-to-author sales where the author's share settles instantly on every purchase with a real-time royalty ledger.", tags: ["Finality", "Royalties"] },
      { name: "ResaleRoyal", desc: "Digital-edition NFTs that pay the author a cut on every secondary resale, forever.", tags: ["EVM", "Royalties"] },
      { name: "FreePress", desc: "Censorship-resistant distribution for banned and embargoed titles via anonymous carriage.", tags: ["Carriage", "Publishing"] },
      { name: "RightsDesk", desc: "Programmable license marketplace for translation, territory, and lending rights encoded as on-chain contracts.", tags: ["Licensing", "WASM"] },
      { name: "FirstEdition", desc: "Provenance-verified signed and first-edition digital books with eth_getProof authenticity certificates.", tags: ["Provenance", "eth_getProof"] },
      { name: "LibraryLoan", desc: "Time-limited on-chain lending that returns rights to the publisher automatically when the loan expires.", tags: ["EVM", "Licensing"] },
      { name: "SerialDrop", desc: "Chapter-by-chapter serialized release with micro-payment unlocks per installment via GhostDAG.", tags: ["Micro-tips", "GhostDAG"] },
      { name: "CoAuthorSplit", desc: "Automatic royalty-splitting contract for co-authors, translators, and illustrators on every sale.", tags: ["WASM", "Splits"] },
    ],
  },

  "photography": {
    overview:
      "Photographers create the images that fill stock libraries, editorial pages, and ad campaigns, yet stock platforms pay pennies per download, strip metadata, and give creators no way to prove authorship or catch unlicensed use. PYRAX timestamps every capture with verifiable provenance, sells and licenses directly with instant finality, enforces resale royalties in the license contract, and uses PYRAX Compute to distinguish authentic photographs from AI-generated fakes.",
    marketSize: "$4.6B (2024)",
    projection: "$6.4B by 2030 · ~5.7% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Stock photography market", value: "$4.6B" },
      { label: "Typical stock payout per download", value: "$0.25-$0.40" },
      { label: "Contributor royalty share", value: "15%-45%" },
      { label: "Images uploaded per day", value: "billions" },
    ],
    painPoints: [
      "Stock platforms pay cents per download and set royalty rates the photographer cannot negotiate.",
      "Uploaded images lose their metadata, so authorship and capture details are erased.",
      "Unlicensed reuse is rampant and photographers have no cheap, provable way to demonstrate ownership.",
      "AI-generated images now flood libraries, undercutting real photographers and confusing buyers.",
    ],
    solutions: [
      {
        feature: "Capture timestamping + provenance (eth_getProof)",
        how: "Each photograph is committed on-chain at capture with a verifiable timestamp and creator signature, so authorship, first-publication date, and the full edit chain are cryptographically provable in any dispute.",
      },
      {
        feature: "Programmable license terms",
        how: "Editorial, commercial, exclusive, and territory-scoped rights are encoded as on-chain license contracts that grant, meter, and expire automatically without a stock intermediary.",
      },
      {
        feature: "BLS-final direct licensing",
        how: "A buyer licenses an image straight from the photographer with instant settlement and no 55%-85% platform cut, so the creator keeps nearly the full fee.",
      },
      {
        feature: "Perpetual resale royalties (EVM / WASM)",
        how: "Limited-edition prints and collectible captures carry royalty logic that pays the photographer on every secondary sale.",
      },
      {
        feature: "PYRAX Compute authenticity attestation vs deepfakes",
        how: "Verifiable AI attests that an image is a genuine camera capture rather than a synthetic generation, giving editorial and evidentiary buyers a trustworthy real-vs-AI signal.",
      },
    ],
    dapps: [
      { name: "ShutterProof", desc: "On-capture provenance registry that timestamps each photo with a verifiable authorship proof.", tags: ["Provenance", "eth_getProof"] },
      { name: "LicenseLens", desc: "Programmable license marketplace for editorial, commercial, and exclusive rights with automatic expiry.", tags: ["Licensing", "EVM"] },
      { name: "DirectStock", desc: "Photographer-owned stock library selling licenses directly with instant finality and no platform cut.", tags: ["Finality", "Direct-pay"] },
      { name: "RealFrame", desc: "PYRAX Compute real-vs-AI attestation that certifies an image is a genuine camera capture for editorial buyers.", tags: ["Compute", "Authenticity"] },
      { name: "PrintEditions", desc: "Limited-edition print NFTs with enforced resale royalties for the photographer.", tags: ["EVM", "Royalties"] },
      { name: "UseWatch", desc: "Unlicensed-use detector that pairs a PYRAX Compute image match with an on-chain ownership proof to support takedowns.", tags: ["Compute", "Provenance"] },
      { name: "AssignEscrow", desc: "Escrow-backed commissioned shoots that release payment on client acceptance of delivered images.", tags: ["Escrow", "EVM"] },
      { name: "MetaKeep", desc: "Permanent on-chain metadata vault so caption, credit, and rights information can never be stripped.", tags: ["Provenance", "WASM"] },
    ],
  },

  "advertising": {
    overview:
      "Digital advertising is a trillion-dollar market built on surveillance, opaque ad-tech middlemen, and impression fraud that siphons tens of billions a year. PYRAX offers a privacy-first alternative: verifiable ad impressions and clicks without tracking or profiling individual users, on-chain escrow that releases spend only on proof of genuine delivery, and instant settlement that collapses the ad-tech intermediary chain and its hidden margins.",
    marketSize: "$740B (2024)",
    projection: "$1.16T by 2030 · ~7.7% CAGR",
    source: "eMarketer, 2024",
    stats: [
      { label: "Global digital ad spend (2024)", value: "$740B" },
      { label: "Ad fraud losses / year", value: "$100B+" },
      { label: "Spend lost to ad-tech middlemen", value: "~50%" },
      { label: "Users blocking ads / trackers", value: "900M+" },
    ],
    painPoints: [
      "Ad-tech intermediaries skim roughly half of every ad dollar between advertiser and publisher.",
      "Impression and click fraud drains over $100B a year with little accountability.",
      "Targeting depends on pervasive surveillance that regulators and users increasingly reject.",
      "Advertisers cannot independently verify that the impressions they paid for actually happened.",
    ],
    solutions: [
      {
        feature: "Verifiable impressions without surveillance",
        how: "Impressions and clicks are proven cryptographically without tracking or profiling any individual, so advertisers get honest, auditable delivery counts while users keep full privacy - no cookies, no cross-site graph.",
      },
      {
        feature: "On-chain escrow with proof-of-delivery",
        how: "Ad budget sits in escrow and is released to the publisher only when verifiable proof of genuine, human delivery is posted, structurally eliminating the pay-first-detect-fraud-later model.",
      },
      {
        feature: "BLS-final direct settlement",
        how: "Advertiser pays publisher directly with instant finality, collapsing the demand-side-to-supply-side chain of intermediaries and reclaiming the ~50% they extract.",
      },
      {
        feature: "GhostDAG per-impression micropayments (500k-TPS target)",
        how: "Parallel throughput settles billions of tiny per-impression and per-click payments in real time, enabling true pay-per-verified-delivery pricing.",
      },
      {
        feature: "Shielded audience matching",
        how: "Campaigns match to consented audience attributes using ZK-shielded criteria, so relevance is preserved without any party assembling a surveillance profile of the viewer.",
      },
    ],
    dapps: [
      { name: "HonestImpression", desc: "Impression-verification layer that proves ad delivery cryptographically with no user tracking.", tags: ["Privacy", "Verifiable"] },
      { name: "AdEscrow", desc: "Budget escrow that pays publishers only on proof of genuine, human-verified delivery.", tags: ["Escrow", "Proof-of-delivery"] },
      { name: "DirectPlacement", desc: "Advertiser-to-publisher marketplace that settles instantly and cuts out the ad-tech middle layer.", tags: ["Finality", "Direct-pay"] },
      { name: "PrivateReach", desc: "Shielded audience matching that targets consented attributes without building a user profile.", tags: ["Shielded", "ZK"] },
      { name: "ClickTruth", desc: "Fraud-proof click accounting with PYRAX Compute bot detection and verifiable, disputable evidence.", tags: ["Compute", "Verifiable"] },
      { name: "MicroSpot", desc: "Per-impression micropayment rail that settles billions of tiny publisher payouts via GhostDAG.", tags: ["Micro-tips", "GhostDAG"] },
      { name: "BrandSafe", desc: "On-chain brand-safety and placement contract that enforces context rules before an ad renders.", tags: ["EVM", "Gov"] },
      { name: "OptInVault", desc: "User-controlled consent vault that grants and revokes ad permissions with shielded, revocable keys.", tags: ["Shielded", "Consent"] },
    ],
  },

  "influencer-marketing": {
    overview:
      "Influencer marketing moves tens of billions a year, but it runs on handshake deals, fake followers, ghosted deliverables, and 30-to-90-day payment terms that leave creators unpaid and brands unsure what they bought. PYRAX escrows every deal on-chain and releases funds on cryptographic proof of delivery, pays creators the instant a post goes live, and uses verifiable engagement metrics so both sides can trust the numbers without a surveillance-based platform in the middle.",
    marketSize: "$24B (2024)",
    projection: "$56B by 2030 · ~15% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Influencer marketing spend (2024)", value: "$24B" },
      { label: "Estimated fake-follower share", value: "~15%" },
      { label: "Typical payment terms", value: "30-90 days" },
      { label: "Brands citing ROI-proof problems", value: "~60%" },
    ],
    painPoints: [
      "Creators wait 30-90 days for payment and frequently get ghosted after delivering.",
      "Fake followers and bought engagement make campaign ROI impossible to trust.",
      "Deliverables and usage rights live in email threads with no enforceable record.",
      "Both sides depend on platform-reported metrics they cannot independently verify.",
    ],
    solutions: [
      {
        feature: "On-chain escrow with proof-of-delivery",
        how: "The brand locks the fee in escrow and it releases to the creator automatically the moment verifiable proof the agreed post went live is posted - no ghosting, no chasing invoices, no 90-day terms.",
      },
      {
        feature: "BLS-final instant payout",
        how: "Once delivery is proven, the creator is paid in one irreversible block, replacing net-90 payment terms with same-second settlement.",
      },
      {
        feature: "Verifiable engagement without surveillance",
        how: "Impressions, clicks, and conversions attributed to a campaign are proven cryptographically without profiling audiences, giving brands honest ROI data and exposing bought engagement.",
      },
      {
        feature: "Programmable usage-rights contracts",
        how: "Content licensing, exclusivity windows, and whitelisting terms are encoded on-chain, so the brand's usage rights and the creator's boundaries are enforceable and auditable.",
      },
      {
        feature: "PYRAX Compute authenticity + fraud scoring",
        how: "Verifiable AI scores an influencer's audience for bot inflation and flags manipulated metrics before a brand commits budget.",
      },
    ],
    dapps: [
      { name: "DealEscrow", desc: "Campaign escrow that releases payment automatically on proof the agreed content went live.", tags: ["Escrow", "Proof-of-delivery"] },
      { name: "InstantPaid", desc: "Same-second creator payout on verified delivery, retiring net-90 terms.", tags: ["Finality", "Direct-pay"] },
      { name: "RealReach", desc: "PYRAX Compute audience-authenticity scoring that flags bought followers before a deal is signed.", tags: ["Compute", "Fraud"] },
      { name: "RightsClip", desc: "Programmable usage-rights and whitelisting contracts encoded on-chain for every collaboration.", tags: ["Licensing", "EVM"] },
      { name: "ProofROI", desc: "Verifiable, surveillance-free engagement attribution so brands can trust campaign numbers.", tags: ["Verifiable", "Privacy"] },
      { name: "MatchMarket", desc: "Direct brand-creator marketplace with on-chain reputation and no agency take rate.", tags: ["Direct-pay", "Reputation"] },
      { name: "AffiliateSplit", desc: "Real-time affiliate payouts that settle a creator's commission per verified conversion.", tags: ["Micro-tips", "Splits"] },
      { name: "DisputeDesk", desc: "Escrow-backed dispute resolution that arbitrates contested deliverables and releases funds by ruling.", tags: ["Escrow", "Gov"] },
    ],
  },

  "collectibles": {
    overview:
      "Digital and physical collectibles - trading cards, memorabilia, limited editions, and phygital drops - depend entirely on provenance and authenticity, the two things centralized marketplaces and grading services keep in silos. PYRAX makes provenance cryptographic and portable via eth_getProof, enforces creator and edition royalties on every resale, and settles fan-to-collector trades instantly, turning collectibles into liquid, verifiable, royalty-bearing assets.",
    marketSize: "$426B (2024)",
    projection: "$1.05T by 2033 · ~10.5% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global collectibles market", value: "$426B" },
      { label: "Counterfeit share of some categories", value: "up to 20%" },
      { label: "Grading / auth turnaround", value: "weeks-months" },
      { label: "Phygital drops market growth", value: "double-digit" },
    ],
    painPoints: [
      "Provenance and grading are locked in centralized silos a buyer must trust blindly.",
      "Counterfeits and altered items infiltrate high-value categories.",
      "Creators and original issuers earn nothing when a collectible resells for many times its issue price.",
      "Illiquid markets and slow authentication make trading collectibles slow and risky.",
    ],
    solutions: [
      {
        feature: "Provenance proofs via eth_getProof",
        how: "Each collectible's issuance, edition number, and full ownership chain are cryptographically provable, so a buyer verifies authenticity and history without trusting a marketplace or grader.",
      },
      {
        feature: "Perpetual issuer + creator royalties (EVM / WASM / Cairo)",
        how: "Royalty logic in the token contract pays the original issuer and creator on every resale, capturing the secondary-market value that today accrues only to flippers.",
      },
      {
        feature: "BLS-final instant trades",
        how: "Collectibles trade fan-to-collector with instant, irreversible settlement, adding liquidity to markets that today move slowly through consignment and auction cycles.",
      },
      {
        feature: "Phygital binding contracts",
        how: "A physical item is bound to its on-chain twin via a tamper-evident chip or seal, so ownership transfers, insurance, and authenticity stay synchronized across the physical and digital sides.",
      },
      {
        feature: "PYRAX Compute authenticity attestation",
        how: "Verifiable AI grades and authenticates item images against known genuine references, attaching a signed attestation that travels with the collectible.",
      },
    ],
    dapps: [
      { name: "ChainOfCustody", desc: "Provenance registry giving every collectible a verifiable issuance-to-owner history via eth_getProof.", tags: ["Provenance", "eth_getProof"] },
      { name: "IssuerRoyalty", desc: "Collectible contracts that pay the original issuer and creator on every secondary sale.", tags: ["EVM", "Royalties"] },
      { name: "PhygitalTwin", desc: "Physical-to-digital binding that keeps a chipped item and its on-chain twin in lockstep.", tags: ["Phygital", "WASM"] },
      { name: "GradeProof", desc: "PYRAX Compute-assisted grading and authentication with a signed, portable attestation.", tags: ["Compute", "Authenticity"] },
      { name: "DropVault", desc: "Limited-edition drop platform with fair, verifiable allocation and instant settlement.", tags: ["Finality", "Drops"] },
      { name: "FractionCard", desc: "Fractional ownership of high-value collectibles with on-chain shares and royalty pass-through.", tags: ["EVM", "Fractional"] },
      { name: "SwapDesk", desc: "Atomic collectible-for-collectible swaps that settle both legs in one irreversible transaction.", tags: ["Escrow", "Finality"] },
      { name: "InsureItem", desc: "On-chain insurance that prices coverage from a collectible's verifiable provenance and grade.", tags: ["EVM", "Provenance"] },
    ],
  },

  "licensing-ip": {
    overview:
      "Intellectual-property licensing is a multi-hundred-billion-dollar market throttled by unenforceable contracts, opaque royalty accounting, and years-long disputes over who owns and used what. PYRAX turns IP into programmable, self-enforcing assets: license terms are encoded as multi-VM contracts that meter usage and pay royalties automatically, ownership and first-use are provable via eth_getProof timestamping, and every license and payment is auditable in real time.",
    marketSize: "$340B (2024)",
    projection: "$520B by 2030 · ~7.3% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global IP licensing revenue", value: "$340B" },
      { label: "Royalty income under-reported", value: "billions/yr" },
      { label: "Avg. IP dispute duration", value: "2-5 years" },
      { label: "Licensed merchandise sales", value: "$340B retail" },
    ],
    painPoints: [
      "License terms are paper contracts that no system enforces at the point of use.",
      "Royalty accounting is opaque and self-reported, so licensors are routinely underpaid.",
      "Proving first authorship and ownership in a dispute is slow, costly, and uncertain.",
      "Sub-licensing chains lose track of who holds which rights in which territory.",
    ],
    solutions: [
      {
        feature: "Programmable license contracts (EVM / WASM / Cairo)",
        how: "License scope, territory, term, and royalty rate are encoded on-chain and enforced automatically, so usage that exceeds the grant is blocked or metered and the correct royalty is always paid.",
      },
      {
        feature: "IP timestamping + provenance (eth_getProof)",
        how: "First authorship and ownership are committed on-chain with a verifiable timestamp, giving licensors decisive, low-cost evidence in any infringement or priority dispute.",
      },
      {
        feature: "BLS-final automated royalties",
        how: "Royalties flow to rights-holders instantly on each licensed use, replacing quarterly self-reported statements with real-time, auditable, tamper-proof payments.",
      },
      {
        feature: "On-chain sub-licensing graph",
        how: "Every sub-license and territory grant is recorded as a linked contract, so the full rights chain is transparent and no party can double-license the same right.",
      },
      {
        feature: "Escrow-backed rights deals",
        how: "Advances and minimum guarantees sit in escrow and release against verifiable milestones, protecting both licensor and licensee in large deals.",
      },
    ],
    dapps: [
      { name: "LicenseChain", desc: "Programmable IP licenses that meter usage and enforce scope and royalties on-chain.", tags: ["Licensing", "EVM"] },
      { name: "PriorArt", desc: "Timestamped authorship registry that provides eth_getProof evidence of first ownership.", tags: ["Provenance", "eth_getProof"] },
      { name: "AutoRoyalty", desc: "Real-time royalty engine that pays rights-holders instantly on each licensed use.", tags: ["Finality", "Royalties"] },
      { name: "SubRights", desc: "On-chain sub-licensing graph that tracks every territory and term to prevent double-licensing.", tags: ["WASM", "Licensing"] },
      { name: "DealGuarantee", desc: "Escrow for advances and minimum guarantees that release on verifiable milestones.", tags: ["Escrow", "EVM"] },
      { name: "BrandVault", desc: "Trademark and character-license marketplace with programmable usage rules for merchandise.", tags: ["Licensing", "Cairo"] },
      { name: "PatentPool", desc: "Standards-essential patent pool that distributes pooled royalties transparently to members.", tags: ["EVM", "Royalties"] },
      { name: "InfringeProof", desc: "PYRAX Compute infringement detector that pairs a match with an on-chain ownership proof for enforcement.", tags: ["Compute", "Provenance"] },
    ],
  },

  "podcasting": {
    overview:
      "Podcasting reaches hundreds of millions of listeners but funds itself through host-read ads, platform exclusivity deals, and subscription apps that take a cut and own the audience. PYRAX lets podcasters monetize directly - per-episode micropayments, streaming subscriptions, and tips settle instantly with no platform commission - while dynamic ad slots run on verifiable, privacy-preserving impressions and shows stay portable and uncensorable across any player.",
    marketSize: "$30B (2024)",
    projection: "$133B by 2030 · ~28% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global podcasting market (2024)", value: "$30B" },
      { label: "Monthly podcast listeners", value: "500M+" },
      { label: "Podcast ad spend (2024)", value: "$4B+" },
      { label: "Platform / app take rate", value: "15%-30%" },
    ],
    painPoints: [
      "Subscription apps and platforms take 15%-30% and control the listener relationship.",
      "Ad monetization relies on unverifiable download numbers and listener tracking.",
      "Exclusivity deals lock shows to one platform and can be pulled or delisted.",
      "Small and independent shows have no low-friction way to earn from a modest audience.",
    ],
    solutions: [
      {
        feature: "GhostDAG micro-payments (500k-TPS target)",
        how: "Listeners pay a few cents per episode or per minute, and send tips, at social scale - monetizing even small, loyal audiences without a subscription paywall or platform gate.",
      },
      {
        feature: "BLS-final direct subscriptions",
        how: "Streaming and membership payments settle straight from listener to podcaster with instant finality and no 15%-30% platform commission.",
      },
      {
        feature: "Verifiable ad impressions without surveillance",
        how: "Dynamically inserted ads report cryptographically verifiable plays without tracking listeners, giving advertisers honest reach data and podcasters trustworthy ad revenue.",
      },
      {
        feature: "Censorship-resistant carriage",
        how: "Episodes are distributed through anonymous file carriage and cannot be delisted by a single platform, so a show survives deplatforming and exclusivity lock-in.",
      },
      {
        feature: "PYRAX Compute creator tools + authenticity",
        how: "Verifiable AI powers transcription, clip generation, and voice-authenticity attestation that proves an episode is the host's real voice, not a synthetic clone.",
      },
    ],
    dapps: [
      { name: "PodTip", desc: "Per-episode and per-minute micro-payments plus tipping via GhostDAG for shows of any size.", tags: ["Micro-tips", "GhostDAG"] },
      { name: "DirectCast", desc: "Listener-to-podcaster subscriptions with instant settlement and zero platform commission.", tags: ["Finality", "Direct-pay"] },
      { name: "TrueDownloads", desc: "Verifiable, surveillance-free play counts so advertisers and hosts can trust ad reach.", tags: ["Verifiable", "Privacy"] },
      { name: "OpenFeed", desc: "Censorship-resistant episode carriage that survives deplatforming and exclusivity lock-in.", tags: ["Carriage", "Publishing"] },
      { name: "DynAd", desc: "Programmable dynamic ad-insertion marketplace paying hosts per verified impression.", tags: ["EVM", "Verifiable"] },
      { name: "VoiceProof", desc: "PYRAX Compute voice-authenticity attestation that certifies an episode is the host's real voice, not a clone.", tags: ["Compute", "Authenticity"] },
      { name: "ClipCoin", desc: "AI clip generator that mints shareable, monetizable episode highlights with royalty pass-through.", tags: ["Compute", "Royalties"] },
      { name: "PatronCast", desc: "Shielded patronage tiers that let listeners fund sensitive shows privately.", tags: ["Shielded", "EVM"] },
    ],
  },
};

