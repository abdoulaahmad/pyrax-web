// SPDX-License-Identifier: LicenseRef-Proprietary
// Industry content for the "finance-banking" category (10 business types). Filled by content pass.
import type { CategoryContent } from "./types";

export const content: CategoryContent = {
  "retail-banking": {
    overview:
      "Retail banking serves individuals and small businesses with deposit accounts, cards, loans, and everyday payments, yet still runs on batch-settled cores where balances sit in siloed ledgers. PYRAX gives retail banks a shared, instantly-final settlement rail with shielded-by-default privacy, so consumer balances and counterparties stay confidential while viewing keys give supervisors read-only, auditable access.",
    marketSize: "$1.6T (2024)",
    projection: "$3.1T by 2032 · ~8.5% CAGR",
    source: "Fortune Business Insights, 2024",
    stats: [
      { label: "Global retail banking revenue", value: "$1.6T" },
      { label: "Adults with a bank account", value: "76%" },
      { label: "Annual cross-account transfers", value: "$40T+" },
      { label: "Fraud losses per year", value: "$485B" },
    ],
    painPoints: [
      "T+1/T+2 batch settlement locks up liquidity and hides intraday risk until end of day.",
      "Account balances and transaction histories live in fragmented, non-interoperable cores.",
      "Card and account fraud costs the sector hundreds of billions annually.",
      "Privacy and disclosure obligations pull in opposite directions - either data is exposed or regulators are blind.",
    ],
    solutions: [
      {
        feature: "BLS proof-of-stake finality",
        how: "Deposits, transfers, and card settlements clear with instant, irreversible finality, eliminating T+1 float and intraday counterparty exposure between banks on the same rail.",
      },
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Customer balances, counterparties, and amounts stay hidden on-chain, while per-account viewing keys give auditors and regulators read-only, auditable access without the ability to move funds.",
      },
      {
        feature: "GhostDAG (500k-TPS target)",
        how: "Parallel block production absorbs retail payment peaks - payroll days, holidays, refunds - without the throughput ceiling or fee spikes of linear chains.",
      },
      {
        feature: "Multi-VM smart contracts (EVM / WASM / Cairo)",
        how: "Program overdraft rules, standing orders, round-up savings, and interest accrual in Solidity or Rust so account logic is transparent, testable, and upgradeable.",
      },
      {
        feature: "PYRAX Compute verifiable AI/compute",
        how: "Run fraud-scoring and credit-decision models with cryptographically verifiable outputs, so a declined transaction or flagged account can be proven fair and reproducible to a regulator.",
      },
    ],
    dapps: [
      { name: "ShieldLedger", desc: "Privacy-preserving deposit accounts where balances are ZK-shielded and each account issues a scoped viewing key for the bank’s compliance desk.", tags: ["Shielded", "ZK"] },
      { name: "InstaClear", desc: "Interbank retail settlement network that finalizes consumer transfers in one block with BLS finality, retiring end-of-day netting.", tags: ["Finality", "EVM"] },
      { name: "RoundVault", desc: "Automated round-up savings contract that sweeps transaction remainders into a yield or reserve pool on every purchase.", tags: ["WASM", "EVM"] },
      { name: "FraudProof", desc: "PYRAX Compute-backed fraud scorer that attaches a verifiable proof to each decline so disputes can be adjudicated on-chain.", tags: ["Compute", "ZK"] },
      { name: "OverdraftDAO", desc: "Programmable overdraft and fee logic governed by transparent, on-chain parameters instead of opaque core-banking rules.", tags: ["EVM", "Gov"] },
      { name: "KYCVault", desc: "Reusable, shielded KYC attestations that customers present to new services via selective-disclosure viewing keys.", tags: ["Shielded", "Cairo"] },
      { name: "PayrollRail", desc: "Bulk salary disbursement that fans out thousands of shielded credits in parallel and settles them with instant finality.", tags: ["Shielded", "Finality"] },
      { name: "DisputeEscrow", desc: "On-chain escrow that holds contested card payments until a merchant/cardholder resolution, releasing funds atomically.", tags: ["Escrow", "EVM"] },
    ],
  },

  "payments-remittances": {
    overview:
      "Payments and remittances move money between people, merchants, and borders, but still bleed value to intermediaries, correspondent hops, and multi-day settlement. PYRAX collapses the chain into a single, instantly-final rail where a shielded transfer settles peer-to-peer with regulator-visible viewing keys and near-zero fees, even across currencies.",
    marketSize: "$1.9T (2024)",
    projection: "$4.8T by 2032 · ~12% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global digital payments TPV", value: "$11.5T" },
      { label: "Cross-border remittance flows", value: "$905B" },
      { label: "Avg. remittance fee", value: "6.2%" },
      { label: "Real-time payments (2024)", value: "$266B txns" },
    ],
    painPoints: [
      "Correspondent-banking hops add days of delay and stack fees at each intermediary.",
      "Remittance costs average above 6%, far over the UN’s 3% target.",
      "Sender and recipient details are exposed across every intermediary in the chain.",
      "Failed or reversed payments create reconciliation and chargeback overhead.",
    ],
    solutions: [
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Remittances move directly from sender to recipient with amounts and identities hidden, while viewing keys let a remitter’s AML team and regulators inspect flows without breaking user privacy.",
      },
      {
        feature: "BLS proof-of-stake finality",
        how: "A payment is irreversibly settled in a single block - no correspondent chain, no multi-day float, no chargeback reversals to reconcile.",
      },
      {
        feature: "EIP-1559 fee market",
        how: "Predictable, low base fees replace percentage-based remittance markups, pushing effective cost per transfer toward fractions of a percent.",
      },
      {
        feature: "Sphinx mixnet metadata privacy",
        how: "Network-layer mixing hides transaction origin and timing, so even traffic analysis cannot link a sender to a recipient corridor.",
      },
      {
        feature: "GhostDAG (500k-TPS target)",
        how: "Parallel throughput sustains the volume of a global retail payments network - millions of small transfers per day - without congestion pricing.",
      },
    ],
    dapps: [
      { name: "RemitDirect", desc: "Sender-to-recipient shielded remittance with instant finality and a built-in compliance viewing key for the licensed operator.", tags: ["Shielded", "Finality"] },
      { name: "CorridorFX", desc: "On-chain FX-and-payout contract that swaps at a quoted rate and delivers local-currency value in one atomic transaction.", tags: ["EVM", "Escrow"] },
      { name: "MerchantTap", desc: "Point-of-sale acceptance dApp with sub-cent fees and one-block confirmation for merchants.", tags: ["EVM", "Finality"] },
      { name: "MixPay", desc: "Metadata-private consumer wallet routing payments through the Sphinx mixnet to defeat corridor traffic analysis.", tags: ["Mixnet", "Shielded"] },
      { name: "SplitFlow", desc: "Programmable payment splitter that fans a single incoming transfer across multiple recipients (payroll, marketplaces, tips).", tags: ["WASM", "EVM"] },
      { name: "StreamPay", desc: "Continuous streaming payments for gig work and subscriptions, metered per block and cancellable anytime.", tags: ["EVM", "Escrow"] },
      { name: "AMLSight", desc: "PYRAX Compute transaction-risk engine that scores flows and produces verifiable AML evidence via scoped viewing keys.", tags: ["Compute", "Shielded"] },
      { name: "RefundGuard", desc: "Escrow-backed conditional payment that auto-refunds if delivery conditions are not met within a deadline.", tags: ["Escrow", "EVM"] },
    ],
  },

  "lending-credit": {
    overview:
      "Lending and credit - from consumer loans to institutional facilities - is slowed by manual underwriting, opaque collateral, and settlement risk between originators and buyers. PYRAX turns loan lifecycles into programmable, instantly-settled contracts with shielded borrower data and viewing-key auditability, plus verifiable AI underwriting through PYRAX Compute.",
    marketSize: "$11.3T (2024)",
    projection: "$25.4T by 2032 · ~10.7% CAGR",
    source: "Precedence Research, 2024",
    stats: [
      { label: "Global lending market", value: "$11.3T" },
      { label: "Digital lending share", value: "$680B" },
      { label: "SME credit gap", value: "$5.7T" },
      { label: "Avg. loan-origination cost", value: "$6-9K" },
    ],
    painPoints: [
      "Underwriting is slow, manual, and hard to audit for fairness or bias.",
      "Collateral status and loan performance are opaque to secondary buyers.",
      "Borrower financial data must be exposed to lenders and servicers to underwrite.",
      "Loan sales and syndication carry settlement risk and multi-day transfer delays.",
    ],
    solutions: [
      {
        feature: "PYRAX Compute verifiable AI/compute",
        how: "Credit-scoring and affordability models run with cryptographic proofs of the exact model and inputs used, giving borrowers and regulators a fairness-auditable underwriting trail.",
      },
      {
        feature: "On-chain escrow",
        how: "Loan disbursement, collateral custody, and repayment waterfalls are held and released by escrow logic, removing counterparty risk in origination and secondary sale.",
      },
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Borrower balances, income proofs, and repayment history stay private, while a servicer or auditor uses viewing keys for read-only performance monitoring.",
      },
      {
        feature: "BLS proof-of-stake finality",
        how: "Loan-participation sales and drawdowns settle irreversibly in one block, so syndicate members and secondary buyers face no transfer-in-flight risk.",
      },
      {
        feature: "eth_getProof verifiable state",
        how: "Any party can cryptographically verify a loan’s outstanding balance, collateral, and status directly against chain state without trusting a servicer’s report.",
      },
    ],
    dapps: [
      { name: "ProofLend", desc: "Underwriting dApp that issues loans on PYRAX Compute-verified affordability scores with a proof attached to every decision.", tags: ["Compute", "EVM"] },
      { name: "CollateralVault", desc: "Escrow-locked collateral with on-chain, verifiable state so secondary buyers can audit LTV in real time.", tags: ["Escrow", "ZK"] },
      { name: "SyndiFlow", desc: "Loan syndication and participation transfers that settle atomically with BLS finality across lender cohorts.", tags: ["Finality", "EVM"] },
      { name: "ShieldScore", desc: "Privacy-preserving credit profile where the borrower shares income and history via scoped viewing keys, not raw data.", tags: ["Shielded", "ZK"] },
      { name: "RepayWaterfall", desc: "Programmable repayment splitter that routes principal and interest to tranches per a coded waterfall.", tags: ["WASM", "Escrow"] },
      { name: "SMECredit", desc: "Under-served small-business lending pool with pooled staking capital and automated draw/repay logic.", tags: ["Stake", "EVM"] },
      { name: "DefaultProof", desc: "Delinquency and default oracle that publishes verifiable performance data for loan buyers.", tags: ["ZK", "PYRAX Compute"] },
      { name: "InvoiceLine", desc: "Revolving credit line secured by shielded, escrowed receivables that release on invoice payment.", tags: ["Escrow", "Shielded"] },
    ],
  },

  "capital-markets": {
    overview:
      "Capital markets - equities, fixed income, and derivatives - remain saddled with T+1/T+2 settlement, layered custody, and reconciliation across CSDs and clearinghouses. PYRAX enables atomic, instantly-final delivery-versus-payment on tokenized instruments, with shielded positions that keep trading strategy private while viewing keys satisfy market surveillance.",
    marketSize: "$120T (2024)",
    projection: "$16.1T tokenized RWA by 2030",
    source: "Boston Consulting Group / World Federation of Exchanges, 2024",
    stats: [
      { label: "Global equity market cap", value: "$115T" },
      { label: "Global bond market", value: "$133T" },
      { label: "Tokenized assets by 2030", value: "$16T" },
      { label: "Avg. post-trade cost", value: "$17-24B/yr" },
    ],
    painPoints: [
      "T+1/T+2 settlement ties up collateral and creates persistent counterparty risk.",
      "Post-trade reconciliation across custodians, CSDs, and clearing is costly and error-prone.",
      "Order and position data leak trading intent to competitors and front-runners.",
      "Corporate actions and coupon payments are manual, slow, and dispute-prone.",
    ],
    solutions: [
      {
        feature: "BLS proof-of-stake finality",
        how: "Trades settle with atomic delivery-versus-payment in a single irreversible block, collapsing T+1 into T+0 and eliminating settlement-fail risk.",
      },
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Positions and order flow stay confidential to protect strategy, while regulators and surveillance desks use viewing keys for read-only market-abuse monitoring.",
      },
      {
        feature: "Multi-VM smart contracts (EVM / WASM / Cairo)",
        how: "Tokenized bonds, equities, and derivatives encode coupons, corporate actions, and lifecycle events as contracts - Cairo for ZK-verifiable payoff proofs where needed.",
      },
      {
        feature: "On-chain escrow",
        how: "Margin, collateral, and DvP legs are escrowed and released atomically, removing the window where one side has paid but not received.",
      },
      {
        feature: "GhostDAG (500k-TPS target)",
        how: "Parallel block production sustains exchange-grade order and settlement throughput without the latency and fee volatility of linear chains.",
      },
    ],
    dapps: [
      { name: "AtomicDvP", desc: "Delivery-versus-payment settlement engine that atomically swaps a tokenized security for cash with BLS finality.", tags: ["Finality", "Escrow"] },
      { name: "BondForge", desc: "Tokenized-bond issuance with coded coupon schedules and automated on-chain corporate actions.", tags: ["EVM", "WASM"] },
      { name: "DarkBook", desc: "Shielded order book that hides size and side until match, defeating front-running while staying surveillance-auditable.", tags: ["Shielded", "ZK"] },
      { name: "MarginLock", desc: "Real-time margin and collateral engine that escrows and rebalances positions per block.", tags: ["Escrow", "EVM"] },
      { name: "PayoffProof", desc: "Cairo-based derivative that publishes a ZK proof of correct payoff computation at expiry.", tags: ["Cairo", "ZK"] },
      { name: "RepoRail", desc: "Tri-party repo dApp with instant, atomic collateral movement and automatic unwind.", tags: ["Escrow", "Finality"] },
      { name: "SurveillanceKey", desc: "Regulator dashboard consuming scoped viewing keys to monitor for wash trades and spoofing across shielded books.", tags: ["Shielded", "Gov"] },
      { name: "CorpAction", desc: "Automated dividend, split, and voting distribution to tokenized-equity holders in a single parallel batch.", tags: ["EVM", "Gov"] },
    ],
  },

  "asset-management": {
    overview:
      "Asset managers run funds, ETFs, and separately-managed accounts where NAV calculation, subscription/redemption, and portfolio rebalancing are batch, opaque, and reconciliation-heavy. PYRAX makes fund shares programmable tokens with instant settlement, shielded holdings that protect proprietary allocations, and viewing keys that give auditors and administrators full transparency.",
    marketSize: "$128T AUM (2024)",
    projection: "$171T by 2028 · ~7.5% CAGR",
    source: "PwC Asset & Wealth Management, 2024",
    stats: [
      { label: "Global AUM", value: "$128T" },
      { label: "Passive/ETF assets", value: "$13.5T" },
      { label: "Tokenized fund AUM", value: "$2B+ (2024)" },
      { label: "Avg. TER (active)", value: "0.6-1.0%" },
    ],
    painPoints: [
      "Subscriptions and redemptions settle on lagged NAV cycles, exposing investors to timing risk.",
      "Proprietary portfolio composition leaks through disclosures and fund flows.",
      "Fund administration and reconciliation across TA, custodian, and manager is costly.",
      "Fee accrual and performance reporting are opaque and hard to independently verify.",
    ],
    solutions: [
      {
        feature: "Multi-VM smart contracts (EVM / WASM / Cairo)",
        how: "Fund shares, NAV strikes, subscription/redemption gates, and management/performance-fee accrual are encoded as auditable, upgradeable on-chain logic.",
      },
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Investor holdings and the fund’s live position sheet stay private, protecting alpha, while administrators and auditors read the full book through viewing keys.",
      },
      {
        feature: "BLS proof-of-stake finality",
        how: "Primary-market subscriptions and redemptions settle irreversibly in one block, eliminating the settlement lag between order and cash movement.",
      },
      {
        feature: "eth_getProof verifiable state",
        how: "Any LP or auditor can cryptographically verify the fund’s token supply, holdings, and fee accruals against chain state - no trust in the administrator’s spreadsheet.",
      },
      {
        feature: "PYRAX Compute verifiable AI/compute",
        how: "Quant and risk models execute with verifiable outputs, so factor exposures and risk limits can be proven to investors and compliance without revealing the model.",
      },
    ],
    dapps: [
      { name: "TokenFund", desc: "Tokenized fund-share dApp with programmable NAV strikes and instant primary-market settlement.", tags: ["EVM", "Finality"] },
      { name: "ShieldBook", desc: "Shielded portfolio ledger that hides live allocations from the market while exposing them to auditors via viewing keys.", tags: ["Shielded", "ZK"] },
      { name: "FeeAccrue", desc: "Automated management- and performance-fee accrual with a verifiable high-water-mark calculation.", tags: ["WASM", "EVM"] },
      { name: "RebalanceBot", desc: "On-chain rebalancing engine that executes target-weight trades atomically at each strike.", tags: ["EVM", "Escrow"] },
      { name: "ProofNAV", desc: "Independently verifiable NAV oracle backed by eth_getProof state proofs of holdings.", tags: ["ZK", "PYRAX Compute"] },
      { name: "RedeemGate", desc: "Redemption-queue contract enforcing gates, lock-ups, and pro-rata fills transparently.", tags: ["EVM", "Gov"] },
      { name: "RiskProof", desc: "PYRAX Compute risk engine publishing verifiable VaR and factor-exposure attestations to LPs.", tags: ["Compute", "Shielded"] },
      { name: "StakeYield", desc: "Fund that allocates idle cash into on-chain staking with transparent, coded yield distribution.", tags: ["Stake", "EVM"] },
    ],
  },

  "insurance": {
    overview:
      "Insurance spans underwriting, premium collection, claims, and reinsurance, all bogged down by manual claims, fraud, and slow payouts. PYRAX enables parametric and escrow-backed policies that pay automatically on verifiable triggers, keeps policyholder data shielded, and uses PYRAX Compute for auditable fraud and risk models.",
    marketSize: "$7.5T (2024)",
    projection: "$11.5T by 2032 · ~5.5% CAGR",
    source: "Statista / Swiss Re Institute, 2024",
    stats: [
      { label: "Global premium volume", value: "$7.5T" },
      { label: "Insurance fraud losses", value: "$308B/yr" },
      { label: "Avg. claim-cycle time", value: "12-30 days" },
      { label: "Reinsurance market", value: "$1.1T" },
    ],
    painPoints: [
      "Claims processing is manual, slow, and a major source of policyholder dissatisfaction.",
      "Fraudulent and duplicate claims drain hundreds of billions each year.",
      "Sensitive health and personal data must be shared broadly to underwrite and adjudicate.",
      "Reinsurance treaties and premium/claim flows are reconciled slowly across parties.",
    ],
    solutions: [
      {
        feature: "On-chain escrow",
        how: "Premiums fund escrowed policy reserves that release payouts automatically when a coded claim condition is met - no manual adjudication for parametric cover.",
      },
      {
        feature: "PYRAX Compute verifiable AI/compute",
        how: "Fraud-detection and risk-pricing models produce cryptographic proofs, so a denied claim or premium loading can be shown to be fair and reproducible.",
      },
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Policyholder health and personal data stay shielded on-chain, while claims adjusters and regulators use scoped viewing keys for read-only, need-to-know access.",
      },
      {
        feature: "Multi-VM smart contracts (EVM / WASM / Cairo)",
        how: "Parametric triggers, coinsurance splits, deductibles, and treaty terms are encoded as deterministic contracts that execute the same way every time.",
      },
      {
        feature: "BLS proof-of-stake finality",
        how: "Premium collection, claim payouts, and reinsurance cessions settle irreversibly in one block, giving all parties immediate, reconciled certainty.",
      },
    ],
    dapps: [
      { name: "ParaPay", desc: "Parametric insurance that auto-pays escrowed claims when an oracle confirms a trigger (flight delay, weather, quake).", tags: ["Escrow", "EVM"] },
      { name: "ClaimProof", desc: "PYRAX Compute fraud scorer that attaches a verifiable proof to every claim decision for dispute resolution.", tags: ["Compute", "ZK"] },
      { name: "ShieldPolicy", desc: "Shielded policy ledger where health and PII stay private and adjusters access only via scoped viewing keys.", tags: ["Shielded", "ZK"] },
      { name: "ReTreaty", desc: "On-chain reinsurance treaty that automates cessions and settles premium/claim flows between cedent and reinsurer.", tags: ["EVM", "Finality"] },
      { name: "PoolStake", desc: "Community risk pool capitalized by stakers, with transparent premium intake and coded loss sharing.", tags: ["Stake", "Escrow"] },
      { name: "MicroCover", desc: "Micro-insurance dApp issuing sub-cent-fee, single-block policies for gig and emerging-market users.", tags: ["EVM", "Finality"] },
      { name: "AuditKey", desc: "Regulator portal that reviews claims and reserves through viewing keys without exposing raw policyholder data.", tags: ["Shielded", "Gov"] },
      { name: "SubroFlow", desc: "Automated subrogation and recovery routing that settles recovered amounts back to insurers atomically.", tags: ["Escrow", "EVM"] },
    ],
  },

  "trade-finance": {
    overview:
      "Trade finance - letters of credit, guarantees, and supply-chain financing - is paper-heavy, fraud-prone, and slow, leaving a multi-trillion-dollar funding gap. PYRAX digitizes trade instruments as escrow-backed contracts that release on verified milestones, with shielded commercial terms and viewing keys for banks, customs, and auditors.",
    marketSize: "$8.5T (2024)",
    projection: "$14.2T by 2032 · ~6.6% CAGR",
    source: "MarketsandMarkets / ICC, 2024",
    stats: [
      { label: "Trade-finance volume", value: "$8.5T" },
      { label: "Global trade-finance gap", value: "$2.5T" },
      { label: "Documents per shipment", value: "20-40" },
      { label: "Avg. LC processing time", value: "5-10 days" },
    ],
    painPoints: [
      "Letters of credit and documentary collections are manual, paper-based, and slow.",
      "Duplicate financing and document fraud impose large losses on banks.",
      "A $2.5T financing gap excludes many SMEs from global trade.",
      "Commercial terms must be shared across many intermediaries, leaking sensitive pricing.",
    ],
    solutions: [
      {
        feature: "On-chain escrow",
        how: "Letters of credit and guarantees are funded into escrow that releases to the exporter automatically when shipment and document milestones are cryptographically verified.",
      },
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Invoice amounts, pricing, and counterparties stay shielded to protect commercial secrets, while financing banks and customs use viewing keys for compliance checks.",
      },
      {
        feature: "eth_getProof verifiable state",
        how: "Banks can prove an invoice or bill of lading has not already been financed, eliminating duplicate-financing fraud through verifiable, uniqueness-enforced state.",
      },
      {
        feature: "Multi-VM smart contracts (EVM / WASM / Cairo)",
        how: "LC terms, incoterms milestones, and multi-tier supply-chain financing waterfalls are encoded as deterministic contracts spanning all trade parties.",
      },
      {
        feature: "BLS proof-of-stake finality",
        how: "Cross-border trade payments and financing draws settle irreversibly in one block, removing the days of float in correspondent banking.",
      },
    ],
    dapps: [
      { name: "SmartLC", desc: "Digital letter of credit that escrows funds and releases to the exporter on verified document and shipment milestones.", tags: ["Escrow", "EVM"] },
      { name: "InvoiceUnique", desc: "Anti-fraud invoice registry using verifiable state to guarantee each receivable is financed only once.", tags: ["ZK", "EVM"] },
      { name: "ShieldTrade", desc: "Shielded trade ledger keeping pricing and counterparties private, with viewing keys for banks and customs.", tags: ["Shielded", "ZK"] },
      { name: "SupplyChainFi", desc: "Deep-tier supply-chain financing that cascades early-payment liquidity down to SME suppliers.", tags: ["Escrow", "WASM"] },
      { name: "GuaranteeVault", desc: "On-chain bank guarantee and standby-LC contract with automatic, condition-based drawdown.", tags: ["Escrow", "Finality"] },
      { name: "eBoL", desc: "Electronic bill of lading as a transferable, verifiable token that controls goods release.", tags: ["Cairo", "ZK"] },
      { name: "CustomsKey", desc: "Customs-authority portal validating trade documents through scoped viewing keys without full data exposure.", tags: ["Shielded", "Gov"] },
      { name: "FactorPool", desc: "Receivables-factoring marketplace where staked capital funds shielded, escrowed invoices.", tags: ["Stake", "Shielded"] },
    ],
  },

  "wealth-management": {
    overview:
      "Wealth management serves high-net-worth clients with advisory, portfolio construction, and estate planning, where privacy, personalization, and transparent fees are paramount. PYRAX lets advisors manage tokenized, shielded portfolios with instant rebalancing and settlement, while viewing keys give clients and auditors verifiable transparency into holdings and fees.",
    marketSize: "$137T (2024)",
    projection: "$230T by 2030 · ~9% CAGR",
    source: "Boston Consulting Group Global Wealth, 2024",
    stats: [
      { label: "Global private wealth", value: "$137T" },
      { label: "HNW individuals", value: "22.8M" },
      { label: "Robo-advisory AUM", value: "$1.8T" },
      { label: "Avg. advisory fee", value: "0.5-1.2%" },
    ],
    painPoints: [
      "Clients demand confidentiality but also want independent proof of what they hold.",
      "Portfolio rebalancing and cross-account moves settle slowly with reconciliation lag.",
      "Fee transparency and performance attribution are hard to verify independently.",
      "Estate transfers and multi-generational planning are manual and dispute-prone.",
    ],
    solutions: [
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Client holdings and transfers stay fully private on-chain, while the client and their auditor hold viewing keys for read-only, verifiable transparency into every position.",
      },
      {
        feature: "BLS proof-of-stake finality",
        how: "Rebalances, contributions, and withdrawals across a client’s tokenized accounts settle irreversibly in one block, with no in-flight settlement risk.",
      },
      {
        feature: "Multi-VM smart contracts (EVM / WASM / Cairo)",
        how: "Model portfolios, glide-paths, tax-loss-harvesting rules, and estate-distribution logic are encoded as programmable, auditable contracts.",
      },
      {
        feature: "eth_getProof verifiable state",
        how: "Clients independently verify holdings, fee accruals, and performance directly against chain state rather than trusting a quarterly statement.",
      },
      {
        feature: "On-chain escrow",
        how: "Estate and trust distributions are escrowed and released on coded conditions - time, milestones, or attestations - executing a client’s wishes deterministically.",
      },
    ],
    dapps: [
      { name: "PrivatePortfolio", desc: "Shielded managed account where the client alone (plus their auditor) can read holdings via viewing keys.", tags: ["Shielded", "ZK"] },
      { name: "GlidePath", desc: "Automated model-portfolio and glide-path engine that rebalances toward target allocations each period.", tags: ["EVM", "WASM"] },
      { name: "ProofStatement", desc: "Verifiable client statement backed by eth_getProof, so every holding and fee is independently checkable.", tags: ["ZK", "PYRAX Compute"] },
      { name: "TaxHarvest", desc: "Tax-loss-harvesting contract that identifies and executes offsetting trades automatically.", tags: ["EVM", "Escrow"] },
      { name: "EstateFlow", desc: "Escrow-based estate and trust distribution that releases assets to heirs on coded conditions.", tags: ["Escrow", "Gov"] },
      { name: "FeeClear", desc: "Transparent advisory-fee accrual and billing with a client-verifiable calculation trail.", tags: ["WASM", "EVM"] },
      { name: "MultiGenTrust", desc: "Multi-generational trust dApp with tiered access via family-member viewing keys and staged vesting.", tags: ["Shielded", "Gov"] },
      { name: "AdvisorVote", desc: "On-chain governance for discretionary mandate changes, capturing client consent immutably.", tags: ["Gov", "EVM"] },
    ],
  },

  "neobanks": {
    overview:
      "Neobanks and fintechs deliver mobile-first banking without branches, but rent their rails from incumbents, inheriting slow settlement and thin margins. PYRAX gives them a native, programmable, instantly-final settlement layer with shielded accounts and viewing-key compliance, so a fintech can build full-stack banking primitives directly on-chain.",
    marketSize: "$143B (2024)",
    projection: "$3.4T by 2032 · ~48% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Neobanking market", value: "$143B" },
      { label: "Global neobank users", value: "600M+" },
      { label: "Fintech funding (2024)", value: "$95B" },
      { label: "Avg. neobank cost-to-serve", value: "1/5 of banks" },
    ],
    painPoints: [
      "Neobanks depend on sponsor banks and card networks, capping margin and control.",
      "Legacy rails settle slowly, forcing pre-funding and float management.",
      "Scaling to millions of users strains per-transaction cost and throughput.",
      "Balancing seamless UX with KYC/AML compliance is operationally heavy.",
    ],
    solutions: [
      {
        feature: "GhostDAG (500k-TPS target)",
        how: "Parallel, high-throughput block production lets a neobank serve millions of daily transactions at sub-cent cost without renting a sponsor bank’s rail.",
      },
      {
        feature: "Multi-VM smart contracts (EVM / WASM / Cairo)",
        how: "Accounts, cards, savings vaults, BNPL, and rewards are built as composable on-chain primitives in Solidity or Rust - a full banking stack without a core-banking vendor.",
      },
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Customer balances and transactions stay private by default, while KYC/AML and regulators operate through viewing keys - compliance without surveillance-by-design.",
      },
      {
        feature: "BLS proof-of-stake finality",
        how: "Instant, irreversible settlement removes pre-funding and float, freeing working capital that thin-margin neobanks otherwise tie up at sponsor banks.",
      },
      {
        feature: "EIP-1559 fee market",
        how: "Predictable, low base fees give neobanks a stable unit economic per transaction, unlike percentage-based interchange and processor fees.",
      },
    ],
    dapps: [
      { name: "NeoCore", desc: "Composable banking-core dApp providing accounts, ledgers, and transfers as on-chain primitives.", tags: ["EVM", "Finality"] },
      { name: "CardMint", desc: "Programmable card-issuing contract with per-merchant controls, limits, and instant authorization.", tags: ["EVM", "WASM"] },
      { name: "VaultSave", desc: "High-yield savings vaults that route balances into on-chain staking with transparent yield.", tags: ["Stake", "EVM"] },
      { name: "SplitPay", desc: "Buy-now-pay-later contract that escrows and installments a purchase across coded milestones.", tags: ["Escrow", "EVM"] },
      { name: "ShieldAccount", desc: "Privacy-first consumer account with shielded balances and a scoped compliance viewing key.", tags: ["Shielded", "ZK"] },
      { name: "OnboardKey", desc: "Reusable KYC attestation flow that shares verified identity via selective disclosure, not raw documents.", tags: ["Shielded", "Cairo"] },
      { name: "RewardLoop", desc: "Programmable cashback and rewards engine paying instant, sub-cent-fee incentives per transaction.", tags: ["EVM", "Finality"] },
      { name: "FraudGuardAI", desc: "PYRAX Compute real-time fraud model with verifiable decisions embedded in the payment flow.", tags: ["Compute", "ZK"] },
    ],
  },

  "cross-border-settlement": {
    overview:
      "Cross-border settlement moves value between institutions and currencies, still routed through slow, expensive correspondent-banking chains and nostro/vostro pre-funding. PYRAX replaces the chain with a single, instantly-final rail where shielded, atomic FX settlement completes in one block and viewing keys give central banks and regulators auditable oversight.",
    marketSize: "$190T (2024)",
    projection: "$290T by 2030 · ~7.3% CAGR",
    source: "McKinsey Global Payments / FXC Intelligence, 2024",
    stats: [
      { label: "Cross-border payment flows", value: "$190T" },
      { label: "Avg. B2B settlement time", value: "2-5 days" },
      { label: "Trapped nostro liquidity", value: "$27T+" },
      { label: "Correspondent-banking cost", value: "$120B/yr" },
    ],
    painPoints: [
      "Correspondent-banking chains add days of delay and stacked fees at each hop.",
      "Nostro/vostro pre-funding traps trillions in idle liquidity across currencies.",
      "FX settlement risk (Herstatt) persists when the two legs settle asynchronously.",
      "Central banks and regulators lack real-time, privacy-preserving visibility into flows.",
    ],
    solutions: [
      {
        feature: "BLS proof-of-stake finality",
        how: "Payment-versus-payment FX legs settle atomically and irreversibly in one block, eliminating Herstatt settlement risk and the multi-day correspondent chain.",
      },
      {
        feature: "On-chain escrow",
        how: "Both currency legs are escrowed and released simultaneously, so neither counterparty is ever exposed to a half-settled trade.",
      },
      {
        feature: "Shielded-by-default ZK transfers",
        how: "Institutional flows and counterparties stay confidential, while central banks and supervisors use viewing keys for real-time, read-only oversight of settlement.",
      },
      {
        feature: "GhostDAG (500k-TPS target)",
        how: "Parallel throughput sustains RTGS-grade wholesale settlement volume, letting many institutions clear concurrently without a throughput ceiling.",
      },
      {
        feature: "Sphinx mixnet metadata privacy",
        how: "Network-layer mixing hides which institutions are transacting and when, preventing competitors and observers from inferring positions from settlement traffic.",
      },
    ],
    dapps: [
      { name: "AtomicPvP", desc: "Payment-versus-payment FX settlement that atomically swaps two currency legs with BLS finality.", tags: ["Finality", "Escrow"] },
      { name: "NostroFree", desc: "On-demand liquidity dApp that eliminates pre-funded nostro accounts through instant settlement.", tags: ["EVM", "Finality"] },
      { name: "CBDCBridge", desc: "Interoperability bridge that settles between tokenized central-bank currencies with viewing-key oversight.", tags: ["Shielded", "Gov"] },
      { name: "WholesaleRail", desc: "RTGS-grade wholesale settlement network for banks, clearing concurrently at high throughput.", tags: ["EVM", "Finality"] },
      { name: "FXPool", desc: "On-chain FX liquidity pool with staked market-maker capital and transparent, atomic swaps.", tags: ["Stake", "Escrow"] },
      { name: "SupervisorKey", desc: "Central-bank oversight portal reading settlement flows through scoped viewing keys, not raw exposure.", tags: ["Shielded", "Gov"] },
      { name: "CorridorPrivacy", desc: "Metadata-private institutional corridor routing settlements through the Sphinx mixnet.", tags: ["Mixnet", "Shielded"] },
      { name: "NettingEngine", desc: "Multilateral netting contract that computes and settles net positions across many banks in one batch.", tags: ["WASM", "Finality"] },
    ],
  },
};

