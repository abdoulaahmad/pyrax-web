// SPDX-License-Identifier: LicenseRef-Proprietary
// Industry content for the "healthcare-life-sciences" category (10 business types).
//
// Privacy stance is load-bearing: PYRAX is shielded-by-default (ZK). Protected health information (PHI),
// genomic data, and clinical records NEVER touch the chain in the clear — only cryptographic commitments,
// proofs, and consent receipts are on-chain. Regulators and auditors read via scoped viewing keys; private
// data is trained/inferred on via PYRAX Compute compute-to-data without ever leaving its custodian. All copy below
// is written to that standard.
import type { CategoryContent } from "./types";

export const content: CategoryContent = {
  "hospitals-providers": {
    overview:
      "Hospitals and provider networks run on fragmented, breach-prone IT while carrying the strictest privacy obligations in any industry. PYRAX gives providers a shielded-by-default settlement and coordination layer where PHI stays off-chain as commitments, care events are tamper-evident, and payers or auditors verify compliance through scoped viewing keys rather than raw data access.",
    marketSize: "$8.9T global health spending (2023)",
    projection: "$11.9T by 2030 · ~4.3% CAGR",
    source: "Deloitte / WHO Global Health Expenditure, 2024",
    stats: [
      { label: "Avg. cost of a healthcare data breach", value: "$9.8M" },
      { label: "U.S. hospital admin overhead", value: "~25% of spend" },
      { label: "Records exposed in U.S. breaches (2023)", value: ">130M" },
      { label: "Providers citing interoperability as top-3 barrier", value: "68%" },
    ],
    painPoints: [
      "Patient data siloed across EHRs, labs, and payers with no trustworthy shared source of truth.",
      "Ransomware and insider breaches expose millions of records; each incident averages eight figures.",
      "Claims and prior-authorization cycles are slow, opaque, and manually reconciled between payer and provider.",
      "Regulators and auditors demand proof of compliance that today requires handing over sensitive raw data.",
    ],
    solutions: [
      {
        feature: "Shielded-by-default ZK ledger",
        how: "Care events, orders, and referrals are recorded as commitments — PHI never appears on-chain, so a shared, tamper-evident record exists without a single honeypot of raw patient data.",
      },
      {
        feature: "Viewing keys for regulators and auditors",
        how: "CMS, Joint Commission, or an internal auditor is granted a read-only viewing key scoped to a facility or date range, proving compliance without ever exposing patient identities.",
      },
      {
        feature: "On-chain escrow for claims and settlements",
        how: "Payer-provider payments release from escrow only when milestone conditions (e.g. verified discharge, coding sign-off) are met, collapsing reconciliation and dispute cycles.",
      },
      {
        feature: "eth_getProof tamper-evident records",
        how: "Any care event's inclusion and integrity is provable via Merkle proof, giving a court-grade audit trail for malpractice defense, chargebacks, and regulatory inquiry.",
      },
      {
        feature: "Consent-gated data sharing",
        how: "A patient's cryptographic consent is required and logged before any provider can request a viewing key, making every disclosure permissioned and revocable.",
      },
    ],
    dapps: [
      { name: "ShieldChart", desc: "Cross-facility care record where each encounter is an on-chain commitment; clinicians retrieve full context only with the patient's live consent token.", tags: ["ZK", "consent", "interoperability"] },
      { name: "ClaimBridge", desc: "Escrow-based claims rail that auto-settles payer-provider payments when coded discharge proofs are submitted.", tags: ["escrow", "claims", "EVM"] },
      { name: "AuditLens", desc: "Regulator portal that reads compliance metrics through scoped viewing keys — proof of adherence without raw PHI.", tags: ["viewing-keys", "compliance", "audit"] },
      { name: "ConsentVault", desc: "Patient-held consent wallet issuing revocable, time-boxed access grants to any provider or researcher.", tags: ["consent", "ZK", "patient"] },
      { name: "TriageProof", desc: "Tamper-evident ED triage and hand-off log using eth_getProof for malpractice-grade timelines.", tags: ["eth_getProof", "audit", "provenance"] },
      { name: "PriorAuthFlow", desc: "Prior-authorization contract that verifies payer criteria against shielded clinical commitments and instantly approves or routes for review.", tags: ["escrow", "WASM", "claims"] },
      { name: "BedNet", desc: "Regional capacity and transfer coordination where bed availability is shared as commitments and settled with BLS instant finality.", tags: ["finality", "coordination", "provenance"] },
      { name: "CareGraphAI", desc: "PYRAX Compute compute-to-data readmission-risk model trained across hospitals without any facility exporting its patient records.", tags: ["Compute", "compute-to-data", "AI"] },
    ],
  },

  "pharma-supply": {
    overview:
      "Pharmaceutical supply chains span thousands of hops where a single counterfeit or diverted lot can be fatal, yet serialization data still lives in disconnected vendor databases. PYRAX anchors DSCSA/FMD-grade serialization and provenance on-chain, kills counterfeits with verifiable chain-of-custody, and keeps commercial terms shielded while still proving authenticity to any downstream party.",
    marketSize: "$4.9B pharma serialization & track-and-trace (2024)",
    projection: "$10.8B by 2030 · ~14.2% CAGR",
    source: "MarketsandMarkets, 2024",
    stats: [
      { label: "Est. global counterfeit-drug trade", value: "$200B+/yr" },
      { label: "Substandard/falsified meds in LMICs", value: "~10.5%" },
      { label: "Avg. pharma recall cost", value: ">$10M" },
      { label: "DSCSA full interoperability deadline", value: "2024" },
    ],
    painPoints: [
      "Counterfeit and diverted product enters the supply chain undetected, endangering patients and brands.",
      "Serialization data is fragmented across CMOs, wholesalers, and dispensers with no shared verifiable ledger.",
      "Recalls are slow and over-broad because affected lots cannot be pinpointed in real time.",
      "Manufacturers must prove provenance to regulators without exposing pricing, volumes, or trade secrets.",
    ],
    solutions: [
      {
        feature: "Pharma serialization and provenance anchoring",
        how: "Every unit and case serial is registered on-chain with an immutable custody trail, so a scan at the pharmacy cryptographically verifies the product is authentic and unrecalled.",
      },
      {
        feature: "Shielded-by-default commercial data",
        how: "Provenance and authenticity are public-verifiable while prices, quantities, and counterparties stay encrypted as commitments — killing counterfeits without leaking trade terms.",
      },
      {
        feature: "IoT and device attestation",
        how: "Cold-chain sensors sign temperature and location attestations on-chain, proving a biologic never broke its excursion limits from plant to patient.",
      },
      {
        feature: "eth_getProof for instant recall targeting",
        how: "A recall query returns cryptographic proof of exactly which serials and custodians hold an affected lot, enabling surgical rather than blanket withdrawals.",
      },
      {
        feature: "Viewing keys for regulators",
        how: "FDA or EMA inspectors receive a scoped read-only key to verify full chain-of-custody for an investigation without accessing the manufacturer's broader commercial ledger.",
      },
    ],
    dapps: [
      { name: "SerialGuard", desc: "Unit-level serialization registry; a pharmacy or patient scan returns a signed authenticity and recall-status proof.", tags: ["serialization", "provenance", "anti-counterfeit"] },
      { name: "ColdProof", desc: "Cold-chain attestation feed where IoT loggers sign excursion-free proofs for biologics and vaccines.", tags: ["IoT", "attestation", "provenance"] },
      { name: "RecallRadar", desc: "Precision recall engine using eth_getProof to locate every custodian holding an affected lot in seconds.", tags: ["eth_getProof", "recall", "audit"] },
      { name: "DivertWatch", desc: "Gray-market diversion detector that flags custody paths inconsistent with authorized distribution, without exposing pricing.", tags: ["ZK", "provenance", "analytics"] },
      { name: "TradeEscrow", desc: "Wholesaler settlement contract releasing payment only against verified delivery and authenticity proofs.", tags: ["escrow", "EVM", "settlement"] },
      { name: "InspectorKey", desc: "Regulator provenance portal reading full chain-of-custody through scoped viewing keys.", tags: ["viewing-keys", "compliance", "audit"] },
      { name: "APIOrigin", desc: "Active-ingredient origin tracker linking API lots to finished-goods serials for full backward traceability.", tags: ["provenance", "WASM", "serialization"] },
      { name: "VaccineTrace", desc: "Dose-level distribution ledger for public-health campaigns with instant finality on custody transfers.", tags: ["finality", "provenance", "IoT"] },
    ],
  },

  "medical-records": {
    overview:
      "Electronic health records are the most valuable and most breached data in healthcare, locked in proprietary EHRs that neither patients nor providers fully control. PYRAX flips the model: records stay encrypted in the patient's custody as off-chain data, only commitments and consent receipts hit the chain, and any authorized party retrieves records through revocable, ZK-gated viewing keys.",
    marketSize: "$34.1B EHR market (2024)",
    projection: "$47.0B by 2030 · ~5.5% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "U.S. individuals affected by health breaches (2023)", value: ">130M" },
      { label: "Patients unable to easily access own records", value: "~40%" },
      { label: "Clinician time lost to record retrieval", value: "hours/week" },
      { label: "Health-record data value on dark markets", value: "10x a card #" },
    ],
    painPoints: [
      "Patients neither own nor can port their own longitudinal record across providers.",
      "Centralized EHR databases are single points of catastrophic breach.",
      "Provider-to-provider record exchange is slow, faxed, or blocked by information-blocking practices.",
      "There is no verifiable, tamper-evident history of who accessed a record and when.",
    ],
    solutions: [
      {
        feature: "PHI stays off-chain — only commitments",
        how: "The encrypted record lives in patient-controlled storage; the chain holds only a hash commitment, so there is no central record database to breach.",
      },
      {
        feature: "Viewing keys for scoped access",
        how: "A patient issues a time-boxed, revocable viewing key to a specialist or ER, granting exactly the slices needed and nothing more.",
      },
      {
        feature: "Consent-gated, revocable sharing",
        how: "Every access grant is an on-chain consent receipt the patient can revoke instantly, and no read is possible without a live grant.",
      },
      {
        feature: "eth_getProof access-log integrity",
        how: "Each record access is committed and provable, producing a tamper-evident who-saw-what audit trail that satisfies HIPAA accounting-of-disclosures.",
      },
      {
        feature: "Multi-VM contracts for record logic",
        how: "EVM/WASM/Cairo contracts encode consent policies, break-glass emergency access rules, and cross-institution exchange without a central intermediary.",
      },
    ],
    dapps: [
      { name: "MyChartKey", desc: "Patient-owned record wallet that issues and revokes scoped viewing keys to any provider on demand.", tags: ["viewing-keys", "consent", "patient"] },
      { name: "CommitMed", desc: "Record-commitment registry proving a document's integrity and timeline without storing its contents on-chain.", tags: ["ZK", "commitment", "integrity"] },
      { name: "BreakGlass", desc: "Emergency-access contract granting ER staff time-limited entry that is fully logged and auto-expires.", tags: ["consent", "WASM", "audit"] },
      { name: "DisclosureLedger", desc: "HIPAA accounting-of-disclosures dashboard built from eth_getProof access commitments.", tags: ["eth_getProof", "audit", "compliance"] },
      { name: "PortMyData", desc: "Cross-EHR portability tool that reconstructs a longitudinal record from consented provider commitments.", tags: ["interoperability", "consent", "patient"] },
      { name: "GrantGuard", desc: "Consent-management app where every share is revocable and every read requires a live on-chain grant.", tags: ["consent", "ZK", "revocable"] },
      { name: "PediPass", desc: "Guardian-managed pediatric records that transition control to the patient at the age of majority via contract logic.", tags: ["consent", "EVM", "patient"] },
      { name: "RecordProofAPI", desc: "Developer SDK for issuing and verifying record commitments and viewing keys in third-party health apps.", tags: ["SDK", "viewing-keys", "integration"] },
    ],
  },

  "clinical-trials": {
    overview:
      "Clinical trials are slow, costly, and dogged by data-integrity and enrollment problems, while participant privacy and site payments add operational drag. PYRAX brings tamper-evident data capture, milestone-based escrow for site and CRO payments, and PYRAX Compute compute-to-data so sponsors can analyze patient-level data across sites without ever centralizing it.",
    marketSize: "$59.9B clinical trials market (2024)",
    projection: "$99.6B by 2032 · ~6.5% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Avg. cost to bring a drug to market", value: "$2.6B" },
      { label: "Trials failing to meet enrollment targets", value: "~80%" },
      { label: "Data queries per patient in a Phase III", value: "dozens" },
      { label: "Share of trial cost in site payments/monitoring", value: "large" },
    ],
    painPoints: [
      "Source data can be altered or lost, undermining trust in trial outcomes and inviting FDA scrutiny.",
      "Patient recruitment and retention are the top drivers of delay and cost.",
      "Site, investigator, and CRO payments are manual, delayed, and hard to tie to verified milestones.",
      "Sponsors want cross-site analytics but cannot legally or ethically pool raw patient data.",
    ],
    solutions: [
      {
        feature: "Tamper-evident data capture",
        how: "Every case-report-form entry is committed on-chain, making source data alteration detectable and giving regulators a verifiable audit trail.",
      },
      {
        feature: "On-chain escrow for milestone payments",
        how: "Site, investigator, and CRO payments release automatically from escrow when enrollment or visit milestones are cryptographically verified.",
      },
      {
        feature: "PYRAX Compute compute-to-data analytics",
        how: "Sponsors train and run statistical models across sites' private patient data in place, receiving verifiable results without any site exporting identifiable records.",
      },
      {
        feature: "Shielded-by-default participant privacy",
        how: "Participant identities and PHI remain off-chain as commitments, so enrollment and outcomes are auditable while individuals stay unidentifiable.",
      },
      {
        feature: "Viewing keys for monitors and IRBs",
        how: "CRAs, IRBs, and regulators receive scoped read-only keys to verify data integrity and consent without broad access to the patient population.",
      },
    ],
    dapps: [
      { name: "TrialLedger", desc: "eCRF capture where each entry is a commitment, giving 21 CFR Part 11-grade tamper evidence.", tags: ["integrity", "eth_getProof", "audit"] },
      { name: "MilestonePay", desc: "Escrow contract auto-releasing site and CRO payments on verified enrollment and visit milestones.", tags: ["escrow", "EVM", "payments"] },
      { name: "CohortAI", desc: "PYRAX Compute cross-site model training on private patient data with verifiable results and zero data movement.", tags: ["Compute", "compute-to-data", "AI"] },
      { name: "eConsentChain", desc: "Digital informed-consent with revocable, shielded participant consent receipts.", tags: ["consent", "ZK", "patient"] },
      { name: "MonitorKey", desc: "Remote-monitoring portal for CRAs and IRBs reading integrity metrics via scoped viewing keys.", tags: ["viewing-keys", "compliance", "audit"] },
      { name: "RecruitMatch", desc: "Privacy-preserving eligibility matcher that screens patients against protocols using ZK proofs, never exposing identities.", tags: ["ZK", "recruitment", "consent"] },
      { name: "AdverseWatch", desc: "Tamper-evident adverse-event reporting with instant-finality timestamps for pharmacovigilance.", tags: ["finality", "provenance", "safety"] },
      { name: "TrialProof", desc: "Public results-registry publishing commitment proofs of primary endpoints to combat selective reporting.", tags: ["integrity", "commitment", "transparency"] },
    ],
  },

  "health-insurance": {
    overview:
      "Health insurers drown in claims-adjudication overhead, fraud, and disputes while holding vast troves of sensitive member data. PYRAX automates adjudication and settlement through on-chain escrow, cuts fraud with tamper-evident claim provenance, and lets members and regulators verify fairness through viewing keys — all without exposing member PHI in the clear.",
    marketSize: "$1.6T U.S. health insurance premiums (2023)",
    projection: "$2.2T by 2030 · ~5.0% CAGR",
    source: "Statista / Precedence Research, 2024",
    stats: [
      { label: "Est. U.S. healthcare fraud losses", value: "~$100B/yr" },
      { label: "Claims initially denied", value: "~15%" },
      { label: "Admin share of premium dollar", value: "~15-25%" },
      { label: "Prior-auth delays reported by physicians", value: "94%" },
    ],
    painPoints: [
      "Claims adjudication is slow, manual, and generates costly disputes and appeals.",
      "Fraud, waste, and abuse siphon roughly a tenth of every dollar spent.",
      "Members distrust opaque denial logic and cannot verify their own claim history.",
      "Coordinating benefits across payers requires sharing sensitive member data.",
    ],
    solutions: [
      {
        feature: "On-chain escrow for claims settlement",
        how: "Verified claims trigger automatic escrow release to providers, collapsing adjudication-to-payment from weeks to near-instant and reducing disputes.",
      },
      {
        feature: "eth_getProof tamper-evident claims",
        how: "Each claim and adjudication decision is committed and provable, so duplicate billing and altered claims are detectable and appeals reference an immutable record.",
      },
      {
        feature: "Shielded-by-default member data",
        how: "Diagnoses, procedures, and member identities live off-chain as commitments; adjudication logic runs against proofs, not raw PHI.",
      },
      {
        feature: "Viewing keys for members and regulators",
        how: "A member sees their full claim history via their own key; state insurance regulators audit denial patterns without accessing the whole book of business.",
      },
      {
        feature: "Multi-VM adjudication contracts",
        how: "EVM/WASM/Cairo contracts encode coverage rules, coordination-of-benefits, and parametric payouts transparently and verifiably.",
      },
    ],
    dapps: [
      { name: "AutoAdjudicate", desc: "Rules-engine contract that adjudicates claims against coverage policies and releases escrowed payment on approval.", tags: ["escrow", "EVM", "claims"] },
      { name: "FraudProof", desc: "Duplicate-billing and phantom-claim detector using eth_getProof provenance across the claims ledger.", tags: ["eth_getProof", "fraud", "audit"] },
      { name: "MemberLens", desc: "Member portal exposing full, verifiable claim and denial history through a personal viewing key.", tags: ["viewing-keys", "transparency", "member"] },
      { name: "COBSync", desc: "Coordination-of-benefits contract reconciling primary/secondary payers on shielded member commitments.", tags: ["ZK", "WASM", "settlement"] },
      { name: "ParametricHealth", desc: "Parametric supplemental policy paying out instantly on a verified diagnosis code trigger.", tags: ["escrow", "parametric", "finality"] },
      { name: "AppealTrail", desc: "Immutable appeals workflow where every denial reason and reversal is a tamper-evident commitment.", tags: ["integrity", "audit", "compliance"] },
      { name: "PreAuthNow", desc: "Instant prior-authorization contract verifying medical-necessity criteria against shielded clinical proofs.", tags: ["ZK", "prior-auth", "EVM"] },
      { name: "RegAuditKey", desc: "Regulator dashboard analyzing denial-rate fairness via scoped viewing keys, no raw member data.", tags: ["viewing-keys", "compliance", "analytics"] },
    ],
  },

  "telemedicine": {
    overview:
      "Telemedicine scaled overnight but inherited weak identity, fragmented records, and cross-state licensing and payment friction. PYRAX secures virtual care with verifiable clinician credentials, consent-gated session records, instant cross-border settlement, and shielded-by-default privacy so a consult leaves a trustworthy trail without ever exposing the patient.",
    marketSize: "$123.3B telemedicine market (2024)",
    projection: "$455.3B by 2030 · ~24.3% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Telehealth CAGR through 2030", value: "~24%" },
      { label: "Patients open to virtual-first care", value: "~60%" },
      { label: "Clinician-credential verification is manual", value: "mostly" },
      { label: "Cross-border payment settlement", value: "days" },
    ],
    painPoints: [
      "Verifying a remote clinician's license and identity across states and borders is slow and spoofable.",
      "Consult records are scattered across platforms with no patient-controlled continuity.",
      "Cross-jurisdiction payments to clinicians settle slowly and expensively.",
      "Session privacy and consent are hard to prove after the fact.",
    ],
    solutions: [
      {
        feature: "Credential attestation on-chain",
        how: "Medical boards issue verifiable license attestations a patient's app checks in real time, so no unlicensed or impersonating provider can start a consult.",
      },
      {
        feature: "BLS instant finality settlement",
        how: "Clinician payments and platform fees settle with sub-second finality across jurisdictions, removing multi-day payout delays.",
      },
      {
        feature: "Consent-gated session records",
        how: "Each consult produces a shielded, patient-owned record commitment released to follow-up providers only via consent.",
      },
      {
        feature: "Shielded-by-default privacy",
        how: "Diagnoses and session content stay off-chain as commitments, giving a verifiable care trail without exposing sensitive telehealth history.",
      },
      {
        feature: "Viewing keys for continuity of care",
        how: "A patient grants their primary-care physician a scoped key to review telehealth consults, closing the virtual-to-in-person gap.",
      },
    ],
    dapps: [
      { name: "LicenseProof", desc: "Real-time clinician-credential verifier reading medical-board attestations before a consult begins.", tags: ["attestation", "credential", "trust"] },
      { name: "ConsultVault", desc: "Patient-owned telehealth record store issuing consent-gated viewing keys to follow-up providers.", tags: ["viewing-keys", "consent", "patient"] },
      { name: "PayClinician", desc: "Cross-border clinician payout contract settling with BLS instant finality.", tags: ["finality", "payments", "EVM"] },
      { name: "eRxTrace", desc: "Tamper-evident e-prescription log with provenance to combat telehealth prescription fraud.", tags: ["provenance", "eth_getProof", "safety"] },
      { name: "TriageBotAI", desc: "PYRAX Compute symptom-triage assistant running inference on private inputs without logging identifiable data.", tags: ["Compute", "AI", "privacy"] },
      { name: "SessionSeal", desc: "Post-consult attestation proving a session occurred, its duration, and consent, without content disclosure.", tags: ["ZK", "attestation", "audit"] },
      { name: "GlobalConsult", desc: "Cross-jurisdiction consult marketplace matching patients to licensed clinicians with escrowed fees.", tags: ["escrow", "credential", "marketplace"] },
      { name: "ContinuityKey", desc: "One-tap grant handing a PCP scoped access to a patient's telehealth history for care continuity.", tags: ["viewing-keys", "consent", "interoperability"] },
    ],
  },

  "medical-devices": {
    overview:
      "Connected medical devices multiply attack surface and recall complexity while device data feeds critical care decisions. PYRAX gives every device a hardware-attested identity, anchors device provenance and firmware integrity on-chain, and lets device data drive smart contracts and PYRAX Compute models without leaking patient-identifiable readings.",
    marketSize: "$570B medical devices market (2024)",
    projection: "$887B by 2032 · ~5.8% CAGR",
    source: "Precedence Research, 2024",
    stats: [
      { label: "Connected medical devices in use", value: "billions" },
      { label: "Hospitals reporting device cyberattacks", value: "~90%" },
      { label: "Avg. medical-device recalls per quarter", value: "hundreds" },
      { label: "Legacy devices with unpatched firmware", value: "widespread" },
    ],
    painPoints: [
      "Devices lack strong, verifiable identity, enabling spoofing and unauthorized data injection.",
      "Firmware tampering and unpatched vulnerabilities threaten patient safety.",
      "Recalls and field-safety corrections are hard to target to affected serials and sites.",
      "Device telemetry that could improve care is either siloed or exposes patient data.",
    ],
    solutions: [
      {
        feature: "IoT and device attestation",
        how: "Each device signs a hardware-rooted identity and firmware-hash attestation on-chain, so only verified, uncompromised devices contribute trusted data.",
      },
      {
        feature: "Provenance anchoring and recall targeting",
        how: "Device serials, firmware versions, and custody are anchored on-chain, enabling precise field-safety corrections via eth_getProof queries.",
      },
      {
        feature: "Shielded-by-default telemetry",
        how: "Device readings tied to patients are committed off-chain, so aggregate integrity and provenance are verifiable while individual data stays private.",
      },
      {
        feature: "Multi-VM contracts for device logic",
        how: "EVM/WASM/Cairo contracts trigger alerts, maintenance escrow, or supply reorders directly from verified device attestations.",
      },
      {
        feature: "PYRAX Compute compute-to-data",
        how: "Predictive-maintenance and safety-signal models train across device fleets and patient data in place, returning verifiable insights without centralizing readings.",
      },
    ],
    dapps: [
      { name: "DeviceID", desc: "Hardware-attested device registry; every reading carries a verifiable identity and firmware-integrity proof.", tags: ["attestation", "IoT", "identity"] },
      { name: "FirmProof", desc: "Firmware-integrity monitor that flags any device whose attested hash drifts from the approved build.", tags: ["attestation", "security", "provenance"] },
      { name: "FieldFix", desc: "Recall and field-safety targeting engine locating affected serials and sites via eth_getProof.", tags: ["eth_getProof", "recall", "provenance"] },
      { name: "MaintEscrow", desc: "Predictive-maintenance contract escrowing service payment against verified device-health attestations.", tags: ["escrow", "IoT", "EVM"] },
      { name: "FleetHealthAI", desc: "PYRAX Compute failure-prediction model trained across a hospital device fleet without exporting telemetry.", tags: ["Compute", "compute-to-data", "AI"] },
      { name: "PumpGuard", desc: "Infusion-pump safety layer verifying dose-command provenance before administration.", tags: ["attestation", "safety", "provenance"] },
      { name: "ImplantPass", desc: "Patient-held implant passport with device provenance, MRI-safety data, and consent-gated access.", tags: ["provenance", "consent", "patient"] },
      { name: "SupplyReorder", desc: "Consumable auto-reorder contract triggered by attested usage telemetry with instant finality.", tags: ["finality", "IoT", "supply"] },
    ],
  },

  "genomics": {
    overview:
      "Genomic data is the most personal, immutable, and re-identifiable data a person owns — yet research demands it be pooled at scale. PYRAX resolves the tension with PYRAX Compute compute-to-data, so models train on private genomes in place, patients hold cryptographic consent over every use, and results are verifiable while raw sequence never leaves its custodian.",
    marketSize: "$32.4B genomics market (2024)",
    projection: "$94.7B by 2030 · ~19.6% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Genomics market CAGR to 2030", value: "~19.6%" },
      { label: "Cost to sequence a human genome", value: "<$200" },
      { label: "Genome data re-identifiable from SNPs", value: "yes" },
      { label: "Participants wanting control over data use", value: "vast majority" },
    ],
    painPoints: [
      "Genomic data is permanently re-identifiable, so any breach is irreversible and lifelong.",
      "Research requires large cohorts, but pooling raw genomes creates unacceptable privacy risk.",
      "Patients rarely control or profit from downstream use of their own genetic data.",
      "Provenance and consent for each genomic use are hard to prove to IRBs and regulators.",
    ],
    solutions: [
      {
        feature: "PYRAX Compute compute-to-data",
        how: "GWAS, polygenic-risk, and variant-effect models train and infer directly on private genomes at each biobank, returning verifiable results without the sequence ever moving.",
      },
      {
        feature: "Consent-gated data with revocation",
        how: "Every model run requires the participant's on-chain consent for that specific purpose, and consent is revocable, giving true dynamic control.",
      },
      {
        feature: "Shielded-by-default genomic commitments",
        how: "Genomes are held off-chain; only commitments and result proofs are on-chain, so there is no re-identifiable data on the ledger.",
      },
      {
        feature: "eth_getProof result provenance",
        how: "Each analysis result carries a proof of which model, data, and consents produced it — an auditable lineage for IRBs and publications.",
      },
      {
        feature: "On-chain escrow for data value-return",
        how: "When a participant's data contributes to a study, escrow can return value or fund a data trust, aligning incentives with the individuals who own the genome.",
      },
    ],
    dapps: [
      { name: "GenomeVault", desc: "Custodian-held genome store exposing only commitments; all use flows through PYRAX Compute compute-to-data.", tags: ["Compute", "compute-to-data", "ZK"] },
      { name: "ConsentGene", desc: "Dynamic genomic-consent wallet granting and revoking per-study, per-purpose access.", tags: ["consent", "revocable", "patient"] },
      { name: "FederatedGWAS", desc: "Cross-biobank association study running in place with verifiable pooled statistics and no raw-data exchange.", tags: ["Compute", "federated", "AI"] },
      { name: "RiskScoreAI", desc: "Polygenic-risk inference a patient runs on their own genome, receiving results without exposing SNPs.", tags: ["Compute", "privacy", "inference"] },
      { name: "LineageProof", desc: "Result-provenance explorer showing exactly which data and consents produced each finding via eth_getProof.", tags: ["eth_getProof", "provenance", "audit"] },
      { name: "DataDividend", desc: "Escrow contract returning value to participants when their genomic data contributes to a funded study.", tags: ["escrow", "incentives", "EVM"] },
      { name: "VariantRegistry", desc: "Shielded pathogenic-variant registry letting labs share evidence commitments without exposing patients.", tags: ["ZK", "commitment", "research"] },
      { name: "PharmacoGeneKey", desc: "Consent-gated pharmacogenomic report a patient shares with a prescriber via scoped viewing key.", tags: ["viewing-keys", "consent", "clinical"] },
    ],
  },

  "biotech-research": {
    overview:
      "Biotech R&D is capital-intensive, IP-sensitive, and increasingly collaborative across institutions that cannot freely share data. PYRAX protects research IP with tamper-evident provenance, funds and coordinates consortia through escrow and multi-VM contracts, and enables cross-lab AI via PYRAX Compute compute-to-data — so collaboration never means surrendering a lab's crown-jewel datasets.",
    marketSize: "$1.55T biotechnology market (2023)",
    projection: "$3.88T by 2030 · ~13.9% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Biotech market CAGR to 2030", value: "~13.9%" },
      { label: "Global biotech R&D spend", value: "hundreds of $B/yr" },
      { label: "Research findings that fail to replicate", value: "~50%" },
      { label: "IP disputes and prior-art contests", value: "common" },
    ],
    painPoints: [
      "Proving invention priority and data provenance for IP is slow and contestable.",
      "Cross-institution collaboration is throttled by inability to share proprietary datasets.",
      "Reproducibility suffers because raw data and methods are opaque and unverifiable.",
      "Consortium funding and milestone payments are administratively heavy and low-trust.",
    ],
    solutions: [
      {
        feature: "eth_getProof IP and data provenance",
        how: "Experimental results and lab-notebook entries are timestamped commitments, giving cryptographic proof of invention priority and data integrity for patents and disputes.",
      },
      {
        feature: "PYRAX Compute compute-to-data collaboration",
        how: "Partner labs jointly train models across each other's private datasets in place, so a consortium gets combined power without any lab exposing its proprietary data.",
      },
      {
        feature: "On-chain escrow for consortium funding",
        how: "Grant and consortium funds release from escrow against verified research milestones, cutting administrative overhead and building funder trust.",
      },
      {
        feature: "Shielded-by-default IP",
        how: "Proprietary methods and results stay off-chain as commitments — provenance and integrity are provable while trade secrets remain confidential.",
      },
      {
        feature: "Multi-VM contracts for licensing and royalties",
        how: "EVM/WASM/Cairo contracts automate data-use agreements, IP licensing, and royalty splits between collaborating institutions.",
      },
    ],
    dapps: [
      { name: "LabNotarize", desc: "Tamper-evident electronic lab notebook committing every result for provable invention priority.", tags: ["eth_getProof", "provenance", "IP"] },
      { name: "ConsortiumAI", desc: "PYRAX Compute cross-lab model training that pools statistical power without moving any proprietary dataset.", tags: ["Compute", "compute-to-data", "AI"] },
      { name: "GrantEscrow", desc: "Milestone-gated funding contract releasing consortium capital on verified research deliverables.", tags: ["escrow", "funding", "EVM"] },
      { name: "ReproProof", desc: "Reproducibility registry publishing method and data commitments so results can be independently verified.", tags: ["integrity", "commitment", "transparency"] },
      { name: "LicenseFlow", desc: "IP-licensing and royalty-split contract automating cross-institution data-use agreements.", tags: ["EVM", "royalties", "licensing"] },
      { name: "AssayVault", desc: "Shielded assay-data exchange where labs trade result commitments without exposing raw screens.", tags: ["ZK", "commitment", "collaboration"] },
      { name: "PriorArtChain", desc: "Timestamped disclosure registry establishing defensible prior art for patent strategy.", tags: ["provenance", "IP", "audit"] },
      { name: "BioMarketAI", desc: "PYRAX Compute target-discovery marketplace where sponsors run inference against private compound and omics libraries.", tags: ["Compute", "marketplace", "inference"] },
    ],
  },

  "mental-health": {
    overview:
      "Mental-health care carries uniquely high stigma, and fear of exposure keeps millions from seeking help. PYRAX enables genuinely anonymous care over its mixnet, keeps every session shielded off-chain, and lets patients prove treatment or eligibility without ever revealing what they disclosed — removing the privacy barrier that keeps people from the care they need.",
    marketSize: "$444.8B mental health market (2023)",
    projection: "$644.4B by 2030 · ~5.5% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Adults with a mental illness untreated", value: "~50%" },
      { label: "Citing privacy/stigma as a barrier to care", value: "leading" },
      { label: "Digital mental-health market CAGR", value: "double-digit" },
      { label: "Sensitivity of behavioral-health records", value: "highest tier" },
    ],
    painPoints: [
      "Stigma and fear of disclosure stop people from seeking mental-health care.",
      "Behavioral-health records are the most sensitive PHI and the most damaging if leaked.",
      "Patients need to prove treatment for work, court, or insurance without revealing content.",
      "Crisis and peer-support platforms struggle to protect anonymity while ensuring safety.",
    ],
    solutions: [
      {
        feature: "Mixnet for anonymous care",
        how: "Patients reach therapists, crisis lines, and peer support over the PYRAX mixnet, so participation cannot be traced back to their identity or network metadata.",
      },
      {
        feature: "Shielded-by-default session privacy",
        how: "Session occurrence and content are committed off-chain; nothing on the ledger reveals that a person sought or received mental-health care.",
      },
      {
        feature: "ZK proofs of treatment without disclosure",
        how: "A patient can prove to an employer, court, or insurer that they completed treatment or met a requirement — without exposing any diagnosis or session detail.",
      },
      {
        feature: "Consent-gated, revocable sharing",
        how: "Behavioral-health records are shared only via explicit, revocable consent grants, honoring the heightened confidentiality these records demand.",
      },
      {
        feature: "On-chain escrow for care payments",
        how: "Sessions with anonymous or pseudonymous clinicians settle through escrow, so payment never links a real-world identity to a therapy record.",
      },
    ],
    dapps: [
      { name: "AnonTherapy", desc: "Mixnet-routed teletherapy where sessions are unlinkable to a patient's real-world identity.", tags: ["mixnet", "anonymity", "privacy"] },
      { name: "CrisisRelay", desc: "Anonymous crisis-support line over the mixnet with optional consent-gated escalation for safety.", tags: ["mixnet", "consent", "safety"] },
      { name: "TreatmentProof", desc: "ZK attestation letting a patient prove completed treatment to a third party without disclosing content.", tags: ["ZK", "attestation", "privacy"] },
      { name: "PeerCircle", desc: "Pseudonymous peer-support community with shielded membership and revocable participation.", tags: ["anonymity", "ZK", "community"] },
      { name: "MoodVault", desc: "Patient-owned mood and journaling record held off-chain as commitments, shared only via viewing keys.", tags: ["viewing-keys", "consent", "patient"] },
      { name: "SessionPay", desc: "Escrow settlement for pseudonymous clinicians that never links payment to a therapy record.", tags: ["escrow", "anonymity", "payments"] },
      { name: "WellnessAI", desc: "PYRAX Compute on-device support model running inference on private inputs with nothing identifiable logged.", tags: ["Compute", "AI", "privacy"] },
      { name: "AccessKey", desc: "Selective-disclosure tool sharing scoped behavioral-health records with a new provider under revocable consent.", tags: ["viewing-keys", "consent", "revocable"] },
    ],
  },
};

