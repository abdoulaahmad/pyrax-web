// SPDX-License-Identifier: LicenseRef-Proprietary
// Industry content for the "real-estate-property" category (10 business types). Filled by content pass.
import type { CategoryContent } from "./types";

export const content: CategoryContent = {
  "residential-sales": {
    overview:
      "Residential sales moves homes between buyers and sellers through a chain of agents, escrow companies, title insurers, and lenders, where a single closing can take 30-50 days and stack thousands in intermediary fees. PYRAX collapses that chain into one atomic transaction - title, funds, and payoff move together or not at all - with shielded valuations and a viewing key that gives the county recorder a tamper-proof, auditable record.",
    marketSize: "$2.3T (2024)",
    projection: "$3.4T by 2030 · ~6.7% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "U.S. existing-home sales value", value: "$2.3T" },
      { label: "Avg. days to close", value: "44 days" },
      { label: "Closing costs per transaction", value: "2-5%" },
      { label: "Annual title/escrow spend", value: "$25B+" },
    ],
    painPoints: [
      "Closings drag 30-50 days across siloed agents, title, escrow, and lender systems.",
      "Buyers pay a stack of intermediary fees - escrow, title insurance, wire, recording - on every deal.",
      "Wire fraud and title fraud siphon billions because funds and title move separately.",
      "Sale prices and buyer identities are public record, exposing negotiation and financial detail.",
    ],
    solutions: [
      {
        feature: "Atomic title transfer + on-chain escrow",
        how: "Buyer funds, seller payoff, and the title token settle in a single transaction - the deed only transfers if the money clears, removing the separate escrow agent and the wire-fraud window entirely.",
      },
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Sale price, deposit, and buyer/seller identities stay hidden on-chain, while a scoped viewing key lets the county recorder and closing auditor verify the transfer without publishing private financials.",
      },
      {
        feature: "eth_getProof tamper-proof title",
        how: "Every title token carries a Merkle-Patricia inclusion proof, so any party can cryptographically verify current ownership against chain state without trusting a central registry copy.",
      },
      {
        feature: "BLS proof-of-stake finality",
        how: "Once the block seals, the sale is irreversible in seconds - no rescission window, no clawback, no multi-day funding limbo between deposit and recording.",
      },
      {
        feature: "PYRAX Compute verifiable AVM valuation",
        how: "An automated valuation model runs with a cryptographic proof of its inputs and output, so a listing or appraisal price can be shown to a buyer or lender as fair and reproducible.",
      },
    ],
    dapps: [
      { name: "AtomicClose", desc: "One-transaction home closing that swaps buyer funds, seller payoff, and the title token atomically, retiring the standalone escrow company.", tags: ["Escrow", "Finality"] },
      { name: "DeedProof", desc: "Title-verification widget that proves current ownership from an eth_getProof inclusion proof, embeddable in any listing or lender portal.", tags: ["eth_getProof", "EVM"] },
      { name: "QuietOffer", desc: "Shielded offer-and-acceptance flow where bid amounts and buyer identity stay private until the deal is signed, with a recorder viewing key.", tags: ["Shielded", "ZK"] },
      { name: "FairPrice", desc: "PYRAX Compute AVM that returns a home valuation plus a verifiable compute proof of the comps and model used.", tags: ["Compute", "ZK"] },
      { name: "TitleGuard", desc: "On-chain title-insurance contract that reads the deed proof directly and only underwrites clean chains of ownership.", tags: ["EVM", "eth_getProof"] },
      { name: "DepositLock", desc: "Programmable earnest-money escrow that auto-releases to the seller on close or refunds the buyer on a failed contingency.", tags: ["Escrow", "EVM"] },
      { name: "AgentSplit", desc: "Commission-splitter contract that fans the closing proceeds across listing, buyer, and brokerage the instant the deed transfers.", tags: ["EVM", "Finality"] },
      { name: "RecorderView", desc: "County-recorder dashboard that ingests viewing keys to reconstruct a verifiable, private register of shielded residential transfers.", tags: ["Shielded", "Gov"] },
    ],
  },

  "commercial-property": {
    overview:
      "Commercial real estate - office, retail, industrial, and multifamily - runs on long due-diligence cycles, syndicated capital stacks, and settlement risk between institutional buyers and sellers. PYRAX tokenizes CRE assets and leases as multi-VM contracts, settles multi-million-dollar transfers atomically with instant finality, and keeps deal economics shielded while auditors hold viewing keys.",
    marketSize: "$1.3T (2024)",
    projection: "$1.9T by 2030 · ~6.5% CAGR",
    source: "JLL, 2024",
    stats: [
      { label: "Global CRE investment volume", value: "$1.3T" },
      { label: "Avg. deal due-diligence", value: "60-90 days" },
      { label: "Global CRE stock", value: "$34T" },
      { label: "Cross-border capital share", value: "~20%" },
    ],
    painPoints: [
      "Institutional closings take months of manual diligence, legal review, and wire coordination.",
      "Capital stacks are syndicated across many LPs with opaque, spreadsheet-driven cap tables.",
      "Large transfers carry settlement and counterparty risk while funds sit in escrow.",
      "Deal terms and investor positions are commercially sensitive yet hard to keep private in shared systems.",
    ],
    solutions: [
      {
        feature: "RWA tokenization via multi-VM contracts",
        how: "An office or industrial asset is represented as a tokenized ownership contract (EVM, WASM, or Cairo), turning an illiquid building into transferable, programmable equity with an on-chain cap table.",
      },
      {
        feature: "Atomic settlement + on-chain escrow",
        how: "A multi-million-dollar acquisition settles as one transaction - equity token, purchase funds, and lien payoff move together, eliminating the escrow-agent float on large deals.",
      },
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Cap-rate, purchase price, and individual LP positions stay confidential on-chain, while auditors and the acquiring fund's compliance desk use viewing keys for read-only verification.",
      },
      {
        feature: "Programmable leases",
        how: "Commercial leases become smart contracts that meter rent, CAM charges, and escalations automatically, streaming payments to owners each period without a property-manager reconciliation step.",
      },
      {
        feature: "IoT/PropTech building data on-chain",
        how: "Occupancy, energy, and maintenance telemetry are anchored on-chain to substantiate NOI and building condition for buyers, refinancers, and green-lease covenants.",
      },
    ],
    dapps: [
      { name: "AssetMint", desc: "CRE tokenization studio that issues a tokenized building equity contract with an on-chain, shielded cap table for syndicated LPs.", tags: ["RWA", "EVM"] },
      { name: "DealClose", desc: "Atomic acquisition rail that swaps the equity token, buyer funds, and lender payoff in one settled block for institutional deals.", tags: ["Escrow", "Finality"] },
      { name: "LeaseStream", desc: "Programmable commercial lease that meters base rent, CAM, and escalations and streams collections to owners automatically.", tags: ["EVM", "WASM"] },
      { name: "CapTablePrivate", desc: "Shielded LP register where investor stakes are hidden but each holder and the auditor carry a scoped viewing key.", tags: ["Shielded", "ZK"] },
      { name: "NOIProof", desc: "On-chain NOI attestation built from IoT occupancy and energy feeds to substantiate valuation during diligence.", tags: ["IoT", "eth_getProof"] },
      { name: "DiligenceVault", desc: "Selective-disclosure data room where sellers reveal shielded rent rolls and financials to qualified buyers via viewing keys.", tags: ["Shielded", "Cairo"] },
      { name: "GreenCovenant", desc: "Sustainability-linked lease contract that adjusts terms based on verifiable on-chain building energy telemetry.", tags: ["IoT", "EVM"] },
      { name: "SyndicatePay", desc: "Distribution engine that fans quarterly cash flow across the tokenized cap table with instant, provable finality.", tags: ["RWA", "Finality"] },
    ],
  },

  "property-management": {
    overview:
      "Property management coordinates rent collection, maintenance, leasing, and owner disbursements across scattered portfolios, drowning in reconciliation and trust-accounting overhead. PYRAX turns leases into programmable contracts that stream rent, escrow deposits, and split owner payouts automatically, with reputation-scored tenants and shielded ledgers that auditors can inspect via viewing keys.",
    marketSize: "$24.2B (2024)",
    projection: "$44.5B by 2030 · ~10.7% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global property-management market", value: "$24.2B" },
      { label: "U.S. units under management", value: "50M+" },
      { label: "Avg. management fee", value: "8-12% of rent" },
      { label: "Late/missed rent rate", value: "~7%" },
    ],
    painPoints: [
      "Rent collection, trust accounting, and owner disbursements require constant manual reconciliation.",
      "Security deposits sit in commingled trust accounts with disputed, opaque deductions.",
      "Maintenance requests and vendor payments are fragmented across email, portals, and spreadsheets.",
      "Owners lack real-time, verifiable visibility into portfolio cash flow and tenant standing.",
    ],
    solutions: [
      {
        feature: "Programmable leases",
        how: "Each lease is a contract that auto-collects rent every period, applies late logic, and streams the net directly to the owner - no trust-account reconciliation and no missed disbursement.",
      },
      {
        feature: "On-chain escrow for deposits",
        how: "Security deposits are held in a transparent escrow contract with rules for return and deductions, so end-of-lease disputes settle against provable on-chain conditions instead of a manager's ledger.",
      },
      {
        feature: "Reputation for rentals",
        how: "Tenants and vendors accrue portable, on-chain reputation from payment history and completed jobs, letting managers screen and price risk without re-pulling opaque third-party reports.",
      },
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Rent amounts, owner distributions, and tenant balances stay private on-chain, while the owner and a trust-account auditor hold viewing keys for read-only verification.",
      },
      {
        feature: "Milestone-based maintenance payments",
        how: "Vendor work orders release payment automatically when a verified completion condition (photo, inspection sign-off, IoT sensor) is met, cutting invoice-approval lag.",
      },
    ],
    dapps: [
      { name: "RentFlow", desc: "Programmable lease that auto-collects rent, applies late fees, and streams the net to the owner every cycle.", tags: ["EVM", "Escrow"] },
      { name: "DepositFair", desc: "Transparent deposit-escrow contract that returns or deducts against provable, agreed on-chain conditions at move-out.", tags: ["Escrow", "EVM"] },
      { name: "TenantScore", desc: "Portable rental-reputation registry built from on-chain payment history that tenants carry between landlords.", tags: ["Reputation", "ZK"] },
      { name: "FixQueue", desc: "Maintenance work-order dApp that escrows vendor payment and releases it on verified job completion.", tags: ["Escrow", "IoT"] },
      { name: "OwnerLedger", desc: "Shielded owner dashboard showing real-time portfolio cash flow with a viewing key for the trust-account auditor.", tags: ["Shielded", "Gov"] },
      { name: "SplitDisburse", desc: "Distribution contract that fans collected rent across owner, manager fee, and reserve escrow the moment it clears.", tags: ["EVM", "Finality"] },
      { name: "VendorRep", desc: "Vendor reputation and dispatch board that ranks contractors by verifiable completed-job history.", tags: ["Reputation", "WASM"] },
      { name: "LeaseSign", desc: "On-chain lease execution with shielded terms and instant finality, replacing PDF-and-email signing loops.", tags: ["Shielded", "Finality"] },
    ],
  },

  "real-estate-investment": {
    overview:
      "REITs and real-estate funds pool investor capital into income property, but shares trade in slow, gated, high-minimum vehicles with quarterly reporting lags and opaque asset-level economics. PYRAX tokenizes REIT and fund units as liquid, tradeable multi-VM contracts, distributes income automatically, and keeps individual positions shielded while regulators and auditors hold viewing keys.",
    marketSize: "$4.0T (2024)",
    projection: "$5.8T by 2030 · ~6.4% CAGR",
    source: "MSCI, 2024",
    stats: [
      { label: "Global listed REIT market cap", value: "$2.0T" },
      { label: "Institutional RE AUM", value: "$4.0T" },
      { label: "Typical private-REIT minimum", value: "$25K+" },
      { label: "Distribution/reporting cadence", value: "Quarterly" },
    ],
    painPoints: [
      "Private REIT and fund units are illiquid with high minimums and long lock-ups.",
      "Investors get quarterly, backward-looking reporting with little asset-level transparency.",
      "Income distributions are manual, delayed, and hard to reconcile across many holders.",
      "Cross-border participation is throttled by custody, KYC, and settlement friction.",
    ],
    solutions: [
      {
        feature: "RWA tokenization via multi-VM contracts",
        how: "Fund and REIT units become fractional, tradeable tokens (EVM/WASM/Cairo) with programmable transfer restrictions, turning a locked-up private placement into a liquid, secondary-market instrument.",
      },
      {
        feature: "Programmable income distributions",
        how: "Rental income and dividends stream to unit-holders pro rata on a schedule the contract enforces, replacing manual quarterly distribution runs and reconciliation.",
      },
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Individual investor positions and returns stay private on-chain, while a scoped viewing key gives auditors and securities regulators read-only oversight of the whole vehicle.",
      },
      {
        feature: "BLS proof-of-stake finality",
        how: "Secondary trades of tokenized units settle in seconds with irreversible finality, giving investors real liquidity instead of redemption queues.",
      },
      {
        feature: "PYRAX Compute verifiable analytics",
        how: "Portfolio risk, NAV, and stress-test models run with verifiable compute, so the reported net asset value can be proven to reflect the stated methodology.",
      },
    ],
    dapps: [
      { name: "REITMint", desc: "Tokenized REIT unit issuer with programmable transfer rules and an on-chain, shielded holder register.", tags: ["RWA", "EVM"] },
      { name: "YieldStream", desc: "Distribution engine that streams rental income to unit-holders pro rata on the contract's schedule.", tags: ["EVM", "Finality"] },
      { name: "UnitSwap", desc: "Secondary marketplace where tokenized fund units trade with instant settlement and compliance gating.", tags: ["RWA", "Finality"] },
      { name: "NAVProof", desc: "PYRAX Compute net-asset-value calculator that publishes a verifiable proof of the valuation methodology each period.", tags: ["Compute", "ZK"] },
      { name: "PositionPrivate", desc: "Shielded investor portfolio where holdings and returns are hidden but a regulator viewing key covers the whole fund.", tags: ["Shielded", "Gov"] },
      { name: "AccreditGate", desc: "Selective-disclosure accreditation check that lets investors prove eligibility without exposing full financials.", tags: ["Shielded", "Cairo"] },
      { name: "FundBridge", desc: "Cross-border subscription contract that onboards global LPs with shielded KYC and atomic capital calls.", tags: ["RWA", "Escrow"] },
      { name: "DebtTranche", desc: "Tokenized mortgage-REIT tranche builder that splits property debt into programmable, tradeable risk layers.", tags: ["RWA", "WASM"] },
    ],
  },

  "mortgage-lending": {
    overview:
      "Mortgage lending is a multi-week gauntlet of origination, underwriting, funding, recording, and secondary-market sale, riddled with document handoffs, wire risk, and privacy tradeoffs. PYRAX makes the loan a programmable contract that funds atomically against the title, streams servicing payments, and keeps borrower financials shielded while lenders and auditors hold viewing keys.",
    marketSize: "$13.5T (2024)",
    projection: "$18.9T by 2030 · ~5.7% CAGR",
    source: "Fortune Business Insights, 2024",
    stats: [
      { label: "U.S. mortgage debt outstanding", value: "$13.5T" },
      { label: "Avg. origination cost", value: "$8-11K" },
      { label: "Avg. time to close a loan", value: "42 days" },
      { label: "MBS market size", value: "$12T+" },
    ],
    painPoints: [
      "Origination and underwriting take weeks of document collection and manual verification.",
      "Funding, payoff, and title recording move on separate rails, opening wire- and title-fraud windows.",
      "Servicing transfers and secondary-market sales lose the audit trail between parties.",
      "Borrowers must expose full financials, yet lenders still lack a verifiable single source of truth.",
    ],
    solutions: [
      {
        feature: "Atomic funding + on-chain escrow against title",
        how: "Loan proceeds disburse in the same transaction that records the lien on the title token - the mortgage and the money bind together, closing the funding-to-recording gap where fraud lives.",
      },
      {
        feature: "Programmable loan servicing",
        how: "The loan contract meters principal, interest, escrow, and payoff automatically, so servicing transfers hand over a self-describing, always-current ledger rather than a reconciliation project.",
      },
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Borrower income, balance, and payment history stay private on-chain, while the lender, servicer, and a regulator use viewing keys for read-only, auditable access.",
      },
      {
        feature: "eth_getProof tamper-proof lien",
        how: "The lien position is verifiable by inclusion proof against chain state, so buyers of the loan or the MBS can confirm collateral and seniority without trusting a servicer's records.",
      },
      {
        feature: "PYRAX Compute verifiable underwriting",
        how: "Credit-decision and affordability models run with verifiable compute, so an approval or denial can be proven consistent and non-discriminatory to a regulator.",
      },
    ],
    dapps: [
      { name: "FundAtomic", desc: "Closing rail that disburses loan proceeds and records the lien on the title token in a single atomic transaction.", tags: ["Escrow", "eth_getProof"] },
      { name: "ServiceStream", desc: "Programmable servicing contract that meters P&I and escrow and produces a live, transfer-ready loan ledger.", tags: ["EVM", "Finality"] },
      { name: "UnderwriteProof", desc: "PYRAX Compute underwriting engine that attaches a verifiable proof to each credit decision for fair-lending audits.", tags: ["Compute", "ZK"] },
      { name: "LienVerify", desc: "Collateral-check widget that proves lien position and seniority from an eth_getProof inclusion proof.", tags: ["eth_getProof", "EVM"] },
      { name: "MBSForge", desc: "Securitization studio that pools tokenized loans into tradeable MBS tranches with on-chain performance data.", tags: ["RWA", "WASM"] },
      { name: "BorrowerVault", desc: "Shielded borrower financial profile shared with lenders through scoped, revocable viewing keys.", tags: ["Shielded", "Cairo"] },
      { name: "PayoffSwap", desc: "Atomic refinance contract that pays off the old lien and records the new one in one settled block.", tags: ["Escrow", "Finality"] },
      { name: "EscrowMeter", desc: "Tax-and-insurance escrow tracker that streams disbursements and reconciles shortages automatically.", tags: ["EVM", "IoT"] },
    ],
  },

  "construction": {
    overview:
      "Construction is plagued by payment disputes, retainage battles, and slow milestone approvals across owners, GCs, and a deep subcontractor chain. PYRAX turns the payment schedule into milestone-based escrow that releases funds on verified progress, anchors IoT and inspection data on-chain, and keeps bid and margin data shielded while owners and auditors hold viewing keys.",
    marketSize: "$13.6T (2024)",
    projection: "$18.8T by 2030 · ~5.5% CAGR",
    source: "Deloitte, 2024",
    stats: [
      { label: "Global construction output", value: "$13.6T" },
      { label: "Avg. days sales outstanding", value: "94 days" },
      { label: "Payments disputed/late", value: "~$280B/yr" },
      { label: "Projects over budget", value: "~70%" },
    ],
    painPoints: [
      "Progress payments and retainage are slow, disputed, and stuck behind manual approvals.",
      "Subcontractors down the chain wait months and carry the financing cost of delayed pay.",
      "Verifying that a milestone is actually complete relies on paperwork and site visits.",
      "Bids, margins, and change-order pricing are sensitive but exposed in shared project systems.",
    ],
    solutions: [
      {
        feature: "Milestone-based construction payments",
        how: "Funds are escrowed against a schedule of values and released automatically when a milestone's verification condition is met, so contractors are paid the moment work is proven done.",
      },
      {
        feature: "IoT/PropTech progress data on-chain",
        how: "Site sensors, drone survey, and inspector sign-offs anchor an immutable progress record, giving the escrow contract a trustworthy trigger and the owner a verifiable build history.",
      },
      {
        feature: "On-chain escrow with atomic release",
        how: "A single escrow holds owner funds and pays the GC and subcontractors in one atomic distribution on release, eliminating the pay-when-paid financing gap down the chain.",
      },
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Bid amounts, subcontractor margins, and change-order pricing stay confidential on-chain, while the owner and a project auditor hold viewing keys for read-only cost verification.",
      },
      {
        feature: "Reputation for contractors",
        how: "GCs and subs accrue portable, on-chain reputation from on-time, on-budget, dispute-free completions, letting owners prequalify bidders against verifiable track record.",
      },
    ],
    dapps: [
      { name: "MilestonePay", desc: "Escrow that releases progress payments automatically when a schedule-of-values milestone is verified complete.", tags: ["Escrow", "IoT"] },
      { name: "SiteProof", desc: "On-chain progress log that anchors sensor, drone, and inspector data as the trigger for milestone release.", tags: ["IoT", "eth_getProof"] },
      { name: "SubChainPay", desc: "Cascading payment contract that pays the GC and every subcontractor tier atomically on each release.", tags: ["Escrow", "Finality"] },
      { name: "RetainVault", desc: "Programmable retainage account that holds and releases held-back funds against final-completion conditions.", tags: ["Escrow", "EVM"] },
      { name: "BidPrivate", desc: "Sealed-bid tender dApp where bid amounts stay shielded until the deadline, with an owner viewing key.", tags: ["Shielded", "ZK"] },
      { name: "ContractorRep", desc: "Reputation registry ranking GCs and subs by verifiable on-time, on-budget completion history.", tags: ["Reputation", "WASM"] },
      { name: "ChangeOrder", desc: "On-chain change-order flow with shielded pricing and instant, auditable owner approval.", tags: ["Shielded", "EVM"] },
      { name: "LienWaiver", desc: "Automated conditional-lien-waiver contract that clears with each verified milestone payment.", tags: ["EVM", "Finality"] },
    ],
  },

  "land-registry": {
    overview:
      "Land registries are the legal source of truth for ownership, yet many run on paper, disconnected databases, and manual recording that invites fraud, error, and long title searches. PYRAX makes each parcel a tamper-proof title token verifiable by inclusion proof, with shielded ownership that governments and auditors read through viewing keys - a public register that is provable yet privacy-preserving.",
    marketSize: "$8.9B (2024)",
    projection: "$18.2B by 2030 · ~12.7% CAGR",
    source: "Statista, 2024",
    stats: [
      { label: "Digital land-registry market", value: "$8.9B" },
      { label: "Parcels lacking formal title", value: "~70% globally" },
      { label: "Avg. title search cost", value: "$200-400" },
      { label: "Property fraud exposure", value: "$1B+/yr (US)" },
    ],
    painPoints: [
      "Ownership records are fragmented across paper, county databases, and title plants.",
      "Title fraud and forged deeds exploit manual, unverifiable recording processes.",
      "Title searches are slow, costly, and re-run from scratch for every transaction.",
      "Registries must be publicly trustworthy yet also protect owner privacy and safety.",
    ],
    solutions: [
      {
        feature: "eth_getProof tamper-proof title",
        how: "Each parcel is a title token whose current owner is provable by a Merkle-Patricia inclusion proof, so anyone can verify ownership against chain state without a trusted intermediary or a manual search.",
      },
      {
        feature: "Atomic title transfer",
        how: "Recording and transfer happen in one settled transaction, so the register is never in an intermediate, forgeable state between deed signing and recording.",
      },
      {
        feature: "Shielded ownership with government viewing keys",
        how: "Owner identity and consideration are shielded on-chain, while the registry office, courts, and auditors hold viewing keys for lawful, read-only access - solving the public-trust-versus-privacy tension.",
      },
      {
        feature: "Programmable encumbrances",
        how: "Liens, easements, and covenants attach to the parcel as contract state, so a title token always carries its live encumbrance set instead of a stale paper abstract.",
      },
      {
        feature: "BLS proof-of-stake finality",
        how: "A recording is irreversible within seconds, giving the register the certainty and immutability a legal system of record requires.",
      },
    ],
    dapps: [
      { name: "ParcelChain", desc: "Sovereign land register where each parcel is a title token with owner, boundary, and encumbrance state on-chain.", tags: ["eth_getProof", "Gov"] },
      { name: "TitleProof", desc: "Public ownership-verification portal that returns a cryptographic inclusion proof for any parcel in seconds.", tags: ["eth_getProof", "EVM"] },
      { name: "RecordAtomic", desc: "One-transaction recording rail that transfers and records a deed atomically with instant finality.", tags: ["Finality", "Escrow"] },
      { name: "PrivateOwner", desc: "Shielded ownership register where owner identity is hidden but registry and court viewing keys grant lawful access.", tags: ["Shielded", "Gov"] },
      { name: "EncumberTrack", desc: "Live encumbrance manager attaching liens, easements, and covenants to the parcel token as verifiable state.", tags: ["EVM", "eth_getProof"] },
      { name: "TitleInsure", desc: "On-chain title insurer that reads the parcel proof directly and underwrites only clean ownership chains.", tags: ["EVM", "Finality"] },
      { name: "BoundaryOracle", desc: "GIS-anchored parcel-boundary oracle that ties survey and IoT geolocation data to the on-chain title.", tags: ["IoT", "Gov"] },
      { name: "DisputeCourt", desc: "Selective-disclosure dispute portal where claimants prove competing interests to a court via viewing keys.", tags: ["Shielded", "Cairo"] },
    ],
  },

  "fractional-ownership": {
    overview:
      "Fractional ownership opens real estate to smaller investors by splitting a property into shares, but legacy platforms lock those shares in illiquid, high-fee, single-platform silos. PYRAX tokenizes each property as a liquid, tradeable multi-VM ownership contract with atomic settlement, automatic income splits, and shielded positions that auditors verify through viewing keys.",
    marketSize: "$16.2B (2024)",
    projection: "$41.5B by 2030 · ~17.0% CAGR",
    source: "Boston Consulting Group, 2024",
    stats: [
      { label: "Tokenized real-estate market", value: "$16.2B" },
      { label: "Projected tokenized RWA (2030)", value: "$18T+" },
      { label: "Typical platform fee", value: "1-3% + carry" },
      { label: "Retail investors reached", value: "10x wider" },
    ],
    painPoints: [
      "Fractional shares are illiquid and locked to a single issuing platform with no secondary market.",
      "High platform and management fees erode small-investor returns.",
      "Income distribution across many co-owners is manual and error-prone.",
      "Investors have little verifiable insight into the underlying asset or their true share.",
    ],
    solutions: [
      {
        feature: "RWA tokenization via multi-VM contracts",
        how: "A property is split into fungible ownership tokens (EVM/WASM/Cairo) that trade freely across wallets and marketplaces, turning fractional shares into genuinely liquid, portable assets.",
      },
      {
        feature: "Atomic settlement + on-chain escrow",
        how: "Buying or selling a fraction settles as one transaction - tokens and funds swap atomically on any secondary venue with no platform-held custody or redemption queue.",
      },
      {
        feature: "Programmable income splits",
        how: "Rental income streams to co-owners pro rata by the contract each period, so a 300-holder property distributes yield automatically instead of via a spreadsheet.",
      },
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Each investor's stake and returns stay private on-chain, while the sponsor's auditor and regulators hold a viewing key over the whole vehicle for oversight.",
      },
      {
        feature: "eth_getProof provable share",
        how: "An owner can prove their exact fractional stake by inclusion proof against chain state, independent of any platform's off-chain records.",
      },
    ],
    dapps: [
      { name: "FractionMint", desc: "Tokenizes a property into tradeable ownership shares with a shielded, provable on-chain cap table.", tags: ["RWA", "EVM"] },
      { name: "ShareSwap", desc: "Open secondary market where property fractions trade atomically across wallets with instant settlement.", tags: ["RWA", "Finality"] },
      { name: "YieldSplit", desc: "Income-distribution contract that streams rent to every co-owner pro rata each period.", tags: ["EVM", "Finality"] },
      { name: "StakeProof", desc: "Ownership-verification widget that proves an investor's exact fractional share from an inclusion proof.", tags: ["eth_getProof", "ZK"] },
      { name: "CoOwnGov", desc: "On-chain governance letting fractional owners vote on sale, refinance, and capex decisions.", tags: ["Gov", "EVM"] },
      { name: "PrivateStake", desc: "Shielded holder register where positions are hidden but a regulator viewing key spans the vehicle.", tags: ["Shielded", "Gov"] },
      { name: "EntryGate", desc: "Compliance-gated onboarding that lets investors prove eligibility via selective disclosure before buying in.", tags: ["Shielded", "Cairo"] },
      { name: "BuyoutPool", desc: "Programmable buyout contract that lets co-owners tender for full ownership at a contract-set price.", tags: ["Escrow", "WASM"] },
    ],
  },

  "short-term-rentals": {
    overview:
      "Short-term rentals connect travelers with hosts, but platforms take 15-20% in fees, hold deposits opaquely, and lock guest and host reputation inside their walled gardens. PYRAX enables trust-minimized booking with on-chain escrow, portable reputation, IoT-verified check-in, and shielded pricing - a peer-to-peer rental layer where funds and reviews are not owned by a single platform.",
    marketSize: "$114B (2024)",
    projection: "$247B by 2030 · ~13.7% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global vacation-rental market", value: "$114B" },
      { label: "Platform take rate", value: "15-20%" },
      { label: "Active listings worldwide", value: "7M+" },
      { label: "Avg. deposit held", value: "$250-500" },
    ],
    painPoints: [
      "Platforms extract 15-20% and control payouts, deposits, and dispute resolution.",
      "Reputation and reviews are locked to one platform and non-portable for hosts and guests.",
      "Security deposits are held opaquely with slow, contested returns.",
      "Guests and hosts must expose personal and pricing data to a central intermediary.",
    ],
    solutions: [
      {
        feature: "On-chain escrow booking",
        how: "Guest payment is escrowed and released to the host on verified check-in, with the deposit auto-returned on checkout - removing the platform as custodian and the 15-20% take.",
      },
      {
        feature: "Reputation for rentals",
        how: "Guest and host reputation is portable, on-chain, and platform-independent, built from real completed stays and disputes so trust travels with the user instead of the app.",
      },
      {
        feature: "IoT/PropTech check-in on-chain",
        how: "Smart-lock and sensor events anchor verifiable check-in/check-out, giving the escrow contract a trustworthy trigger to release funds and settle the deposit.",
      },
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Nightly rates, payouts, and guest identity stay private on-chain, while a host's tax authority or the operator's auditor can use a viewing key for lawful reporting.",
      },
      {
        feature: "Programmable dynamic pricing",
        how: "Pricing and cancellation policy live in the booking contract, so rate rules and refund logic execute deterministically instead of via opaque platform policy.",
      },
    ],
    dapps: [
      { name: "StayEscrow", desc: "Peer-to-peer booking that escrows guest funds and releases them to the host on verified check-in.", tags: ["Escrow", "IoT"] },
      { name: "RepPassport", desc: "Portable guest-and-host reputation built from on-chain completed stays, usable across any rental app.", tags: ["Reputation", "ZK"] },
      { name: "LockProof", desc: "Smart-lock oracle that anchors check-in/check-out events on-chain to trigger escrow and deposit settlement.", tags: ["IoT", "eth_getProof"] },
      { name: "DepositReturn", desc: "Transparent deposit contract that auto-returns funds at checkout unless a provable damage claim is filed.", tags: ["Escrow", "EVM"] },
      { name: "RatePrivate", desc: "Shielded booking flow where nightly rates and payouts stay private, with a tax-authority viewing key for hosts.", tags: ["Shielded", "Gov"] },
      { name: "DynamicRate", desc: "On-chain dynamic-pricing engine that sets nightly rates and cancellation terms deterministically.", tags: ["EVM", "WASM"] },
      { name: "DisputeFair", desc: "Neutral dispute-resolution dApp that adjudicates claims against on-chain check-in and condition evidence.", tags: ["Escrow", "Reputation"] },
      { name: "HostPay", desc: "Instant host payout that settles with finality the moment a stay completes, no multi-day platform hold.", tags: ["Finality", "EVM"] },
    ],
  },

  "proptech": {
    overview:
      "PropTech digitizes buildings and real-estate operations with IoT, smart-building systems, and data platforms, but that telemetry sits in vendor silos with no trusted, cross-party record. PYRAX anchors building and device data on-chain as tamper-proof state, runs verifiable analytics through PYRAX Compute, and lets owners monetize shielded data with viewing-key access - turning building intelligence into a shared, provable layer.",
    marketSize: "$40.2B (2024)",
    projection: "$133.1B by 2032 · ~16.1% CAGR",
    source: "Fortune Business Insights, 2024",
    stats: [
      { label: "Global PropTech market", value: "$40.2B" },
      { label: "Connected buildings (2024)", value: "~1.5B devices" },
      { label: "PropTech VC funding (2023)", value: "$11.4B" },
      { label: "Smart-building energy savings", value: "10-30%" },
    ],
    painPoints: [
      "Building IoT and operations data are trapped in incompatible, single-vendor silos.",
      "No trusted cross-party record ties telemetry to leases, valuations, or ESG claims.",
      "AI models for energy, occupancy, and valuation are black boxes owners cannot verify.",
      "Owners cannot safely share or monetize sensitive building data without losing control of it.",
    ],
    solutions: [
      {
        feature: "IoT/PropTech building data on-chain",
        how: "Sensor, meter, and BMS telemetry is anchored on-chain as tamper-proof state, giving every stakeholder - owner, tenant, insurer, regulator - one verifiable record instead of vendor exports.",
      },
      {
        feature: "PYRAX Compute verifiable AI/compute",
        how: "Energy-optimization, occupancy, and valuation models run with cryptographic proofs of inputs and outputs, so an ESG figure or a savings claim can be independently verified.",
      },
      {
        feature: "Shielded data with viewing keys",
        how: "Owners keep raw building data shielded and grant scoped, revocable viewing keys to insurers, auditors, or data buyers - monetizing telemetry without surrendering it.",
      },
      {
        feature: "Programmable data marketplaces",
        how: "Building data streams are metered and sold through smart contracts, paying owners per query while contracts enforce usage and access terms automatically.",
      },
      {
        feature: "eth_getProof anchored records",
        how: "Any anchored building metric is provable by inclusion proof, so leases, green certifications, and insurance covenants can reference verifiable on-chain data rather than trust a report.",
      },
    ],
    dapps: [
      { name: "BuildingChain", desc: "Anchors BMS, meter, and sensor telemetry on-chain as a tamper-proof, multi-stakeholder building record.", tags: ["IoT", "eth_getProof"] },
      { name: "ESGProof", desc: "PYRAX Compute engine that computes energy and emissions metrics with a verifiable proof for ESG reporting.", tags: ["Compute", "ZK"] },
      { name: "DataMarket", desc: "Metered marketplace where owners sell shielded building-data streams via viewing keys and per-query pricing.", tags: ["Shielded", "EVM"] },
      { name: "OccupancyOracle", desc: "On-chain occupancy oracle feeding verifiable people-counts into leases, valuations, and HVAC control.", tags: ["IoT", "Finality"] },
      { name: "SmartLease", desc: "PropTech lease contract that ties rent, CAM, and green covenants to live on-chain building telemetry.", tags: ["EVM", "IoT"] },
      { name: "ValuAI", desc: "PYRAX Compute valuation model that returns a building price with a proof of the data and method used.", tags: ["Compute", "ZK"] },
      { name: "AccessGrant", desc: "Viewing-key manager that issues scoped, revocable data access to insurers, lenders, and auditors.", tags: ["Shielded", "Cairo"] },
      { name: "DevicePay", desc: "Machine-to-machine payments where building devices settle for energy and services autonomously on-chain.", tags: ["IoT", "WASM"] },
    ],
  },
};

