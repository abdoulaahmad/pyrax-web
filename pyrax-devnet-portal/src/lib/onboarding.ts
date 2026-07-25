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
export const QUIZ_MAX_RETRIES = 3; // unlimited if 0

// Quiz questions seed data (will be stored in DB, but initialized with these)
export const QUIZ_QUESTIONS_SEED = [
  { question: "What is the primary purpose of DevNet?", options: ["Production network for real transactions","Development and testing network for developers","Private network for team only","Archive of historical data"], correct_answer: 1, explanation: "DevNet is specifically designed as a development and testing environment." },
  { question: "How are testers primarily rewarded?", options: ["By paying fees","Node uptime and active participation","Referring friends","Social media posts"], correct_answer: 1, explanation: "Rewards are based on participation." },
  { question: "What is a bug bounty?", options: ["A penalty for crashing","A reward for finding and reporting security flaws","A type of node","A consensus mechanism"], correct_answer: 1, explanation: "Bug bounties reward security disclosures." },
  { question: "Are DevNet transactions permanent on the mainnet?", options: ["Yes","No, DevNet is separate","Only if approved","Sometimes"], correct_answer: 1, explanation: "DevNet is a separate network." },
  { question: "What should you do with your seed phrase?", options: ["Store it securely offline","Share it with support","Post it on Discord","Save it as a plain text file"], correct_answer: 0, explanation: "Seed phrases must be kept secure and offline." },
  { question: "Who can recover your lost private keys?", options: ["The Pyrax support team","The network admins","Only you","Anyone with your email"], correct_answer: 2, explanation: "You are solely responsible for your keys." },
  { question: "What environment is best for running a node?", options: ["A shared public computer","A secure, dedicated environment","A rooted smartphone","A smart TV"], correct_answer: 1, explanation: "Nodes need dedicated secure environments." },
  { question: "What is a soulbound certification?", options: ["A temporary badge","A transferable certificate","A non-transferable credential bound to your account","A physical certificate"], correct_answer: 2, explanation: "Soulbound tokens cannot be transferred." },
  { question: "What happens if a miner breaks the protocol rules?", options: ["They get a warning","They receive double rewards","They risk being slashed or banned","Nothing"], correct_answer: 2, explanation: "Rule breaking leads to slashing." },
  { question: "What type of finality does the Pyrax consensus aim for?", options: ["Slow finality","Fast finality","No finality","Optional finality"], correct_answer: 1, explanation: "Pyrax uses fast finality." },
  { question: "What do miners do?", options: ["They propose blocks and secure the network","They write the code","They provide customer support","They sell PYRX"], correct_answer: 0, explanation: "Miners secure the network." },
  { question: "What is the purpose of consensus?", options: ["To speed up the internet","To ensure all nodes agree on the state of the network","To mine more coins","To encrypt messages"], correct_answer: 1, explanation: "Consensus ensures agreement across the distributed network." },
  { question: "What should you do if your node crashes unexpectedly?", options: ["Ignore it","Restart it and check logs","Wait for an update","Contact the team immediately via email"], correct_answer: 1, explanation: "Always check logs first when diagnosing issues." },
  { question: "Which port typically needs to be open for the node?", options: ["80","443","30303","21"], correct_answer: 2, explanation: "30303 is the standard P2P port." },
  { question: "What log levels indicate potential issues?", options: ["INFO and DEBUG","ERROR and WARN","TRACE","SUCCESS"], correct_answer: 1, explanation: "Errors and warnings highlight problems." },
  { question: "Where should you look first if your node breaks?", options: ["Twitter","The node logs","The source code","Your router"], correct_answer: 1, explanation: "Logs provide the immediate context of the failure." },
  { question: "Where should you report node crashes?", options: ["DM developers","The Issue Council in the DevNet portal","Reddit","Email support"], correct_answer: 1, explanation: "The Issue Council is the official channel." },
  { question: "What information is critical to include in a report?", options: ["Your age","Your node version and logs","Your IP address","Your private key"], correct_answer: 1, explanation: "Logs and version help reproduce the issue." },
  { question: "Before participating in stress testing, what must you complete?", options: ["Fill out a form","Pair your node and synchronize it","Pay a fee","Get approval from 3 staff members"], correct_answer: 1, explanation: "Your node must be paired and synchronized before stress testing." },
  { question: "Should you DM developers directly with bug reports?", options: ["Yes","No, use the Issue Council","Only on weekends","If it is urgent"], correct_answer: 1, explanation: "DMs are hard to track; always use official channels." },
  { question: "What is a block explorer used for?", options: ["Mining blocks","Viewing transactions and blocks on the network","Storing private keys","Writing smart contracts"], correct_answer: 1, explanation: "Block explorers let you view the blockchain data." },
  { question: "What is a smart contract?", options: ["A legal document","Self-executing code on the blockchain","A node operator agreement","A hardware wallet"], correct_answer: 1, explanation: "Smart contracts are code deployed on the chain." },
  { question: "Why is it important to keep your node online?", options: ["To save electricity","To help maintain network stability and earn rewards","To avoid getting banned","To increase your internet speed"], correct_answer: 1, explanation: "Uptime contributes to network stability." },
  { question: "What does P2P stand for?", options: ["Pay to Play","Peer to Peer","Point to Point","Private to Public"], correct_answer: 1, explanation: "Nodes communicate in a Peer-to-Peer manner." },
  { question: "What is network latency?", options: ["The time it takes for data to travel across the network","The size of a block","The number of active nodes","The reward rate"], correct_answer: 0, explanation: "Latency refers to the delay in data transmission." },
  { question: "What does \"slashing\" refer to in network consensus?", options: ["Reducing the block size","A penalty where a validator loses a portion of their staked tokens for malicious behavior","Lowering transaction fees","Speeding up the network"], correct_answer: 1, explanation: "Slashing is a penalty for bad actors." },
  { question: "What is the minimum hardware requirement for running a basic DevNet node?", options: ["A supercomputer","A standard VPS or desktop with moderate CPU/RAM","A smartphone","A quantum computer"], correct_answer: 1, explanation: "DevNet nodes can run on standard hardware." },
  { question: "How often are Pyrax DevNet reward distributions typically processed?", options: ["Every minute","Periodically based on epochs or test phases","Once a year","Never"], correct_answer: 1, explanation: "Rewards are tallied at the end of epochs/phases." },
  { question: "What is the role of a validator in a Proof of Stake network?", options: ["To mine with GPUs","To propose and vote on blocks based on their stake","To write smart contracts","To buy PYRX on exchanges"], correct_answer: 1, explanation: "Validators vote on blocks based on stake." },
  { question: "Why might your node become \"desynchronized\"?", options: ["It was banned","It lost internet connection or fell too far behind the current block height","It has too many tokens","It is too fast"], correct_answer: 1, explanation: "Desync happens when a node falls behind the tip of the chain." },
  { question: "What should you do before updating your node software?", options: ["Delete all your files","Stop the node and back up your config/keys","Unplug your router","Sell your tokens"], correct_answer: 1, explanation: "Always stop the node and backup configs before updating." },
  { question: "How is a tester's \"Uptime Score\" calculated?", options: ["By how much money they have","By the percentage of time their node is actively syncing and responding to peers","By how many friends they invite","By how fast they click"], correct_answer: 1, explanation: "Uptime is a measure of active network participation." },
  { question: "What happens if you run two nodes with the same validator key?", options: ["You get double rewards","You will likely be slashed for double-signing or conflicting proposals","The network crashes","Nothing happens"], correct_answer: 1, explanation: "Running the same key on multiple nodes causes double-signing." },
  { question: "What is an \"Epoch\" in the context of blockchain?", options: ["A specific period of time or number of blocks used for state changes (e.g. validator rotation)","A type of token","A consensus algorithm","A hardware component"], correct_answer: 0, explanation: "Epochs are discrete time/block periods." },
  { question: "What does it mean when a transaction is \"pending\"?", options: ["It has been finalized","It was rejected","It has been broadcast but not yet included in a block","It is a scam"], correct_answer: 2, explanation: "Pending means awaiting block inclusion." },
  { question: "If you find a critical security vulnerability, what is the best action?", options: ["Post it publicly on Twitter","Exploit it to show how it works","Report it privately via the official Bug Bounty/Issue Council process","Ignore it"], correct_answer: 2, explanation: "Vulnerabilities must be disclosed responsibly." },
  { question: "What is a Genesis Block?", options: ["The last block in a chain","The first block of a blockchain network","A block that contains an error","A block with no transactions"], correct_answer: 1, explanation: "The Genesis Block is block 0 or block 1 of a chain." },
  { question: "What is a \"Hard Fork\"?", options: ["A minor update","A backward-incompatible upgrade requiring all nodes to update","A new wallet app","A hardware failure"], correct_answer: 1, explanation: "Hard forks require all participants to upgrade." },
  { question: "Why does Pyrax use a DevNet before MainNet?", options: ["To test network stability, consensus mechanisms, and security in a safe environment","To waste time","Because MainNet is too expensive","To hide the code"], correct_answer: 0, explanation: "DevNet acts as a safe testing sandbox." },
  { question: "What is \"Gas\" or \"Transaction Fees\" used for?", options: ["To speed up the internet","To compensate validators for computational work and prevent spam","To buy NFTs","To pay taxes"], correct_answer: 1, explanation: "Gas pays for compute and prevents network spam." },
  { question: "What does a \"51% attack\" refer to?", options: ["When 51% of users complain","A scenario where a single entity controls the majority of network power/stake","When a node crashes 51% of the time","A sale on tokens"], correct_answer: 1, explanation: "51% attacks compromise network integrity." },
  { question: "What is the function of the \"Mempool\"?", options: ["To pool money together","A waiting area for unconfirmed transactions","A swimming pool for developers","A memory storage device"], correct_answer: 1, explanation: "The mempool holds unconfirmed transactions." },
  { question: "How can you verify that a transaction was successful?", options: ["Ask support","Check the block explorer using the transaction hash","Wait for an email","Guess"], correct_answer: 1, explanation: "Block explorers provide the canonical state." },
  { question: "What is a \"Light Node\"?", options: ["A node that glows in the dark","A node that does not store the full blockchain history, relying on full nodes","A node with no security","A node that only mines"], correct_answer: 1, explanation: "Light nodes sync headers and rely on full nodes for data." },
  { question: "What happens if you lose access to the email linked to your DevNet account?", options: ["You can easily change it without proof","You may lose access to your tester profile and rewards","Support will give you a new account with the same rewards","Nothing, it doesn't matter"], correct_answer: 1, explanation: "Your account is tied to your auth credentials." },
  { question: "Why are logs categorized into levels (INFO, WARN, ERROR)?", options: ["To make them look pretty","To help operators filter and identify the severity of events","Because developers like colors","To save disk space"], correct_answer: 1, explanation: "Log levels aid in troubleshooting and monitoring." },
  { question: "What is the purpose of the \"Acceptance Testing\" phase?", options: ["To accept new users","Final validation of all features and stability before moving toward MainNet","To accept donations","To sign terms of service"], correct_answer: 1, explanation: "Acceptance testing is the final check." },
  { question: "What is \"State Sync\"?", options: ["Syncing your phone with your computer","A fast way for a node to catch up by downloading a recent snapshot instead of every historical block","Syncing files","A type of attack"], correct_answer: 1, explanation: "State sync speeds up node bootstrapping." },
  { question: "What is a \"Sybil Attack\"?", options: ["Attacking someone named Sybil","When one entity creates multiple fake identities to gain disproportionate influence","A network crash","A phishing email"], correct_answer: 1, explanation: "Sybil attacks spoof multiple identities." },
  { question: "How do you prove you are a human on the DevNet portal?", options: ["By sending a photo","Through KYC or social verification (e.g. Telegram/Discord)","By typing fast","You don't need to"], correct_answer: 1, explanation: "Verification often involves linking social accounts or KYC." }
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
