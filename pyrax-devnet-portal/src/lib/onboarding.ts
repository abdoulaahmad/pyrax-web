// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Onboarding system constants, enums, and validation utilities for DevNet Portal V2.

import type { Mission, OnboardingStatus, TestingPhase } from '../types/onboarding';
import lesson1Content from './content/lesson_1.json';
import lesson2Content from './content/lesson_2.json';
import lesson3Content from './content/lesson_3.json';
import lesson4Content from './content/lesson_4.json';
import lesson5Content from './content/lesson_5.json';

// ---- Onboarding States ----
export const ONBOARDING_STATES = {
  REGISTERED: 'REGISTERED',
  PROFILE_COMPLETE: 'PROFILE_COMPLETE',
  TRAINING: 'TRAINING',
  QUIZ: 'QUIZ',
  CERTIFIED: 'CERTIFIED',
  NODE_DOWNLOAD: 'NODE_DOWNLOAD',
  NODE_PAIRED: 'NODE_PAIRED',
  TESTING: 'TESTING',
  COMPLETED: 'COMPLETED',
} as const;

export type OnboardingStateKey = keyof typeof ONBOARDING_STATES;

// State progression order for validation
export const STATE_ORDER: OnboardingStatus[] = [
  'REGISTERED',
  'PROFILE_COMPLETE',
  'TRAINING',
  'QUIZ',
  'CERTIFIED',
  'NODE_DOWNLOAD',
  'NODE_PAIRED',
  'TESTING',
  'COMPLETED',
];

// ---- Training Modules ----
export const TRAINING_MODULES = [
  {
    id: 'lesson_1',
    title: 'DevNet Introduction & Economics',
    lesson_order: 1,
    required_for_cert: true,
    content: lesson1Content,
  },
  {
    id: 'lesson_2',
    title: 'Node Architecture & Security',
    lesson_order: 2,
    required_for_cert: true,
    content: lesson2Content,
  },
  {
    id: 'lesson_3',
    title: 'Consensus Mechanisms & Mining',
    lesson_order: 3,
    required_for_cert: true,
    content: lesson3Content,
  },
  {
    id: 'lesson_4',
    title: 'Diagnostics & Troubleshooting',
    lesson_order: 4,
    required_for_cert: true,
    content: lesson4Content,
  },
  {
    id: 'lesson_5',
    title: 'Incident Reporting & Best Practices',
    lesson_order: 5,
    required_for_cert: true,
    content: lesson5Content,
  },
] as const;

export const TRAINING_MODULES_COUNT = TRAINING_MODULES.length;

// ---- Quiz Configuration ----
export const QUIZ_PASSING_SCORE = 80; // percentage
export const QUIZ_QUESTIONS_PER_ATTEMPT = 20;
// `: number`, not an inferred literal `3` — the call sites legitimately test `=== 0` to detect the
// documented "unlimited" setting, and a literal type makes that comparison a type error.
export const QUIZ_MAX_RETRIES: number = 3; // unlimited if 0

// Quiz questions seed data (will be stored in DB, but initialized with these)
export const QUIZ_QUESTIONS_SEED = [
  { question: "Which of the following best describes the PYRAX TriStream Consensus mechanism?", options: ["A single Proof-of-Work stream that all miners compete in equally","Three independent streams: ASIC mining, CPU/GPU mining, and PoS validation, each receiving 33.3% of block rewards","A pure Proof-of-Stake system where validators vote on blocks by staking tokens","A delegated system where the PYRAX team selects which nodes produce blocks"], correct_answer: 1, explanation: "TriStream runs three independent streams simultaneously: Stream A (ASIC mining with BLAKE3 and SHA-256), Stream B (CPU/GPU mining with KAWPOW and RandomX plus an AI processing pool), and Stream C (PoS validation). Each stream receives exactly 33.3% of block rewards, preventing any single group from dominating the network." },
  { question: "A tester's node achieves 92% uptime for the month. How much PYRX do they earn from the uptime reward alone?", options: ["24,000 PYRX — they are above 90% so they qualify for the highest tier","0 PYRX — they did not hit the 98% threshold required for any reward","16,000 PYRX — they fall in the 90-97.99% uptime tier","10,000 PYRX — the system rounds down to the nearest tier boundary"], correct_answer: 2, explanation: "The uptime reward is tiered. 90-97.99% uptime earns 16,000 PYRX per month. The 24,000 PYRX tier requires 98% or above. The 10,000 PYRX tier applies to 75-89.99% uptime. Only the best single node per account is counted." },
  { question: "A tester discovers a critical consensus vulnerability and submits an exceptionally well-documented report with step-by-step reproduction instructions. What is their total bug bounty?", options: ["48,000 PYRX — the base critical severity bounty only","60,000 PYRX — 48,000 base plus the 25% reproduction quality bonus","20,000 PYRX — critical bugs are capped at the high severity rate for external testers","8,000 PYRX — all bug bounties pay the same base rate regardless of severity"], correct_answer: 1, explanation: "Critical severity = 48,000 PYRX base. Excellent reproduction steps earn a +25% reproduction quality bonus, adding 12,000 PYRX. Total: 60,000 PYRX. The reproduction bonus applies across all severity levels." },
  { question: "What happens to the DevNet PYRX a tester earns throughout the testing programme?", options: ["It is deposited immediately to the mainnet wallet address provided during registration","It accumulates as a server-side allocation and is delivered via the mainnet airdrop when PYRAX launches","It can be withdrawn monthly once a tester reaches Silver contribution tier","It expires if not claimed within 90 days of each reward calculation period"], correct_answer: 1, explanation: "DevNet PYRX is never paid out during DevNet. It accumulates as a tracked server-side allocation and is delivered via the mainnet airdrop at launch. The allocation survives DevNet resets. Nothing is paid until mainnet and there is no early withdrawal mechanism." },
  { question: "Which of the following actions would directly violate the DevNet tester agreement?", options: ["Submitting a node crash report through the Issue Council with the full node log and version number attached","Running the node on a dedicated home server with auto-restart configured via systemd","Sharing your portal login credentials with a friend so they can run a node under your account","Updating your node to the latest version within the 72-hour on-time window after a new release"], correct_answer: 2, explanation: "DevNet access is bound to your individual approved tester identity. Sharing credentials allows another person to participate without approval, violating the tester agreement and risking both accounts being banned with all PYRX allocations forfeited. All three of the other options are correct and encouraged behaviour." },
  { question: "Which component of a PYRAX node is responsible for validating incoming blocks and maintaining the local state database?", options: ["The RPC Interface, which handles all incoming block data via HTTP","The Core Daemon (pyraxd), which syncs the blockchain and enforces consensus rules","The Consensus Engine alone, which operates as a separate process from the daemon","The DHT Client, which coordinates block delivery from peers"], correct_answer: 1, explanation: "The Core Daemon (pyraxd) is the primary process. It syncs the chain, validates blocks against the TriStream Consensus rules, and maintains the state database. The Consensus Engine is embedded within it, not a separate process. The RPC Interface is for querying — not block validation." },
  { question: "A tester wants to store their node's keystore file for backup. Which of the following is safe?", options: ["Uploading it to Google Drive so it can be restored if the machine dies","Committing it to a private GitHub repository with a strong access token","Storing an encrypted copy on an offline USB drive kept in a secure physical location","Emailing it to their own email address as an attachment"], correct_answer: 2, explanation: "The keystore file must never be placed in cloud storage, version control, or transmitted over email — even to yourself. An encrypted offline backup on a physically secured USB drive is the correct approach. Cloud and email backups expose the file to network-based attack vectors." },
  { question: "What happens during the 'Peer Discovery' stage of the node lifecycle?", options: ["The node downloads and verifies the genesis block for the first time","The node connects to the Dynamic Intelligent Mesh Network to find active peers via the DHT","The node receives new blocks and broadcasts its PoS votes in steady state","The node generates a new private key and keystore file"], correct_answer: 1, explanation: "Peer Discovery is the second stage of the node lifecycle. The node connects to the PYRAX P2P mesh using the DHT (Distributed Hash Table) to locate and connect to active peers. Genesis Sync (downloading the genesis block) is the first stage and only happens once. Steady State is the fourth stage." },
  { question: "Which ports should be open on a node machine running in default configuration?", options: ["All ports should be open to ensure peer connectivity","Only port 443 (HTTPS) and port 22 (SSH) for remote management","Port 30303 (P2P TCP/UDP) and RPC port 8545 only if needed externally — all others blocked","Port 80 (HTTP) so the node's web dashboard is accessible from the internet"], correct_answer: 2, explanation: "A correctly hardened node only opens what it needs: port 30303 (TCP and UDP) for peer-to-peer connectivity. The RPC port 8545 should only be opened externally if you specifically need remote tooling access — otherwise it should be restricted to localhost. All other ports should be blocked by the firewall." },
  { question: "A tester suspects their private key has been compromised. What is the correct immediate action?", options: ["Generate a new private key and continue running — the old key will expire automatically","Delete the keystore file and reinstall the node software to remove the threat","Contact the DevNet team immediately via the portal so they can blacklist the compromised node address from the reward ledger","Wait to see if any unauthorized transactions appear before taking action"], correct_answer: 2, explanation: "There is no automatic key recovery or expiry in PYRAX. If you suspect compromise, the only protective action is to notify the DevNet team immediately so they can blacklist the compromised node address from the reward ledger before the mainnet airdrop. Waiting, reinstalling, or generating a new key alone does not protect the accrued PYRX allocation." },
  { question: "A PYRAX block reaches 'finality' when which condition is met?", options: ["When Stream A (ASIC miners) produce the block with the most accumulated proof-of-work","When a supermajority (67%+) of staked PYRX in Stream C votes to confirm the block","When the block has been in the chain for more than 6 subsequent blocks","When both Stream A and Stream B produce identical block proposals"], correct_answer: 1, explanation: "Finality in PYRAX requires a supermajority PoS vote from Stream C validators — specifically 67%+ of staked weight. Once reached, the block is irreversible. It is not based on accumulated PoW depth (like Bitcoin's 6-block rule) or on matching proposals between streams." },
  { question: "A tester notices in their node logs that a fork has occurred. After how many unresolved blocks should they file a high-severity incident report?", options: ["Immediately — any fork is a critical incident requiring an instant report","After 1 block — forks should never occur on a healthy network","After 3 to 5 blocks — if the fork has not resolved by then, it is a reportable anomaly","After 20 blocks — the network always self-resolves within that window"], correct_answer: 2, explanation: "Temporary forks are a normal part of TriStream consensus since Streams A and B produce competing proposals simultaneously. Stream C resolves these by voting on the canonical tip. A fork not resolved within 3–5 blocks is anomalous and should be reported as a high-severity incident." },
  { question: "What is the primary purpose of Stream B (CPU/GPU Mining) in the TriStream model?", options: ["To provide computational security by making fraudulent blocks expensive to produce","To aggregate PoS votes from validators and enforce finality","To ensure the network remains accessible to commodity hardware and prevent ASIC dominance","To batch Layer 3 transactions and settle ZK proofs on Layer 1"], correct_answer: 2, explanation: "Stream B (KAWPOW and RandomX) is specifically designed to keep block production accessible to CPU and GPU miners, preventing ASICs from monopolising the network. Stream A provides the PoW computational security. Stream C handles PoS finality. ZK Rollup settlement is a Layer 3 function." },
  { question: "A DevNet tester running a PoS validator node intentionally double-signs to test how the network reacts. What is the consequence?", options: ["Nothing — double-signing is allowed during DevNet for testing purposes","The node is temporarily disconnected from peers but reconnects automatically","The validator's accrued DevNet PYRX rewards are slashed","The validator is issued a warning but keeps all rewards"], correct_answer: 2, explanation: "Double-signing (voting for two competing blocks at the same height) is a slashable offence. On DevNet, this results in slashing of accrued PYRX rewards. It is NOT a permitted test action — intentional consensus interference is a critical protocol violation that can result in removal from the programme." },
  { question: "A hard fork (consensus rule change) is released. A validator fails to upgrade within the required window. What happens to their votes?", options: ["Their votes are still counted — the network is backwards-compatible","Their votes are rejected by upgraded peers, effectively removing them from the active validator set","They are automatically upgraded by the network without any action required","Their stake is returned and they must re-register as a validator"], correct_answer: 1, explanation: "After a hard fork, all upgraded peers enforce the new consensus rules. Votes from non-upgraded validators do not conform to the new rules and are therefore rejected. This effectively removes them from the active validator set until they upgrade. Upgrade compliance is mandatory within 72 hours of a release." },
  { question: "A tester's node has not imported a new block for 8 minutes. The first diagnostic step is to check which of the following?", options: ["Restart the node immediately without any further investigation","File a Critical incident report straight away","Check peer count using pyrax attach --exec 'net.peerCount' to determine if there is a connectivity problem","Increase the maxpeers setting in pyrax.conf as the first action"], correct_answer: 2, explanation: "The first step when a node stops syncing is to check peer count. Zero peers means a connectivity or firewall issue. Only if the peer count is healthy (and the node still isn't syncing) should you proceed to check disk space, restart the daemon, or file a report. Restarting blindly before diagnosing is a common mistake." },
  { question: "Which log level should you filter for to monitor only serious failures in real time?", options: ["DEBUG — because it captures the most detail and helps find the root cause faster","INFO — because it shows all normal block imports and peer connections","ERROR, FATAL, and PANIC — because these indicate component failures and crashes","WARN — because warnings always precede fatal failures and give early notice"], correct_answer: 2, explanation: "ERROR, FATAL, and PANIC log levels indicate actual failures. DEBUG provides excessive volume and should only be used for specific tracing. INFO is for normal health monitoring. WARN messages are worth noting but represent automatic recoveries — they do not always precede fatal failures." },
  { question: "A node's log shows a PANIC entry followed by a stack trace, and the process has exited. What must the incident report include?", options: ["Only the date and time of the crash — the engineering team can find the rest","The full stack trace, exact node version, and block height at the time of the crash","A screenshot of the terminal and the tester's hardware specifications","A description of what the tester was doing on a different computer at the time"], correct_answer: 1, explanation: "A PANIC is a high-severity crash. To reproduce and fix it, engineering needs: the full stack trace (exact error path), the node version (so they can locate the code), and the block height (to identify if a specific block triggered the crash). Without these, the report cannot be actioned." },
  { question: "A tester wants to check what process is using port 30303 on a Linux machine. Which command is correct?", options: ["ping 30303","ps aux | grep pyraxd","netstat -tulpn | grep 30303","systemctl status 30303"], correct_answer: 2, explanation: "netstat -tulpn | grep 30303 lists all listening ports and filters for 30303, showing which process is bound to it. ping is for host reachability. ps aux lists processes by name, not port. systemctl status requires a service name, not a port number." },
  { question: "DEBUG logging is left enabled on a tester's node for a week. What is the most likely problem this causes?", options: ["The node runs faster because it processes fewer consensus messages","The node generates gigabytes of log data, which can fill the disk and cause the node to stop syncing","DEBUG logging has no side effects — it is safe to leave enabled indefinitely","It causes the node to reconnect to peers more frequently"], correct_answer: 1, explanation: "DEBUG logging is extremely verbose and generates massive log files very quickly. If the disk fills up, the node cannot write new block data and will stop syncing (showing an OUT OF DISK log entry). Always use INFO level for production-like operation, and only switch to DEBUG temporarily when tracing a specific issue." },
  { question: "A tester discovers their node is producing blocks that are being rejected by all peers. How should this be classified and when should it be reported?", options: ["Low severity — report in the next session since the network is self-correcting the issue","Medium severity — report within 24 hours after observing the pattern consistently","Critical severity — report immediately via the Issue Council","High severity — report within 2 hours after gathering a full stack trace"], correct_answer: 2, explanation: "A node producing invalid blocks that are universally rejected by peers is a Critical severity event — it indicates a potential consensus vulnerability or a bug that could affect network integrity. This must be reported immediately via the Issue Council, not after gathering more data." },
  { question: "Which of the following is a mandatory element in every incident report?", options: ["A screenshot of the terminal window showing the error","The tester's IP address and ISP information","The exact node version obtained by running pyraxd --version","A video recording of the issue occurring in real time"], correct_answer: 2, explanation: "The exact node version (from pyraxd --version) is mandatory because engineers use it to locate the precise code that produced the error. Screenshots are not acceptable substitutes for raw log text. IP address and videos are not required fields in the standard report template." },
  { question: "Why is it prohibited to report bugs by directly messaging developers on Discord or Telegram?", options: ["Developers are not permitted to use those platforms for work communication","Direct messages do not create a trackable record, do not trigger reward accounting, and cannot be triaged or assigned by the engineering team","The response time for direct messages is faster, which the team wants to avoid","Discord and Telegram are not encrypted, so bug details would be publicly visible"], correct_answer: 1, explanation: "The Issue Council is the only reportin channel because it creates an auditable, trackable record, triggers the PYRX reward accounting system, and allows engineering to triage and assign issues. Direct messages are informal and cannot be tracked, meaning they may be lost and will not generate any rewards." },
  { question: "A report is submitted that says only: 'My node crashed. Please fix.' What is the most likely outcome?", options: ["It is accepted and the team will ask follow-up questions to gather the missing details","It is rejected because it lacks the node version, log extract, block height, and reproduction steps","It earns a reduced PYRX reward since partial information is still useful","It is escalated to Critical severity because crashes are always high-priority"], correct_answer: 1, explanation: "Reports without a node version, log extract, block height, and reproduction steps are rejected and earn no PYRX. The engineering team cannot action a report without these fundamentals. The review team does not follow up to gather missing information — the responsibility is on the tester to submit complete reports." },
  { question: "A tester notices a stress test campaign is in progress. They observe interesting behaviour but decide to wait until the campaign ends to write their report. Is this correct?", options: ["Yes — final reports are more valuable because they summarise the full picture","No — observations should be documented throughout the campaign, and the report submitted within 48 hours of campaign end, not delayed indefinitely","Yes — submitting during a campaign can interfere with the test conditions","No — reports must be submitted within 1 hour of observing any event during a stress test"], correct_answer: 1, explanation: "During stress test campaigns you should document observations throughout — not just at the end. The submission deadline is within 48 hours of campaign end. Waiting indefinitely risks forgetting critical timestamps and transaction counts. Submitting during the campaign does not interfere with test conditions." },
  { question: "Which runtimes are simultaneously supported by the PYRAX Layer 2 sidechain?", options: ["EVM, WASM, and Cairo","EVM only","WASM and BPF","Solidity and Vyper"], correct_answer: 0, explanation: "Layer 2 supports EVM, WASM (Rust/AssemblyScript), and Cairo (ZK-STARK) contract runtimes simultaneously." },
  { question: "What is the primary function of Layer 3 in the PYRAX architecture?", options: ["Basic block settlement","Handling high-throughput transactions and AI job processing via ZK Rollups","Storing historical state","P2P peer discovery"], correct_answer: 1, explanation: "Layer 3 (ZK Rollup) is responsible for handling high-throughput transactions and AI job processing." },
  { question: "How much storage and RAM is required for a standard Full Node?", options: ["100+ GB storage, 8+ GB RAM","1 GB storage, 2 GB RAM","1000+ GB storage, 32+ GB RAM","No storage required"], correct_answer: 0, explanation: "A Full Node, which is the standard for testers, requires 100+ GB of storage and 8+ GB of RAM." },
  { question: "What specific criteria must be met to earn the 'Founding Tester' title?", options: ["Be one of the first 150 approved testers","Be one of the first 10 testers to successfully pair a node","Achieve 98%+ uptime for 3 months","Find a critical consensus bug"], correct_answer: 1, explanation: "The first 150 approved testers become Foundational Pioneers, but only the first 10 to pair a node earn the Founding Tester title and a 50,000 PYRX bonus." },
  { question: "What happens to your PYRX allocation tracking when the DevNet is reset?", options: ["It is wiped completely along with on-chain data","It survives all resets and is tracked server-side","It is halved","You must email support to restore it"], correct_answer: 1, explanation: "While on-chain data and pairing records are wiped during resets, your PYRX allocation tracking survives." },
  { question: "What is the Consistency Multiplier for uptime rewards and how is it earned?", options: ["1.5x multiplier for 100% uptime","1.2x multiplier for 95%+ uptime, all updates on time, and 1+ accepted report","2x multiplier for running two nodes","1.1x multiplier for daily logins"], correct_answer: 1, explanation: "The Consistency Multiplier is 1.2x and requires 95%+ uptime, all updates on time, and at least 1 accepted report." },
  { question: "What is the base reward for submitting a Medium severity bug (DoS vectors)?", options: ["48,000 PYRX","20,000 PYRX","8,000 PYRX","2,400 PYRX"], correct_answer: 2, explanation: "Medium severity bugs (like DoS vectors) earn a base reward of 8,000 PYRX." },
  { question: "What is the requirement to reach the Gold contribution tier?", options: ["0+ PYRX","50k+ PYRX","200k+ PYRX","750k+ PYRX"], correct_answer: 2, explanation: "The Gold contribution tier requires accumulating 200,000+ PYRX." },
  { question: "If a tester runs multiple nodes on different machines using the same DevNet account, how is their uptime calculated?", options: ["The uptime of all nodes is added together","Only the best single node per account is counted","The average uptime is calculated","The account is banned for running multiple nodes"], correct_answer: 1, explanation: "Only the best single node per account earns rewards; running multiple does not compound rewards." },
  { question: "Which cryptographic algorithms are used by Stream A (ASIC Mining)?", options: ["KAWPOW and RandomX","BLAKE3 and SHA-256","Keccak-256 only","Ed25519"], correct_answer: 1, explanation: "Stream A uses BLAKE3 and SHA-256 for raw hash-rate security." },
  { question: "How can idle GPUs in Stream B earn additional PYRX?", options: ["By mining Bitcoin","By joining the AI Processing Pool for inference tasks","By staking tokens","By hosting a block explorer"], correct_answer: 1, explanation: "Idle GPU compute in Stream B can join the AI Processing Pool to earn PYRX for inference tasks." },
  { question: "What is the block time for the Layer 1 TriStream Blockchain?", options: ["~10 seconds","~60 seconds","~10 minutes","Instantaneous"], correct_answer: 1, explanation: "The base settlement layer (Layer 1) has ~60s block times." },
  { question: "A tester discovers their node crashed due to an 'OUT OF DISK' error. What is the most likely cause?", options: ["They opened port 8545 to the public","They left DEBUG logging enabled for an extended period","They double-signed a block","Their internet connection dropped"], correct_answer: 1, explanation: "DEBUG logging generates massive amounts of data very quickly and can easily fill a disk." },
  { question: "If you fail to update your node within 72 hours of a new release, what is the most severe consequence?", options: ["You lose the 3,000 PYRX on-time bonus","Your node may fork away from consensus and your PoS votes will be rejected by upgraded peers","Your IP address is banned","Your account is deleted"], correct_answer: 1, explanation: "While you lose the bonus, the more severe consequence is falling out of consensus and having your votes rejected." },
  { question: "How are temporary forks typically resolved in the PYRAX network?", options: ["Stream A miners dictate the longest chain","Stream C validators vote on the canonical tip to resolve competing proposals from Streams A and B","The DevNet admins manually intervene","The node with the highest uptime wins"], correct_answer: 1, explanation: "Stream C resolves forks by voting on the canonical tip when Streams A and B produce competing proposals." },
  { question: "What happens if a tester submits a fabricated bug report?", options: ["They receive a warning","Their report is ignored","Immediate removal from the programme and forfeiture of all accrued PYRX","They lose 10,000 PYRX"], correct_answer: 2, explanation: "Fabricated reports, sharing credentials, or running multiple accounts results in immediate removal and forfeiture of all PYRX." },
  { question: "Which node type stores all historical state of the blockchain?", options: ["Light Node","Mining Node","Archive Node","Full Node"], correct_answer: 2, explanation: "Archive Nodes store all historical state, whereas Full Nodes only store the pruned active state necessary for validation." },
  { question: "What happens if a tester uses the DevNet as a staging environment for production apps?", options: ["It is encouraged for testing","It violates the rule that DevNet is NOT for production apps since data will be reset","They earn bonus PYRX","Their transactions are prioritized"], correct_answer: 1, explanation: "DevNet is not a staging environment for production apps because it is isolated and resets periodically." },
  { question: "What is the penalty for a PoS validator double-signing a block?", options: ["A warning email","Temporary network ban","Slashing of staked or accrued PYRX rewards","Nothing"], correct_answer: 2, explanation: "Double-signing is a malicious act that results in slashing." },
  { question: "What constitutes a 'qualifying week' for the Consistency Bonus?", options: ["Logging into the portal every day","3+ accepted test submissions OR 2+ issue reports with a 60%+ acceptance rate","98% uptime","Finding at least one critical bug"], correct_answer: 1, explanation: "A qualifying week requires 3+ accepted test submissions or 2+ issue reports with a 60%+ acceptance rate." },
  { question: "What must a tester do before participating in a stress testing campaign?", options: ["Wait for an email invitation","Ensure their node is paired and fully synchronized","Upgrade to an Archive node","Open all firewall ports"], correct_answer: 1, explanation: "Nodes must be paired and fully synchronized before they can meaningfully participate in stress tests." },
  { question: "When reporting a node crash, why is the exact block height crucial?", options: ["To calculate the reward amount","So engineers can determine if a specific block payload triggered the crash","To prove the node was online","It is not crucial"], correct_answer: 1, explanation: "Block height helps identify if a malformed transaction or specific consensus state at that height triggered the crash." },
  { question: "What is the reference price of $0.0025 for DevNet PYRX?", options: ["The price you can sell it for today","The price you must pay to join","Purely illustrative; DevNet PYRX currently has zero real-world monetary value","The guaranteed mainnet launch price"], correct_answer: 2, explanation: "The reference price is purely illustrative. DevNet PYRX has no monetary value." },
  { question: "Why should you NOT run your node on your primary workstation?", options: ["It will slow down your internet","Nodes require a dedicated environment to maximize uptime and security","It is illegal","It voids your warranty"], correct_answer: 1, explanation: "Nodes need a dedicated, stable environment to maximize uptime, which a primary workstation cannot guarantee." },
  { question: "What is the consequence of failing to include reproduction steps in a high-severity bug report?", options: ["The report is escalated to a developer to investigate manually","The report is rejected and earns no PYRX","You still receive the base reward but lose the bonus","The issue council automatically generates them"], correct_answer: 1, explanation: "Reports lacking required information like reproduction steps are rejected and earn no PYRX." }
] as const;

// ---- Missions ----
export const MISSIONS_SEED: Omit<Mission, 'id' | 'created_at'>[] = [
  {
    mission_number: 1,
    title: 'Complete Profile',
    description: 'Fill out your profile with your display name, handle, and payout wallet.',
    prerequisites: [],
    completion_criteria: { display_name: true, handle: true, payout_wallet: true },
    unlock_conditions: { profile_complete: true },
  },
  {
    mission_number: 2,
    title: 'Complete Training',
    description: 'Complete all 5 training modules: DevNet Intro, Node Fundamentals, Mining Rules, Consensus Basics, and Incident Reporting.',
    prerequisites: [1],
    completion_criteria: { all_lessons_completed: true },
    unlock_conditions: { training_completed: true },
  },
  {
    mission_number: 3,
    title: 'Pass Certification Quiz',
    description: 'Pass the certification quiz with a score of 80% or higher.',
    prerequisites: [2],
    completion_criteria: { quiz_passed: true, score_gte: 80 },
    unlock_conditions: { certified: true },
  },
  {
    mission_number: 4,
    title: 'Download Node Application',
    description: 'Download the node application for your platform (Windows, macOS, or Linux).',
    prerequisites: [3],
    completion_criteria: { node_downloaded: true },
    unlock_conditions: { node_downloaded: true },
  },
];

// ---- Testing Phases ----
export const TESTING_PHASES_SEED: Omit<TestingPhase, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    phase_name: 'Registration',
    phase_order: 1,
    objectives: [{ goal: 'Complete profile and accept terms' }],
    start_date: Date.now(),
    end_date: null,
  },
  {
    phase_name: 'Training',
    phase_order: 2,
    objectives: [{ goal: 'Complete all training modules' }],
    start_date: Date.now(),
    end_date: null,
  },
  {
    phase_name: 'Certification',
    phase_order: 3,
    objectives: [{ goal: 'Pass certification quiz with 80%+' }],
    start_date: Date.now(),
    end_date: null,
  },
  {
    phase_name: 'Node Installation',
    phase_order: 4,
    objectives: [{ goal: 'Download and install node application' }],
    start_date: Date.now(),
    end_date: null,
  },
  {
    phase_name: 'Node Pairing',
    phase_order: 5,
    objectives: [{ goal: 'Pair node with account' }],
    start_date: Date.now(),
    end_date: null,
  },
  {
    phase_name: 'Synchronization',
    phase_order: 6,
    objectives: [{ goal: 'Keep node synchronized with network' }],
    start_date: Date.now(),
    end_date: null,
  },
  {
    phase_name: 'Mining',
    phase_order: 7,
    objectives: [{ goal: 'Participate in mining operations' }],
    start_date: Date.now(),
    end_date: null,
  },
  {
    phase_name: 'Stress Testing',
    phase_order: 8,
    objectives: [{ goal: 'Execute stress test scenarios' }],
    start_date: Date.now(),
    end_date: null,
  },
  {
    phase_name: 'Acceptance Testing',
    phase_order: 9,
    objectives: [{ goal: 'Final validation and acceptance' }],
    start_date: Date.now(),
    end_date: null,
  },
];

// ---- Feature Flags ----
export const DEFAULT_FEATURE_FLAGS = [
  'training',
  'quiz',
  'download',
  'mining',
  'consensus_tools',
  'advanced_logs',
  'stress_testing',
] as const;

export type FeatureFlagName = typeof DEFAULT_FEATURE_FLAGS[number];

// ---- State Transition Rules ----
/** Validates if a transition from oldState to newState is allowed */
export function isValidTransition(oldState: OnboardingStatus, newState: OnboardingStatus): boolean {
  const oldIndex = STATE_ORDER.indexOf(oldState);
  const newIndex = STATE_ORDER.indexOf(newState);

  if (oldIndex === -1 || newIndex === -1) return false;

  // Allow staying in the same state
  if (oldIndex === newIndex) return true;

  // Only allow forward progression
  return newIndex === oldIndex + 1;
}

/** Get the next expected state in progression */
export function getNextState(currentState: OnboardingStatus): OnboardingStatus | null {
  const index = STATE_ORDER.indexOf(currentState);
  if (index === -1 || index === STATE_ORDER.length - 1) return null;
  return STATE_ORDER[index + 1];
}

/** Check if a user can access a feature based on their onboarding state */
export function canAccessFeatureByState(feature: FeatureFlagName, userState: OnboardingStatus): boolean {
  const stateIndex = STATE_ORDER.indexOf(userState);

  switch (feature) {
    case 'training':
      // Training available after profile complete
      return stateIndex >= STATE_ORDER.indexOf('PROFILE_COMPLETE');
    case 'quiz':
      // Quiz available after training started/completed
      return stateIndex >= STATE_ORDER.indexOf('TRAINING');
    case 'download':
      // Download available only after certified
      return stateIndex >= STATE_ORDER.indexOf('CERTIFIED');
    case 'mining':
      // Mining available after node paired
      return stateIndex >= STATE_ORDER.indexOf('NODE_PAIRED');
    case 'consensus_tools':
      // Consensus tools available after testing started
      return stateIndex >= STATE_ORDER.indexOf('TESTING');
    case 'advanced_logs':
      // Advanced logs available after node paired
      return stateIndex >= STATE_ORDER.indexOf('NODE_PAIRED');
    case 'stress_testing':
      // Stress testing available during testing phase
      return stateIndex >= STATE_ORDER.indexOf('TESTING');
    default:
      return false;
  }
}

// ---- Certification ----
export const CERTIFICATION_VALIDITY_DAYS = 365; // Certificates expire after 1 year
export const CERT_ID_PREFIX = 'CERT';

/** Generate a unique certification number */
export function generateCertificationNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${CERT_ID_PREFIX}-${timestamp}-${random}`;
}

// ---- Validation Utilities ----
export function isValidOnboardingStatus(status: string): status is OnboardingStatus {
  return STATE_ORDER.includes(status as OnboardingStatus);
}

export function isFinalState(status: OnboardingStatus): boolean {
  return status === 'COMPLETED';
}

export function isTrainingState(status: OnboardingStatus): boolean {
  return status === 'TRAINING' || status === 'QUIZ';
}

export function isCertificationRequired(status: OnboardingStatus): boolean {
  return STATE_ORDER.indexOf(status) >= STATE_ORDER.indexOf('CERTIFIED');
}

export function isNodeOperationState(status: OnboardingStatus): boolean {
  return STATE_ORDER.indexOf(status) >= STATE_ORDER.indexOf('NODE_DOWNLOAD');
}
