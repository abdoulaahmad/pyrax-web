// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The pre-authored PYRAX Product Test suite. These are the "tests" (stored in the repurposed
// `campaigns` table) a closed-alpha tester works through end-to-end, capturing proof at each step.
// Two tracks — the Inferno desktop app and the PYRAX CLI — each an install → … → validating chain,
// enforced by `prereq_slugs` so a tester can't jump to staking before their node is synced.
//
// This list is the SOURCE for the boot-time seed: db.init() calls upsertTest() for every entry, keyed
// by the stable `slug`, so re-running is idempotent (staff edits to a seeded test are overwritten on
// the next boot unless the slug is removed here — seed content is code-owned; ad-hoc staff tests use a
// different slug namespace). Steps are authored for a first-time tester: every action is spelled out.
//
// Proof kinds per step:
//   'photo'  — a screenshot proves it (state the app/CLI shows).
//   'video'  — a short screen recording proves it (a flow, e.g. an animation or a multi-second sync).
//   'either' — a screenshot OR a short clip is fine.
//   'none'   — no upload needed (a read/confirm step); the tester just marks it done.
// `logsPrompt`, when set, asks the tester to paste the relevant CLI/app log or error text for that step
// into the submission's big "logs" field (helps the reviewer + Sentinel cross-check).

export type ProofKind = "photo" | "video" | "either" | "none";

export interface SeedStep {
  title: string;
  instruction: string;
  proof: ProofKind;
  logsPrompt?: string;
}

export interface SeedTest {
  slug: string;
  track: "cli" | "inferno";
  title: string;
  body: string;                 // one-paragraph "what this test covers / why it matters"
  order_idx: number;            // display + progression order within the track
  weight_pyrx: number;          // per-test reward (install ~1000 … validating ~5000)
  est_minutes: number;
  app_version: string;          // the build these steps were authored against (informational)
  prereq_slugs: string[];       // tests that must be ACCEPTED before this one unlocks
  steps: SeedStep[];
}

// The build these instructions were authored against. Bump when steps are revised for a new release.
const V = "v0.1.0";

// ===================================================================================================
// INFERNO TRACK — the desktop node app (Windows / macOS / Linux).
// ===================================================================================================
const INFERNO: SeedTest[] = [
  {
    slug: "inferno-install",
    track: "inferno",
    title: "Install Inferno & first launch",
    body: "Download the Inferno desktop app for your operating system, install it, and open it for the first time. This is the foundation for every other Inferno test.",
    order_idx: 1,
    weight_pyrx: 1_000,
    est_minutes: 10,
    app_version: V,
    prereq_slugs: [],
    steps: [
      {
        title: "Download the installer",
        instruction: "1. Open the portal's Downloads page.\n2. Click the Inferno download for YOUR operating system (Windows, macOS, or Linux).\n3. Wait for the file to finish downloading and note where it saved (usually your Downloads folder).",
        proof: "photo",
        logsPrompt: "If the download failed or was blocked, paste any error message or browser warning you saw.",
      },
      {
        title: "Run the installer",
        instruction: "1. Open the file you just downloaded.\n2. If your OS shows a security prompt (Windows SmartScreen, or macOS \"cannot be opened\"), follow the on-screen unblock steps and continue — the app is unsigned during the alpha, this is expected.\n3. Complete the install and let it finish.",
        proof: "either",
        logsPrompt: "Paste the exact text of any security warning or install error, and which OS you're on.",
      },
      {
        title: "Open Inferno for the first time",
        instruction: "1. Launch the Inferno app.\n2. Wait for the main window to appear.\n3. Take a screenshot of the very first screen you see (the welcome / home screen).",
        proof: "photo",
      },
      {
        title: "Confirm the version",
        instruction: "1. Find the app version (usually in Settings, About, or the bottom corner of the window).\n2. Confirm it matches the build listed on the Downloads page.",
        proof: "photo",
      },
    ],
  },
  {
    slug: "inferno-onboard",
    track: "inferno",
    title: "Complete onboarding & connect to the network",
    body: "Walk through Inferno's first-run onboarding and confirm the app connects to the PYRAX Forge network.",
    order_idx: 2,
    weight_pyrx: 1_200,
    est_minutes: 10,
    app_version: V,
    prereq_slugs: ["inferno-install"],
    steps: [
      {
        title: "Follow the onboarding screens",
        instruction: "1. Read each onboarding screen the app shows on first launch.\n2. Click through them (Next / Continue) to the end.\n3. Screenshot any screen where the wording was confusing or a button didn't work.",
        proof: "either",
      },
      {
        title: "Confirm the selected network",
        instruction: "1. Find where the app shows which network you're on.\n2. Confirm it says the PYRAX Forge / devnet network (not mainnet).\n3. Screenshot the network indicator.",
        proof: "photo",
      },
      {
        title: "Confirm the app reaches the network",
        instruction: "1. Look for a connection status (Connected / Online, or a green dot).\n2. Wait up to a minute for it to turn connected.\n3. Screenshot the connected status.",
        proof: "photo",
        logsPrompt: "If it never connects, paste any connection error and open Logs (if available) and paste the last ~20 lines.",
      },
    ],
  },
  {
    slug: "inferno-wallet",
    track: "inferno",
    title: "Create your wallet, back it up & view your balance",
    body: "Create a wallet inside Inferno, safely record the recovery phrase, and confirm you can see your address and balance. Your wallet is how you'll receive test funds and, later, stake.",
    order_idx: 3,
    weight_pyrx: 2_500,
    est_minutes: 15,
    app_version: V,
    prereq_slugs: ["inferno-onboard"],
    steps: [
      {
        title: "Create a new wallet",
        instruction: "1. Open the Wallet tab.\n2. Click Create Wallet (or Create New Wallet).\n3. Set a password if the app asks for one.",
        proof: "photo",
      },
      {
        title: "Back up your recovery phrase",
        instruction: "1. The app will show a recovery phrase (usually 12 or 24 words).\n2. Write it down on paper — do NOT screenshot the words themselves and do NOT share them with anyone.\n3. Confirm the phrase in the app if it asks you to re-enter some words.\n\nIMPORTANT: For your proof, screenshot only the CONFIRMATION screen (\"backup complete\"), never the words.",
        proof: "photo",
      },
      {
        title: "View your wallet address",
        instruction: "1. Find your receive address (starts with 0x).\n2. Copy it.\n3. Screenshot the address shown in the app — this one is safe to share.",
        proof: "photo",
      },
      {
        title: "View your balance",
        instruction: "1. Look at your wallet balance.\n2. It's fine if it's 0 right now (you can request test funds from the faucet later).\n3. Screenshot the balance display.",
        proof: "photo",
      },
    ],
  },
  {
    slug: "inferno-sync",
    track: "inferno",
    title: "Sync your node to the chain tip",
    body: "Let Inferno download the chain and reach the current tip. A synced node is required before you can mine, stake, or validate.",
    order_idx: 4,
    weight_pyrx: 2_000,
    est_minutes: 20,
    app_version: V,
    prereq_slugs: ["inferno-wallet"],
    steps: [
      {
        title: "Find the sync status",
        instruction: "1. Open the node / dashboard view.\n2. Find the sync indicator and the current block height.\n3. Screenshot it as it starts.",
        proof: "photo",
      },
      {
        title: "Record syncing to the tip",
        instruction: "1. Watch the block height climb.\n2. Record a short (5–15s) screen clip showing the height increasing OR the progress bar moving.",
        proof: "video",
      },
      {
        title: "Confirm you're fully synced",
        instruction: "1. Wait until the app says Synced / Up to date (height stops climbing and matches the network).\n2. Screenshot the synced state with the final block height visible.",
        proof: "photo",
        logsPrompt: "If sync stalls or the height stops before catching up, paste the last ~30 log lines and note the height it stuck at.",
      },
    ],
  },
  {
    slug: "inferno-peers",
    track: "inferno",
    title: "Check your peer connections",
    body: "Confirm your node is connected to other peers on the network — peers are how your node exchanges blocks and transactions.",
    order_idx: 5,
    weight_pyrx: 1_500,
    est_minutes: 10,
    app_version: V,
    prereq_slugs: ["inferno-sync"],
    steps: [
      {
        title: "Open the peers / network view",
        instruction: "1. Find the Peers or Network section (may be under the node/dashboard view).\n2. Screenshot the list of connected peers and the peer count.",
        proof: "photo",
      },
      {
        title: "Confirm at least one peer",
        instruction: "1. Confirm the peer count is 1 or more.\n2. If it's 0 for more than a couple of minutes, note that in your submission.",
        proof: "photo",
        logsPrompt: "If you have 0 peers, paste any networking error from the logs and tell us your OS + whether you're behind a firewall/VPN.",
      },
    ],
  },
  {
    slug: "inferno-mining",
    track: "inferno",
    title: "Start mining and earn a block reward",
    body: "Turn on mining in Inferno and confirm your node produces or receives work. Mining is how new blocks are found on the devnet.",
    order_idx: 6,
    weight_pyrx: 2_500,
    est_minutes: 20,
    app_version: V,
    prereq_slugs: ["inferno-peers"],
    steps: [
      {
        title: "Open the mining tab",
        instruction: "1. Find the Mining tab.\n2. Screenshot the mining screen before you start.",
        proof: "photo",
      },
      {
        title: "Start mining",
        instruction: "1. Click Start Mining.\n2. Watch for the app to show it's hashing / working (a hashrate number, or an active indicator).\n3. Record a short clip of the mining running with the hashrate visible.",
        proof: "video",
        logsPrompt: "If mining won't start or errors, paste the error and the last ~20 mining log lines.",
      },
      {
        title: "Let it run and check for a reward",
        instruction: "1. Leave mining running for a few minutes.\n2. Check your wallet balance for any mining reward, or the mining tab for blocks found.\n3. Screenshot whatever changes (balance increase, or a \"block found\" entry). If nothing changes after ~10 minutes, screenshot the mining stats anyway and note it.",
        proof: "either",
      },
    ],
  },
  {
    slug: "inferno-staking",
    track: "inferno",
    title: "Stake PYRX — bond solo or join a pool",
    body: "Put PYRX to work securing the network. You can either bond enough to stake solo, or join a staking pool with a smaller amount. Staking is the step before becoming a validator.",
    order_idx: 7,
    weight_pyrx: 4_000,
    est_minutes: 25,
    app_version: V,
    prereq_slugs: ["inferno-mining"],
    steps: [
      {
        title: "Make sure you have test PYRX",
        instruction: "1. Check your wallet has some test PYRX (from mining, or request it from the faucet if the portal offers one).\n2. Screenshot your balance before staking.",
        proof: "photo",
      },
      {
        title: "Open the staking tab",
        instruction: "1. Find the Staking tab.\n2. Read the on-screen requirements. Note the two options:\n   • Solo bond: stake 260,000 PYRX on your own.\n   • Join a pool: contribute from as little as 10,000 PYRX.\n3. Screenshot the staking screen showing these options.",
        proof: "photo",
      },
      {
        title: "Stake (bond solo OR join a pool)",
        instruction: "1. Pick the option that fits your balance:\n   • If you have 260,000+ PYRX: enter a solo bond of 260,000 PYRX.\n   • Otherwise: choose a pool and contribute at least 10,000 PYRX.\n2. Confirm the transaction (enter your password if asked).\n3. Record a short clip of you submitting the stake and the confirmation appearing.",
        proof: "video",
        logsPrompt: "Paste the transaction hash if shown, and any error if the stake was rejected (e.g. \"insufficient balance\", \"below minimum\").",
      },
      {
        title: "Confirm your stake is active",
        instruction: "1. After the transaction confirms, check that the staking tab shows your active stake / pool position and the bonded amount.\n2. Screenshot the active-stake state.",
        proof: "photo",
      },
    ],
  },
  {
    slug: "inferno-validating",
    track: "inferno",
    title: "Become a validator",
    body: "Promote your staked node to a validator so it can help produce and seal blocks. This is the deepest node role and requires an active solo bond of 260,000 PYRX (pool members validate through the pool).",
    order_idx: 8,
    weight_pyrx: 5_000,
    est_minutes: 25,
    app_version: V,
    prereq_slugs: ["inferno-staking"],
    steps: [
      {
        title: "Open the validator screen",
        instruction: "1. Find the Validator section (often inside or next to the Staking tab).\n2. Read the requirements — solo validation needs the full 260,000 PYRX bond active.\n3. Screenshot the validator screen.",
        proof: "photo",
      },
      {
        title: "Register / activate as a validator",
        instruction: "1. Click Become a Validator (or Activate Validator).\n2. Confirm the transaction.\n3. Record a short clip of the activation and its confirmation.",
        proof: "video",
        logsPrompt: "Paste the activation transaction hash and any error (e.g. \"bond below validator minimum\", \"already validating\").",
      },
      {
        title: "Confirm your validator is active",
        instruction: "1. Wait for the app to show your node as an ACTIVE validator (a validator badge/status, and ideally a count of blocks proposed/sealed once it starts).\n2. Screenshot the active-validator status.",
        proof: "photo",
        logsPrompt: "Paste the last ~20 log lines around block proposal/sealing so we can confirm your validator is participating.",
      },
    ],
  },
  {
    slug: "inferno-stream",
    track: "inferno",
    title: "Try the Stream tab (media over the mesh)",
    body: "Exercise Inferno's Stream feature, which pulls media over the PYRAX mesh. This tests the app's carriage/relay path.",
    order_idx: 9,
    weight_pyrx: 2_000,
    est_minutes: 15,
    app_version: V,
    prereq_slugs: ["inferno-sync"],
    steps: [
      {
        title: "Open the Stream tab",
        instruction: "1. Find the Stream tab.\n2. Screenshot the Stream screen.",
        proof: "photo",
      },
      {
        title: "Start a stream",
        instruction: "1. Pick an available item to stream (or follow the on-screen prompt to start one).\n2. Record a short clip showing the media starting to play or download over the mesh.",
        proof: "video",
        logsPrompt: "If the stream never starts or buffers forever, paste any error and the last ~20 stream/relay log lines.",
      },
    ],
  },
  {
    slug: "inferno-neurax",
    track: "inferno",
    title: "Open the NEURAX (Sentinel) tab",
    body: "Explore the NEURAX tab — PYRAX's local-first AI surface. This confirms the AI/Sentinel panel loads and responds inside the app.",
    order_idx: 10,
    weight_pyrx: 2_000,
    est_minutes: 15,
    app_version: V,
    prereq_slugs: ["inferno-sync"],
    steps: [
      {
        title: "Open the NEURAX tab",
        instruction: "1. Find the NEURAX (or Sentinel) tab.\n2. Screenshot what it shows on open.",
        proof: "photo",
      },
      {
        title: "Interact with NEURAX",
        instruction: "1. Follow the on-screen prompt (e.g. type a question, run the suggested action, or enable the feature).\n2. Record a short clip of NEURAX responding or the panel updating.",
        proof: "video",
        logsPrompt: "If NEURAX errors or hangs, paste the error text and the last ~20 log lines.",
      },
    ],
  },
  {
    slug: "inferno-logs",
    track: "inferno",
    title: "Find and export your logs",
    body: "Locate Inferno's logs and export them. Good logs make every future bug report far easier to diagnose — this teaches you where to grab them.",
    order_idx: 11,
    weight_pyrx: 1_500,
    est_minutes: 10,
    app_version: V,
    prereq_slugs: ["inferno-sync"],
    steps: [
      {
        title: "Open the logs view",
        instruction: "1. Find the Logs section (often in Settings or a dedicated tab).\n2. Screenshot the logs view.",
        proof: "photo",
      },
      {
        title: "Export or copy logs",
        instruction: "1. Use Export Logs (or copy the recent lines).\n2. If the app lets you save a log file, keep it — you can attach it to bug reports.\n3. Paste the last ~30 lines of your log into the logs field below.",
        proof: "none",
        logsPrompt: "Paste the last ~30 lines of your Inferno log here.",
      },
    ],
  },
];

// ===================================================================================================
// CLI TRACK — the command-line node tool (all platforms).
// ===================================================================================================
const CLI: SeedTest[] = [
  {
    slug: "cli-install",
    track: "cli",
    title: "Install the PYRAX CLI",
    body: "Download the PYRAX command-line tool and confirm it runs. Everything in the CLI track builds on this.",
    order_idx: 1,
    weight_pyrx: 1_000,
    est_minutes: 10,
    app_version: V,
    prereq_slugs: [],
    steps: [
      {
        title: "Download the CLI",
        instruction: "1. Open the portal's Downloads page.\n2. Download the PYRAX CLI for your platform.\n3. If needed, unzip it and (macOS/Linux) mark it executable, e.g. `chmod +x pyrax`.",
        proof: "either",
        logsPrompt: "Paste any download or permission error you hit.",
      },
      {
        title: "Put it on your PATH (optional)",
        instruction: "1. Either move the binary somewhere on your PATH, or note its full path so you can run it.\n2. Open a terminal / command prompt in that folder.",
        proof: "none",
      },
      {
        title: "Confirm it runs",
        instruction: "1. Run `pyrax --version` (or `./pyrax --version`).\n2. Screenshot the terminal showing the version output.\n3. Paste that version line into the logs field.",
        proof: "photo",
        logsPrompt: "Paste the exact output of `pyrax --version`. If it errored (e.g. \"command not found\", \"permission denied\"), paste that instead.",
      },
    ],
  },
  {
    slug: "cli-init-config",
    track: "cli",
    title: "Initialize your node config",
    body: "Create the CLI's config/data directory and point it at the PYRAX Forge devnet. This sets up where your node stores its data.",
    order_idx: 2,
    weight_pyrx: 1_200,
    est_minutes: 10,
    app_version: V,
    prereq_slugs: ["cli-install"],
    steps: [
      {
        title: "Run init",
        instruction: "1. Run `pyrax init` (or the equivalent the CLI help shows for first-time setup — check `pyrax --help`).\n2. Accept or set the devnet/Forge network when prompted.\n3. Screenshot the output.",
        proof: "photo",
        logsPrompt: "Paste the full output of `pyrax init` (or the help text if the command name differs).",
      },
      {
        title: "Confirm the config exists",
        instruction: "1. Find the config/data directory the CLI created (the init output usually prints its path).\n2. Confirm the config file is there and names the Forge/devnet network.\n3. Paste the network line from the config (redact anything that looks secret).",
        proof: "none",
        logsPrompt: "Paste the network/chain lines from your config file.",
      },
    ],
  },
  {
    slug: "cli-keys-wallet",
    track: "cli",
    title: "Create keys / wallet",
    body: "Generate your node's key/wallet with the CLI and record the recovery material safely. This is the account that receives rewards and stakes.",
    order_idx: 3,
    weight_pyrx: 2_500,
    est_minutes: 15,
    app_version: V,
    prereq_slugs: ["cli-init-config"],
    steps: [
      {
        title: "Generate a wallet/key",
        instruction: "1. Run the key/wallet create command (check `pyrax --help`; often `pyrax wallet create` or `pyrax keys new`).\n2. When it prints a recovery phrase or private key, write it down on paper. Do NOT paste the secret words/key anywhere in this report.",
        proof: "none",
        logsPrompt: "Paste ONLY the command you ran and the NON-secret output (the address). NEVER paste the seed phrase or private key.",
      },
      {
        title: "Show your address",
        instruction: "1. Run the command that prints your public address (e.g. `pyrax wallet address`).\n2. Screenshot the terminal showing your 0x address.",
        proof: "photo",
      },
      {
        title: "Check your balance",
        instruction: "1. Run the balance command (e.g. `pyrax wallet balance`).\n2. Screenshot it. A 0 balance is fine for now.",
        proof: "photo",
        logsPrompt: "Paste the balance command's output.",
      },
    ],
  },
  {
    slug: "cli-node-run",
    track: "cli",
    title: "Create and start your node",
    body: "Start the CLI node and let it sync to the chain tip. A running, synced node is required for mining, staking, and validating.",
    order_idx: 4,
    weight_pyrx: 2_000,
    est_minutes: 25,
    app_version: V,
    prereq_slugs: ["cli-keys-wallet"],
    steps: [
      {
        title: "Start the node",
        instruction: "1. Run the node start command (e.g. `pyrax node run` or `pyrax start` — check `pyrax --help`).\n2. Watch the startup logs. Screenshot the terminal once it's up and logging.",
        proof: "photo",
        logsPrompt: "Paste the first ~20 lines of node startup output.",
      },
      {
        title: "Watch it sync",
        instruction: "1. Watch the block height in the logs climb toward the network tip.\n2. Record a short clip of the height increasing.",
        proof: "video",
      },
      {
        title: "Confirm synced",
        instruction: "1. In another terminal, run the status command (e.g. `pyrax status`).\n2. Confirm it reports synced / caught up with the current height and peer count.\n3. Screenshot the status output.",
        proof: "photo",
        logsPrompt: "Paste the full output of `pyrax status`. If sync stalls, paste the height it stuck at and the last ~20 log lines.",
      },
    ],
  },
  {
    slug: "cli-mine",
    track: "cli",
    title: "Mine from the CLI",
    body: "Enable mining on your CLI node and confirm it's producing/receiving work.",
    order_idx: 5,
    weight_pyrx: 2_500,
    est_minutes: 20,
    app_version: V,
    prereq_slugs: ["cli-node-run"],
    steps: [
      {
        title: "Start mining",
        instruction: "1. Run the mine command (e.g. `pyrax mine start`, or start the node with the mining flag — check `pyrax --help`).\n2. Confirm the logs show hashing / work being done.\n3. Screenshot the mining output with a hashrate visible.",
        proof: "photo",
        logsPrompt: "Paste the mining startup output and the first hashrate line. If it errored, paste the error.",
      },
      {
        title: "Check for a reward",
        instruction: "1. Let it mine a few minutes, then check your balance again (`pyrax wallet balance`).\n2. Screenshot any change. If nothing after ~10 min, screenshot the mining stats and note it.",
        proof: "either",
      },
    ],
  },
  {
    slug: "cli-stake-pool",
    track: "cli",
    title: "Stake — bond solo or join a pool",
    body: "Stake PYRX from the CLI. Bond 260,000 PYRX to stake solo, or join a pool from 10,000 PYRX. Staking is the step before validating.",
    order_idx: 6,
    weight_pyrx: 4_000,
    est_minutes: 25,
    app_version: V,
    prereq_slugs: ["cli-mine"],
    steps: [
      {
        title: "Confirm your balance",
        instruction: "1. Run `pyrax wallet balance` and confirm you have test PYRX to stake (from mining or the faucet).\n2. Screenshot it.",
        proof: "photo",
      },
      {
        title: "Read the staking options",
        instruction: "1. Run the staking help (e.g. `pyrax stake --help`).\n2. Note the two paths: solo bond 260,000 PYRX, or join a pool from 10,000 PYRX.\n3. Paste the help output.",
        proof: "none",
        logsPrompt: "Paste the output of `pyrax stake --help`.",
      },
      {
        title: "Submit your stake",
        instruction: "1. Run the stake command for your choice:\n   • Solo: `pyrax stake bond --amount 260000` (or the exact syntax from the help).\n   • Pool: `pyrax stake join --pool <id> --amount 10000` (or as the help shows).\n2. Screenshot the terminal showing the transaction was submitted and confirmed.",
        proof: "photo",
        logsPrompt: "Paste the stake command you ran, the transaction hash, and any error (e.g. \"insufficient balance\", \"below minimum\").",
      },
      {
        title: "Confirm the stake is active",
        instruction: "1. Run the stake status command (e.g. `pyrax stake status`).\n2. Confirm it shows your bonded amount / pool position.\n3. Screenshot it.",
        proof: "photo",
      },
    ],
  },
  {
    slug: "cli-validator",
    track: "cli",
    title: "Become a validator from the CLI",
    body: "Promote your staked CLI node to a validator so it helps produce and seal blocks. Solo validation needs the full 260,000 PYRX bond active.",
    order_idx: 7,
    weight_pyrx: 5_000,
    est_minutes: 25,
    app_version: V,
    prereq_slugs: ["cli-stake-pool"],
    steps: [
      {
        title: "Read the validator command",
        instruction: "1. Run the validator help (e.g. `pyrax validator --help`).\n2. Confirm the bond requirement (260,000 PYRX active for solo validation).\n3. Paste the help output.",
        proof: "none",
        logsPrompt: "Paste the output of `pyrax validator --help`.",
      },
      {
        title: "Register as a validator",
        instruction: "1. Run the register command (e.g. `pyrax validator register`).\n2. Screenshot the terminal showing the registration transaction submitted and confirmed.",
        proof: "photo",
        logsPrompt: "Paste the registration transaction hash and any error (e.g. \"bond below validator minimum\", \"already registered\").",
      },
      {
        title: "Confirm you're validating",
        instruction: "1. Run `pyrax validator status` (or `pyrax status`).\n2. Confirm your node shows as an ACTIVE validator, ideally with blocks proposed/sealed once it starts.\n3. Screenshot it.",
        proof: "photo",
        logsPrompt: "Paste the last ~20 log lines around block proposal/sealing so we can confirm your validator is participating.",
      },
    ],
  },
  {
    slug: "cli-peers",
    track: "cli",
    title: "Inspect your peers",
    body: "Check who your CLI node is connected to. Peers are how your node exchanges blocks and transactions.",
    order_idx: 8,
    weight_pyrx: 1_500,
    est_minutes: 10,
    app_version: V,
    prereq_slugs: ["cli-node-run"],
    steps: [
      {
        title: "List peers",
        instruction: "1. Run the peers command (e.g. `pyrax peers` or `pyrax net peers`).\n2. Screenshot the peer list and count.",
        proof: "photo",
        logsPrompt: "Paste the peers command output. If you have 0 peers, tell us your OS and whether you're behind a firewall/VPN.",
      },
    ],
  },
  {
    slug: "cli-stream",
    track: "cli",
    title: "Stream media over the mesh (CLI)",
    body: "Exercise the CLI's stream/carriage path — pulling media over the PYRAX mesh from the command line.",
    order_idx: 9,
    weight_pyrx: 2_000,
    est_minutes: 15,
    app_version: V,
    prereq_slugs: ["cli-node-run"],
    steps: [
      {
        title: "Read the stream command",
        instruction: "1. Run the stream help (e.g. `pyrax stream --help`).\n2. Paste the help output.",
        proof: "none",
        logsPrompt: "Paste the output of `pyrax stream --help`.",
      },
      {
        title: "Start a stream",
        instruction: "1. Start a stream following the help (pick an available item, or start one).\n2. Screenshot or record the terminal showing the stream progressing / data arriving.",
        proof: "either",
        logsPrompt: "If the stream fails, paste the error and the last ~20 stream/relay log lines.",
      },
    ],
  },
  {
    slug: "cli-neurax-relay",
    track: "cli",
    title: "Run a NEURAX relay",
    body: "Use the CLI's NEURAX route/relay command — connecting your node to PYRAX's AI compute path. This confirms the NEURAX CLI surface works.",
    order_idx: 10,
    weight_pyrx: 2_000,
    est_minutes: 15,
    app_version: V,
    prereq_slugs: ["cli-node-run"],
    steps: [
      {
        title: "Read the NEURAX command",
        instruction: "1. Run the NEURAX help (e.g. `pyrax neurax --help` or `pyrax neurax route --help`).\n2. Paste the help output.",
        proof: "none",
        logsPrompt: "Paste the output of the NEURAX help command.",
      },
      {
        title: "Start the relay / route",
        instruction: "1. Run the NEURAX route/relay command as the help shows.\n2. Screenshot the terminal showing it started and is connected.",
        proof: "photo",
        logsPrompt: "Paste the startup output and any error if it didn't connect.",
      },
    ],
  },
  {
    slug: "cli-doctor",
    track: "cli",
    title: "Run the doctor / diagnostics",
    body: "Run the CLI's built-in health check and export diagnostics. This teaches you the one command that captures everything the team needs to debug your node.",
    order_idx: 11,
    weight_pyrx: 1_500,
    est_minutes: 10,
    app_version: V,
    prereq_slugs: ["cli-node-run"],
    steps: [
      {
        title: "Run doctor",
        instruction: "1. Run the diagnostics command (e.g. `pyrax doctor` or `pyrax diagnose`).\n2. Screenshot the summary of checks (what passed / what warned).",
        proof: "photo",
        logsPrompt: "Paste the full `pyrax doctor` output. Flag anything it marks as failing or warning.",
      },
      {
        title: "Export diagnostics",
        instruction: "1. If doctor can export a report/bundle, save it — you can attach it to bug reports.\n2. Confirm the file was written and note its path.",
        proof: "none",
      },
    ],
  },
];

/** The full seed suite, both tracks in order. Consumed by db.init() to upsert each test by slug. */
export const SEED_TESTS: SeedTest[] = [...INFERNO, ...CLI];
