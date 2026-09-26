// SPDX-License-Identifier: LicenseRef-Proprietary
// Industry content for the "supply-chain-logistics" category (10 business types).
import type { CategoryContent } from "./types";

export const content: CategoryContent = {
  "freight-shipping": {
    overview:
      "Freight and shipping moves goods across road, rail, ocean, and air through a fragmented web of carriers, brokers, forwarders, and 3PLs. Reconciling bills of lading, proof-of-delivery, and detention charges across these parties is slow and dispute-prone. PYRAX gives every shipment a shared, tamper-evident record while keeping negotiated rates confidential between the parties that agreed to them.",
    marketSize: "$5.2T (2024)",
    projection: "$7.9T by 2030 · ~7.2% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global freight & logistics market", value: "$5.2T (2024)" },
      { label: "Freight lost to invoice/settlement disputes", value: "~$140B/yr" },
      { label: "Documents per international shipment", value: "20-50" },
      { label: "Digital freight matching CAGR", value: "~24% to 2030" },
    ],
    painPoints: [
      "Bill-of-lading and proof-of-delivery data is re-keyed across brokers, carriers, and shippers, causing errors and multi-week settlement disputes.",
      "Carriers wait 30-90 days for payment while contracted rates and rebates leak to competitors through shared EDI intermediaries.",
      "No single source of truth for chain-of-custody, so liability for damage or delay is contested after the fact.",
      "Detention, demurrage, and accessorial charges are calculated from disputed timestamps with no verifiable event trail.",
    ],
    solutions: [
      {
        feature: "Shielded-by-default transfers",
        how: "Negotiated line-haul rates, fuel surcharges, and volume rebates settle privately between shipper and carrier, so competitors and marketplaces never see contract economics while the shipment record stays shared.",
      },
      {
        feature: "On-chain escrow with proof-of-delivery",
        how: "Freight charges are locked in escrow at tender and auto-release to the carrier the moment a signed electronic proof-of-delivery event is committed, cutting days-sales-outstanding from 60 days to minutes.",
      },
      {
        feature: "eth_getProof verifiable milestones",
        how: "Pickup, gate-in, transload, and delivery milestones produce Merkle proofs any counterparty can verify independently, ending timestamp disputes for detention and demurrage.",
      },
      {
        feature: "GhostDAG high-throughput ledger",
        how: "The 500k-TPS GhostDAG consensus absorbs telematics and scan events from an entire fleet without congestion, so every parcel and container milestone is recorded, not sampled.",
      },
      {
        feature: "Viewing keys for auditors and insurers",
        how: "A shipper grants a scoped viewing key to a cargo insurer or freight auditor to inspect one lane's history without exposing the rest of the book of business.",
      },
    ],
    dapps: [
      { name: "ChainBoL", desc: "Electronic bill-of-lading that mints a transferable title token; endorsement and surrender happen on-chain with a full custody trail.", tags: ["e-BoL", "title-transfer"] },
      { name: "SettleFreight", desc: "Escrow-backed freight settlement that pays carriers automatically on committed proof-of-delivery, with shielded rate data.", tags: ["escrow", "quick-pay"] },
      { name: "DetentionProof", desc: "Verifiable gate-in/gate-out clock that computes detention and demurrage from cryptographically timestamped events.", tags: ["accessorials", "milestones"] },
      { name: "LaneMatch", desc: "Digital freight matching where shippers post loads and carriers bid, with contract terms sealed in shielded transfers.", tags: ["freight-matching", "marketplace"] },
      { name: "ClaimTrail", desc: "Damage-claim adjudicator that reconstructs chain-of-custody from milestone proofs to assign liability.", tags: ["claims", "custody"] },
      { name: "RebateVault", desc: "Confidential volume-rebate accrual that proves thresholds met without revealing per-shipment pricing.", tags: ["rebates", "shielded"] },
      { name: "NeuraLane", desc: "PYRAX Compute-driven lane and mode optimizer that outputs a verifiable routing recommendation with cost/carbon tradeoffs.", tags: ["Compute", "optimization"] },
      { name: "BrokerBridge", desc: "Multi-VM smart contract that codifies broker-carrier agreements and enforces payment terms across EVM and WASM tooling.", tags: ["multi-vm", "contracts"] },
    ],
  },

  "warehousing": {
    overview:
      "Warehousing and distribution centers hold inventory on behalf of many owners, run WMS platforms that rarely interoperate, and bill by storage, handling, and throughput. Ownership, condition, and location of goods are hard to prove across 3PL boundaries. PYRAX turns inventory into verifiable digital records that move between owners without exposing each tenant's commercial data.",
    marketSize: "$690B (2024)",
    projection: "$1.1T by 2030 · ~8.1% CAGR",
    source: "Mordor Intelligence, 2024",
    stats: [
      { label: "Global warehousing market", value: "$690B (2024)" },
      { label: "Automated warehouse CAGR", value: "~14% to 2030" },
      { label: "Inventory record inaccuracy (typical)", value: "~35% of SKUs" },
      { label: "3PL warehousing share of logistics spend", value: "~11%" },
    ],
    painPoints: [
      "Inventory ownership and pledge status is opaque, complicating warehouse-receipt financing and inventory audits.",
      "WMS platforms across 3PLs and clients do not reconcile, so cycle counts and billing disputes are constant.",
      "Multi-tenant facilities cannot share condition and movement data without leaking one client's throughput to another.",
      "Slotting, labor, and put-away decisions are made without a verifiable, real-time view of goods in motion.",
    ],
    solutions: [
      {
        feature: "Multi-VM smart contracts",
        how: "Warehouse-receipt tokens and storage SLAs are written once and enforced across EVM, WASM, and Cairo tooling, so lenders and 3PLs integrate without rebuilding contract logic.",
      },
      {
        feature: "Shielded-by-default transfers",
        how: "Ownership of pallets and SKUs transfers between tenants and buyers with the transaction amount and throughput hidden, protecting each client's velocity data in a shared facility.",
      },
      {
        feature: "IoT device identity and micro-payments",
        how: "Scanners, forklifts, and RFID gateways hold on-chain identities that stream signed movement events and settle per-scan handling fees automatically.",
      },
      {
        feature: "eth_getProof verifiable inventory",
        how: "A cryptographic proof of on-hand quantity for a given owner backs warehouse-receipt lending and audit without the lender trusting the operator's spreadsheet.",
      },
      {
        feature: "Viewing keys for auditors",
        how: "An inventory auditor or warehouse-receipt financier receives a scoped viewing key to verify one client's holdings without seeing the facility's other tenants.",
      },
    ],
    dapps: [
      { name: "WareReceipt", desc: "Tokenized warehouse receipts usable as loan collateral, with proof of on-hand quantity and pledge status.", tags: ["receipts", "trade-finance"] },
      { name: "SlotSense", desc: "PYRAX Compute slotting optimizer that recommends put-away locations from verifiable movement history.", tags: ["Compute", "slotting"] },
      { name: "CycleTruth", desc: "Continuous cycle-count reconciler that anchors each count as a verifiable event and flags discrepancies.", tags: ["inventory", "audit"] },
      { name: "PalletPass", desc: "Custody-transfer app that moves pallet ownership between tenants with shielded quantities and prices.", tags: ["custody", "shielded"] },
      { name: "ForkFee", desc: "Micro-payment rail where forklifts and scanners settle per-move handling charges via IoT device identities.", tags: ["IoT", "micropayments"] },
      { name: "TenantWall", desc: "Multi-tenant data partition that shares facility-level metrics while sealing each client's throughput.", tags: ["multi-tenant", "privacy"] },
      { name: "SLAGuard", desc: "Storage-SLA contract that meters dwell time and auto-credits clients when handling targets are missed.", tags: ["contracts", "escrow"] },
      { name: "ColdCorner", desc: "Zone-condition monitor bridging warehouse sensors into verifiable environmental attestations.", tags: ["IoT", "compliance"] },
    ],
  },

  "cold-chain": {
    overview:
      "Cold chain moves temperature-sensitive pharmaceuticals, food, and biologics where a single excursion can spoil an entire shipment and trigger regulatory recall. Proving an unbroken temperature history across handoffs is the core challenge. PYRAX anchors continuous sensor data as verifiable attestations and auto-settles claims when the chain is broken.",
    marketSize: "$310B (2024)",
    projection: "$650B by 2030 · ~13.2% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global cold chain market", value: "$310B (2024)" },
      { label: "Pharma cold chain logistics CAGR", value: "~12% to 2030" },
      { label: "Food lost to cold-chain failure", value: "~$35B/yr" },
      { label: "Vaccine wastage from temperature excursions", value: "up to 25%" },
    ],
    painPoints: [
      "Temperature excursions are logged on isolated data loggers that can be tampered with or lost, undermining recall and claims.",
      "Handoffs between carriers, warehouses, and last-mile break the continuity of the temperature record.",
      "Insurance and spoilage claims take weeks to adjudicate because no party trusts the other's sensor data.",
      "Regulators require an auditable chain-of-custody for biologics that legacy systems cannot produce on demand.",
    ],
    solutions: [
      {
        feature: "IoT device identity and micro-payments",
        how: "Each temperature and humidity logger holds a cryptographic identity and signs readings on-chain, so the sensor stream is provably from that device and cannot be retroactively edited.",
      },
      {
        feature: "GhostDAG high-throughput ledger",
        how: "500k-TPS GhostDAG ingests dense per-minute readings from thousands of reefers and shippers concurrently, keeping a complete, unsampled temperature history.",
      },
      {
        feature: "On-chain escrow with automated claims",
        how: "A spoilage insurance contract holds premium in escrow and auto-pays the shipper the instant a signed reading breaches the agreed threshold, closing claims in minutes.",
      },
      {
        feature: "Viewing keys for regulators",
        how: "An FDA or EMA inspector receives a scoped viewing key to review one lot's full cold-chain history for GDP/GMP compliance without accessing unrelated shipments.",
      },
      {
        feature: "eth_getProof verifiable custody",
        how: "Each handoff commits a proof of the temperature range held during that leg, so liability for an excursion is assigned to the exact custodian responsible.",
      },
    ],
    dapps: [
      { name: "ColdProof", desc: "Immutable temperature ledger where each logger signs readings under its own device identity.", tags: ["IoT", "cold-chain"] },
      { name: "ExcursionPay", desc: "Parametric spoilage insurance that auto-settles the shipper when a threshold breach is committed.", tags: ["escrow", "insurance"] },
      { name: "VaxTrace", desc: "Vaccine custody tracker producing per-lot proofs for regulators and health ministries.", tags: ["pharma", "compliance"] },
      { name: "ReeferWatch", desc: "Reefer-container monitor streaming door, power, and temperature events with micro-billed sensor identities.", tags: ["IoT", "micropayments"] },
      { name: "GDPAudit", desc: "Good-Distribution-Practice audit portal granting inspectors viewing keys to a single lot's history.", tags: ["viewing-keys", "audit"] },
      { name: "FreshScore", desc: "PYRAX Compute shelf-life predictor that computes remaining freshness from verifiable temperature exposure.", tags: ["Compute", "food"] },
      { name: "HandoffSeal", desc: "Custody-handoff app that assigns excursion liability to the responsible carrier via verifiable proofs.", tags: ["custody", "liability"] },
      { name: "BioLotLedger", desc: "Biologics lot ledger linking cold-chain attestations to batch release for regulated therapies.", tags: ["biologics", "provenance"] },
    ],
  },

  "provenance-tracking": {
    overview:
      "Provenance tracking proves where a product and its inputs came from - critical for luxury goods, ethical sourcing, food safety, and anti-counterfeiting. Buyers and regulators increasingly demand verifiable origin without brands exposing their full supplier network. PYRAX lets a product carry a portable, verifiable history while keeping supplier identities and prices confidential.",
    marketSize: "$4.8B (2024)",
    projection: "$18.2B by 2030 · ~24.9% CAGR",
    source: "MarketsandMarkets, 2024",
    stats: [
      { label: "Blockchain supply-chain market", value: "$4.8B (2024)" },
      { label: "Provenance/traceability CAGR", value: "~25% to 2030" },
      { label: "Global counterfeit trade", value: "~$2T/yr" },
      { label: "Consumers paying more for verified origin", value: "~70%" },
    ],
    painPoints: [
      "Counterfeit goods enter the chain because origin claims are unverifiable paper certificates.",
      "Brands want to prove ethical and sustainable sourcing without publishing their competitive supplier list.",
      "Traceability data lives in supplier silos and cannot be assembled into one credible history on demand.",
      "Recall and safety events are slow because the affected batch's full path cannot be reconstructed quickly.",
    ],
    solutions: [
      {
        feature: "Shielded-by-default transfers",
        how: "Each tier-to-tier handoff proves the input is authentic and compliant while hiding the supplier's identity and the transacted price, protecting the sourcing strategy.",
      },
      {
        feature: "eth_getProof verifiable origin",
        how: "A consumer or customs officer scans a product and independently verifies a Merkle proof that it originated from a certified farm, mine, or mill - no trust in the brand's database required.",
      },
      {
        feature: "Multi-VM smart contracts",
        how: "Certification rules (organic, fair-trade, conflict-free) are encoded as portable contracts that any downstream party can execute across EVM, WASM, and Cairo.",
      },
      {
        feature: "Viewing keys for auditors",
        how: "A sustainability certifier gets a scoped viewing key to inspect the full supplier chain for an audit while the public only sees the verified claim, not the suppliers.",
      },
      {
        feature: "The mixnet",
        how: "Suppliers submit origin attestations through the mixnet so participation and volumes are not correlatable by observers, preserving confidentiality in competitive sourcing markets.",
      },
    ],
    dapps: [
      { name: "OriginSeal", desc: "Scan-to-verify product passport that returns a cryptographic proof of certified origin.", tags: ["passport", "anti-counterfeit"] },
      { name: "TierChain", desc: "Multi-tier sourcing ledger where each handoff is shielded but the compliance claim is public.", tags: ["shielded", "sourcing"] },
      { name: "FairProof", desc: "Fair-trade and organic certification contract that travels with the goods across VMs.", tags: ["certification", "multi-vm"] },
      { name: "RecallPath", desc: "Instant recall tracer that reconstructs a batch's full path from committed handoff proofs.", tags: ["recall", "traceability"] },
      { name: "MineToMarket", desc: "Conflict-mineral provenance for gold and cobalt with mixnet-submitted origin attestations.", tags: ["minerals", "mixnet"] },
      { name: "LuxAuth", desc: "Luxury-goods authenticity token bound to the physical item via NFC, resale-verifiable.", tags: ["luxury", "authenticity"] },
      { name: "GreenLedger", desc: "Carbon and sustainability attestation ledger that proves claims without exposing suppliers.", tags: ["sustainability", "viewing-keys"] },
      { name: "FarmTrace", desc: "Farm-to-shelf food traceability with per-lot geographic and treatment provenance.", tags: ["food-safety", "provenance"] },
    ],
  },

  "customs-trade": {
    overview:
      "Customs and trade compliance governs the documents, duties, and controls that let goods cross borders legally. Filings are duplicated across brokers, carriers, and multiple national customs systems, inviting fraud and delay. PYRAX gives customs authorities selective, cryptographically verifiable visibility into shipments while traders keep their commercial data private.",
    marketSize: "$32B (2024)",
    projection: "$58B by 2030 · ~10.4% CAGR",
    source: "Fortune Business Insights, 2024",
    stats: [
      { label: "Global trade management software market", value: "$32B (2024)" },
      { label: "Trade compliance software CAGR", value: "~10% to 2030" },
      { label: "Annual global customs duties collected", value: "~$1.2T" },
      { label: "Shipments delayed by documentation errors", value: "~1 in 5" },
    ],
    painPoints: [
      "The same commercial invoice and packing list is re-filed across origin, transit, and destination customs, each a point of fraud and error.",
      "Traders must disclose sensitive pricing to brokers and authorities, risking leakage of margins and supplier terms.",
      "Origin and HS-classification claims are hard for customs to verify without physical inspection, slowing clearance.",
      "Duty drawback, preferential-origin, and sanctions screening are manual and audit-heavy.",
    ],
    solutions: [
      {
        feature: "Viewing keys for customs authorities",
        how: "A trader issues a customs authority a scoped viewing key granting exactly the fields that clearance requires - value, origin, HS code - without exposing the full commercial relationship.",
      },
      {
        feature: "Shielded-by-default transfers",
        how: "Declared transaction values settle privately while a proof of the declared amount is available to the relevant authority, so margins are not published to every intermediary.",
      },
      {
        feature: "eth_getProof verifiable declarations",
        how: "Preferential-origin and HS-classification claims are backed by proofs customs can verify against upstream provenance, enabling green-lane clearance without inspection.",
      },
      {
        feature: "Multi-VM smart contracts",
        how: "Duty calculation, drawback, and sanctions-screening logic run as auditable contracts, giving traders and authorities a shared, deterministic rulebook.",
      },
      {
        feature: "BLS instant finality",
        how: "Single-slot BLS finality means a customs release event is irreversible immediately, so downstream carriers can act on clearance with no re-org risk.",
      },
    ],
    dapps: [
      { name: "ClearKey", desc: "Selective-disclosure customs filing that shares only the required fields via a viewing key.", tags: ["viewing-keys", "clearance"] },
      { name: "OriginRule", desc: "Preferential-origin engine that proves rules-of-origin compliance for free-trade agreements.", tags: ["origin", "FTA"] },
      { name: "DutyChain", desc: "On-chain duty-calculation and drawback contract with a deterministic, auditable tariff logic.", tags: ["duties", "multi-vm"] },
      { name: "SanctionGate", desc: "Sanctions and denied-party screening that attests a shipment passed without revealing counterparties.", tags: ["compliance", "screening"] },
      { name: "GreenLane", desc: "Trusted-trader lane granting instant BLS-final release for pre-verified declarations.", tags: ["finality", "clearance"] },
      { name: "InvoiceSeal", desc: "Shielded commercial-invoice registry that proves declared value to authorities only.", tags: ["shielded", "invoicing"] },
      { name: "HSClassify", desc: "PYRAX Compute HS-code classifier producing an explainable, verifiable classification recommendation.", tags: ["Compute", "classification"] },
      { name: "TransitBond", desc: "Escrow-backed transit bond that auto-releases on verifiable border-exit proof.", tags: ["escrow", "transit"] },
    ],
  },

  "last-mile-delivery": {
    overview:
      "Last-mile delivery is the costliest, most failure-prone leg - the final handoff to the customer's door. High parcel volumes, gig couriers, and disputed deliveries strain settlement and proof. PYRAX records verifiable delivery events at scale and settles couriers instantly on confirmed drop-off while protecting customer and courier data.",
    marketSize: "$150B (2024)",
    projection: "$290B by 2030 · ~11.6% CAGR",
    source: "Research and Markets, 2024",
    stats: [
      { label: "Global last-mile delivery market", value: "$150B (2024)" },
      { label: "Last-mile share of total shipping cost", value: "~53%" },
      { label: "Failed first-delivery rate (urban)", value: "~10-15%" },
      { label: "Parcel volume growth", value: "~10% CAGR to 2030" },
    ],
    painPoints: [
      "Proof-of-delivery is a photo or scrawled signature that is easy to dispute, driving refund fraud and chargebacks.",
      "Gig couriers wait for weekly payouts and cannot verify what they are owed per stop.",
      "Delivery event volume from millions of parcels overwhelms centralized settlement systems.",
      "Customer address and presence data is sensitive and over-shared with every routing and carrier partner.",
    ],
    solutions: [
      {
        feature: "On-chain escrow with proof-of-delivery",
        how: "The delivery fee is escrowed at dispatch and auto-releases to the courier the instant a signed proof-of-delivery event is committed, giving gig drivers per-stop instant pay.",
      },
      {
        feature: "GhostDAG high-throughput ledger",
        how: "500k-TPS GhostDAG records a verifiable scan and geolocation event for every one of millions of daily parcels without settlement backlogs.",
      },
      {
        feature: "IoT device identity and micro-payments",
        how: "Smart lockers, e-bikes, and handheld scanners carry device identities that sign drop-off events and settle micro-fees for locker use or handoff.",
      },
      {
        feature: "The mixnet",
        how: "Customer address and presence signals route through the mixnet so routing partners see only what they need, preventing profiling of delivery patterns.",
      },
      {
        feature: "PYRAX Compute route optimization",
        how: "PYRAX Compute computes dynamic delivery sequences with a verifiable compute proof, so a fleet operator can trust the optimizer's output without exposing customer locations.",
      },
    ],
    dapps: [
      { name: "DropProof", desc: "Signed proof-of-delivery capturing geolocation, time, and photo hash as a verifiable event.", tags: ["POD", "milestones"] },
      { name: "StopPay", desc: "Per-stop instant courier settlement from escrow on confirmed delivery.", tags: ["escrow", "gig-pay"] },
      { name: "LockerLink", desc: "Smart-locker access and micro-billing via IoT device identities for parcel drop and pickup.", tags: ["IoT", "lockers"] },
      { name: "RouteProof", desc: "PYRAX Compute route sequencer that ships a verifiable optimization proof with each manifest.", tags: ["Compute", "routing"] },
      { name: "PrivDrop", desc: "Privacy-preserving address relay routing customer location through the mixnet.", tags: ["mixnet", "privacy"] },
      { name: "ReturnFlow", desc: "Reverse-logistics tracker that escrows refunds against verifiable return-scan events.", tags: ["returns", "escrow"] },
      { name: "GigRep", desc: "Courier reputation ledger built from verifiable on-time and success-rate proofs.", tags: ["reputation", "gig"] },
      { name: "ColdDrop", desc: "Last-mile cold-chain add-on attesting temperature held to the doorstep for grocery and pharma.", tags: ["cold-chain", "IoT"] },
    ],
  },

  "procurement": {
    overview:
      "Procurement manages sourcing, purchase orders, and supplier payments - a high-value flow riddled with fraud, maverick spend, and slow three-way matching. Buyers and suppliers each guard pricing while needing to agree on terms. PYRAX automates purchase-to-pay with verifiable milestones and keeps negotiated pricing shielded from the rest of the market.",
    marketSize: "$9.5B (2024)",
    projection: "$18B by 2030 · ~11.3% CAGR",
    source: "Gartner / Fortune Business Insights, 2024",
    stats: [
      { label: "Procurement software market", value: "$9.5B (2024)" },
      { label: "Global B2B procurement spend", value: "~$120T/yr" },
      { label: "Invoice fraud / duplicate-payment loss", value: "~1-2% of spend" },
      { label: "Maverick (off-contract) spend", value: "~20% of spend" },
    ],
    painPoints: [
      "Three-way matching of PO, receipt, and invoice is manual, delaying supplier payment and enabling duplicate invoices.",
      "Negotiated unit prices and rebates leak across the supplier base, eroding buyer leverage.",
      "Off-contract maverick spend is invisible until after the money is gone.",
      "Supplier onboarding and KYC is repeated by every buyer, slowing new-vendor activation.",
    ],
    solutions: [
      {
        feature: "Multi-VM smart contracts",
        how: "Purchase orders become executable contracts that enforce catalog pricing, approval thresholds, and payment terms, eliminating off-contract maverick spend at the source.",
      },
      {
        feature: "On-chain escrow with automated three-way match",
        how: "Funds escrow at PO issuance and release only when a verifiable goods-receipt event matches the PO and invoice, killing duplicate and ghost invoices.",
      },
      {
        feature: "Shielded-by-default transfers",
        how: "Supplier settlements clear with the negotiated price hidden, so a buyer's rate card cannot be reverse-engineered by other suppliers on the same network.",
      },
      {
        feature: "Viewing keys for auditors",
        how: "Internal audit and tax authorities receive scoped viewing keys to verify spend against contracts without querying every supplier's confidential pricing.",
      },
      {
        feature: "eth_getProof verifiable receipts",
        how: "Goods-receipt and service-completion events carry proofs that back accrual accounting and dispute resolution without re-collecting evidence.",
      },
    ],
    dapps: [
      { name: "MatchPay", desc: "Automated three-way match that releases supplier payment on verifiable PO-receipt-invoice agreement.", tags: ["P2P", "escrow"] },
      { name: "CatalogLock", desc: "Contract-pricing enforcer that blocks off-catalog and over-threshold purchases at issuance.", tags: ["contracts", "compliance"] },
      { name: "RateShield", desc: "Confidential supplier-pricing vault settling POs with shielded unit prices.", tags: ["shielded", "pricing"] },
      { name: "VendorPass", desc: "Reusable supplier KYC/onboarding credential portable across buyers.", tags: ["identity", "onboarding"] },
      { name: "SpendProof", desc: "Real-time spend-under-management dashboard backed by verifiable transaction proofs.", tags: ["analytics", "viewing-keys"] },
      { name: "BidVault", desc: "Sealed-bid RFQ where quotes stay shielded until the award, preventing collusion.", tags: ["sourcing", "sealed-bid"] },
      { name: "SupplyScore", desc: "PYRAX Compute supplier-risk scorer producing a verifiable risk rating from performance proofs.", tags: ["Compute", "risk"] },
      { name: "AccrualLedger", desc: "Automated accrual and month-end close from committed goods-receipt milestones.", tags: ["accounting", "milestones"] },
    ],
  },

  "fleet-management": {
    overview:
      "Fleet management operates and maintains vehicles across telematics, fuel, maintenance, and driver systems that rarely share data. Utilization, maintenance history, and driver behavior are hard to verify for insurers, lessors, and resale. PYRAX gives each vehicle a verifiable operating record and settles usage-based costs automatically at machine scale.",
    marketSize: "$28B (2024)",
    projection: "$77B by 2030 · ~18.3% CAGR",
    source: "MarketsandMarkets, 2024",
    stats: [
      { label: "Global fleet management market", value: "$28B (2024)" },
      { label: "Connected-vehicle telematics CAGR", value: "~18% to 2030" },
      { label: "Commercial vehicles under management", value: "~180M globally" },
      { label: "Unplanned-downtime cost per truck", value: "~$450-760/day" },
    ],
    painPoints: [
      "Telematics, fuel-card, and maintenance data sit in separate silos, so total cost of ownership is never fully known.",
      "Maintenance and accident history is unverifiable, depressing resale value and complicating insurance.",
      "Usage-based leasing, insurance, and tolls settle slowly on disputed odometer and behavior data.",
      "High-frequency vehicle events overwhelm centralized platforms, forcing lossy sampling.",
    ],
    solutions: [
      {
        feature: "IoT device identity and micro-payments",
        how: "Each telematics unit and OBD dongle holds a device identity that signs mileage, fuel, and event data, and settles per-mile tolls, insurance, and lease charges automatically.",
      },
      {
        feature: "GhostDAG high-throughput ledger",
        how: "500k-TPS GhostDAG ingests continuous telemetry from an entire fleet - location, harsh-braking, fuel burn - without sampling, giving a complete operating record.",
      },
      {
        feature: "eth_getProof verifiable vehicle history",
        how: "Odometer, maintenance, and incident history is provable at resale or renewal, so a lessor or insurer verifies condition without trusting a paper logbook.",
      },
      {
        feature: "PYRAX Compute predictive maintenance",
        how: "PYRAX Compute predicts component failures from verifiable telemetry and issues a proof-backed maintenance recommendation, cutting unplanned downtime.",
      },
      {
        feature: "On-chain escrow for usage-based settlement",
        how: "Pay-per-mile insurance and toll charges escrow and settle against signed odometer events, ending disputes over usage.",
      },
    ],
    dapps: [
      { name: "MileSign", desc: "Tamper-evident odometer and telemetry ledger signed by each vehicle's device identity.", tags: ["IoT", "telematics"] },
      { name: "PayPerMile", desc: "Usage-based insurance and tolling that settles per-mile from verifiable trip events.", tags: ["escrow", "UBI"] },
      { name: "MaintProof", desc: "Verifiable service-history registry that lifts resale and off-lease valuation.", tags: ["maintenance", "resale"] },
      { name: "FleetBrain", desc: "PYRAX Compute predictive-maintenance engine issuing proof-backed failure warnings.", tags: ["Compute", "predictive"] },
      { name: "DriverScore", desc: "Behavior-scoring ledger from harsh-event telemetry, driving insurance discounts.", tags: ["safety", "reputation"] },
      { name: "FuelTrue", desc: "Fuel-card fraud detector reconciling dispenser events against vehicle telemetry.", tags: ["fuel", "fraud"] },
      { name: "LeaseFlow", desc: "Usage-based leasing contract that meters utilization and auto-invoices lessees.", tags: ["leasing", "contracts"] },
      { name: "EVCharge", desc: "EV charging settlement via IoT identities with micro-payments per kWh delivered.", tags: ["EV", "micropayments"] },
    ],
  },

  "maritime": {
    overview:
      "Maritime and ports move roughly 80% of world trade through a document-heavy ecosystem of carriers, terminals, port authorities, and financiers. Bills of lading, port calls, and container moves are slow to reconcile and vulnerable to fraud. PYRAX digitizes negotiable shipping documents and port events with verifiable finality while keeping freight economics confidential.",
    marketSize: "$3.1T (2024)",
    projection: "$4.2T by 2030 · ~5.2% CAGR",
    source: "UNCTAD / Allied Market Research, 2024",
    stats: [
      { label: "Seaborne trade value handled", value: "~$14T/yr (goods)" },
      { label: "Maritime freight & port services market", value: "$3.1T (2024)" },
      { label: "Share of world trade by volume", value: "~80%" },
      { label: "Global container throughput", value: "~870M TEU/yr" },
    ],
    painPoints: [
      "Paper bills of lading are slow, fraud-prone, and delay cargo release when they arrive after the ship.",
      "Port-call, gate, and crane events are recorded in siloed terminal operating systems that do not reconcile.",
      "Trade-finance instruments (letters of credit) are manual and mismatch-heavy, tying up working capital.",
      "Freight rates and demurrage terms leak through shared platforms, eroding carrier and shipper leverage.",
    ],
    solutions: [
      {
        feature: "Multi-VM smart contracts",
        how: "Electronic bills of lading and letters of credit become negotiable instruments enforced across EVM, WASM, and Cairo, so title transfers and payment triggers are programmatic.",
      },
      {
        feature: "BLS instant finality",
        how: "Single-slot BLS finality makes cargo-release and title-endorsement events irreversible immediately, so a terminal can release a container the moment title transfers with no re-org risk.",
      },
      {
        feature: "eth_getProof verifiable port events",
        how: "Vessel arrival, gate-in, and crane-move events carry proofs that all parties verify independently, ending demurrage and detention disputes across terminals.",
      },
      {
        feature: "Shielded-by-default transfers",
        how: "Charter rates, freight, and demurrage settle privately while a proof of settlement satisfies financiers, keeping commercial terms off shared platforms.",
      },
      {
        feature: "On-chain escrow for trade finance",
        how: "A digital letter of credit escrows payment and releases to the exporter automatically when a verifiable shipment or delivery milestone is committed.",
      },
    ],
    dapps: [
      { name: "SeaBoL", desc: "Negotiable electronic bill of lading with instant-final title endorsement and surrender.", tags: ["e-BoL", "finality"] },
      { name: "PortPulse", desc: "Cross-terminal port-event ledger reconciling arrivals, gates, and crane moves as verifiable proofs.", tags: ["port", "milestones"] },
      { name: "LCFlow", desc: "Digital letter-of-credit escrow that auto-settles exporters on committed shipment events.", tags: ["trade-finance", "escrow"] },
      { name: "DemurrageClock", desc: "Verifiable free-time and demurrage meter computed from proof-backed port timestamps.", tags: ["demurrage", "accessorials"] },
      { name: "CharterVault", desc: "Confidential charter-party settlement keeping freight and hire rates shielded.", tags: ["shielded", "chartering"] },
      { name: "BoxTrace", desc: "Container-level custody tracker across ocean, rail, and drayage handoffs.", tags: ["container", "custody"] },
      { name: "PortRoute", desc: "PYRAX Compute berth and stowage optimizer producing a verifiable planning proof.", tags: ["Compute", "optimization"] },
      { name: "CargoInsure", desc: "Parametric marine-cargo insurance that pays on verifiable loss or delay events.", tags: ["insurance", "escrow"] },
    ],
  },

  "air-cargo": {
    overview:
      "Air cargo carries the highest-value, most time-sensitive freight - pharma, electronics, perishables - under tight regulatory and security controls. Air waybills, ground handling, and customs handoffs are fragmented and paper-dependent. PYRAX provides verifiable milestone tracking and instant settlement across airlines, forwarders, and ground handlers while protecting rate data.",
    marketSize: "$130B (2024)",
    projection: "$205B by 2030 · ~7.9% CAGR",
    source: "IATA / Straits Research, 2024",
    stats: [
      { label: "Global air cargo revenue", value: "$130B (2024)" },
      { label: "Air cargo tonnage carried", value: "~62M tonnes/yr" },
      { label: "Share of world trade value by air", value: "~35%" },
      { label: "e-Air-Waybill adoption target", value: "~80%+" },
    ],
    painPoints: [
      "Air waybills and dangerous-goods declarations are still partly paper, slowing acceptance and clearance.",
      "Handoffs between airline, ground handler, forwarder, and customs each re-key data and lose milestones.",
      "High-value and pharma shipments need continuous, tamper-proof condition and custody evidence.",
      "Interline settlement between airlines and handlers is slow and reconciliation-heavy.",
    ],
    solutions: [
      {
        feature: "eth_getProof verifiable milestones",
        how: "Acceptance, uplift, transit, and delivery milestones carry proofs each party verifies independently, closing the visibility gaps between airline, handler, and forwarder.",
      },
      {
        feature: "On-chain escrow for interline settlement",
        how: "Interline and ground-handling charges escrow and auto-settle on verifiable milestone completion, replacing slow monthly reconciliation between carriers.",
      },
      {
        feature: "IoT device identity and micro-payments",
        how: "Smart tags and ULD sensors sign temperature, shock, and location events under device identities, giving pharma and electronics shippers tamper-proof condition evidence.",
      },
      {
        feature: "Shielded-by-default transfers",
        how: "Confidential air-freight rates and forwarder commissions settle privately while a proof satisfies audit, keeping negotiated pricing off shared industry systems.",
      },
      {
        feature: "BLS instant finality",
        how: "Acceptance and customs-release events reach irreversible finality immediately, so downstream ground handlers act on status with no ambiguity or reversal.",
      },
    ],
    dapps: [
      { name: "AirWayChain", desc: "Electronic air-waybill with verifiable acceptance, uplift, and delivery milestones.", tags: ["e-AWB", "milestones"] },
      { name: "InterlineNet", desc: "Interline settlement engine that auto-clears airline and handler charges from escrow.", tags: ["escrow", "settlement"] },
      { name: "ULDSense", desc: "Unit-load-device condition monitor signing temperature and shock events via IoT identities.", tags: ["IoT", "cold-chain"] },
      { name: "DGDeclare", desc: "Dangerous-goods declaration contract enforcing IATA rules with a verifiable compliance proof.", tags: ["compliance", "contracts"] },
      { name: "PharmaAir", desc: "CEIV-Pharma custody tracker producing per-shipment cold-chain proofs for regulators.", tags: ["pharma", "viewing-keys"] },
      { name: "RateSeal", desc: "Confidential air-freight rate settlement keeping forwarder and airline pricing shielded.", tags: ["shielded", "pricing"] },
      { name: "CargoFlow", desc: "PYRAX Compute capacity and load-planning optimizer with verifiable allocation proofs.", tags: ["Compute", "capacity"] },
      { name: "TrackTag", desc: "High-value shipment geolocation tracker streaming signed position events at scale.", tags: ["tracking", "GhostDAG"] },
    ],
  },
};

