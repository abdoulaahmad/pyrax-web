// SPDX-License-Identifier: LicenseRef-Proprietary
// Industry content for the "ai-data-compute" category (10 business types) — PYRAX's flagship category,
// home turf for NEURAX (the verifiable AI/GPU compute marketplace). Filled by content pass.
import type { CategoryContent } from "./types";

export const content: CategoryContent = {
  "ai-inference": {
    overview:
      "AI inference is the runtime side of AI — serving trained models to answer prompts, score data, and drive agents — and it is now the dominant, recurring cost of production AI. PYRAX turns inference into a verifiable, pay-per-use market through NEURAX: jobs are priced in compute units at a fixed 8 PYRX/CU, funded by on-chain escrow, and settled against a single ComputeReceipt whose result is checked by a 4-rung verification ladder rather than trusted blindly.",
    marketSize: "$76B (2024)",
    projection: "$255B by 2030 · ~22% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "AI inference market (2024)", value: "$76B" },
      { label: "Share of AI compute spend on inference", value: "~60–70%" },
      { label: "Enterprises deploying GenAI in production", value: "65%" },
      { label: "Cost premium vs. commodity GPU rental", value: "3–5×" },
    ],
    painPoints: [
      "Inference bills scale with every request, so serving costs quickly dwarf one-time training costs.",
      "You cannot prove a hosted API actually ran the model and settings you paid for — quantization, routing, and caching are invisible.",
      "Sending prompts and documents to a third-party endpoint leaks proprietary and personal data.",
      "Capacity is concentrated in a few clouds, creating price power, waitlists, and single points of failure.",
    ],
    solutions: [
      {
        feature: "NEURAX verifiable inference (pay-per-CU)",
        how: "Each request becomes a metered job priced at a fixed 8 PYRX/CU and bound to a ComputeReceipt that records the model, inputs digest, and output, so you pay only for the work actually performed.",
      },
      {
        feature: "4-rung verification ladder",
        how: "Results climb from provider attestation, to redundant re-execution by independent workers, up to ZK proofs — you choose how strong a guarantee each job needs instead of trusting the endpoint blindly.",
      },
      {
        feature: "On-chain escrow settlement",
        how: "Funds are locked in escrow at submission and released against a verified ComputeReceipt, so honest workers are paid atomically and disputed or failed jobs are refundable.",
      },
      {
        feature: "Compute-to-data + shielded transfers",
        how: "Inference runs next to private data with prompts and outputs moved as shielded transfers, and a scoped viewing key lets an auditor confirm what ran without exposing the payload.",
      },
      {
        feature: "Local-first consumer-GPU workers",
        how: "An RTX 3060-baseline runtime lets anyone contribute a GPU, and VRAM/trust-tier scheduling routes each model to a worker that can actually hold it, widening supply beyond the hyperscalers.",
      },
    ],
    dapps: [
      { name: "ProofServe", desc: "Verifiable inference gateway that returns each completion alongside a ComputeReceipt and a caller-selected verification rung.", tags: ["NEURAX", "ComputeReceipt"] },
      { name: "EscrowInfer", desc: "Pay-per-CU API where callers escrow PYRX per request and funds release only when the result verifies.", tags: ["NEURAX", "Escrow"] },
      { name: "PrivatePrompt", desc: "Shielded inference relay that hides prompts and outputs on-chain while issuing viewing keys to compliance reviewers.", tags: ["Shielded", "NEURAX"] },
      { name: "ZKOracle", desc: "ZK-proven model oracle that feeds smart contracts scores it can prove were produced by a specified model.", tags: ["ZK", "NEURAX"] },
      { name: "RouterMesh", desc: "Trust-tier router that spreads inference across independent workers and re-executes a sample for redundant verification.", tags: ["NEURAX", "Scheduler"] },
      { name: "AgentLedger", desc: "Autonomous-agent runtime whose every tool call and model step is metered and receipted for auditable spend.", tags: ["NEURAX", "EVM"] },
      { name: "EdgeServe", desc: "Consumer-GPU inference pool that lets home RTX operators earn PYRX for served CUs with VRAM-aware scheduling.", tags: ["NEURAX", "Edge"] },
      { name: "FairDecline", desc: "On-chain decision endpoint that attaches a verifiable receipt to model outputs so a disputed answer can be reproduced.", tags: ["ComputeReceipt", "ZK"] },
    ],
  },

  "decentralized-compute": {
    overview:
      "Decentralized compute pools idle GPUs and servers from many operators into an open, permissionless supercomputer, breaking the hyperscaler bottleneck for AI and rendering workloads. PYRAX is the settlement and trust layer NEURAX runs on: buyers escrow PYRX, workers are matched by VRAM and trust tier, and every job settles against a ComputeReceipt whose output is validated by the 4-rung ladder — so payment follows proven work, not promises.",
    marketSize: "$9.4B (2024)",
    projection: "$100B+ by 2032 · ~28% CAGR",
    source: "Grand View Research / Precedence, 2024",
    stats: [
      { label: "Decentralized physical infra (DePIN) compute", value: "$9.4B" },
      { label: "Global GPU shortage backlog", value: "$50B+" },
      { label: "Avg. datacenter GPU utilization", value: "~50%" },
      { label: "Cost gap vs. hyperscale cloud", value: "up to 80% cheaper" },
    ],
    painPoints: [
      "AI teams face long GPU waitlists and premium on-demand pricing from a handful of clouds.",
      "Vast amounts of consumer and enterprise GPU capacity sit idle with no trustless way to monetize it.",
      "Buyers cannot verify a remote worker actually ran the requested job on the claimed hardware.",
      "Marketplaces without escrow expose both sides to non-payment and non-delivery.",
    ],
    solutions: [
      {
        feature: "NEURAX compute marketplace",
        how: "Buyers post jobs and the network matches workers, meters usage in compute units at a fixed 8 PYRX/CU, and settles peer-to-peer with no cloud middleman taking margin.",
      },
      {
        feature: "On-chain escrow + 4B-PYRX compute pool",
        how: "A dedicated protocol pool bootstraps demand while per-job escrow locks buyer funds up front and releases them to workers only against a verified ComputeReceipt.",
      },
      {
        feature: "VRAM / trust-tier scheduler",
        how: "Jobs are placed on workers that can actually hold the model in memory and meet the required trust tier, so large models never land on hardware that will fail them.",
      },
      {
        feature: "ShardedExecutor GPU pooling",
        how: "A model too big for one GPU is split across a cohort of consumer cards with a member-independent combine, letting pooled RTX-class hardware serve workloads that once needed a datacenter card.",
      },
      {
        feature: "4-rung verification ladder",
        how: "Attestation, redundant re-execution, and ZK proofs give buyers a dial between cheap-and-fast and cryptographically-proven, without changing how they pay.",
      },
    ],
    dapps: [
      { name: "GPUMarket", desc: "Open order book where buyers escrow PYRX for GPU-hours and NEURAX matches them to available workers by VRAM and price.", tags: ["NEURAX", "Escrow"] },
      { name: "ShardPool", desc: "Cohort scheduler that runs a single oversized model across many consumer GPUs via the ShardedExecutor.", tags: ["NEURAX", "Scheduler"] },
      { name: "ProofOfWorkload", desc: "Job runner that returns a ComputeReceipt with a chosen verification rung so buyers can trust results from unknown workers.", tags: ["ComputeReceipt", "ZK"] },
      { name: "IdleYield", desc: "One-click worker client that lets home and studio GPUs earn PYRX for verified CUs when otherwise idle.", tags: ["NEURAX", "Edge"] },
      { name: "RenderSwarm", desc: "Distributed 3D/render farm that shards frames across the pool and settles per completed frame.", tags: ["NEURAX", "Escrow"] },
      { name: "TierBid", desc: "Reverse-auction contract where workers bid on jobs and stake into their trust tier for priority placement.", tags: ["EVM", "Scheduler"] },
      { name: "BurstCloud", desc: "Autoscaling backend that overflows spiky AI demand from a private cluster into the NEURAX market with capped spend.", tags: ["NEURAX", "WASM"] },
      { name: "SlashGuard", desc: "Dispute contract that re-executes a challenged job on independent workers and slashes the escrow of a proven-faulty provider.", tags: ["Escrow", "ZK"] },
    ],
  },

  "data-marketplaces": {
    overview:
      "Data marketplaces let organizations buy, sell, and license datasets — from training corpora to real-time feeds — but the core paradox is that a buyer must inspect data to value it, and once seen it is copied for free. PYRAX resolves this with compute-to-data: NEURAX runs the buyer's model against the seller's private dataset in place, and only a verified ComputeReceipt and payment cross the wire, so value is exchanged without the raw data ever leaving the owner.",
    marketSize: "$1.1B (2024)",
    projection: "$16.3B by 2033 · ~35% CAGR",
    source: "Precedence Research, 2024",
    stats: [
      { label: "Data marketplace market (2024)", value: "$1.1B" },
      { label: "Enterprise data-monetization interest", value: "70%" },
      { label: "Share of data that is 'dark'/unused", value: "~55%" },
      { label: "Cost of a data breach (avg.)", value: "$4.9M" },
    ],
    painPoints: [
      "Sellers must expose samples to prove value, and buyers can copy or resell what they preview.",
      "Regulated and proprietary data (health, financial, biometric) can rarely be moved off-premises at all.",
      "Buyers cannot verify a dataset's provenance, freshness, or that a model was actually trained on it.",
      "Royalties and licensing terms are hard to enforce once data has changed hands.",
    ],
    solutions: [
      {
        feature: "Compute-to-data via NEURAX",
        how: "Buyers submit a training or query job that executes against the seller's dataset in place; the data never moves, and only the receipted result and payment are exchanged.",
      },
      {
        feature: "Content-addressed encrypted storage",
        how: "Datasets are stored encrypted and referenced by content hash, so any use is pinned to an immutable, verifiable version of the exact data licensed.",
      },
      {
        feature: "Shielded transfers + viewing keys",
        how: "Purchases, access grants, and usage stay private on-chain, while scoped viewing keys let a regulator or auditor confirm a licensed use without seeing the underlying records.",
      },
      {
        feature: "On-chain escrow + programmable royalties",
        how: "Escrow releases payment against a verified ComputeReceipt, and multi-VM contracts split royalties to every upstream data contributor automatically on each access.",
      },
      {
        feature: "eth_getProof verifiable state",
        how: "Provenance, license terms, and access logs are provable directly from state proofs, so buyers can independently verify a dataset's lineage and rights.",
      },
    ],
    dapps: [
      { name: "DataInPlace", desc: "Compute-to-data marketplace where buyers run models against private datasets that never leave the seller's node.", tags: ["Compute-to-data", "NEURAX"] },
      { name: "ProvenanceVault", desc: "Content-addressed registry that binds every dataset to an immutable hash and a verifiable lineage trail.", tags: ["Storage", "ComputeReceipt"] },
      { name: "RoyaltySplit", desc: "Contract that pays every upstream contributor their share automatically on each licensed access.", tags: ["EVM", "Escrow"] },
      { name: "ShieldLicense", desc: "Private licensing rail where purchases are shielded and each grant issues a scoped viewing key for auditors.", tags: ["Shielded", "Gov"] },
      { name: "FeedEscrow", desc: "Streaming-data subscription that escrows PYRX and meters delivery of real-time feeds per verified batch.", tags: ["Escrow", "NEURAX"] },
      { name: "TrainReceipt", desc: "Training broker that returns a ComputeReceipt proving a model was fit on the exact licensed corpus.", tags: ["ComputeReceipt", "Compute-to-data"] },
      { name: "ConsentledData", desc: "Individual-consent marketplace letting people license their personal data with revocable, viewing-key-scoped access.", tags: ["Shielded", "Cairo"] },
      { name: "LineageProof", desc: "Provenance verifier that uses eth_getProof to attest a dataset's version and terms to any consumer.", tags: ["ZK", "Storage"] },
    ],
  },

  "machine-learning-ops": {
    overview:
      "ML Ops covers the pipeline that takes models from training to production — data prep, distributed training, versioning, evaluation, and deployment — and its central weakness is reproducibility: teams and regulators struggle to prove which data, code, and compute produced a given model. PYRAX makes the whole pipeline attestable: NEURAX runs training and eval jobs against a ComputeReceipt, content-addressed storage pins the exact inputs, and eth_getProof makes every artifact and metric independently verifiable.",
    marketSize: "$3.4B (2024)",
    projection: "$39B by 2034 · ~28% CAGR",
    source: "MarketsandMarkets, 2024",
    stats: [
      { label: "ML Ops market (2024)", value: "$3.4B" },
      { label: "ML models that reach production", value: "~13%" },
      { label: "Enterprises citing reproducibility gaps", value: "60%+" },
      { label: "AI compute doubling cadence", value: "~6 months" },
    ],
    painPoints: [
      "Training runs are rarely reproducible — the exact data, hyperparameters, and hardware are lost.",
      "Distributed training is expensive and locked to a single cloud's cluster availability.",
      "Model lineage and evaluation metrics are self-reported, so audits and incident reviews are hard to trust.",
      "Regulated deployments (EU AI Act, model risk management) demand provable, tamper-evident records.",
    ],
    solutions: [
      {
        feature: "NEURAX distributed training jobs",
        how: "Training runs are metered in compute units at 8 PYRX/CU and can shard across a ShardedExecutor cohort, giving teams cluster-scale compute without a hyperscaler contract.",
      },
      {
        feature: "ComputeReceipt for reproducibility",
        how: "Every training and evaluation job emits one ComputeReceipt binding the data digest, config, code hash, and resulting artifact — a cryptographic record that the run happened as claimed.",
      },
      {
        feature: "Content-addressed model & dataset registry",
        how: "Datasets, checkpoints, and containers are addressed by hash, so a model version can be traced to the exact bytes that produced it and never silently drifts.",
      },
      {
        feature: "eth_getProof verifiable metrics",
        how: "Evaluation scores and lineage are committed to state and provable via proofs, so an auditor can verify a model card's claims without re-running the pipeline.",
      },
      {
        feature: "4-rung verification for evals",
        how: "Benchmark and safety-eval results can be independently re-executed or ZK-proven, replacing self-reported metrics with verifiable ones.",
      },
    ],
    dapps: [
      { name: "RepoTrain", desc: "Distributed training service that returns a ComputeReceipt pinning data, config, and code for a fully reproducible run.", tags: ["NEURAX", "ComputeReceipt"] },
      { name: "ModelRegistry", desc: "Content-addressed registry of checkpoints and datasets with immutable, verifiable lineage.", tags: ["Storage", "EVM"] },
      { name: "EvalProof", desc: "Benchmark harness that re-executes evaluations on independent workers and publishes verifiable scores.", tags: ["ZK", "NEURAX"] },
      { name: "DriftWatch", desc: "Monitoring dApp that anchors production metrics on-chain and proves when a model has drifted from its baseline.", tags: ["ComputeReceipt", "WASM"] },
      { name: "ShardTrainer", desc: "Cohort trainer that fans a large training job across pooled consumer GPUs via the ShardedExecutor.", tags: ["NEURAX", "Scheduler"] },
      { name: "AuditCard", desc: "Model-card contract whose every claim is backed by an eth_getProof-verifiable artifact for regulators.", tags: ["Gov", "ZK"] },
      { name: "PipelineEscrow", desc: "CI/CD for models where each stage escrows PYRX and pays workers on a verified receipt.", tags: ["Escrow", "NEURAX"] },
      { name: "PrivateFineTune", desc: "Compute-to-data fine-tuning that adapts a base model on private corpora without moving the data.", tags: ["Compute-to-data", "Shielded"] },
    ],
  },

  "iot-devices": {
    overview:
      "IoT connects tens of billions of sensors, meters, vehicles, and machines that generate telemetry and increasingly transact autonomously, but they lack strong identity and a native way to pay for services in tiny amounts. PYRAX gives every device a cryptographic machine identity, BLS-final micro-payments for pay-per-use data and compute, and tamper-proof logs — so devices can prove who they are, buy inference from NEURAX, and sell verified data without a human in the loop.",
    marketSize: "$714B (2024)",
    projection: "$3.35T by 2033 · ~18% CAGR",
    source: "Precedence Research, 2024",
    stats: [
      { label: "Global IoT market (2024)", value: "$714B" },
      { label: "Connected IoT devices", value: "18B+" },
      { label: "IoT data generated per year", value: "80+ ZB" },
      { label: "IoT devices with weak/no identity", value: "majority" },
    ],
    painPoints: [
      "Devices lack verifiable identity, making spoofing, botnets, and rogue actuators easy.",
      "There is no efficient rail for sub-cent, machine-to-machine payments for data and services.",
      "Sensor logs can be altered after the fact, undermining audits, warranties, and disputes.",
      "Sending raw telemetry to the cloud for inference wastes bandwidth and leaks location and behavior.",
    ],
    solutions: [
      {
        feature: "Machine identity + BLS finality",
        how: "Each device holds a keypair as its on-chain identity and its signed actions finalize instantly, so a meter, vehicle, or robot can authenticate and act with irreversible settlement.",
      },
      {
        feature: "Micro-payments for M2M commerce",
        how: "Devices pay and get paid in tiny PYRX amounts per reading, per kilowatt, or per API call, enabling true pay-per-use machine economies without card rails or minimums.",
      },
      {
        feature: "Tamper-proof telemetry logs",
        how: "Signed sensor data is anchored on-chain so readings are immutable and time-ordered, giving warranties, insurers, and regulators an unfalsifiable record.",
      },
      {
        feature: "Edge inference via NEURAX",
        how: "Devices buy inference from nearby consumer-GPU workers with escrow and a ComputeReceipt, keeping raw telemetry local while paying only for verified results.",
      },
      {
        feature: "Shielded transfers + viewing keys",
        how: "Location, usage, and payment data stay private on-chain, while a viewing key lets an operator or auditor inspect a specific device's activity when needed.",
      },
    ],
    dapps: [
      { name: "DeviceID", desc: "Machine-identity registry giving each device a keypair, attestation, and revocation path on-chain.", tags: ["Identity", "EVM"] },
      { name: "MicroMeter", desc: "Pay-per-reading rail where sensors sell data in sub-cent PYRX micro-payments with instant finality.", tags: ["Finality", "IoT"] },
      { name: "TamperLog", desc: "Immutable telemetry anchor that time-stamps signed sensor data for warranties and audits.", tags: ["Storage", "Gov"] },
      { name: "EdgeInfer", desc: "On-device inference broker that buys NEURAX compute from nearby workers with escrow and receipts.", tags: ["NEURAX", "Edge"] },
      { name: "FleetPay", desc: "Autonomous-vehicle and drone wallet that pays for charging, tolls, and airspace per use.", tags: ["Finality", "IoT"] },
      { name: "ShieldTelemetry", desc: "Privacy-preserving telemetry stream with viewing-key access for operators and regulators.", tags: ["Shielded", "IoT"] },
      { name: "GridMachine", desc: "M2M energy market where smart meters and batteries trade kilowatts with signed, finalized settlement.", tags: ["Finality", "EVM"] },
      { name: "SwarmContract", desc: "Coordination contract letting robot/drone swarms bid, pay, and settle tasks among themselves.", tags: ["WASM", "IoT"] },
    ],
  },

  "cybersecurity": {
    overview:
      "Cybersecurity defends systems, data, and identities against a threat landscape where attackers increasingly weaponize AI, and where defenders' own logs and detection models are prime targets for tampering. PYRAX hardens the defensive stack: tamper-proof logs give an append-only, cryptographically-anchored audit trail, NEURAX runs threat-detection models with verifiable ComputeReceipts, and eth_getProof makes security state independently attestable — so evidence and defenses can be trusted even after a breach.",
    marketSize: "$193B (2024)",
    projection: "$562B by 2032 · ~14% CAGR",
    source: "Fortune Business Insights, 2024",
    stats: [
      { label: "Cybersecurity market (2024)", value: "$193B" },
      { label: "Projected annual cybercrime cost (2025)", value: "$10.5T" },
      { label: "Avg. breach dwell time", value: "~200 days" },
      { label: "Breaches involving log tampering/deletion", value: "significant" },
    ],
    painPoints: [
      "Attackers delete or alter logs to erase their tracks, destroying forensic evidence.",
      "AI-driven attacks scale faster than human-staffed SOCs can respond.",
      "Threat-detection models are opaque, so a missed or false alert cannot be proven fair or reproduced.",
      "Sharing threat intelligence between organizations exposes sensitive internal data.",
    ],
    solutions: [
      {
        feature: "Tamper-proof, append-only logs",
        how: "Security events are anchored on-chain with instant finality, so an intruder cannot alter or delete the record without detection, preserving a forensic chain of custody.",
      },
      {
        feature: "NEURAX verifiable threat detection",
        how: "Detection and triage models run as receipted jobs, so every alert or clear can be reproduced and proven to have used the sanctioned model and rules.",
      },
      {
        feature: "eth_getProof verifiable state",
        how: "Configuration, patch levels, and access grants are committed to provable state, giving auditors and insurers cryptographic assurance of a system's posture.",
      },
      {
        feature: "Shielded threat-intel sharing",
        how: "Organizations exchange indicators via shielded transfers with viewing keys, contributing to shared defense without exposing internal identifiers or victims.",
      },
      {
        feature: "Machine identity + BLS finality",
        how: "Strong on-chain identity for services and devices closes off spoofing, and instantly-final revocation cuts a compromised key out of the network immediately.",
      },
    ],
    dapps: [
      { name: "ImmutaLog", desc: "Append-only SIEM sink that anchors security events on-chain for tamper-evident forensics.", tags: ["Storage", "Gov"] },
      { name: "ProofSOC", desc: "Detection pipeline that attaches a ComputeReceipt to every alert so triage decisions are reproducible.", tags: ["NEURAX", "ComputeReceipt"] },
      { name: "PostureProof", desc: "Continuous-compliance dApp that proves patch level and config via eth_getProof to auditors and insurers.", tags: ["ZK", "Gov"] },
      { name: "ThreatShare", desc: "Shielded threat-intelligence exchange with viewing-key-scoped disclosure between members.", tags: ["Shielded", "EVM"] },
      { name: "KeyRevoke", desc: "Instant-finality revocation registry that ejects a compromised identity network-wide in one block.", tags: ["Identity", "Finality"] },
      { name: "HoneyLedger", desc: "Decoy-and-deception network that immutably records attacker interactions for analysis.", tags: ["Storage", "IoT"] },
      { name: "BountyEscrow", desc: "Bug-bounty escrow that pays researchers on a verified, reproducible proof-of-vulnerability.", tags: ["Escrow", "ComputeReceipt"] },
      { name: "AIWatch", desc: "Verifiable anomaly detector for on-chain and off-chain activity that proves each flag with a receipt.", tags: ["NEURAX", "ZK"] },
    ],
  },

  "cloud-storage": {
    overview:
      "Cloud and storage underpins every digital workload, but the dominant model concentrates data in a few providers, creating lock-in, egress fees, and single points of failure and censorship. PYRAX pairs with decentralized storage to make data content-addressed and encrypted, provably retrievable, and monetizable per byte: NEURAX runs compute-to-data next to the bytes, escrow settles storage and retrieval per proof, and eth_getProof lets anyone verify a file's integrity and availability.",
    marketSize: "$91B (2024)",
    projection: "$472B by 2032 · ~23% CAGR",
    source: "Fortune Business Insights, 2024",
    stats: [
      { label: "Cloud storage market (2024)", value: "$91B" },
      { label: "Global data created per year", value: "180+ ZB" },
      { label: "Cloud spend lost to egress/waste", value: "~30%" },
      { label: "Enterprises citing vendor lock-in risk", value: "80%+" },
    ],
    painPoints: [
      "Data centralization creates lock-in, censorship risk, and correlated outages.",
      "Egress fees and opaque pricing penalize moving or reusing your own data.",
      "Providers self-report durability and availability — there is no independent proof a file is intact.",
      "Storing regulated data with third parties raises sovereignty and confidentiality concerns.",
    ],
    solutions: [
      {
        feature: "Content-addressed encrypted storage",
        how: "Files are encrypted client-side and referenced by content hash, so integrity is self-verifying and the same bytes are addressable across any provider without lock-in.",
      },
      {
        feature: "eth_getProof retrievability proofs",
        how: "Storage providers commit availability to state, letting clients cryptographically verify a file is stored and retrievable rather than trusting an SLA.",
      },
      {
        feature: "Escrow + per-byte micro-payments",
        how: "Storage and retrieval settle in metered PYRX against proofs of service, replacing surprise egress bills with transparent, pay-for-what-you-use pricing.",
      },
      {
        feature: "Compute-to-data via NEURAX",
        how: "Analytics and inference run where the data lives, so large datasets are queried in place — no egress, and results come back with a ComputeReceipt.",
      },
      {
        feature: "Shielded access + viewing keys",
        how: "Access grants and usage stay private on-chain while viewing keys give a data owner or regulator scoped, auditable visibility into who read what.",
      },
    ],
    dapps: [
      { name: "PinProof", desc: "Content-addressed storage layer that anchors each file's hash and proves retrievability via eth_getProof.", tags: ["Storage", "ZK"] },
      { name: "MeteredBucket", desc: "Pay-per-byte object store that escrows PYRX and settles storage and retrieval against proofs of service.", tags: ["Escrow", "Storage"] },
      { name: "QueryInPlace", desc: "Compute-to-data warehouse that runs analytics next to the bytes and returns receipted results.", tags: ["Compute-to-data", "NEURAX"] },
      { name: "ShieldDrive", desc: "Encrypted personal drive with viewing-key sharing and immutable access logs.", tags: ["Shielded", "Gov"] },
      { name: "ReplicaMarket", desc: "Redundancy market where independent nodes bid to hold and prove replicas of critical data.", tags: ["Storage", "Escrow"] },
      { name: "SovereignVault", desc: "Jurisdiction-aware storage that keeps regulated data in-region with provable placement.", tags: ["Gov", "Storage"] },
      { name: "ColdArchive", desc: "Long-term archival with periodic on-chain proofs that cold data is still intact and recoverable.", tags: ["Storage", "ZK"] },
      { name: "CDNMesh", desc: "Decentralized CDN that pays edge caches per verified delivery of content-addressed assets.", tags: ["Edge", "Escrow"] },
    ],
  },

  "scientific-computing": {
    overview:
      "Scientific computing powers simulation, genomics, climate modeling, and drug discovery — HPC workloads that are compute-starved, expensive, and increasingly demand reproducibility and secure collaboration on sensitive data. PYRAX opens supercomputer-class capacity through NEURAX's pooled GPUs and ShardedExecutor, binds every run to a ComputeReceipt for reproducibility, and uses compute-to-data so institutions can jointly analyze private cohorts without ever sharing the raw data.",
    marketSize: "$54B (2024)",
    projection: "$132B by 2032 · ~11% CAGR",
    source: "MarketsandMarkets, 2024",
    stats: [
      { label: "HPC market (2024)", value: "$54B" },
      { label: "Global R&D spend", value: "$2.75T" },
      { label: "Studies failing reproducibility", value: "~50%" },
      { label: "Research idle to compute waitlists", value: "months" },
    ],
    painPoints: [
      "Access to HPC clusters is gated by grants, queues, and institutional allocation.",
      "Published results are often not reproducible because the exact code, data, and environment are lost.",
      "Cross-institution collaboration on sensitive data (patient genomes, proprietary compounds) is blocked by privacy law.",
      "Grant and compute spending is hard to audit and attribute to specific runs.",
    ],
    solutions: [
      {
        feature: "NEURAX pooled HPC + ShardedExecutor",
        how: "Large simulations shard across cohorts of consumer and datacenter GPUs, giving labs elastic, supercomputer-class capacity billed at 8 PYRX/CU without a cluster allocation.",
      },
      {
        feature: "ComputeReceipt reproducibility",
        how: "Each run emits a receipt pinning the code, inputs, seeds, and environment, so a result can be independently re-executed and verified — the missing link for reproducible science.",
      },
      {
        feature: "Compute-to-data collaboration",
        how: "Institutions run shared models against each other's private datasets in place, enabling federated genomics or multi-site trials with no raw data ever leaving its owner.",
      },
      {
        feature: "Content-addressed data & code",
        how: "Datasets, containers, and analysis code are addressed by hash, giving every paper an immutable, citable, verifiable computational artifact.",
      },
      {
        feature: "Escrow-metered grant spend",
        how: "Grant funds escrow per job and release against verified receipts, producing a transparent, auditable trail of exactly what compute each result cost.",
      },
    ],
    dapps: [
      { name: "SimGrid", desc: "Elastic HPC broker that shards simulations across pooled GPUs and bills per verified CU.", tags: ["NEURAX", "Scheduler"] },
      { name: "ReproPaper", desc: "Reproducibility registry pairing each publication with a ComputeReceipt and content-addressed artifact.", tags: ["ComputeReceipt", "Storage"] },
      { name: "FedGenome", desc: "Federated genomics platform that runs models across hospitals' private cohorts via compute-to-data.", tags: ["Compute-to-data", "Shielded"] },
      { name: "GrantLedger", desc: "Grant-management dApp that escrows funds per run and produces an auditable compute-spend trail.", tags: ["Escrow", "Gov"] },
      { name: "MolSearch", desc: "Distributed drug-discovery screen that fans docking jobs across the NEURAX pool.", tags: ["NEURAX", "Scheduler"] },
      { name: "ClimateProof", desc: "Climate-model runner that publishes ZK-verifiable results others can trust without re-running.", tags: ["ZK", "ComputeReceipt"] },
      { name: "PeerCompute", desc: "Idle-cluster sharing network where research groups trade unused GPU-hours peer-to-peer.", tags: ["NEURAX", "Escrow"] },
      { name: "DataCite", desc: "Content-addressed dataset citation service giving every corpus an immutable, verifiable reference.", tags: ["Storage", "EVM"] },
    ],
  },

  "edge-computing": {
    overview:
      "Edge computing pushes processing to where data is produced — factories, vehicles, retail, telco towers — to cut latency and bandwidth, but it fragments trust across thousands of unmanaged nodes that must coordinate, pay each other, and prove their work. PYRAX is the coordination layer: NEURAX's local-first runtime turns consumer-GPU edge nodes into verifiable workers, machine identity and BLS finality secure and settle their interactions, and ComputeReceipts prove each edge job ran as specified.",
    marketSize: "$16.5B (2024)",
    projection: "$156B by 2030 · ~37% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Edge computing market (2024)", value: "$16.5B" },
      { label: "Enterprise data processed at the edge (2025)", value: "~75%" },
      { label: "Edge devices deployed", value: "billions" },
      { label: "Latency-critical AI use cases", value: "growing fast" },
    ],
    painPoints: [
      "Edge nodes are numerous, untrusted, and physically exposed — hard to authenticate and coordinate.",
      "There is no native way for edge nodes to transact and settle compute with each other.",
      "Results from a remote edge worker can't be verified without shipping data back to the cloud.",
      "Sensitive edge data (faces, plates, medical signals) must not be centralized for processing.",
    ],
    solutions: [
      {
        feature: "NEURAX local-first runtime",
        how: "The RTX 3060-baseline runtime turns any edge box into a verifiable worker, so inference runs on-site at low latency while still being metered and receipted.",
      },
      {
        feature: "Machine identity + BLS finality",
        how: "Every edge node has a cryptographic identity and its transactions finalize instantly, enabling secure, real-time coordination and settlement among untrusted nodes.",
      },
      {
        feature: "ComputeReceipt at the edge",
        how: "Each edge job emits a receipt, so a central operator can verify what ran on a remote node without pulling the raw data back to the cloud.",
      },
      {
        feature: "Micro-payments for edge compute",
        how: "Nodes buy and sell spare cycles in tiny PYRX amounts, forming a local compute market that reallocates capacity to wherever demand spikes.",
      },
      {
        feature: "Shielded transfers + viewing keys",
        how: "Sensitive edge data and payments stay private on-chain, with viewing keys giving operators scoped, auditable oversight of a specific node's activity.",
      },
    ],
    dapps: [
      { name: "EdgeWorker", desc: "Local-first NEURAX client that turns an on-site GPU box into a metered, receipted inference node.", tags: ["NEURAX", "Edge"] },
      { name: "NodeMesh", desc: "Peer market where edge nodes buy and sell spare cycles with instant-finality micro-payments.", tags: ["Edge", "Finality"] },
      { name: "FactoryVision", desc: "On-premises defect-detection dApp that runs vision models locally and receipts each inspection.", tags: ["NEURAX", "ComputeReceipt"] },
      { name: "TowerCompute", desc: "Telco-edge compute market that places latency-critical AI at the nearest tower node.", tags: ["Edge", "Scheduler"] },
      { name: "PrivacyCam", desc: "Edge camera pipeline that processes faces/plates locally and only shares shielded, viewing-key-scoped results.", tags: ["Shielded", "Edge"] },
      { name: "AutoCoord", desc: "Vehicle-to-infrastructure coordinator that settles right-of-way and services with signed finality.", tags: ["Identity", "Finality"] },
      { name: "RetailEdge", desc: "In-store analytics node that runs inventory and footfall models on-prem with receipted spend.", tags: ["NEURAX", "IoT"] },
      { name: "FailoverGrid", desc: "Resilience mesh that reroutes edge workloads to healthy nodes and proves each handoff.", tags: ["Edge", "ComputeReceipt"] },
    ],
  },

  "synthetic-data": {
    overview:
      "Synthetic data generates artificial datasets that mirror the statistics of real data without exposing real individuals, and it is fast becoming essential as real-world training data grows scarce and privacy-constrained. PYRAX makes synthetic data trustworthy and monetizable: NEURAX runs generation as a receipted compute job, compute-to-data lets generators learn from private source data without copying it, and eth_getProof anchors provenance so buyers can prove a synthetic set's origin, quality, and privacy guarantees.",
    marketSize: "$0.4B (2024)",
    projection: "$8.9B by 2030 · ~61% CAGR",
    source: "MarketsandMarkets, 2024",
    stats: [
      { label: "Synthetic data market (2024)", value: "$0.4B" },
      { label: "AI training data that will be synthetic (2030)", value: "60%+" },
      { label: "Gartner-forecast synthetic dominance", value: "by 2026" },
      { label: "Privacy-blocked real datasets", value: "widespread" },
    ],
    painPoints: [
      "High-quality real training data is running out and is increasingly restricted by privacy law and copyright.",
      "Generators must see sensitive real data to learn its distribution, recreating the privacy risk.",
      "Buyers cannot verify a synthetic set's provenance, fidelity, or that it truly protects real individuals.",
      "Bias and leakage in synthetic data are hard to detect and prove after generation.",
    ],
    solutions: [
      {
        feature: "Compute-to-data generation",
        how: "Generators learn a distribution by running against private source data in place, so real records are never copied out and the synthetic output carries no raw personal data.",
      },
      {
        feature: "NEURAX receipted generation jobs",
        how: "Each synthetic dataset is produced as a metered NEURAX job bound to a ComputeReceipt, so its exact model, config, and source-in-place run are recorded and reproducible.",
      },
      {
        feature: "eth_getProof provenance & guarantees",
        how: "Fidelity scores, privacy parameters, and lineage are committed to provable state, letting buyers independently verify a set's quality and its differential-privacy claims.",
      },
      {
        feature: "4-rung verification of quality",
        how: "Quality and leakage checks can be re-executed by independent workers or ZK-proven, replacing a vendor's self-graded fidelity report with verifiable evidence.",
      },
      {
        feature: "Escrow + programmable licensing",
        how: "Buyers escrow PYRX and pay against a verified receipt, while multi-VM contracts enforce usage terms and route royalties to the source-data contributors.",
      },
    ],
    dapps: [
      { name: "SynthForge", desc: "Compute-to-data generator that learns from private sources in place and receipts every synthetic set.", tags: ["Compute-to-data", "NEURAX"] },
      { name: "FidelityProof", desc: "Quality oracle that re-executes fidelity and leakage checks and publishes verifiable scores.", tags: ["ZK", "ComputeReceipt"] },
      { name: "SynthMarket", desc: "Marketplace for verified synthetic datasets with escrow settlement and provenance proofs.", tags: ["Escrow", "Storage"] },
      { name: "PrivacyBudget", desc: "Differential-privacy manager that tracks and proves the epsilon spent generating each dataset.", tags: ["Shielded", "Gov"] },
      { name: "SourceRoyalty", desc: "Contract that pays real-data contributors a royalty each time synthetic derivatives are licensed.", tags: ["EVM", "Compute-to-data"] },
      { name: "BiasAudit", desc: "Verifiable fairness auditor that proves a synthetic set's bias profile to buyers and regulators.", tags: ["NEURAX", "ZK"] },
      { name: "EdgeSynth", desc: "On-device synthetic generation for edge nodes that keeps sensitive source data fully local.", tags: ["Edge", "Shielded"] },
      { name: "TwinGen", desc: "Digital-twin data factory that generates simulation datasets with receipted, reproducible runs.", tags: ["NEURAX", "ComputeReceipt"] },
    ],
  },
};
