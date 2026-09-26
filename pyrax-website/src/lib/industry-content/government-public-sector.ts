// SPDX-License-Identifier: LicenseRef-Proprietary
// Industry content for the "government-public-sector" category (10 business types). Filled by content pass.
import type { CategoryContent } from "./types";

export const content: CategoryContent = {
  "digital-identity": {
    overview:
      "Government digital identity underpins access to every public service, yet most national ID and login schemes centralize citizen data in honeypot databases that leak and over-share. PYRAX enables self-sovereign identity where citizens hold their own credentials and prove attributes - over 18, a resident, a licensed professional - through zero-knowledge selective disclosure, revealing a single fact instead of an entire dossier.",
    marketSize: "$34.5B (2024)",
    projection: "$103B by 2030 · ~20% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Digital identity market", value: "$34.5B" },
      { label: "People without legal ID", value: "850M" },
      { label: "Govt digital ID programs", value: "160+ countries" },
      { label: "Identity-fraud losses", value: "$43B/yr" },
    ],
    painPoints: [
      "Centralized national-ID databases are single points of failure and prime breach targets.",
      "Verifying one attribute (age, residency) forces citizens to expose full identity documents.",
      "Credentials issued by one agency are rarely reusable or interoperable across others.",
      "Citizens have no control or audit trail over who accessed their identity data.",
    ],
    solutions: [
      {
        feature: "Self-sovereign identity + ZK selective disclosure",
        how: "Citizens hold credentials in their own wallet and prove a single claim - over 18, a citizen, resident of a district - with a zero-knowledge proof that reveals nothing else, ending the over-sharing of full ID documents.",
      },
      {
        feature: "Shielded-by-default privacy with viewing keys",
        how: "Personal attributes stay encrypted on-chain and private to the citizen, while an issuing agency or auditor uses a scoped viewing key for lawful, read-only verification instead of holding a plaintext copy.",
      },
      {
        feature: "eth_getProof tamper-proof registries",
        how: "Credential issuance, revocation, and status live in a verifiable registry any relying party can check cryptographically against chain state - no calling back to a central authority's database.",
      },
      {
        feature: "Multi-VM smart contracts (EVM / WASM / Cairo)",
        how: "Issuance rules, expiry, revocation lists, and cross-agency trust frameworks are encoded as deterministic contracts, with Cairo proving ZK attribute checks natively.",
      },
      {
        feature: "BLS proof-of-stake finality",
        how: "Credential issuance and revocation take effect with instant, irreversible finality, so a revoked or updated identity is immediately authoritative everywhere it is checked.",
      },
    ],
    dapps: [
      { name: "SovereignID", desc: "Citizen-held national identity wallet that issues ZK proofs of attributes without ever exposing the underlying documents.", tags: ["ZK", "Shielded"] },
      { name: "AgeProof", desc: "Selective-disclosure age gate that proves a citizen is over 18 or over 65 for services without revealing birthdate or name.", tags: ["ZK", "Cairo"] },
      { name: "ResidentKey", desc: "Proof-of-residency credential for district services and voting eligibility, verifiable without disclosing the full address.", tags: ["ZK", "Gov"] },
      { name: "RevokeList", desc: "Tamper-proof credential-revocation registry that relying parties verify via eth_getProof rather than a central call.", tags: ["ZK", "EVM"] },
      { name: "CrossAgency", desc: "Interoperability layer letting a credential issued by one agency be trusted and reused across others through a shared trust framework.", tags: ["EVM", "Gov"] },
      { name: "ConsentLog", desc: "Citizen-controlled access log where every identity check is recorded and the holder can see and revoke who queried them.", tags: ["Shielded", "Gov"] },
      { name: "GuardianRecover", desc: "Social-recovery contract that lets trusted guardians restore a lost identity wallet without any central custodian.", tags: ["WASM", "EVM"] },
      { name: "ProProof", desc: "Professional-license attestation (doctor, engineer, notary) provable via ZK to employers and the public without a lookup portal.", tags: ["ZK", "Gov"] },
    ],
  },

  "voting-elections": {
    overview:
      "Public elections must be simultaneously secret, verifiable, and resistant to coercion - properties paper and legacy e-voting struggle to guarantee together. PYRAX enables end-to-end verifiable, coercion-resistant voting where each ballot is a zero-knowledge proof: voters can confirm their vote was counted, anyone can audit the tally, yet no one can prove how an individual voted.",
    marketSize: "$4.9B (2024)",
    projection: "$8.5B by 2030 · ~9.5% CAGR",
    source: "MarketsandMarkets, 2024",
    stats: [
      { label: "Election-technology market", value: "$4.9B" },
      { label: "National elections/yr", value: "60+" },
      { label: "Voters lacking trust in results", value: "~40%" },
      { label: "Cost of a national election", value: "$1-8B" },
    ],
    painPoints: [
      "Voters cannot independently verify their ballot was recorded and counted correctly.",
      "Ballot secrecy and public auditability are treated as a trade-off, not both guaranteed.",
      "Remote and internet voting invite coercion and vote-selling with receipts.",
      "Centralized tallying systems are opaque and erode public trust in outcomes.",
    ],
    solutions: [
      {
        feature: "End-to-end verifiable ZK ballots",
        how: "Each vote is cast as a zero-knowledge proof of a valid, eligible ballot, so the tally is publicly auditable and any voter can confirm inclusion while individual choices stay secret.",
      },
      {
        feature: "Coercion-resistant shielded voting",
        how: "Shielded-by-default casting means a voter cannot produce a receipt proving how they voted, defeating vote-buying and coercion even for remote ballots.",
      },
      {
        feature: "Self-sovereign identity + ZK eligibility",
        how: "Voters prove eligibility - citizen, of age, registered in the district - through selective disclosure, enforcing one-person-one-vote without linking identity to the ballot.",
      },
      {
        feature: "eth_getProof verifiable tally",
        how: "The final count is a verifiable function of on-chain state, so observers and courts can recompute and prove the result rather than trusting an election authority's server.",
      },
      {
        feature: "BLS proof-of-stake finality",
        how: "Once the polling window closes, results reach instant, irreversible finality with no window for late tampering, recount ambiguity, or silent revision.",
      },
    ],
    dapps: [
      { name: "SecretBallot", desc: "End-to-end verifiable voting where each ballot is a ZK proof - auditable in aggregate, secret per voter.", tags: ["ZK", "Shielded"] },
      { name: "EligibleVote", desc: "ZK eligibility gate proving a voter is registered and of age without linking their identity to the cast ballot.", tags: ["ZK", "Cairo"] },
      { name: "CoerceGuard", desc: "Coercion-resistant remote voting that makes receipts impossible, defeating vote-buying and duress.", tags: ["Shielded", "ZK"] },
      { name: "OpenTally", desc: "Public, recomputable tally backed by eth_getProof so anyone can verify the result from chain state.", tags: ["ZK", "Gov"] },
      { name: "AuditObserver", desc: "Election-observer dashboard that verifies inclusion proofs and detects any inconsistency in real time.", tags: ["Gov", "EVM"] },
      { name: "PetitionChain", desc: "Verifiable citizen-petition and ballot-initiative platform with signature eligibility proven via ZK.", tags: ["ZK", "Gov"] },
      { name: "DelegateVote", desc: "Liquid-democracy delegation contract letting citizens delegate and reclaim their vote transparently.", tags: ["EVM", "Gov"] },
      { name: "ReferendumBox", desc: "Binding referendum dApp with coded quorum, thresholds, and instant-final certified outcomes.", tags: ["Finality", "EVM"] },
    ],
  },

  "public-records": {
    overview:
      "Public records - land titles, business registries, vital records, and official filings - are the backbone of legal certainty, yet siloed government databases are prone to tampering, loss, and disputed provenance. PYRAX anchors registries in tamper-proof, verifiable state where any citizen or notary can prove a record's authenticity and history with eth_getProof, while sensitive fields stay shielded behind viewing keys.",
    marketSize: "$11.2B (2024)",
    projection: "$24.6B by 2030 · ~14% CAGR",
    source: "MarketsandMarkets, 2024",
    stats: [
      { label: "Govt records-management market", value: "$11.2B" },
      { label: "Land parcels without clear title", value: "70%+ globally" },
      { label: "Records lost to disaster/tamper", value: "billions of docs" },
      { label: "Title-fraud losses (US)", value: "$5.3B/yr" },
    ],
    painPoints: [
      "Land and title registries are mutable, disputed, and vulnerable to fraudulent alteration.",
      "Records fragment across agencies with no single verifiable source of truth.",
      "Citizens must physically retrieve and pay for copies to prove a record exists.",
      "Provenance and chain-of-title history are hard to establish and easy to forge.",
    ],
    solutions: [
      {
        feature: "eth_getProof tamper-proof registries",
        how: "Titles, filings, and vital records are anchored in verifiable state so their existence, content hash, and full history can be cryptographically proven by anyone without trusting a clerk's database.",
      },
      {
        feature: "Timestamped immutable records",
        how: "Every registration and amendment is instantly-final and timestamped, creating an unforgeable chain of provenance for chain-of-title and evidentiary use.",
      },
      {
        feature: "Shielded-by-default privacy with viewing keys",
        how: "Sensitive fields - personal data on a deed, sealed vital records - stay shielded, while authorized registrars, courts, and the record's subject read them through scoped viewing keys.",
      },
      {
        feature: "Multi-VM smart contracts (EVM / WASM / Cairo)",
        how: "Title transfer rules, registration workflows, and multi-party sign-offs are encoded as deterministic contracts that enforce statutory process automatically.",
      },
      {
        feature: "Self-sovereign identity + ZK selective disclosure",
        how: "Parties prove authority to file or amend a record - owner, executor, licensed agent - via selective disclosure, without exposing unrelated personal information.",
      },
    ],
    dapps: [
      { name: "TitleChain", desc: "Tamper-proof land-title registry with verifiable chain-of-title and one-block transfer finality.", tags: ["Finality", "EVM"] },
      { name: "ProofDeed", desc: "Verifiable deed and instrument filing where authenticity is provable via eth_getProof, ending paper certified copies.", tags: ["ZK", "Gov"] },
      { name: "VitalVault", desc: "Shielded vital-records registry (birth, marriage, death) with viewing-key access for the subject and courts.", tags: ["Shielded", "ZK"] },
      { name: "BizRegistry", desc: "Business-entity registry with verifiable ownership, filings, and instant status changes.", tags: ["EVM", "Gov"] },
      { name: "NotaryProof", desc: "On-chain notarization that timestamps and hashes documents for evidentiary, tamper-evident proof.", tags: ["ZK", "EVM"] },
      { name: "LienTrack", desc: "Verifiable lien and encumbrance registry so buyers and lenders can prove a clear title in seconds.", tags: ["EVM", "Gov"] },
      { name: "ArchiveAnchor", desc: "Public-archive anchoring service that commits document hashes for long-term integrity guarantees.", tags: ["ZK", "Gov"] },
      { name: "TransferFlow", desc: "Property-transfer workflow that escrows and executes title, tax, and recording steps atomically.", tags: ["Escrow", "EVM"] },
    ],
  },

  "tax-revenue": {
    overview:
      "Tax and revenue administration must collect fairly, minimize fraud, and remain auditable, yet legacy systems suffer huge compliance gaps, refund fraud, and opaque assessment. PYRAX gives revenue agencies shielded citizen filings that stay private by default with viewing keys for lawful audit, on-chain escrow for automated collection and refunds, and verifiable computation so assessments can be proven correct.",
    marketSize: "$18.4B (2024)",
    projection: "$36.9B by 2030 · ~12.3% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Tax-management software market", value: "$18.4B" },
      { label: "Global tax gap", value: "$3.5T+" },
      { label: "Refund-fraud losses (US)", value: "$5.5B/yr" },
      { label: "VAT/GST fraud (EU)", value: "€61B/yr" },
    ],
    painPoints: [
      "Large compliance gaps let owed revenue go uncollected while audits are costly and slow.",
      "Refund and VAT carousel fraud drain tens of billions annually.",
      "Taxpayer financial data is broadly exposed to administer and audit returns.",
      "Assessments are opaque, making disputes and appeals adversarial and hard to resolve.",
    ],
    solutions: [
      {
        feature: "Shielded-by-default privacy with viewing keys",
        how: "Taxpayer filings, income, and account data stay encrypted and private, while auditors and courts access exactly what a lawful audit requires through scoped, logged viewing keys - private for citizens, auditable for the agency.",
      },
      {
        feature: "On-chain escrow + automated collection",
        how: "Withholding, VAT, and installment payments are escrowed and settled automatically at the point of transaction, and verified refunds release directly to the taxpayer without fraud-prone manual disbursement.",
      },
      {
        feature: "PYRAX Compute verifiable public-sector AI",
        how: "Fraud-detection and risk-scoring models run with cryptographic proofs, so a flagged return or denied refund can be shown to be fair, reproducible, and non-arbitrary to an appeals body.",
      },
      {
        feature: "eth_getProof verifiable assessments",
        how: "An assessment is a verifiable function of declared, on-chain figures, letting a taxpayer independently reproduce and challenge the computation instead of trusting an opaque notice.",
      },
      {
        feature: "Self-sovereign identity + ZK selective disclosure",
        how: "Taxpayers prove eligibility for a credit or exemption - income band, dependents, residency - through ZK selective disclosure without exposing their entire financial picture.",
      },
    ],
    dapps: [
      { name: "ShieldFile", desc: "Privacy-preserving tax filing where returns are shielded and the agency audits only via scoped viewing keys.", tags: ["Shielded", "ZK"] },
      { name: "AutoWithhold", desc: "Point-of-transaction withholding and VAT collection that escrows and remits tax automatically in one block.", tags: ["Escrow", "EVM"] },
      { name: "RefundDirect", desc: "Fraud-resistant refund engine that verifies eligibility and releases funds directly to the taxpayer.", tags: ["Escrow", "Finality"] },
      { name: "FairAudit", desc: "PYRAX Compute risk model that attaches a verifiable proof to every audit selection to prove non-arbitrary treatment.", tags: ["Compute", "ZK"] },
      { name: "VATChain", desc: "Real-time VAT/GST ledger that kills carousel fraud by making each input credit verifiable and unique.", tags: ["EVM", "ZK"] },
      { name: "CreditProof", desc: "ZK eligibility proofs for tax credits and exemptions without disclosing full income and family data.", tags: ["ZK", "Cairo"] },
      { name: "AppealTrail", desc: "Transparent, recomputable assessment record that gives taxpayers a verifiable basis for appeals.", tags: ["Gov", "ZK"] },
      { name: "InstallmentPay", desc: "Programmable installment-payment plan that escrows and auto-collects agreed schedules.", tags: ["Escrow", "WASM"] },
    ],
  },

  "benefits-welfare": {
    overview:
      "Benefits and welfare programs must reach eligible recipients quickly while resisting fraud and preserving dignity, yet legacy delivery is slow, leaky, and intrusive. PYRAX enables direct, fraud-resistant benefit payments through on-chain escrow and automated disbursement, with self-sovereign eligibility proofs so citizens prove they qualify - low income, unemployed, a parent - without surrendering their whole life story.",
    marketSize: "$1.6T (2024)",
    projection: "$2.4T by 2030 · ~7% CAGR",
    source: "Statista / OECD Social Expenditure, 2024",
    stats: [
      { label: "Global public social spending", value: "$1.6T+ (programs)" },
      { label: "Benefits lost to fraud/error", value: "$175B/yr" },
      { label: "Eligible people not enrolled", value: "up to 40%" },
      { label: "Avg. claim-processing time", value: "2-8 weeks" },
    ],
    painPoints: [
      "Improper payments from fraud and error waste a large share of program budgets.",
      "Slow, paperwork-heavy enrollment leaves many eligible people unserved.",
      "Means-testing forces recipients to expose extensive personal and financial data.",
      "Funds leak through intermediaries instead of reaching recipients directly.",
    ],
    solutions: [
      {
        feature: "On-chain escrow + automated benefits",
        how: "Program funds are escrowed and released directly to verified recipients on coded eligibility and schedule triggers, cutting out intermediaries and the manual steps where leakage and fraud occur.",
      },
      {
        feature: "Self-sovereign identity + ZK selective disclosure",
        how: "Applicants prove they meet means-test thresholds - income below a line, unemployed, a caregiver - with a zero-knowledge proof, qualifying without exposing their full financial and family details.",
      },
      {
        feature: "Shielded-by-default privacy with viewing keys",
        how: "Recipient status and payments stay private to protect dignity, while program auditors and oversight bodies verify integrity through scoped viewing keys rather than open records.",
      },
      {
        feature: "eth_getProof verifiable eligibility state",
        how: "Uniqueness-enforced state prevents duplicate enrollment and double-dipping across programs, which auditors can verify cryptographically instead of cross-matching siloed databases.",
      },
      {
        feature: "PYRAX Compute verifiable public-sector AI",
        how: "Fraud and eligibility models produce verifiable outputs, so an approval or denial is provably fair and consistent - reducing wrongful denials and defensible on appeal.",
      },
    ],
    dapps: [
      { name: "DirectBenefit", desc: "Escrow-backed benefit disbursement that pays verified recipients directly on a coded schedule.", tags: ["Escrow", "Finality"] },
      { name: "QualifyProof", desc: "ZK means-test that proves income and eligibility below a threshold without revealing exact figures.", tags: ["ZK", "Cairo"] },
      { name: "DignityCard", desc: "Shielded benefits account keeping recipient status private while auditors verify via viewing keys.", tags: ["Shielded", "ZK"] },
      { name: "NoDoubleDip", desc: "Cross-program uniqueness registry that prevents duplicate enrollment, verifiable via eth_getProof.", tags: ["ZK", "EVM"] },
      { name: "FairDecision", desc: "PYRAX Compute eligibility model attaching a verifiable proof to each approval or denial for appeals.", tags: ["Compute", "ZK"] },
      { name: "VoucherFlow", desc: "Programmable, purpose-restricted voucher (food, housing, transit) spendable only at eligible vendors.", tags: ["EVM", "Escrow"] },
      { name: "ReliefRapid", desc: "Disaster-relief payout dApp that fans direct aid to affected residents in parallel with instant finality.", tags: ["Finality", "Escrow"] },
      { name: "EnrollEasy", desc: "One-tap enrollment that auto-checks eligibility via selective disclosure to lift uptake among the unserved.", tags: ["ZK", "Gov"] },
    ],
  },

  "smart-cities": {
    overview:
      "Smart cities coordinate transport, utilities, sensors, and services across millions of devices and residents, straining on interoperability, data privacy, and trust. PYRAX provides a shared coordination layer for IoT and municipal services with high-throughput settlement, verifiable data, and shielded resident information that stays private while authorized operators access it through viewing keys.",
    marketSize: "$623B (2024)",
    projection: "$1.57T by 2030 · ~16.6% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Smart-cities market", value: "$623B" },
      { label: "Connected IoT devices", value: "18B+" },
      { label: "Cities with smart programs", value: "1,000+" },
      { label: "Urban population by 2050", value: "68%" },
    ],
    painPoints: [
      "IoT and municipal systems are siloed vendors that do not interoperate or share trust.",
      "Sensor and mobility data expose residents' movements and behavior with no privacy control.",
      "Micropayments for parking, transit, and utilities are too costly and slow at city scale.",
      "Citizens cannot verify that city data and automated decisions are accurate or fair.",
    ],
    solutions: [
      {
        feature: "IoT coordination + GhostDAG throughput",
        how: "Parallel, 500k-TPS-target block production lets millions of devices and residents transact - parking, tolls, metering, charging - with sub-cent, one-block settlement no linear chain can sustain.",
      },
      {
        feature: "Shielded-by-default privacy with viewing keys",
        how: "Mobility, sensor, and utility data tied to residents stay shielded so the city cannot surveil individuals, while operators and auditors access aggregate or specific data lawfully through viewing keys.",
      },
      {
        feature: "eth_getProof verifiable municipal data",
        how: "Sensor readings, service records, and automated decisions are anchored in verifiable state, letting residents and oversight bodies prove the data behind a fee, fine, or policy is genuine.",
      },
      {
        feature: "Multi-VM smart contracts (EVM / WASM / Cairo)",
        how: "Dynamic pricing, service-level agreements with vendors, and cross-agency workflows are encoded as deterministic contracts that coordinate independent municipal systems.",
      },
      {
        feature: "BLS proof-of-stake finality",
        how: "Toll, transit, and utility charges settle instantly and irreversibly, enabling real-time congestion pricing and pay-per-use utilities without reconciliation lag.",
      },
    ],
    dapps: [
      { name: "ParkFlow", desc: "Real-time smart-parking dApp with sub-cent, one-block micropayments and dynamic on-chain pricing.", tags: ["EVM", "Finality"] },
      { name: "GridMeter", desc: "Shielded utility metering that bills residents privately while operators reconcile via viewing keys.", tags: ["Shielded", "EVM"] },
      { name: "TollChain", desc: "Automated road-tolling and congestion-pricing engine settling per passage with instant finality.", tags: ["Finality", "EVM"] },
      { name: "SensorProof", desc: "Verifiable IoT sensor registry anchoring readings in state so fees and fines are provably data-backed.", tags: ["ZK", "IoT"] },
      { name: "MobilityPass", desc: "Multimodal transit pass that coordinates payments across bus, rail, and micromobility vendors.", tags: ["WASM", "IoT"] },
      { name: "EVCharge", desc: "Peer-to-peer EV-charging market with metered, real-time settlement between drivers and stations.", tags: ["EVM", "Escrow"] },
      { name: "CivicReport", desc: "Verifiable 311/service-request ledger that residents can track and audit end to end.", tags: ["Gov", "EVM"] },
      { name: "AirQualityDAO", desc: "Community air- and noise-monitoring network with verifiable, privacy-preserving open data.", tags: ["IoT", "ZK"] },
    ],
  },

  "defense-security": {
    overview:
      "Defense and national security demand the highest assurance of data integrity, supply-chain provenance, and confidential coordination across agencies and allies. PYRAX offers verifiable, tamper-evident state and shielded-by-default communications where operational data stays secret behind cryptography, yet cleared oversight bodies retain lawful, viewing-key auditability.",
    marketSize: "$2.4T (2024)",
    projection: "$3.4T by 2030 · ~5.9% CAGR",
    source: "Statista / SIPRI Military Expenditure, 2024",
    stats: [
      { label: "Global defense spending", value: "$2.4T" },
      { label: "Defense-cyber market", value: "$45B" },
      { label: "Counterfeit parts in supply", value: "up to 15%" },
      { label: "Cyber incidents on govt/yr", value: "millions" },
    ],
    painPoints: [
      "Counterfeit and gray-market parts infiltrate defense supply chains with weak provenance.",
      "Inter-agency and allied data sharing lacks a trusted, tamper-evident common record.",
      "Sensitive operational data must stay secret yet remain auditable to oversight.",
      "Centralized command systems present single points of failure and compromise.",
    ],
    solutions: [
      {
        feature: "Shielded-by-default privacy with viewing keys",
        how: "Operational and logistics data are shielded by default so adversaries cannot read them, while cleared inspectors general and oversight committees retain lawful, read-only access through scoped viewing keys.",
      },
      {
        feature: "eth_getProof tamper-evident provenance",
        how: "Component and materiel provenance is anchored in verifiable state, so a part's origin and chain-of-custody can be cryptographically proven, defeating counterfeit and gray-market infiltration.",
      },
      {
        feature: "Timestamped immutable audit trail",
        how: "Orders, access events, and logistics movements are instantly-final and timestamped, producing an unforgeable audit record for accountability and after-action review.",
      },
      {
        feature: "Decentralized BLS-final coordination",
        how: "A distributed, instantly-final ledger removes the single point of failure of centralized command systems while keeping all participants on one authoritative, tamper-resistant record.",
      },
      {
        feature: "Self-sovereign identity + ZK clearance proofs",
        how: "Personnel prove clearance level and need-to-know via zero-knowledge selective disclosure, granting access without exposing identity or the full credential to the resource being accessed.",
      },
    ],
    dapps: [
      { name: "PartsProvenance", desc: "Tamper-evident component provenance ledger proving origin and custody to defeat counterfeits.", tags: ["ZK", "Gov"] },
      { name: "SecureShare", desc: "Shielded inter-agency and allied data-sharing layer with viewing-key oversight for cleared reviewers.", tags: ["Shielded", "Gov"] },
      { name: "ClearanceProof", desc: "ZK clearance and need-to-know attestation that grants access without revealing personnel identity.", tags: ["ZK", "Cairo"] },
      { name: "ChainCustody", desc: "Immutable, timestamped chain-of-custody for evidence, materiel, and sensitive assets.", tags: ["ZK", "Gov"] },
      { name: "LogiTrack", desc: "Verifiable defense-logistics ledger coordinating movements across units with instant finality.", tags: ["Finality", "EVM"] },
      { name: "CommandMesh", desc: "Decentralized, tamper-resistant coordination record with no single point of compromise.", tags: ["Finality", "Gov"] },
      { name: "IntegrityAnchor", desc: "Firmware and software integrity anchoring that proves deployed builds are unaltered.", tags: ["ZK", "EVM"] },
      { name: "AuditSentinel", desc: "Oversight portal that inspects shielded operations through scoped viewing keys, not raw exposure.", tags: ["Shielded", "Gov"] },
    ],
  },

  "education-public": {
    overview:
      "Public education must issue trustworthy credentials, fund students efficiently, and protect learner data across schools, districts, and higher ed. PYRAX gives institutions tamper-proof, instantly-verifiable diplomas and transcripts, shielded student records private to the learner, and on-chain escrow for grants and scholarships that pay against verified milestones.",
    marketSize: "$142B (2024)",
    projection: "$598B by 2032 · ~19.7% CAGR",
    source: "Grand View Research (EdTech), 2024",
    stats: [
      { label: "EdTech market", value: "$142B" },
      { label: "Global students", value: "1.5B+" },
      { label: "Fake-degree/credential fraud", value: "$1B+/yr" },
      { label: "Time to verify a transcript", value: "days-weeks" },
    ],
    painPoints: [
      "Diplomas and transcripts are slow to verify and easy to forge.",
      "Student records are locked in institutional silos that don't travel with the learner.",
      "Scholarship and grant funds are disbursed slowly with weak accountability.",
      "Learner data is broadly shared, exposing minors' and students' personal information.",
    ],
    solutions: [
      {
        feature: "eth_getProof tamper-proof credentials",
        how: "Diplomas, transcripts, and micro-credentials are anchored in verifiable state so an employer or another institution proves authenticity instantly against chain state - no forgery, no registrar call.",
      },
      {
        feature: "Self-sovereign identity + ZK selective disclosure",
        how: "Learners hold their own credentials and prove a specific achievement - a degree, a passing grade, a certification - through selective disclosure without exposing their full academic record.",
      },
      {
        feature: "Shielded-by-default privacy with viewing keys",
        how: "Student records, especially for minors, stay shielded and private to the learner and guardians, while accreditors and auditors access exactly what oversight requires via viewing keys.",
      },
      {
        feature: "On-chain escrow for grants + scholarships",
        how: "Scholarship, grant, and student-aid funds are escrowed and released against verified enrollment and progress milestones, ensuring accountable, direct disbursement.",
      },
      {
        feature: "PYRAX Compute verifiable public-sector AI",
        how: "AI tutoring and assessment models run with verifiable outputs, so grading assistance and adaptive learning decisions can be shown to be fair, consistent, and reproducible.",
      },
    ],
    dapps: [
      { name: "DiplomaProof", desc: "Tamper-proof diploma and certificate registry verifiable instantly by any employer via eth_getProof.", tags: ["ZK", "Gov"] },
      { name: "PortableTranscript", desc: "Learner-held transcript that travels across institutions with ZK proofs of specific results.", tags: ["ZK", "Cairo"] },
      { name: "ShieldRecord", desc: "Shielded student-record store private to learners and guardians, with viewing keys for accreditors.", tags: ["Shielded", "ZK"] },
      { name: "GrantEscrow", desc: "Scholarship and grant disbursement escrowed against verified enrollment and progress milestones.", tags: ["Escrow", "Finality"] },
      { name: "SkillBadge", desc: "Verifiable micro-credential and skill-badge issuer for lifelong-learning and workforce pathways.", tags: ["EVM", "Gov"] },
      { name: "FairGrade", desc: "PYRAX Compute assessment assistant that attaches a verifiable fairness proof to AI-supported grading.", tags: ["Compute", "ZK"] },
      { name: "AttendProof", desc: "Privacy-preserving attendance and completion proofs for funding and compliance reporting.", tags: ["ZK", "Gov"] },
      { name: "AidDirect", desc: "Direct student-aid rail that pays tuition and stipends to verified students with instant finality.", tags: ["Escrow", "EVM"] },
    ],
  },

  "judicial-legal": {
    overview:
      "Courts and legal systems depend on the integrity of evidence, the authenticity of filings, and the enforceability of judgments, all undermined by tampering risk and slow, paper-bound process. PYRAX provides timestamped, tamper-evident evidence and filings, shielded case data with viewing keys for authorized parties, and programmable settlements that enforce judgments and escrow deterministically.",
    marketSize: "$37.7B (2024)",
    projection: "$77.6B by 2030 · ~12.7% CAGR",
    source: "Grand View Research (Legal Tech), 2024",
    stats: [
      { label: "Legal-tech market", value: "$37.7B" },
      { label: "Court case backlog (US)", value: "millions of cases" },
      { label: "Evidence-integrity disputes", value: "frequent" },
      { label: "Avg. civil case duration", value: "months-years" },
    ],
    painPoints: [
      "Digital evidence integrity and chain-of-custody are difficult to prove and easy to challenge.",
      "Court filings and records are slow, paper-bound, and vulnerable to loss or alteration.",
      "Sensitive case data must be shared with parties while staying sealed from the public.",
      "Judgment enforcement and settlement disbursement are manual and slow to execute.",
    ],
    solutions: [
      {
        feature: "Timestamped tamper-evident evidence",
        how: "Digital evidence and its chain-of-custody are hashed and timestamped with instant finality, producing an unforgeable record that resists challenge and proves integrity in court.",
      },
      {
        feature: "eth_getProof verifiable filings",
        how: "Court filings and dockets are anchored in verifiable state so their existence, content, and time are cryptographically provable - no disputed or altered records.",
      },
      {
        feature: "Shielded-by-default privacy with viewing keys",
        how: "Sealed and sensitive case data stay shielded from the public, while judges, counsel, and parties of record access exactly their permitted scope through viewing keys.",
      },
      {
        feature: "On-chain escrow for judgments + settlements",
        how: "Settlement funds, bonds, and awarded damages are escrowed and released deterministically on judgment or coded conditions, making enforcement automatic rather than adversarial.",
      },
      {
        feature: "Multi-VM smart contracts (EVM / WASM / Cairo)",
        how: "Consent decrees, structured settlements, and legal-obligation logic are encoded as deterministic contracts that self-execute according to their terms.",
      },
    ],
    dapps: [
      { name: "EvidenceLock", desc: "Timestamped, tamper-evident evidence and chain-of-custody ledger that stands up in court.", tags: ["ZK", "Gov"] },
      { name: "FileProof", desc: "Verifiable e-filing system where every docket entry is provable via eth_getProof.", tags: ["ZK", "EVM"] },
      { name: "SealedCase", desc: "Shielded case-data store keeping records private to parties of record via scoped viewing keys.", tags: ["Shielded", "Gov"] },
      { name: "SettleEscrow", desc: "Structured-settlement and damages escrow that releases funds automatically on judgment.", tags: ["Escrow", "Finality"] },
      { name: "DecreeExec", desc: "Consent-decree contract that self-executes obligations and reports compliance verifiably.", tags: ["EVM", "Gov"] },
      { name: "ChainOfCustody", desc: "Cross-agency custody ledger tracking exhibits from seizure to trial with immutable timestamps.", tags: ["ZK", "Gov"] },
      { name: "BondVault", desc: "Bail- and surety-bond escrow with coded release and forfeiture conditions.", tags: ["Escrow", "EVM"] },
      { name: "NotarizeAI", desc: "PYRAX Compute-assisted document analysis with verifiable outputs for authenticity and consistency review.", tags: ["Compute", "ZK"] },
    ],
  },

  "licensing-permits": {
    overview:
      "Licensing and permitting - professional licenses, building permits, business registrations, environmental approvals - are gatekeepers to lawful activity, yet notoriously slow, opaque, and fraud-prone. PYRAX turns licenses and permits into verifiable, instantly-checkable credentials, encodes approval workflows as deterministic contracts, and lets applicants prove qualifications through ZK selective disclosure.",
    marketSize: "$3.9B (2024)",
    projection: "$8.1B by 2030 · ~13% CAGR",
    source: "MarketsandMarkets (Govt Permitting), 2024",
    stats: [
      { label: "Permitting-software market", value: "$3.9B" },
      { label: "Avg. building-permit wait", value: "1-6 months" },
      { label: "Licensed professionals (US)", value: "60M+" },
      { label: "Cost of permit delays", value: "billions/yr" },
    ],
    painPoints: [
      "Permit and license approval is slow, multi-agency, and opaque to applicants.",
      "License authenticity is hard for the public and employers to verify quickly.",
      "Applicants over-share personal and business data to prove they qualify.",
      "Renewals, expirations, and revocations are poorly tracked and easy to miss.",
    ],
    solutions: [
      {
        feature: "eth_getProof verifiable licenses",
        how: "Professional licenses and permits are anchored in verifiable state so the public, employers, and inspectors confirm validity and status instantly against chain state - no forgery, no lookup portal.",
      },
      {
        feature: "Multi-VM smart contracts (EVM / WASM / Cairo)",
        how: "Multi-agency approval workflows, conditions, and fee logic are encoded as deterministic contracts, routing an application through required steps and issuing automatically when criteria are met.",
      },
      {
        feature: "Self-sovereign identity + ZK selective disclosure",
        how: "Applicants prove they meet requirements - certified, insured, zoning-eligible - through zero-knowledge selective disclosure without submitting their full document set.",
      },
      {
        feature: "BLS proof-of-stake finality",
        how: "Issuance, renewal, and revocation take effect with instant, irreversible finality, so a license's current status is always authoritative the moment it changes.",
      },
      {
        feature: "On-chain escrow for fees + bonds",
        how: "Permit fees, performance bonds, and impact deposits are escrowed and released on coded milestones - inspection passed, work completed - automating refunds and forfeitures.",
      },
    ],
    dapps: [
      { name: "LicenseProof", desc: "Instantly verifiable professional-license registry the public and employers check via eth_getProof.", tags: ["ZK", "Gov"] },
      { name: "PermitFlow", desc: "Multi-agency permit workflow encoded as a contract that auto-issues when all conditions are met.", tags: ["EVM", "Gov"] },
      { name: "QualifyDisclose", desc: "ZK qualification proofs for licensing (certified, insured, eligible) without full document submission.", tags: ["ZK", "Cairo"] },
      { name: "RenewTrack", desc: "Automated renewal and expiry tracker with instant status changes and public verifiability.", tags: ["Finality", "EVM"] },
      { name: "BondEscrow", desc: "Performance-bond and impact-deposit escrow that releases on verified inspection milestones.", tags: ["Escrow", "EVM"] },
      { name: "ZoningCheck", desc: "Verifiable zoning and land-use eligibility proofs tied to the tamper-proof parcel registry.", tags: ["ZK", "Gov"] },
      { name: "InspectLog", desc: "Timestamped inspection-record ledger linking pass/fail outcomes to permit conditions.", tags: ["Gov", "EVM"] },
      { name: "EnvApprove", desc: "Environmental-permit workflow with verifiable conditions, monitoring, and automated compliance checks.", tags: ["WASM", "Gov"] },
    ],
  },
};

