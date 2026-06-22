// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
export type DocBlock =
  | { t: "h2"; text: string }
  | { t: "h3"; text: string }
  | { t: "p"; html: string }
  | { t: "list"; items: string[] }
  | { t: "code"; lang: string; title?: string; code: string }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "callout"; kind: "info" | "warn"; html: string };
export type DocPage = { slug: string; title: string; blocks: DocBlock[] };
export type DocCategory = { name: string; pages: DocPage[] };

const PAGE_INTRODUCTION: DocPage = {
  slug: "introduction",
  title: "Introduction",
  blocks: [
    { t: "p", html: "<strong>PYRAX</strong> is a Layer 1 blockchain that runs <strong>three smart-contract virtual machines side by side</strong> over a single shared state: the EVM (via <a href=\"https://github.com/bluealloy/revm\">revm</a>), WebAssembly (via <a href=\"https://wasmtime.dev/\">wasmtime</a>), and Cairo (via <a href=\"https://github.com/lambdaclass/cairo-vm\">cairo-vm</a>). A contract written in Solidity, a contract written in Rust and compiled to WASM, and a contract written in Cairo are all <em>first-class accounts on the same chain</em>. They share the same balances, the same 32-byte storage slots, the same logs, and the same fee market — and they can call each other." },
    { t: "p", html: "If you have shipped on Ethereum, almost everything you know still applies: the same wallets, the same <code>eth_*</code> JSON-RPC, the same raw transaction format, the same <code>keccak256</code>, the same reverts. What is new is that you are no longer limited to Solidity, and the chain underneath is a <strong>GhostDAG (TriStream)</strong> rather than a single linear chain." },
    { t: "callout", kind: "info", html: "<strong>The one-sentence model:</strong> a contract is an account with code and storage; the VM that executes it is auto-detected from the code's magic bytes; everything else — accounts, storage, gas, logs, RPC — is shared and Ethereum-compatible." },
    { t: "h2", text: "What PYRAX is, concretely" },
    { t: "list", items: [
      "<strong>One state, three VMs.</strong> Accounts hold a balance, a nonce, and (optionally) deployed code. The code's leading bytes decide which VM runs it. There is no separate \"WASM chain\" or \"Cairo chain\" — it is one ledger.",
      "<strong>Contracts are accounts.</strong> Deploying a contract creates an account with code and storage. Calling it executes that code <em>inside L1 block application</em>, with the result (including reverts) committed to the block.",
      "<strong>Storage is universal.</strong> Every VM reads and writes the same model: <strong>32-byte key → 32-byte value</strong> slots, scoped per account. A Solidity <code>mapping</code> slot, a WASM <code>storage_set</code> slot, and a Cairo <code>pyrax.storage_write</code> slot are the same kind of slot.",
      "<strong>The token is PYRX.</strong> All value, all gas, and all fees are denominated in PYRX (base units), with 18 decimals.",
      "<strong>Reverts are real transactions.</strong> A reverted or trapped call is <em>not</em> an error that vanishes — the transaction is still included in the block and still charged gas, exactly like Ethereum. The receipt simply reports <code>success: false</code>.",
      "<strong>The dev node speaks Ethereum JSON-RPC.</strong> Point MetaMask, Hardhat, Foundry, ethers, viem, or web3.js at it. HTTP and WebSocket are served on a single socket; <code>eth_*</code>, <code>net_*</code>, <code>web3_*</code>, filters, and subscriptions all work, alongside native <code>pyrax_*</code> methods."
    ]},
    { t: "h2", text: "The three-VM model" },
    { t: "p", html: "Each VM is a real, production implementation — not a transpiler or an emulator. You write in the language's native toolchain, deploy the resulting artifact, and the chain runs it." },
    { t: "table", head: ["VM", "Engine", "You write in", "Deploy artifact", "Detected by"], rows: [
      ["EVM", "revm", "Solidity, Vyper, Yul", "EVM init bytecode", "default (no magic marker)"],
      ["WASM", "wasmtime", "Rust, AssemblyScript, TinyGo, C/C++", "a .wasm module", "\\0asm magic (first 4 bytes)"],
      ["Cairo", "cairo-vm", "Cairo", "compiled Cairo program", "\\0CAIRO marker (first 6 bytes)"]
    ]},
    { t: "h3", text: "VM auto-detection" },
    { t: "p", html: "There is no flag, no opcode, and no registry to tell the chain which VM to use. When a contract is created, the ledger inspects the leading bytes of the code:" },
    { t: "code", lang: "rust", code: "pub fn detect_vm(code: &[u8]) -> VmKind {\n    if code.starts_with(b\"\\0asm\") {        // WebAssembly module magic\n        VmKind::Wasm\n    } else if code.starts_with(CAIRO_MAGIC) { // b\"\\0CAIRO\"\n        VmKind::Cairo\n    } else {\n        VmKind::Evm                          // default: raw EVM init code\n    }\n}" },
    { t: "p", html: "This is why a plain Hardhat/Foundry/MetaMask deployment \"just works\": raw EVM init code carries no marker, so it falls through to the default EVM path. The detected VM is then <strong>baked into the account's code hash</strong> — the stored runtime code is tagged <code>[vm_tag || code]</code> and hashed, so an account's identity commits to <em>both</em> its code and the VM that runs it. A contract is permanently and unambiguously self-identifying as EVM, WASM, or Cairo." },
    { t: "h2", text: "Same as Ethereum vs. different from Ethereum" },
    { t: "p", html: "The fastest way to orient: assume Ethereum, then learn the deltas." },
    { t: "h3", text: "What is the same" },
    { t: "list", items: [
      "<strong>Accounts &amp; nonces.</strong> 20-byte addresses, per-account nonce, balance, code.",
      "<strong>The EVM itself.</strong> revm executes standard EVM bytecode; Solidity/Vyper compile and deploy unchanged.",
      "<strong>Transactions.</strong> Standard EIP-2718 raw transactions are accepted verbatim via <code>eth_sendRawTransaction</code>; the canonical Ethereum tx id is <code>keccak256(raw)</code>, byte-exact with what wallets and explorers expect.",
      "<strong>JSON-RPC.</strong> A broad <code>eth_*</code> read/write subset, plus <code>net_*</code>, <code>web3_*</code>, log filters (<code>eth_newFilter</code>/<code>eth_getFilterChanges</code>), and WebSocket subscriptions (<code>eth_subscribe</code> for <code>newHeads</code>, <code>logs</code>, <code>newPendingTransactions</code>).",
      "<strong>EIP-1559 fee market.</strong> A per-block base fee that retargets ±12.5% toward a gas target, plus a priority tip; queryable via <code>eth_gasPrice</code>, <code>eth_maxPriorityFeePerGas</code>, and <code>eth_feeHistory</code>.",
      "<strong><code>web3_sha3</code> is keccak256</strong>, exactly as on Ethereum (not SHA-3).",
      "<strong>Logs &amp; receipts.</strong> Ethereum-compatible log objects, topics, and receipt shapes (<code>status</code>, <code>gasUsed</code>, <code>cumulativeGasUsed</code>, <code>logs</code>, <code>contractAddress</code>).",
      "<strong>CREATE2.</strong> EIP-1014 address derivation — <code>keccak256(0xff ++ sender ++ salt ++ keccak256(init_code))[12..]</code> — works, including from WASM/Cairo factories."
    ]},
    { t: "h3", text: "What is different" },
    { t: "table", head: ["Topic", "Ethereum", "PYRAX"], rows: [
      ["Consensus / structure", "Linear chain, single PoW→PoS", "TriStream GhostDAG: three parallel streams (A, B, C) form a blockDAG"],
      ["block.number", "Linear block height", "GhostDAG blue score — a reorg-stable height analogue (linear height on a single-stream dev chain)"],
      ["Uncles / ommers", "Possible", "None. eth_getUncleCountBy… always returns 0x0"],
      ["Native contract languages", "Solidity/Vyper only", "EVM plus native WASM and Cairo"],
      ["Gas pricing inside the VM", "EVM charges gas", "Ledger charges + distributes gas; the EVM runs with gas_price = 0 and the ledger owns the fee market"],
      ["Fee distribution", "Base fee burned, tip → producer", "Base fee split 25% burn / 50% PYRAX treasury / 25% DAO; tip split 70% producer / 20% PYRAX / 10% DAO"],
      ["Private value", "Public only", "A native shielded pool (zero-knowledge notes) alongside transparent and Ethereum txs"]
    ]},
    { t: "p", html: "When a contract reads <code>block.number</code> (EVM <code>NUMBER</code>, WASM <code>block_number()</code>, Cairo <code>pyrax.get_block_number</code>), it gets the block header's <strong>blue score</strong> — the GhostDAG measure of how many blue blocks precede it. Blue score is <strong>reorg-stable</strong>, so seal-time execution and replay-time execution always agree. On a single-stream development chain, blue score is exactly the linear height, so it behaves just like Ethereum's block number." },
    { t: "h2", text: "The layered architecture in one page" },
    { t: "p", html: "PYRAX is structured as settlement/execution layers over a peer-to-peer mesh, with user-facing wallet and node applications:" },
    { t: "list", items: [
      "<strong>L1 — PYRAX GhostDAG blockDAG (Rust).</strong> A multi-parent blockDAG ordered by GhostDAG (blue set / k-cluster), produced by TriStream mining — Stream A: BLAKE3+SHA-256 PoW · Stream B: KAWPOW+RandomX PoW with an AI-compute hook · Stream C: PoS — and given economic finality by Stream-C BLS-aggregate attestations. Transactions are shielded by default (note commitments + nullifiers + zk proofs), with transparent and Ethereum txs as first-class public paths.",
      "<strong>L2 — Execution.</strong> EVM (revm) · WASM (wasmtime) · Cairo (cairo-vm), all over one shared 32-byte state.",
      "<strong>L3 — ZK rollup.</strong> Recursive validity proofs (plonky2) that settle to L1.",
      "<strong>Mesh.</strong> Bootstrapless libp2p — Kademlia DHT, GossipSub, QUIC/TCP/WebRTC transports, and mDNS — with an onion-routed mixnet for metadata privacy.",
      "<strong>Applications.</strong> A cross-platform wallet (extension + mobile + desktop) and an Electron node/mining app."
    ]},
    { t: "callout", kind: "warn", html: "<strong>This is the Phase 10 devnet slice.</strong> A few behaviors are intentionally simplified in the current devnet: <code>BLOCKHASH</code> returns zero, bridge batch finalization is deferred (proofs are rejected until the real verifier lands), and per-account storage is not yet folded into the state root (consensus stays safe because peers re-execute blocks deterministically rather than trusting reported storage)." },
    { t: "h2", text: "Where to go next" },
    { t: "list", items: [
      "<a href=\"/getting-started/\">Getting Started</a> — run a dev node, connect a wallet, deploy your first contract, and send a transaction.",
      "<a href=\"/networks/\">Networks &amp; endpoints</a> — the five networks, chain IDs, block times, and the faucet.",
      "<a href=\"/concepts/architecture/\">Architecture</a> — how GhostDAG, the shared state, and the three VMs fit together.",
      "<a href=\"/reference/json-rpc/\">JSON-RPC reference</a> — every <code>eth_*</code>, <code>pyrax_*</code>, <code>net_*</code>, and <code>web3_*</code> method."
    ]}
  ]
};


const PAGE_GETTING_STARTED: DocPage = {
  slug: "getting-started",
  title: "Getting started",
  blocks: [
    { t: "p", html: "PYRAX is a multi-VM Layer-1 blockchain. A single node runs three execution engines side by side — <strong>EVM</strong> (via revm), <strong>WASM</strong> (via wasmtime), and <strong>Cairo</strong> (via cairo-vm) — over one shared, 32-byte-slot state and one GhostDAG ledger. A contract is just an account that carries code and storage; the node auto-detects which VM to run from the code's leading magic bytes, so you deploy to all three the same way." },
    { t: "p", html: "This guide takes you from an empty machine to a running dev node, a verified JSON-RPC endpoint, a connected wallet, and your first deployed contract." },
    { t: "callout", kind: "info", html: "<strong>The fastest path:</strong> if you only want to <em>read</em> the chain and call contracts, you need just the Rust toolchain (to build the node) plus <code>curl</code>. The per-VM example toolchains (Node, <code>solc</code>, the Rust <code>wasm32</code> target, Cairo) are only needed when you reach the matching quickstart." },
    { t: "h2", text: "Prerequisites" },
    { t: "table", head: ["Tool", "Needed for", "Notes"], rows: [
      ["Rust (stable)", "Building and running the node", "PYRAX builds with a stock stable toolchain — no libclang, no protoc, no native toolchain required. Install via rustup."],
      ["Git", "Cloning the repo", "Any recent version."],
      ["curl", "Verifying the RPC endpoint", "Pre-installed on macOS/Linux; bundled with Windows 10+."],
      ["Node.js + npm", "The EVM quickstart and the docs site", "Only when you deploy to the EVM or build the docs locally."],
      ["solc (Solidity)", "Compiling the EVM sample contract", "Or use Foundry/Hardhat, which manage solc for you."],
      ["wasm32-unknown-unknown target", "The WASM quickstart", "rustup target add wasm32-unknown-unknown."],
      ["Cairo toolchain", "The Cairo quickstart", "Only when you deploy a Cairo program."]
    ]},
    { t: "p", html: "Verify your Rust install before going further:" },
    { t: "code", lang: "bash", code: "rustc --version\ncargo --version" },
    { t: "p", html: "You should see a stable toolchain (e.g. <code>rustc 1.8x.x</code>). If <code>cargo</code> is not found, restart your shell so <code>~/.cargo/bin</code> is on your <code>PATH</code>." },
    { t: "h2", text: "1. Clone and build the node" },
    { t: "p", html: "Clone the core workspace and build the <code>pyrax-node</code> binary. The node has feature flags that gate optional subsystems; to serve JSON-RPC you must build with the <strong><code>rpc</code></strong> feature (the lean default build seals blocks but starts no RPC server)." },
    { t: "code", lang: "bash", code: "git clone https://github.com/pyrax-network/pyrax.git\ncd pyrax\n\n# Build the node with the JSON-RPC server (HTTP + WebSocket) enabled.\ncargo build -p pyrax-node --features rpc --release" },
    { t: "p", html: "This compiles the whole workspace the first time, which can take several minutes. The relevant feature flags:" },
    { t: "table", head: ["Feature", "What it adds"], rows: [
      ["(default)", "Lean, toolchain-free build: seals blocks on a timer, no RPC server."],
      ["rpc", "JSON-RPC server (HTTP + WebSocket) on one socket. Pulls in tokio + the persistent chain store. This is what you want for development."],
      ["mesh", "The live libp2p P2P mesh — gossip + block/tx ingest across nodes."],
      ["full", "rpc + mesh together — the production node."]
    ]},
    { t: "callout", kind: "info", html: "For a one-node dev chain you do not need <code>mesh</code>. Use <code>--features rpc</code>. Add <code>--features full</code> only when you want to join or form a multi-node network." },
    { t: "h2", text: "2. Run the dev node" },
    { t: "p", html: "Run the binary with the dev consensus engine (instant-seal). The node builds genesis, opens a persistent chain store under <code>--datadir</code>, seals a block on the current DAG tips on a fixed interval, and serves JSON-RPC on <code>127.0.0.1:&lt;rpc-port&gt;</code>." },
    { t: "code", lang: "bash", code: "cargo run -p pyrax-node --features rpc --release -- \\\n  --dev \\\n  --datadir ./pyrax-data \\\n  --rpc-port 8545" },
    { t: "h3", text: "CLI flags" },
    { t: "table", head: ["Flag", "Default", "Meaning"], rows: [
      ["--datadir <PATH>", "./pyrax-data", "Directory for chain data, keys, and node state."],
      ["--network <NETWORK>", "devnet2", "Which PYRAX network to join (see the Networks page)."],
      ["--chainspec <PATH>", "(none)", "Override the compiled-in chainspec with a TOML file (devnets only)."],
      ["--rpc-port <PORT>", "8545", "Port the JSON-RPC server listens on."],
      ["--p2p-port <PORT>", "30303", "Port the libp2p mesh listens on (used with --features mesh)."],
      ["--peer <MULTIADDR>", "(none, repeatable)", "Dial a peer on startup, e.g. /ip4/<ip>/tcp/<port>/p2p/<peer-id>."],
      ["--dev", "false", "Single-node development mode (implies the Dev instant-seal consensus)."],
      ["--consensus <KIND>", "dev", "Consensus engine: dev (instant-seal) or tristream (rotates Streams A/B/C)."],
      ["--role <ROLE>", "full", "Node role: full (mine + validate), relay (backbone, no mining), or verifier (validate-only)."]
    ]},
    { t: "callout", kind: "warn", html: "<strong>Only a <code>full</code> node produces blocks.</strong> The default role is <code>full</code>, which mines/seals. A <code>relay</code> or <code>verifier</code> node ingests, validates, and (with the mesh) relays peers' blocks but <strong>never seals</strong> — so a single <code>--role verifier</code> node on its own will never advance past genesis. For a solo dev chain, keep the default <code>--role full</code>." },
    { t: "h3", text: "Expected startup output" },
    { t: "p", html: "On launch you'll see the banner and a log line confirming the RPC server is listening:" },
    { t: "code", lang: "bash", code: "==================================================\n  PYRAX node v0.1.0\n  Layer-1 GhostDAG blockchain (shielded by default)\n--------------------------------------------------\n  network   : <name> (devnet2)\n  chain-id  : 710823\n  datadir   : ./pyrax-data\n  rpc-port  : 8545\n  seed pubs : <n>\n  dev mode  : true\n  consensus : dev\n  role      : full\n==================================================" },
    { t: "code", lang: "bash", code: "INFO opened persistent chain store datadir=./pyrax-data\nINFO JSON-RPC server (HTTP+WS) listening addr=127.0.0.1:8545 chain_id=710823\nINFO sealed dev block hash=pyr... blue_score=1 stream=C txs=0\nINFO sealed dev block hash=pyr... blue_score=2 stream=C txs=0" },
    { t: "p", html: "The <code>blue_score</code> ticks up once per seal interval. That blue score is the GhostDAG height — and it is exactly the number PYRAX surfaces to contracts as <code>block.number</code> and over <code>eth_blockNumber</code>. In dev single-stream mode it increments linearly, so it doubles as a familiar block height. Leave this terminal running; press <code>Ctrl-C</code> to stop the node cleanly." },
    { t: "h2", text: "3. Verify over JSON-RPC" },
    { t: "p", html: "The dev node serves both HTTP and WebSocket JSON-RPC on the same socket (<code>127.0.0.1:8545</code> by default). Confirm it's alive with two read calls." },
    { t: "p", html: "<strong>Chain id</strong> (<code>eth_chainId</code> returns a <code>0x</code>-prefixed hex quantity; <code>net_version</code> returns the same id as a decimal string, <code>\"710823\"</code>, which some tools prefer):" },
    { t: "code", lang: "bash", code: "curl -s http://127.0.0.1:8545 \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_chainId\",\"params\":[]}'" },
    { t: "p", html: "The result decodes to <code>710823</code> — Devnet 2." },
    { t: "p", html: "<strong>Current height</strong> (<code>eth_blockNumber</code> returns the tip's blue score as a hex quantity; the native namespace returns it as a plain decimal):" },
    { t: "code", lang: "bash", code: "curl -s http://127.0.0.1:8545 \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"pyrax_blockNumber\",\"params\":[]}'" },
    { t: "code", lang: "json", code: "{\"jsonrpc\":\"2.0\",\"id\":3,\"result\":5}" },
    { t: "callout", kind: "info", html: "<strong>Two namespaces, one node.</strong> PYRAX exposes a native <code>pyrax_*</code> namespace (DAG tips, peers, shielded-pool state, mining work) alongside an Ethereum-compatible <code>eth_*</code>/<code>net_*</code>/<code>web3_*</code> subset so that MetaMask, viem, ethers, Hardhat, and Foundry all work out of the box." },
    { t: "h2", text: "4. Connect a wallet" },
    { t: "h3", text: "MetaMask (manual network)" },
    { t: "table", head: ["Field", "Value"], rows: [
      ["Network name", "PYRAX Devnet 2"],
      ["New RPC URL", "http://127.0.0.1:8545"],
      ["Chain ID", "710823"],
      ["Currency symbol", "PYRX"],
      ["Block explorer URL", "(leave blank for local dev)"]
    ]},
    { t: "p", html: "MetaMask immediately calls <code>eth_chainId</code> and <code>net_version</code> to validate the network; if the node is running, both return <code>710823</code> and the network is accepted." },
    { t: "callout", kind: "warn", html: "<strong>Use the right chain id for the network you ran.</strong> The chain id must match the <code>--network</code> your node is on. The default is <code>710823</code> (Devnet 2); <code>--network testnet</code> is <code>104928</code>; <code>--network mainnet</code> is <code>563821</code>. A mismatch makes signed transactions un-includable (the node rejects them with a <code>ChainMismatch</code> error — replay protection)." },
    { t: "h3", text: "viem (TypeScript)" },
    { t: "code", lang: "typescript", code: "import { createPublicClient, http, defineChain } from \"viem\";\n\nexport const pyraxDevnet2 = defineChain({\n  id: 710823,\n  name: \"PYRAX Devnet 2\",\n  nativeCurrency: { name: \"PYRAX\", symbol: \"PYRX\", decimals: 18 },\n  rpcUrls: { default: { http: [\"http://127.0.0.1:8545\"] } },\n});\n\nconst client = createPublicClient({\n  chain: pyraxDevnet2,\n  transport: http(),\n});\n\nconst chainId = await client.getChainId();   // 710823\nconst blockNumber = await client.getBlockNumber(); // bigint, the current blue score\nconsole.log({ chainId, blockNumber });" },
    { t: "callout", kind: "info", html: "<strong>EIP-1559 fees on PYRAX.</strong> PYRAX runs an EIP-1559 fee market. <code>eth_gasPrice</code>, <code>eth_maxPriorityFeePerGas</code>, and <code>eth_feeHistory</code> all work; the base fee floors at <code>1</code> base unit and adjusts at most 12.5% per block." },
    { t: "h2", text: "5. Deploy your first contract" },
    { t: "p", html: "Every contract on PYRAX is an account with code and 32-byte-slot storage, executed inside L1 block application. <strong>The VM is auto-detected from the deployed code's leading bytes:</strong>" },
    { t: "table", head: ["Leading magic", "Detected VM"], rows: [
      ["\\0asm (0x00 61 73 6d)", "WASM (wasmtime)"],
      ["\\0CAIRO (0x00 43 41 49 52 4f)", "Cairo (cairo-vm)"],
      ["anything else", "EVM (revm) — the default"]
    ]},
    { t: "p", html: "The quickest deploy is the EVM path, because standard Ethereum tooling produces the raw transaction for you and <code>eth_sendRawTransaction</code> accepts it verbatim." },
    { t: "h3", text: "EVM (fastest start)" },
    { t: "code", lang: "solidity", code: "// SPDX-License-Identifier: Apache-2.0\npragma solidity ^0.8.24;\n\ncontract Counter {\n    uint256 public count;\n\n    event Incremented(uint256 newCount);\n\n    function increment() external returns (uint256) {\n        count += 1;\n        emit Incremented(count);\n        return count;\n    }\n}" },
    { t: "code", lang: "typescript", code: "import { createWalletClient, http, getContract } from \"viem\";\nimport { privateKeyToAccount } from \"viem/accounts\";\n\nconst account = privateKeyToAccount(\"0x<YOUR_FUNDED_DEV_KEY>\");\nconst wallet = createWalletClient({ account, chain: pyraxDevnet2, transport: http() });\n\n// Deploy: viem signs locally and submits via eth_sendRawTransaction.\nconst hash = await wallet.deployContract({ abi, bytecode });\n\n// Read the receipt (eth_getTransactionReceipt) — note contractAddress + status.\nconst receipt = await client.waitForTransactionReceipt({ hash });\nconsole.log(receipt.contractAddress, receipt.status); // \"0x...\", \"success\"" },
    { t: "p", html: "The returned transaction hash is <code>keccak256(raw)</code> — byte-identical to what Etherscan-style explorers expect. The contract address for a <code>CREATE</code> deploy is derived as <code>keccak256(domain ++ sender ++ nonce)[12..]</code>." },
    { t: "h3", text: "WASM" },
    { t: "code", lang: "rust", code: "use pyrax_contract_sdk as sdk;\n\nconst SLOT0: [u8; 32] = [0u8; 32];\n\n#[no_mangle]\npub extern \"C\" fn deploy() {} // optional constructor; counter starts at 0\n\n#[no_mangle]\npub extern \"C\" fn call() {\n    let mut v = sdk::storage_get(&SLOT0);\n    increment_be(&mut v);\n    sdk::storage_set(&SLOT0, &v);\n    sdk::log(&[[0u8; 32]], &v);\n    sdk::output(&v);\n}" },
    { t: "code", lang: "bash", code: "rustup target add wasm32-unknown-unknown\ncargo build -p counter --target wasm32-unknown-unknown --release" },
    { t: "p", html: "The leading <code>\\0asm</code> magic makes the ledger route the module to the WASM VM automatically. Every contract must export <code>memory</code> and <code>call</code>; <code>deploy</code> is an optional constructor." },
    { t: "h3", text: "Cairo" },
    { t: "p", html: "A Cairo program is deployed the same way, prefixed with the Cairo runtime marker so the ledger detects it. Cairo contracts talk to the chain through <code>pyrax.*</code> syscalls (<code>pyrax.storage_read</code>, <code>pyrax.storage_write</code>, <code>pyrax.emit_event</code>, <code>pyrax.get_block_number</code>, …), with calldata, output, and events all encoded as arrays of <code>felt252</code>. Gas is metered in Cairo steps (≈1 step per gas)." },
    { t: "h2", text: "Troubleshooting" },
    { t: "table", head: ["Symptom", "Cause & fix"], rows: [
      ["eth_chainId returns the wrong number / wallet rejects the network", "Check which --network you ran. Devnet 2 (default) is 710823; Testnet is 104928; Mainnet is 563821. Your wallet's chain id must match exactly."],
      ["curl to 127.0.0.1:8545 connection refused", "You almost certainly built without the RPC server. Rebuild with --features rpc (or --features full)."],
      ["blue_score / eth_blockNumber never advances past 0", "Only a full-role node seals. Use the default --role full for a single-node dev chain."],
      ["RPC only reachable from localhost", "The dev server binds to 127.0.0.1 deliberately — it is not exposed on 0.0.0.0. Front it with a reverse proxy or SSH tunnel."],
      ["Transaction rejected: InvalidNonce or InsufficientBalance", "The nonce must be the next expected value (eth_getTransactionCount), and the account must cover value + gas. Fund from a genesis-allocated dev/faucet account."],
      ["A contract call \"fails\" but still costs gas", "By design: a revert or trap is a valid-but-failed execution. The tx is included, the receipt status is 0x0, and gas is charged."],
      ["Build fails complaining about a native toolchain", "The workspace builds with stock stable Rust and needs no libclang/protoc. For local development, --features rpc is sufficient."]
    ]},
    { t: "h2", text: "Next steps" },
    { t: "list", items: [
      "<a href=\"/networks/\">Networks &amp; endpoints</a> — chain IDs, block times, and the faucet.",
      "<a href=\"/concepts/architecture/\">Architecture</a> — how GhostDAG, the shared state, and the three VMs fit together.",
      "<a href=\"/reference/json-rpc/\">JSON-RPC reference</a> — every <code>pyrax_*</code> and <code>eth_*</code> method, with params, return shapes, and error codes."
    ]}
  ]
};


const PAGE_NETWORKS: DocPage = {
  slug: "networks",
  title: "Networks & endpoints",
  blocks: [
    { t: "p", html: "PYRAX ships <strong>five</strong> networks. They are not separate codebases — every node carries all five chainspecs compiled into the binary and selects one at startup with <code>--network</code>. Each network has its own numeric <strong>chain ID</strong> (which isolates its state, signatures, and p2p gossip), its own genesis allocation, and its own purpose. The native token on every PYRAX network is <strong>PYRX</strong> (18 decimals)." },
    { t: "callout", kind: "info", html: "<strong>New here?</strong> If you just want to build and test locally, run a dev node and talk to it over JSON-RPC at <code>http://127.0.0.1:8545</code>. The chain ID for that node depends on which <code>--network</code> you pass — the default is <strong>Devnet2 (710823)</strong>." },
    { t: "h2", text: "The five networks at a glance" },
    { t: "table", head: ["Network", "--network value", "Chain ID (decimal)", "Target block time", "Faucet", "Purpose"], rows: [
      ["Internal Devnet 1.0", "internal-devnet-simulated", "881109", "5s (instant-seal)", "No", "Dev team instant-seal network (no real PoW/PoS). Internal-only."],
      ["Internal Devnet (Live)", "internal-devnet-live", "429294", "5s", "Yes", "Live internal devnet — real miners + validators across the three streams. Internal-only."],
      ["Devnet 2", "devnet2", "710823", "5s", "Yes", "Closed development network (\"Devnet 2.0\"). The default."],
      ["Testnet", "testnet", "104928", "6s", "Yes", "The official public test network."],
      ["Mainnet", "mainnet", "563821", "6s", "No", "The production network."]
    ]},
    { t: "callout", kind: "warn", html: "<strong>Chain IDs are not sequential and not Ethereum-style.</strong> PYRAX chain IDs are the agreed, pinned decimal assignments above — they are deliberately not <code>1</code>, <code>1337</code>, or any familiar Ethereum value. Use the exact numbers when configuring MetaMask, Hardhat, Foundry, or any EIP-155 signer; a mismatched chain ID makes signatures invalid and transactions un-includable (<code>ChainMismatch</code>). <code>eth_chainId</code> returns the value as a <code>0x</code>-prefixed hex quantity; <code>net_version</code> returns the same value as a decimal string." },
    { t: "h2", text: "How the networks differ" },
    { t: "p", html: "The five networks fall into three tiers." },
    { t: "h3", text: "Production — Mainnet" },
    { t: "p", html: "<strong>Mainnet</strong> (<code>563821</code>) is the real, value-bearing network. PYRX on mainnet is the production token. There is <strong>no faucet</strong>: you acquire PYRX, you don't mint it for free. Mainnet's chainspec is <strong>pinned by a blake3 hash</strong> that a unit test checks — if the embedded mainnet spec file ever changes, the build fails until the pin is updated deliberately. Mainnet's genesis block hash is likewise pinned." },
    { t: "h3", text: "Public test — Testnet" },
    { t: "p", html: "<strong>Testnet</strong> (<code>104928</code>) is the official public test network — the one outside developers join. It behaves like mainnet (real miners and validators across the three streams) but its PYRX has no value, and it carries a <strong>seeded faucet account</strong> in its genesis allocation. Like mainnet, the testnet chainspec and genesis hash are pinned by blake3 for tamper-evidence." },
    { t: "h3", text: "Development / internal — the three devnets" },
    { t: "list", items: [
      "<strong>Devnet 2</strong> (<code>710823</code>) — the closed development network and the <strong>default</strong> when you run a node with no <code>--network</code> flag. Has a faucet.",
      "<strong>Internal Devnet (Live)</strong> (<code>429294</code>) — operates exactly like the real network (real PoW/PoS work across the three streams) but is internal-only. Has a faucet.",
      "<strong>Internal Devnet 1.0</strong> (<code>881109</code>) — the dev team's instant-seal network: blocks seal immediately with no real proof-of-work or proof-of-stake. Internal-only. No faucet."
    ]},
    { t: "p", html: "The three devnets are <strong>not pinned</strong> the way the public networks are and may be overridden at runtime with a custom <code>--chainspec &lt;path&gt;</code> TOML file (devnets only)." },
    { t: "h2", text: "RPC endpoints" },
    { t: "h3", text: "Local development node" },
    { t: "p", html: "A dev node serves JSON-RPC over <strong>HTTP and WebSocket on a single socket</strong>. The default listen port is <code>8545</code>, so the local endpoints are:" },
    { t: "table", head: ["Transport", "URL"], rows: [
      ["HTTP", "http://127.0.0.1:8545"],
      ["WebSocket", "ws://127.0.0.1:8545"]
    ]},
    { t: "p", html: "The port is set with <code>--rpc-port</code> (default <code>8545</code>). The same socket answers the native <code>pyrax_*</code> namespace, the Ethereum-compatible <code>eth_*</code> subset, the <code>eth_*Filter</code> poll API, <code>eth_subscribe</code> (over WS), and <code>web3_*</code> / <code>net_*</code> tooling." },
    { t: "code", lang: "bash", code: "# Confirm which chain your node thinks it is on (Devnet2 = 710823)\ncurl -s http://127.0.0.1:8545 \\\n  -H 'content-type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_chainId\",\"params\":[]}'\n\n# Native height (GhostDAG blue score)\ncurl -s http://127.0.0.1:8545 \\\n  -H 'content-type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"pyrax_blockNumber\",\"params\":[]}'" },
    { t: "callout", kind: "info", html: "<strong>Verify the chain ID before sending signed transactions.</strong> Always read <code>eth_chainId</code> (hex) or <code>net_version</code> (decimal) from a node before submitting signed transactions to it. The value comes straight from the node's selected network, so it is the ground truth for which chain you are actually talking to." },
    { t: "h3", text: "Hosted endpoints" },
    { t: "p", html: "PYRAX's hosted node services (updates, peer discovery, sync, the per-node web portals, the directory, and docs) run under <strong>pyraxchain.com</strong>. Public hosted RPC and supporting services for the test and production networks are served from that domain rather than from your local socket. The organization's brand and email stay on <strong>pyraxchain.com</strong>, while the operational hosted services live on <strong>pyraxchain.com</strong>. For local development, always use <code>http://127.0.0.1:8545</code>." },
    { t: "h2", text: "The testnet faucet (and other seeded networks)" },
    { t: "p", html: "Three of the five networks ship with a <strong>seeded faucet account</strong> in their genesis allocation, so test addresses can be funded with PYRX. The faucet system account dispenses <strong>500 PYRX per claim</strong> with a <strong>12 h cooldown</strong>." },
    { t: "table", head: ["Network", "Faucet?"], rows: [
      ["Internal Devnet 1.0", "No"],
      ["Internal Devnet (Live)", "Yes"],
      ["Devnet 2", "Yes"],
      ["Testnet", "Yes"],
      ["Mainnet", "No"]
    ]},
    { t: "p", html: "For most external developers, <strong>Testnet (104928)</strong> is the network with a faucet you should target. The faucet is a pre-funded genesis account; the test PYRX it dispenses has no value. Mainnet has <strong>no faucet by design</strong> — production PYRX is never minted for free." },
    { t: "callout", kind: "info", html: "There is a reserved on-chain <code>FAUCET</code> system address at <code>0x0000000000000000000000000000000000000202</code>, alongside the treasury block (<code>PYRAX_TREASURY</code> at <code>0x…0200</code>, <code>DAO_TREASURY</code> at <code>0x…0201</code>). These are part of the reserved system-address range and exist on the networks that seed them." },
    { t: "h2", text: "Running a node and picking a network" },
    { t: "p", html: "The node binary selects its network with <code>--network</code>, taking one of the five values from the table above. With no flag it defaults to <strong>Devnet2</strong>." },
    { t: "code", lang: "bash", code: "# Default: joins Devnet2 (chain id 710823), RPC on :8545, P2P on :30303\ncargo run -p pyrax-node --features full\n\n# Join the public testnet explicitly\ncargo run -p pyrax-node --features full -- --network testnet\n\n# Single-node local dev (instant seal), custom data dir and RPC port\ncargo run -p pyrax-node --features full -- \\\n  --dev \\\n  --datadir ./my-pyrax-data \\\n  --rpc-port 8545" },
    { t: "callout", kind: "warn", html: "<strong><code>--chainspec</code> is devnet-only.</strong> You can override a devnet's parameters at runtime with <code>--chainspec &lt;path&gt;</code>, but the public <strong>testnet</strong> and <strong>mainnet</strong> specs are baked into the binary and pinned by a blake3 hash — they are not meant to be replaced at runtime. A node always carries valid parameters with no runtime file dependency." },
    { t: "h3", text: "Node roles" },
    { t: "p", html: "<code>--role</code> does not change which chain you are on; it changes what the node does on that chain:" },
    { t: "list", items: [
      "<strong><code>full</code></strong> — mines/produces blocks, validates, and joins the AI job pool.",
      "<strong><code>relay</code></strong> — relays blocks and transactions and serves peer discovery (DHT-heavy); does <strong>not</strong> mine or do producer validation.",
      "<strong><code>verifier</code></strong> — validates every block and proof; does <strong>not</strong> mine and is not a discovery backbone."
    ]},
    { t: "h2", text: "Bootstrap model (no central boot server)" },
    { t: "p", html: "PYRAX is <strong>bootstrapless</strong>: a network's <code>bootnodes</code> list is normally empty. Peers find each other via mDNS, the Kademlia DHT, peer-exchange, and <strong>signed seed lists</strong> — which a node trusts only from the Ed25519 publisher keys listed in that network's chainspec (<code>trusted_seed_publishers</code>). You can still dial specific peers at startup with <code>--peer</code>, or at runtime via the <code>pyrax_dialPeers</code> RPC." },
    { t: "h2", text: "Summary" },
    { t: "list", items: [
      "Five networks, each with a fixed decimal chain ID: simulated <code>881109</code>, internal-live <code>429294</code>, <strong>Devnet2 <code>710823</code> (default)</strong>, <strong>Testnet <code>104928</code></strong>, <strong>Mainnet <code>563821</code></strong>.",
      "Target block time is 5s on the devnets and 6s on testnet and mainnet (the simulated devnet seals instantly).",
      "Local dev RPC (HTTP + WS) lives on one socket at <code>http://127.0.0.1:8545</code>; hosted services live on <strong>pyraxchain.com</strong>.",
      "Faucets exist on internal-live, Devnet2, and <strong>Testnet</strong> (500 PYRX/claim, 12 h cooldown) — not on the simulated devnet or mainnet.",
      "The native token everywhere is <strong>PYRX</strong> (18 decimals)."
    ]}
  ]
};


const PAGE_ACCOUNTS: DocPage = {
  slug: "accounts-and-storage",
  title: "Accounts & storage",
  blocks: [
    { t: "p", html: "Everything on PYRAX lives in <strong>accounts</strong>. A wallet holds a balance in an account; a contract is <em>also</em> an account — one that happens to carry code and storage. This single, uniform account model is what lets the EVM, WASM, and Cairo virtual machines share one world state and call into each other." },
    { t: "callout", kind: "info", html: "<strong>Prerequisites.</strong> If you've used Ethereum, the account shape will feel familiar — PYRAX deliberately keeps EOAs, 20-byte addresses, nonces, and 32-byte storage slots Ethereum-compatible so existing tooling (MetaMask, Hardhat, Foundry, ethers/viem) works against the dev node's JSON-RPC." },
    { t: "h2", text: "The account model" },
    { t: "p", html: "The world state is a map from a 20-byte <strong>address</strong> to an <strong><code>Account</code></strong>. Every account — whether it's your wallet or a deployed contract — has exactly four fields." },
    { t: "code", lang: "rust", code: "// pyrax-state/src/lib.rs\npub struct Account {\n    pub balance: Amount,    // spendable balance, in base units (PYRX)\n    pub nonce: u64,         // next expected transaction nonce (replay protection)\n    pub code_hash: Hash,    // hash of the account's code (Hash::ZERO for a plain account)\n    pub storage_root: Hash, // root of the account's own storage\n}" },
    { t: "table", head: ["Field", "Type", "Meaning"], rows: [
      ["balance", "Amount (wraps u128)", "Spendable native-token (PYRX) balance, in base units."],
      ["nonce", "u64", "The next transaction nonce the account is expected to use. Increments on every transaction it sends; a mismatch is rejected with InvalidNonce { expected, got }."],
      ["code_hash", "Hash (32 bytes)", "BLAKE3 hash of the account's stored code, or Hash::ZERO if the account has no code. This is how an account \"remembers\" it is a contract."],
      ["storage_root", "Hash (32 bytes)", "Root commitment over the account's own storage."]
    ]},
    { t: "p", html: "An account is considered a <strong>contract</strong> exactly when it has code:" },
    { t: "code", lang: "rust", code: "// pyrax-state/src/lib.rs\nimpl Account {\n    pub fn is_contract(&self) -> bool {\n        self.code_hash != Hash::ZERO\n    }\n}" },
    { t: "p", html: "An <em>unknown</em> address (one never funded and never deployed to) reads back as the default account — <code>balance = 0</code>, <code>nonce = 0</code>, <code>code_hash = ZERO</code>, <code>storage_root = ZERO</code>. Reading state never fails on a missing address; it returns this empty account. The native <code>pyrax_getBalance</code> and <code>pyrax_nonce</code> RPCs (and their <code>eth_getBalance</code> / <code>eth_getTransactionCount</code> equivalents) surface these fields." },
    { t: "h2", text: "Addresses" },
    { t: "p", html: "A PYRAX address is <strong>20 bytes</strong>, exactly like Ethereum. Two derivation paths exist." },
    { t: "h3", text: "Externally-owned accounts (EOAs)" },
    { t: "p", html: "An EOA is controlled by a private key. Its address is derived from the corresponding <strong>secp256k1</strong> public key the same way Ethereum does it — the low 20 bytes of the keccak256 of the public key. Because the signing scheme and hashing match Ethereum, a key generated in MetaMask or Foundry produces the <em>same</em> address on PYRAX." },
    { t: "h3", text: "Contract addresses" },
    { t: "p", html: "<strong><code>CREATE</code> (nonce-derived).</strong> The address is a domain-separated keccak256 over the deploying sender and its nonce. Critically, the domain string is <strong>per-VM</strong>, so the same <code>(sender, nonce)</code> pair yields a different address depending on which VM the code targets:" },
    { t: "code", lang: "rust", code: "// pyrax-state/src/contract.rs\nfn create_address(domain: &[u8], sender: Address, nonce: u64) -> Address {\n    let mut pre = Vec::with_capacity(domain.len() + 20 + 8);\n    pre.extend_from_slice(domain);\n    pre.extend_from_slice(&sender.0);\n    pre.extend_from_slice(&nonce.to_be_bytes());\n    let h = pyrax_crypto::keccak256(&pre);\n    let mut a = [0u8; 20];\n    a.copy_from_slice(&h[12..]); // low 20 bytes\n    Address(a)\n}" },
    { t: "table", head: ["VM", "CREATE domain"], rows: [
      ["EVM", "b\"PYRAX-EVM-CREATE\""],
      ["WASM", "b\"PYRAX-WASM-CREATE\""],
      ["Cairo", "b\"PYRAX-CAIRO-CREATE\""]
    ]},
    { t: "p", html: "<strong><code>CREATE2</code> (salt-derived, EIP-1014).</strong> PYRAX implements the standard Ethereum formula so addresses are counterfactually pre-computable:" },
    { t: "code", lang: "rust", code: "// pyrax-state/src/contract.rs:141\npub fn create2_address(sender: Address, salt: [u8; 32], init_code: &[u8]) -> Address {\n    let code_hash = pyrax_crypto::keccak256(init_code);\n    let mut pre = Vec::with_capacity(1 + 20 + 32 + 32);\n    pre.push(0xff);\n    pre.extend_from_slice(&sender.0);\n    pre.extend_from_slice(&salt);\n    pre.extend_from_slice(&code_hash);\n    let h = pyrax_crypto::keccak256(&pre);\n    let mut a = [0u8; 20];\n    a.copy_from_slice(&h[12..]);\n    Address(a)\n}" },
    { t: "p", html: "The formula is <code>keccak256(0xff ++ sender ++ salt ++ keccak256(init_code))[12..]</code>. Unlike <code>CREATE</code>, <code>CREATE2</code> is <strong>not</strong> domain-separated by VM: a WASM or Cairo factory and an EVM factory all land a child at the same deterministic address for the same <code>(sender, salt, init_code)</code>. This is what makes cross-VM <code>CREATE2</code> factories possible." },
    { t: "callout", kind: "warn", html: "<strong>Reserved system addresses.</strong> The all-zero prefix block is reserved. Precompiles occupy <code>0x00..00_01xx</code> (e.g. <code>0x…0101</code> BLAKE3, <code>0x…0103</code> KECCAK256), and the treasury/faucet block occupies <code>0x00..00_02xx</code> (e.g. <code>0x…0200</code> PYRAX treasury, <code>0x…0202</code> faucet). A <code>CREATE2</code> address landing in this reserved range is rejected; the probability of a keccak-derived address colliding here is roughly 2⁻¹⁴⁴." },
    { t: "h2", text: "EOAs vs. contracts" },
    { t: "table", head: ["", "EOA", "Contract"], rows: [
      ["code_hash", "Hash::ZERO", "non-zero (commits to code + VM)"],
      ["is_contract()", "false", "true"],
      ["Created by", "generating a keypair", "deploying code (CREATE / CREATE2)"],
      ["Can send transactions", "yes (signs with private key)", "only as a cross-VM callee within a frame"],
      ["Can hold a balance", "yes", "yes"],
      ["Has storage", "empty", "32-byte slot map"],
      ["eth_getCode returns", "0x (empty)", "the runtime bytecode"]
    ]},
    { t: "h2", text: "The 32-byte storage slot model — shared across all VMs" },
    { t: "callout", kind: "info", html: "Contract storage is a map from a 32-byte key (slot) to a 32-byte value, and that model is <strong>identical</strong> for the EVM, WASM, and Cairo. There is one storage namespace per contract, addressed by 32-byte slots, no matter which VM wrote it." },
    { t: "p", html: "Because the slot model is shared, a value written by one VM can be read by another at the same slot. A 32-byte big-endian word is a 32-byte big-endian word everywhere. Unset slots read back as 32 zero bytes; there is no \"does this slot exist\" distinction. The state backend trait the VMs are built against makes this explicit — the storage key and value are both 32-byte words:" },
    { t: "code", lang: "rust", code: "// pyrax-vm-wasm/src/lib.rs:125  (the EVM and Cairo backends mirror this shape)\npub trait StateBackend {\n    fn account(&self, address: Address) -> Result<AccountState, WasmError>;\n    fn storage(&self, address: Address, slot: U256) -> Result<U256, WasmError>;\n    fn set_account(&mut self, address: Address, account: AccountState) -> Result<(), WasmError>;\n    fn set_storage(&mut self, address: Address, slot: U256, value: U256) -> Result<(), WasmError>;\n}" },
    { t: "p", html: "Here <code>U256</code> is just a <code>[u8; 32]</code> — a 256-bit big-endian word — and so is the EVM's and Cairo's native word type. The in-memory backends all key storage the same way: <code>HashMap&lt;(Address, [u8; 32]), [u8; 32]&gt;</code>." },
    { t: "h3", text: "How each VM reads and writes a slot" },
    { t: "p", html: "Each VM exposes the same two operations — read a slot, write a slot — through its own native interface. The semantics (32-byte key in, 32-byte value out) are identical; only the surface syntax differs." },
    { t: "code", lang: "solidity", title: "EVM — SLOAD / SSTORE", code: "// Read/write slot 0 directly. A declared `uint256 x;` is just slot 0.\nfunction readSlot(uint256 slot) external view returns (uint256 v) {\n    assembly { v := sload(slot) }      // 32-byte slot -> 32-byte value\n}\nfunction writeSlot(uint256 slot, uint256 val) external {\n    assembly { sstore(slot, val) }     // write 32-byte value to 32-byte slot\n}" },
    { t: "code", lang: "rust", title: "WASM — storage_get / storage_set (pyrax-contract-sdk)", code: "use pyrax::{storage_get, storage_set};\n\n// Read 32 bytes from a slot (all-zero if never written).\nlet value: [u8; 32] = storage_get(&slot_key);\n\n// Write 32 bytes to a slot.\nstorage_set(&slot_key, &new_value);" },
    { t: "code", lang: "cairo", title: "Cairo — pyrax.storage_read / pyrax.storage_write", code: "// Read slot `key` (a felt) into `value`.\n%{ syscall_handler = \"pyrax.storage_read\" %}   // reads ids.key, writes ids.value\n\n// Write `value` to slot `key`.\n%{ syscall_handler = \"pyrax.storage_write\" %}  // reads ids.key, ids.value" },
    { t: "h3", text: "Slot operations side-by-side" },
    { t: "table", head: ["VM", "Read", "Write", "Key / value type", "Read gas", "Write gas"], rows: [
      ["EVM", "SLOAD", "SSTORE", "32-byte word (U256)", "(revm pricing)", "(revm pricing)"],
      ["WASM", "storage_get (storage_read)", "storage_set (storage_write)", "[u8; 32]", "800", "5,000"],
      ["Cairo", "pyrax.storage_read", "pyrax.storage_write", "felt252 ↔ 32-byte word", "1 word", "1 word"]
    ]},
    { t: "callout", kind: "info", html: "All three VMs apply storage writes to an <strong>overlay</strong> during execution and only commit (flush) them on success. A reverted or trapped call discards its storage writes entirely — the revert is still included in the block and charged gas, but its state mutations are rolled back." },
    { t: "h2", text: "Code storage (tagged by VM)" },
    { t: "p", html: "When you deploy a contract, its runtime code is stored once in a content-addressed code store, and the account's <code>code_hash</code> points at it. The VM is auto-detected from the code's leading <strong>magic bytes</strong> at deploy time:" },
    { t: "code", lang: "rust", code: "// pyrax-state/src/contract.rs:54\npub fn detect_vm(code: &[u8]) -> VmKind {\n    if code.starts_with(b\"\\0asm\") {        // WebAssembly module preamble\n        VmKind::Wasm\n    } else if code.starts_with(CAIRO_MAGIC) { // b\"\\0CAIRO\"\n        VmKind::Cairo\n    } else {\n        VmKind::Evm                          // default: treat as EVM bytecode\n    }\n}" },
    { t: "p", html: "The code store keys runtime code by a content hash, but the stored bytes are <strong><code>[vm_tag] ++ code</code></strong> — a single byte recording the VM, followed by the code. The account's <code>code_hash</code> is the BLAKE3 of those <em>tagged</em> bytes, so the hash commits to <strong>both the code and the VM</strong>:" },
    { t: "code", lang: "rust", code: "// pyrax-state/src/contract.rs:993\nfn store_code(&mut self, vm: VmKind, code: &[u8]) -> Hash {\n    let mut tagged = Vec::with_capacity(1 + code.len());\n    tagged.push(vm.tag());               // 0 = EVM, 1 = WASM, 2 = Cairo\n    tagged.extend_from_slice(code);\n    let h = Hash(pyrax_crypto::blake3(&tagged));\n    self.code.insert(h, tagged);\n    h                                    // account.code_hash = this\n}" },
    { t: "table", head: ["VmKind", "tag()"], rows: [["Evm", "0"], ["Wasm", "1"], ["Cairo", "2"]] },
    { t: "p", html: "The runtime code that <code>eth_getCode</code> returns is the <strong>untagged</strong> code (the tag is an internal storage detail). For WASM and Cairo, the leading magic is intentionally <strong>kept</strong> in the stored runtime so the code is self-identifying." },
    { t: "h2", text: "The shared state overlay" },
    { t: "p", html: "Every contract execution — EVM, WASM, or Cairo — runs against a <code>LedgerView</code>: a <strong>staging view</strong> of the committed ledger. It is the mechanism that makes \"commit on success, discard on revert\" work uniformly across all three VMs. The overlay has exactly three behaviors:" },
    { t: "list", items: [
      "<strong>Read-through.</strong> A read first checks the overlay; on a miss it falls through to the committed ledger (returning zero / a default account if the ledger has nothing).",
      "<strong>Buffered writes.</strong> <code>set_account</code> / <code>set_storage</code> only insert into the overlay's in-memory maps. The committed ledger is never touched during execution.",
      "<strong>Commit-on-success / discard-on-revert.</strong> When the VM returns, <code>pyrax-state</code> applies the accumulated account and storage writes to the real ledger <strong>only on the success path</strong>. A revert or trap returns the overlay unread, so nothing is applied — the transaction is still included and gas is still charged, but its state changes vanish."
    ]},
    { t: "code", lang: "rust", title: "Read-through, from pyrax-state/src/contract.rs", code: "fn storage(&self, address, slot) -> Result<U256, EvmError> {\n    if let Some(v) = self.storage.get(&(address, slot.0)) {\n        return Ok(U256(*v));            // overlay hit\n    }\n    let v = self.ledger.storage          // fall through to committed ledger\n        .get(&(pa(address), Hash(slot.0)))\n        .copied().unwrap_or(Hash::ZERO); // unset slot = zero\n    Ok(U256(v.0))\n}" },
    { t: "p", html: "Because the EVM, WASM, and Cairo account/storage byte layouts are identical (20-byte addresses, 32-byte storage slots, <code>balance</code>/<code>nonce</code>/<code>code</code>), all three VMs implement their <code>StateBackend</code> against the <em>same</em> <code>LedgerView</code> — the WASM and Cairo backends literally delegate to the EVM backend. One overlay, three VMs. This is also why an EVM contract calling a WASM contract (or vice versa) operates over the same staging state, and a reverting callee is isolated exactly like a reverting EVM sub-call." },
    { t: "h2", text: "What the state_root commits — and what it doesn't (yet)" },
    { t: "p", html: "Each block header carries a <code>state_root</code> (root of post-execution state), built from an account commitment plus the shielded note-tree root and nullifier accumulator. The account commitment folds in every account's address, balance, nonce, <code>code_hash</code>, and <code>storage_root</code>:" },
    { t: "code", lang: "rust", code: "// pyrax-state/src/lib.rs:601 (state_root)\nfor (addr, acct) in accounts {        // sorted by address\n    buf.extend_from_slice(&addr.0);\n    buf.extend_from_slice(&acct.balance.0.to_be_bytes());\n    buf.extend_from_slice(&acct.nonce.to_be_bytes());\n    buf.extend_from_slice(&acct.code_hash.0);      // deployed code IS committed\n    buf.extend_from_slice(&acct.storage_root.0);\n}" },
    { t: "callout", kind: "warn", html: "<strong>Per-account storage is not yet folded into the <code>state_root</code>.</strong> In the current Phase 10 devnet slice, the account commitment includes each contract's <code>code_hash</code>, but per-account contract storage is not yet folded into the root. This is consensus-safe today because PYRAX achieves agreement by <strong>re-execution, not by trusting committed storage</strong>: when a node ingests a peer's block, it re-executes the block's transactions against its own state. Deterministic execution means every honest node converges on the same storage. Committing storage via a per-account storage trie is planned and lands with a genesis re-pin." },
    { t: "h2", text: "What can go wrong" },
    { t: "table", head: ["Symptom", "Cause", "Fix"], rows: [
      ["InvalidNonce { expected, got }", "Transaction nonce doesn't match the account's next expected nonce.", "Query pyrax_nonce / eth_getTransactionCount and resubmit with the right nonce."],
      ["InsufficientBalance", "Account lacked balance for value + fees.", "Fund the account (testnet has a faucet); reduce value/gas."],
      ["eth_getCode returns 0x for a contract you \"deployed\"", "Deploy reverted, or you're querying an EOA / wrong address.", "Check the receipt's success and contract_address; recompute the CREATE/CREATE2 address (CREATE is VM-domain-separated)."],
      ["Slot reads back as all zeros", "Slot was never written, or you derived the slot key differently than the writer.", "Confirm the slot derivation matches across VMs (it's a literal 32-byte key); unset = 32 zero bytes by design."],
      ["A storage write \"disappeared\"", "The call reverted or trapped; writes are rolled back on failure.", "Check the receipt success flag — a revert is included and gas-charged but mutates nothing."],
      ["Two VMs derive different contract addresses for the same sender/nonce", "CREATE is domain-separated per VM.", "Use CREATE2 for VM-agnostic deterministic addresses, or derive with the correct per-VM domain."]
    ]}
  ]
};


const PAGE_TRANSACTIONS: DocPage = {
  slug: "transactions",
  title: "Transactions",
  blocks: [
    { t: "p", html: "A <strong>transaction</strong> is the unit of state change on PYRAX. Every balance transfer, contract deployment, and contract call enters the chain as a transaction, gets ordered by <a href=\"/concepts/consensus/\">GhostDAG consensus</a>, and is applied during L1 block application." },
    { t: "callout", kind: "info", html: "<strong>New here?</strong> If you just want to send a transaction with MetaMask, Hardhat, Foundry, or viem: PYRAX speaks standard Ethereum JSON-RPC. Point your tooling at the dev node's RPC socket, sign as usual, and your wallet's <code>eth_sendRawTransaction</code> call just works." },
    { t: "h2", text: "The transaction envelope" },
    { t: "p", html: "Internally, every transaction is one variant of a single <code>Tx</code> envelope (defined in <code>pyrax-primitives</code>). Blocks carry <code>Tx</code> values, not any one concrete type. There are three variants:" },
    { t: "table", head: ["Variant", "Privacy", "Signature scheme", "Tx id (hash)", "Entry point"], rows: [
      ["Shielded(ShieldedTransaction)", "Private (default)", "Zero-knowledge proof", "BLAKE3(encode)", "pyrax_sendTransaction"],
      ["Transparent(Transaction)", "Public", "secp256k1 over BLAKE3 payload", "BLAKE3(signing payload)", "pyrax_sendTransaction"],
      ["Ethereum(EthTransaction)", "Public", "secp256k1 over keccak256 (EIP-155)", "keccak256(raw bytes)", "eth_sendRawTransaction"]
    ]},
    { t: "p", html: "Shielded is the <em>default</em> shape — PYRAX is privacy-forward — but transparent and Ethereum transactions are first-class and are how all EVM/WASM/Cairo contract activity flows. The native token transferred in <code>value</code> across all three is <strong>PYRX</strong>, denominated in base units (the <code>Amount</code> type wraps a <code>u128</code>)." },
    { t: "callout", kind: "info", html: "<strong>Which one do I use?</strong> Building with EVM tooling (MetaMask, Foundry, Hardhat, viem)? You're sending <strong>Ethereum</strong> transactions. Want a simple, explicit on-chain transfer with a visible sender? That's a <strong>Transparent</strong> transaction. Want private value transfer? That's a <strong>Shielded</strong> transaction, where the prover runs wallet-side." },
    { t: "h2", text: "Native Ethereum transactions" },
    { t: "p", html: "PYRAX accepts standard, unmodified Ethereum-signed transactions — legacy, EIP-2930 (access list), and EIP-1559 (dynamic fee) — so existing Ethereum tooling targets the L1 EVM out of the box. An <code>EthTransaction</code> stores exactly one field — the raw signed bytes verbatim:" },
    { t: "code", lang: "rust", code: "pub struct EthTransaction {\n    /// Raw EIP-2718 signed transaction, exactly as passed to\n    /// `eth_sendRawTransaction` (with the `0x` stripped).\n    pub raw: Vec<u8>,\n}" },
    { t: "p", html: "Storing the raw bytes (rather than pre-decoded fields) lets every node independently re-decode and re-verify the signature, and keeps the canonical transaction id — <code>keccak256(raw)</code> — byte-exact with what wallets and block explorers expect. On every node, at mempool admission and again at block application, the bytes are structurally decoded (RLP / EIP-2718), the sender is recovered by secp256k1 over the keccak256, EIP-155-bound signing hash, and the fields are extracted into plain PYRAX domain types." },
    { t: "p", html: "The effective price the ledger charges is <code>min(gas_price, base_fee + max_priority_fee_per_gas)</code> — standard EIP-1559. A legacy transaction maps its whole <code>gasPrice</code> to the tip cap, so its effective tip is <code>gasPrice − base_fee</code>." },
    { t: "h3", text: "Chain binding (EIP-155)" },
    { t: "p", html: "The signature is EIP-155-bound to a chain id. You <strong>must</strong> sign for the network you're targeting, or recovery yields a different (wrong) sender and the transaction is rejected. PYRAX chain ids (decimal):" },
    { t: "table", head: ["Network", "Chain id (decimal)"], rows: [
      ["Internal Devnet 1.0", "881109"],
      ["Internal Devnet (Live)", "429294"],
      ["Devnet2 (default)", "710823"],
      ["Testnet (public, has faucet)", "104928"],
      ["Mainnet", "563821"]
    ]},
    { t: "p", html: "Query the live value with <code>eth_chainId</code> (hex) or <code>net_version</code> (decimal). Set this as your wallet's network chain id before signing." },
    { t: "callout", kind: "warn", html: "<strong>Blob transactions are not supported.</strong> EIP-4844 (blob) transactions are rejected on the L1 EVM. A blob tx decodes structurally but is refused with an <code>Unsupported</code> error before admission. Use legacy, EIP-2930, or EIP-1559 types." },
    { t: "h3", text: "Example: submit a raw Ethereum transaction" },
    { t: "code", lang: "typescript", code: "import { createWalletClient, http, parseEther } from \"viem\";\nimport { privateKeyToAccount } from \"viem/accounts\";\n\nconst account = privateKeyToAccount(\"0x...your-private-key...\");\n\nconst client = createWalletClient({\n  account,\n  transport: http(\"http://127.0.0.1:8545\"),\n  chain: {\n    id: 710823, // Devnet2 — must match eth_chainId\n    name: \"PYRAX Devnet2\",\n    nativeCurrency: { name: \"PYRAX\", symbol: \"PYRX\", decimals: 18 },\n    rpcUrls: { default: { http: [\"http://127.0.0.1:8545\"] } },\n  },\n});\n\n// viem signs locally and calls eth_sendRawTransaction under the hood.\nconst hash = await client.sendTransaction({\n  to: \"0x0000000000000000000000000000000000001234\",\n  value: parseEther(\"1\"),\n});\nconsole.log(hash); // 0x... == keccak256(raw signed bytes)" },
    { t: "h2", text: "Transparent transactions" },
    { t: "p", html: "A transparent transaction is PYRAX's native explicit transfer: the sender is visible and there is no privacy. It is signed with a 65-byte recoverable secp256k1 signature over a BLAKE3 payload (not keccak/RLP — a PYRAX-native shape, distinct from the Ethereum envelope)." },
    { t: "code", lang: "rust", code: "pub struct Transaction {\n    pub chain_id: ChainId,      // Network id (replay protection)\n    pub nonce: u64,             // Sender-scoped sequence number\n    pub to: Option<Address>,    // Recipient; None = contract creation\n    pub value: Amount,          // Value transferred (base units)\n    pub gas_limit: u64,         // Maximum gas the tx may consume\n    pub gas_price: Amount,      // Price offered per unit of gas\n    pub data: Vec<u8>,          // Call data / contract init code\n    pub signature: Signature,   // 65-byte recoverable secp256k1 signature\n}" },
    { t: "p", html: "The <strong>signing payload</strong> is the deterministic encoding of every field except the signature; the signing hash — and the canonical transaction id — is <code>BLAKE3</code> of that payload, so the id is stable before and after signing:" },
    { t: "code", lang: "bash", code: "signing_hash = BLAKE3( encode(chain_id, nonce, to, value, gas_limit, gas_price, data) )\nhash         = signing_hash   // the tx id is the signing hash; stable before and after signing" },
    { t: "p", html: "Submit transparent transactions with <code>pyrax_sendTransaction</code>, which returns a <code>pyr</code>-prefixed transaction hash." },
    { t: "h2", text: "Shielded transactions" },
    { t: "p", html: "Shielded transactions are the privacy-preserving default. Value moves between note commitments; spends are authorized by a zero-knowledge proof rather than a recoverable signature, and the prover runs <strong>wallet-side</strong> (no keys ever reach the node). The canonical id is <code>BLAKE3(encode)</code> over all <code>ShieldedTransaction</code> fields. The node only exposes the public data a wallet needs to scan and build proofs locally — note commitments, encrypted note ciphertexts, the tree anchor, and the spent-nullifier set — via <code>pyrax_shieldedChainData</code> and <code>pyrax_noteState</code>. Every shielded spend burns a flat <code>SHIELDED_FEE = 100</code> base units as anti-DoS, and applies to shield, transfer, and deshield." },
    { t: "h2", text: "Encoding a deployment" },
    { t: "p", html: "A <strong>contract deployment</strong> is a transaction with <strong>no recipient</strong> and the contract's init code in <code>data</code>. PYRAX auto-detects which VM the code targets from a magic prefix — you do <strong>not</strong> pick a VM flag:" },
    { t: "code", lang: "bash", code: "to    = null (None)\ndata  = init/runtime code\nvalue = optional endowment\n\n# Address derivation:\nCREATE (nonce-derived):  keccak256(domain || sender || nonce)[12..]\n  EVM:   domain = b\"PYRAX-EVM-CREATE\"\n  WASM:  domain = b\"PYRAX-WASM-CREATE\"\n  Cairo: domain = b\"PYRAX-CAIRO-CREATE\"\n\nCREATE2 (EIP-1014):  keccak256(0xff || sender || salt || keccak256(init_code))[12..]" },
    { t: "callout", kind: "warn", html: "<strong>Endowing a new contract.</strong> A contract-creation transaction with a non-zero <code>value</code> but <strong>no code</strong> is rejected with <code>UnsupportedTransaction</code> — there's nothing to receive the endowment. Send value to a contract by calling it after deployment, or include init code that accepts value." },
    { t: "h2", text: "Encoding a call" },
    { t: "p", html: "A <strong>contract call</strong> is a transaction whose recipient is the contract and whose <code>data</code> is the calldata (first 4 bytes = method selector, by convention). The selector convention is shared across VMs: EVM selectors are <code>keccak256(\"transfer(address,uint256)\")[0..4]</code> etc.; WASM contracts read the first 4 calldata bytes via the SDK's <code>selector()</code>; Cairo contracts receive calldata as an array of felts." },
    { t: "h3", text: "Read-only calls vs state-changing calls" },
    { t: "table", head: ["", "eth_call", "eth_sendRawTransaction"], rows: [
      ["Mutates state?", "No — read-only over latest state", "Yes — applied in a block"],
      ["Costs gas on-chain?", "No (gas is metered but nothing is charged)", "Yes"],
      ["Returns", "Output bytes immediately", "A tx hash; result via receipt"],
      ["Reverts", "Errors with the revert reason", "Included + gas-charged"]
    ]},
    { t: "callout", kind: "info", html: "<strong>Reverts are not free.</strong> A revert is included and gas-charged in a real (state-changing) transaction. The transaction lands in a block, consumes gas, and produces a receipt with <code>success = false</code>. This is true for all three VMs: a WASM <code>revert</code>/trap or a Cairo <code>pyrax.revert</code> is a failed but valid execution. Only <code>eth_call</code> (read-only) surfaces the revert as an immediate RPC error instead." },
    { t: "h2", text: "Transaction hashing" },
    { t: "table", head: ["Variant", "Hash function", "Over"], rows: [
      ["Ethereum", "keccak256", "The raw EIP-2718 signed bytes"],
      ["Transparent", "BLAKE3", "The signing payload (all fields except signature)"],
      ["Shielded", "BLAKE3", "The encoding of all ShieldedTransaction fields"]
    ]},
    { t: "p", html: "For comparison, <strong>block</strong> hashes are <code>BLAKE3</code> of the deterministic encoding of the <code>DagBlockHeader</code>. The Ethereum id is what wallets and explorers display; you can reproduce it from raw bytes with <code>web3_sha3</code> (which, matching Ethereum, is actually keccak256)." },
    { t: "h2", text: "Nonces" },
    { t: "p", html: "Every account has a monotonically increasing nonce — its transaction sequence number — that provides ordering and replay protection." },
    { t: "list", items: [
      "A transaction's nonce must equal the sender's <strong>next expected</strong> nonce. Off-by-one in either direction is rejected with <code>InvalidNonce { expected, got }</code>.",
      "Query the next nonce with <code>pyrax_nonce(addr)</code> (returns a <code>u64</code>) or <code>eth_getTransactionCount(address)</code> (returns a <code>0x</code>-hex quantity). Both return the same value; the latter ignores its block-tag argument and always returns latest.",
      "Ethereum and transparent transactions each carry their nonce in the signed payload, so it is part of what the signature commits to."
    ]},
    { t: "code", lang: "bash", code: "# Next nonce for an account (Ethereum-style, hex)\ncurl -s http://127.0.0.1:8545 \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getTransactionCount\",\"params\":[\"0xabc...\",\"latest\"]}'\n# => {\"jsonrpc\":\"2.0\",\"id\":1,\"result\":\"0x2a\"}   // nonce 42" },
    { t: "h2", text: "The transaction lifecycle" },
    { t: "list", items: [
      "<strong>Build and sign.</strong> Your wallet or tooling constructs the transaction and signs it (EIP-155 keccak for Ethereum, BLAKE3 for transparent, a ZK proof for shielded).",
      "<strong>Submit.</strong> Send it to the dev node's RPC socket — <code>eth_sendRawTransaction</code> for Ethereum txs, <code>pyrax_sendTransaction</code> for transparent/shielded. The node decodes, recovers the sender, checks the nonce, balance, chain id, and fee cap, and admits it to the <strong>mempool</strong>. A rejection surfaces as a clear RPC error (the relevant <code>StateError</code>).",
      "<strong>Consensus ordering.</strong> The transaction is selected into a block, sealed and ordered by GhostDAG. The block's <code>gas_limit</code> is <code>BLOCK_GAS_LIMIT = 30_000_000</code> total gas; transactions are included until that budget is reached.",
      "<strong>Block application.</strong> Every node executes the block deterministically — auto-detecting the VM per contract, running the call/deploy, updating balances and 32-byte storage slots, charging gas, and distributing fees (base fee: 25% burned / 50% PYRAX treasury / 25% DAO; priority tip: 70% producer / 20% PYRAX / 10% DAO). The <code>block.number</code> surfaced to contracts is the GhostDAG <strong>blue score</strong> of the header.",
      "<strong>Receipt.</strong> Once mined, poll <code>eth_getTransactionReceipt(hash)</code> — <code>null</code> until mined (or if reorged out), then a full Ethereum-compatible receipt. The transaction itself is retrievable with <code>eth_getTransactionByHash</code>."
    ]},
    { t: "h2", text: "Receipts" },
    { t: "p", html: "A receipt is the authoritative record of how a transaction executed. The state-layer receipt carries <code>transaction_hash</code>, <code>success</code> (a revert is <code>false</code> but still included), <code>gas_used</code>, <code>cumulative_gas_used</code>, <code>logs</code>, and <code>contract_address</code> (set only for a successful contract-creation tx). Over JSON-RPC, <code>eth_getTransactionReceipt</code> returns the Ethereum-compatible shape, adding block context and decoded logs:" },
    { t: "code", lang: "json", code: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"result\": {\n    \"transactionHash\": \"0x1234abcd...\",\n    \"blockHash\": \"0xfeed...\",\n    \"blockNumber\": \"0x1f4\",\n    \"transactionIndex\": \"0x0\",\n    \"from\": \"0xabcdef0123456789abcdef0123456789abcdef01\",\n    \"to\": \"0x00000000000000000000000000000000000000ab\",\n    \"contractAddress\": null,\n    \"status\": \"0x1\",\n    \"gasUsed\": \"0x5208\",\n    \"cumulativeGasUsed\": \"0x5208\",\n    \"logs\": []\n  }\n}" },
    { t: "callout", kind: "warn", html: "<strong>A <code>null</code> receipt is normal.</strong> <code>eth_getTransactionReceipt</code> returns <code>null</code> when the transaction is unknown, not yet mined, or was reorged out of the canonical chain. Poll until it returns an object, or watch new heads via <code>eth_subscribe(\"newHeads\")</code> and re-check." },
    { t: "h2", text: "What can go wrong" },
    { t: "table", head: ["Symptom", "Cause", "Fix"], rows: [
      ["InvalidNonce { expected, got }", "Nonce doesn't match the account's next expected value", "Re-fetch with eth_getTransactionCount / pyrax_nonce and resend"],
      ["ChainMismatch { expected, got }", "Signed for the wrong chain id", "Set your wallet's chain id to the target network (see the chain-id table)"],
      ["InsufficientBalance", "Balance below value + fees", "Fund the account (Testnet/Devnet2 have faucets) or lower the amount"],
      ["FeeCapBelowBaseFee", "Gas-price cap below the block's EIP-1559 base fee", "Raise maxFeePerGas / gasPrice; check eth_gasPrice"],
      ["UnsupportedTransaction", "Contract-creation with non-zero value but no code", "Deploy code that accepts value, or send value via a follow-up call"],
      ["Recover / Decode error", "Malformed or wrongly-signed raw bytes", "Re-sign; verify the chain id and that you submitted the full 0x-prefixed raw tx"],
      ["Blob tx rejected (Unsupported)", "EIP-4844 blob transaction", "Use legacy, EIP-2930, or EIP-1559 types"],
      ["status: \"0x0\" in receipt", "Execution reverted (but was still included + gas-charged)", "Inspect revert reason via eth_call with the same args; fix the contract input"]
    ]}
  ]
};


const PAGE_GAS_AND_FEES: DocPage = {
  slug: "gas-and-fees",
  title: "Gas & fees",
  blocks: [
    { t: "p", html: "Every transaction on PYRAX pays for the work it asks the network to do. That payment is denominated in <strong>gas</strong> — a unit of computational effort — and priced in <strong>PYRX</strong>, the native token. This page explains how gas is metered, how the base fee moves block-to-block under EIP-1559, how the total fee a transaction pays is split between the network and the block producer, and how one notion of \"gas\" maps consistently across all three virtual machines." },
    { t: "p", html: "If you've used Ethereum, almost everything here will feel familiar — PYRAX speaks the same EIP-1559 fee model and exposes the same RPC methods (<code>eth_gasPrice</code>, <code>eth_maxPriorityFeePerGas</code>, <code>eth_feeHistory</code>). The differences are in <em>where the fee goes</em> (a producer-forward split with a partial burn) and in the fact that one gas accounting model spans three VMs." },
    { t: "h2", text: "The two numbers a wallet sets" },
    { t: "table", head: ["Field", "Meaning"], rows: [
      ["gas_limit", "The maximum gas the transaction may consume. If execution needs more, it halts with OutOfGas and is still included + charged for the gas it burned."],
      ["maxFeePerGas (the cap)", "The most PYRX per gas you will ever pay. Must be ≥ base_fee of the including block, or the tx is un-includable (FeeCapBelowBaseFee)."],
      ["maxPriorityFeePerGas (the tip)", "The portion above the base fee you offer the producer to prioritize you."]
    ]},
    { t: "p", html: "A legacy (Type-0) transaction with a single <code>gasPrice</code> maps both the cap and the priority to that one value." },
    { t: "h2", text: "Gas is metered the same way across all three VMs" },
    { t: "p", html: "PYRAX is a multi-VM L1: a contract is just an account with code, and the VM is auto-detected from the code's magic bytes. Critically, <strong>all three VMs charge into one unified gas budget</strong>, so a transaction's <code>gas_limit</code> means the same thing no matter which VM (or chain of VMs, via cross-VM calls) it touches." },
    { t: "table", head: ["VM", "Native meter", "Mapping to gas"], rows: [
      ["EVM (revm)", "EVM gas", "1:1 — EVM gas is PYRAX gas."],
      ["WASM (wasmtime)", "wasmtime fuel", "1:1 — one unit of fuel = one unit of gas."],
      ["Cairo (cairo-vm)", "Cairo steps", "≈ 1 step = 1 gas, plus a load charge."]
    ]},
    { t: "h3", text: "WASM: fuel = gas" },
    { t: "p", html: "The WASM executor runs with <code>consume_fuel(true)</code> and treats fuel and gas as identical. Compilation is priced at <code>4</code> gas per code byte (<code>COMPILE_GAS_PER_BYTE</code>), so even a module that traps on the first instruction pays to be compiled. Per-host-function charges (the WASM equivalents of EVM opcodes) are fixed constants:" },
    { t: "table", head: ["Host op", "Gas"], rows: [
      ["storage_read (SLOAD)", "800"],
      ["storage_write (SSTORE)", "5,000"],
      ["input_copy", "8 × input_len"],
      ["emit_log", "375 + 8 × (topics_len × 32 + data_len)"],
      ["set_output", "8 × len"],
      ["create2", "32,000 + 8 × code_len"],
      ["precompile", "200 + 8 × input_len (+ the precompile's own metered cost)"],
      ["call (cross-VM)", "700 + 8 × input_len (+ the callee's gas_used)"],
      ["chain_id, block_number, block_timestamp, caller_copy, value_copy, address_copy, input_size", "0 (read-only queries)"]
    ]},
    { t: "p", html: "Cross-VM <code>call</code> forwards <strong>63/64 of remaining fuel</strong> to the callee (EIP-150), exactly as the EVM does." },
    { t: "h3", text: "Cairo: steps + a load charge" },
    { t: "p", html: "Cairo prices roughly one gas per VM step. On top of that it charges <code>4</code> gas per byte of compiled program (<code>CAIRO_LOAD_GAS_PER_BYTE</code>) before execution. The total is:" },
    { t: "code", lang: "bash", code: "gas_used = load_gas + consumed_steps + precompile_gas" },
    { t: "p", html: "where <code>load_gas = program_len × 4</code>, and the step budget available to run is <code>gas_limit − load_gas</code>. An over-size or unparseable program is a <em>charged failure</em>: <code>success = false</code>, <code>gas_used = gas_limit</code>." },
    { t: "h3", text: "The 21,000-gas transfer floor" },
    { t: "p", html: "A plain transparent value transfer (no contract code) costs a flat <code>GAS_PER_TRANSFER = 21,000</code> gas — the intrinsic gas, matching Ethereum's transfer cost. This is the floor; anything that runs code costs this plus the metered execution. (Shielded spends are priced differently: each carries a flat <code>SHIELDED_FEE = 100</code> base-unit anti-DoS fee on top of any gas.)" },
    { t: "h2", text: "The block gas limit" },
    { t: "code", lang: "bash", code: "BLOCK_GAS_LIMIT = 30_000_000" },
    { t: "p", html: "This is a consensus constant (<code>pyrax-primitives</code>). It governs three things: the sealer fills a block up to 30,000,000 gas of transactions; every individual transaction's <code>gas_limit</code> must be <code>≤ BLOCK_GAS_LIMIT</code>; and a block whose re-executed <code>gas_used</code> exceeds the limit is rejected by every node. The gas limit is also the basis for the EIP-1559 fee target:" },
    { t: "code", lang: "bash", code: "gas_target = gas_limit / GAS_ELASTICITY = 30_000_000 / 2 = 15_000_000" },
    { t: "p", html: "A block that uses exactly 15,000,000 gas keeps the base fee flat; above it the fee rises, below it the fee falls." },
    { t: "h2", text: "The EIP-1559 base-fee market" },
    { t: "p", html: "PYRAX runs a deterministic EIP-1559 base fee. Each block's <code>base_fee</code> (PYRX per gas) is computed <em>purely</em> from its parent — the sealer sets <code>header.base_fee</code>, and every node re-derives and validates it, so seal-time and replay-time always agree." },
    { t: "table", head: ["Constant", "Value", "Role"], rows: [
      ["BLOCK_GAS_LIMIT", "30_000_000", "Block gas cap; target is half of this."],
      ["GAS_ELASTICITY", "2", "Target = gas_limit / 2 = 15M gas."],
      ["BASE_FEE_MAX_CHANGE_DENOMINATOR", "8", "Max ±12.5% (1/8) change per block."],
      ["MIN_BASE_FEE", "1", "Floor; the fee never drops below 1 base unit."],
      ["INITIAL_BASE_FEE", "1", "Genesis base fee (equals the floor)."]
    ]},
    { t: "code", lang: "rust", title: "The retarget formula", code: "pub fn next_base_fee(parent_base_fee: u128, parent_gas_used: u64, parent_gas_limit: u64) -> u128 {\n    let target = (parent_gas_limit / GAS_ELASTICITY) as u128;   // 15_000_000\n    let base = parent_base_fee.max(MIN_BASE_FEE);\n    if target == 0 { return base; }\n    let used = parent_gas_used as u128;\n    let next = if used > target {\n        // Above target: raise the fee, rounded UP by at least 1 base unit.\n        let delta = used - target;\n        let inc = (base.saturating_mul(delta) / target / BASE_FEE_MAX_CHANGE_DENOMINATOR).max(1);\n        base.saturating_add(inc)\n    } else if used < target {\n        // Below target: lower the fee (NOT floored to 1, so idle chains reach the floor).\n        let delta = target - used;\n        let dec = base.saturating_mul(delta) / target / BASE_FEE_MAX_CHANGE_DENOMINATOR;\n        base.saturating_sub(dec)\n    } else {\n        base   // exactly at target → unchanged\n    };\n    next.max(MIN_BASE_FEE)\n}" },
    { t: "p", html: "The asymmetry — increases round up, decreases don't — is the canonical EIP-1559 behavior: a chain that stays full keeps climbing even when the proportional increase would round to zero, while a quiet chain can return exactly to the floor." },
    { t: "h3", text: "Effective gas price" },
    { t: "code", lang: "rust", code: "fn effective_gas_price(cap: u128, max_priority: u128, base_fee: u128) -> Option<u128> {\n    if cap < base_fee {\n        return None;                 // un-includable → FeeCapBelowBaseFee\n    }\n    Some(cap.min(base_fee.saturating_add(max_priority)))\n}" },
    { t: "p", html: "In other words, <code>effective_price = min(maxFeePerGas, base_fee + maxPriorityFeePerGas)</code>. If <code>cap &lt; base_fee</code>, the transaction cannot be included this block (<code>FeeCapBelowBaseFee</code>); it can become includable later if the base fee falls." },
    { t: "h2", text: "The producer-forward fee split" },
    { t: "p", html: "This is where PYRAX diverges from vanilla Ethereum. After a transaction is charged <code>gas_used × effective_price</code>, that total is split into a <strong>base portion</strong> and a <strong>tip portion</strong>, and each is divided by <em>consensus-frozen</em> per-mille (parts-per-thousand) constants. A quarter of the base fee is <strong>burned</strong>; the rest funds the network, the DAO, and the block producer." },
    { t: "table", head: ["Constant", "Per-mille", "Goes to"], rows: [
      ["BASE_BURN_PERMILLE", "250 (25%)", "Burned — removed from supply, never credited"],
      ["BASE_PYRAX_PERMILLE", "500 (50%)", "PYRAX treasury (0x…0200)"],
      ["base remainder", "250 (25%)", "DAO treasury (0x…0201)"],
      ["TIP_VALIDATOR_PERMILLE", "700 (70%)", "Block producer (coinbase)"],
      ["TIP_PYRAX_PERMILLE", "200 (20%)", "PYRAX treasury"],
      ["tip remainder", "100 (10%)", "DAO treasury"]
    ]},
    { t: "p", html: "The DAO share is computed as the <em>remainder</em> in both cases, which guarantees the split conserves value exactly — no base unit is lost or double-counted." },
    { t: "code", lang: "bash", title: "How the split is computed", code: "base_burn      = permille(base_portion, 250)\nbase_pyrax     = permille(base_portion, 500)\nbase_dao       = base_portion - base_burn - base_pyrax        // ~25%\n\ntip_validator  = permille(tip_portion, 700)\ntip_pyrax      = permille(tip_portion, 200)\ntip_dao        = tip_portion - tip_validator - tip_pyrax       // ~10%\n\nPYRAX_TREASURY += base_pyrax + tip_pyrax\nDAO_TREASURY   += base_dao   + tip_dao\ncoinbase       += tip_validator\n// base_burn is removed from supply (not credited anywhere)" },
    { t: "callout", kind: "info", html: "<strong>Invariant.</strong> <code>base_portion + tip_portion == gas_used × effective_price == total fee debited</code>. The sender is debited with a checked multiply before distribution, the treasury credits use <code>checked_add</code>, and the DAO absorbs each remainder so the split is value-exact." },
    { t: "h2", text: "Worked numeric example" },
    { t: "p", html: "Suppose the including block has <code>base_fee = 100</code> PYRX/gas, a transaction sets <code>maxFeePerGas = 150</code> and <code>maxPriorityFeePerGas = 30</code>, and it consumes <code>gas_used = 21,000</code> (a plain transfer)." },
    { t: "code", lang: "bash", code: "effective_price = min(150, 100 + 30) = min(150, 130) = 130 PYRX/gas\ntotal_fee     = 21,000 × 130 = 2,730,000 PYRX\nunit_base     = min(100, 130) = 100\nbase_portion  = 21,000 × 100  = 2,100,000 PYRX\ntip_portion   = 21,000 × (130 - 100) = 21,000 × 30 = 630,000 PYRX" },
    { t: "table", head: ["Recipient", "From base", "From tip", "Total"], rows: [
      ["Burned (supply down)", "525,000", "—", "525,000"],
      ["PYRAX treasury", "1,050,000", "126,000", "1,176,000"],
      ["DAO treasury", "525,000", "63,000", "588,000"],
      ["Block producer", "—", "441,000", "441,000"],
      ["Sum", "2,100,000", "630,000", "2,730,000 ✓"]
    ]},
    { t: "p", html: "The sum equals the <code>2,730,000</code> PYRX debited from the sender — the split conserves value exactly. The producer takes home <code>441,000</code> PYRX (the bulk of the tip), <code>525,000</code> PYRX is permanently burned, and the two treasuries share the rest." },
    { t: "h2", text: "Fee-market RPC methods" },
    { t: "list", items: [
      "<strong><code>eth_gasPrice</code></strong> — returns <code>next_base_fee + suggested_priority_fee</code> as a hex quantity — the legacy gas price a non-1559 sender should use for prompt inclusion.",
      "<strong><code>eth_maxPriorityFeePerGas</code></strong> — returns just the suggested priority tip per gas for prompt inclusion.",
      "<strong><code>eth_feeHistory</code></strong> — returns a window of historical base fees plus the projected pending-block base fee. <code>baseFeePerGas</code> has length <code>blockCount + 1</code> (one trailing entry for the pending block, per EIP-1559); <code>gasUsedRatio</code> is one value per block in the window (not the pending block); <code>reward</code> is present only if <code>rewardPercentiles</code> was supplied."
    ]},
    { t: "callout", kind: "info", html: "<strong>Setting a sane maxFeePerGas.</strong> A common heuristic: call <code>eth_feeHistory</code>, take the latest <code>baseFeePerGas</code>, multiply by ~2 to absorb a couple of full blocks of 12.5% increases, then add <code>eth_maxPriorityFeePerGas</code> as your tip. Since PYRAX caps each block's base-fee change at 12.5%, a 2× headroom comfortably covers several blocks of congestion." },
    { t: "h2", text: "Reference: all gas & fee constants" },
    { t: "table", head: ["Constant", "Value", "Where"], rows: [
      ["BLOCK_GAS_LIMIT", "30,000,000", "pyrax-primitives"],
      ["GAS_ELASTICITY", "2 (target = limit/2 = 15M)", "pyrax-primitives"],
      ["BASE_FEE_MAX_CHANGE_DENOMINATOR", "8 (±12.5%/block)", "pyrax-primitives"],
      ["MIN_BASE_FEE", "1", "pyrax-primitives"],
      ["INITIAL_BASE_FEE", "1", "pyrax-primitives"],
      ["GAS_PER_TRANSFER", "21,000", "pyrax-state"],
      ["SHIELDED_FEE", "100 (flat, per shielded spend)", "pyrax-state"],
      ["BASE_BURN_PERMILLE", "250 (25% of base burned)", "pyrax-state"],
      ["BASE_PYRAX_PERMILLE", "500 (50% of base → PYRAX)", "pyrax-state"],
      ["base DAO remainder", "250 (25% of base → DAO)", "pyrax-state"],
      ["TIP_VALIDATOR_PERMILLE", "700 (70% of tip → producer)", "pyrax-state"],
      ["TIP_PYRAX_PERMILLE", "200 (20% of tip → PYRAX)", "pyrax-state"],
      ["tip DAO remainder", "100 (10% of tip → DAO)", "pyrax-state"],
      ["WASM COMPILE_GAS_PER_BYTE", "4", "pyrax-vm-wasm"],
      ["WASM GAS_SLOAD", "800", "pyrax-vm-wasm"],
      ["WASM GAS_SSTORE", "5,000", "pyrax-vm-wasm"],
      ["Cairo CAIRO_LOAD_GAS_PER_BYTE", "4", "pyrax-vm-cairo"],
      ["PYRAX_TREASURY", "0x…0200", "pyrax-contracts"],
      ["DAO_TREASURY", "0x…0201", "pyrax-contracts"]
    ]}
  ]
};


const PAGE_CONSENSUS: DocPage = {
  slug: "consensus",
  title: "Consensus",
  blocks: [
    { t: "p", html: "PYRAX runs a <strong>TriStream GhostDAG</strong> consensus: a block <em>DAG</em> (directed acyclic graph), not a single block <em>chain</em>, with three parallel block streams feeding one shared, totally-ordered ledger. This page is the practical version for people who write and deploy contracts — what <code>block.number</code> actually means, why there are no uncle blocks, how to think about finality and reorgs, and why the block context your contract reads is deterministic." },
    { t: "callout", kind: "info", html: "<strong>The one thing to internalize.</strong> PYRAX orders a <em>DAG</em> of blocks into a single sequence and executes transactions in that order. Every VM (EVM, WASM, Cairo) sees the same shared state and the same block context. From inside a contract it feels like a normal linear chain — the DAG is what the consensus layer does to get there." },
    { t: "h2", text: "The mental model: a DAG that becomes a line" },
    { t: "p", html: "On a classic blockchain, each block has exactly one parent, so blocks form a line. The cost is throughput: only one block can extend the tip at a time, and any block produced in parallel is wasted (an \"uncle\"/\"ommer\")." },
    { t: "p", html: "PYRAX uses <strong>GhostDAG</strong> (the Kaspa-family approach). A block can reference <em>multiple</em> parents (the current DAG tips), so many blocks can be produced in parallel and <strong>all of them are kept</strong>. GhostDAG then computes a single canonical ordering over the whole DAG by coloring blocks <strong>blue</strong> (well-connected, in-consensus) or <strong>red</strong> (poorly-connected, late/withholding) via k-cluster blue-set selection. The blue set, ordered, <em>is</em> the chain your transactions execute against." },
    { t: "list", items: [
      "<strong>There are no uncle/ommer blocks.</strong> Parallel blocks aren't orphaned — they're absorbed into the order. So the Ethereum uncle RPCs always return zero.",
      "<strong>\"Height\" is the blue score, not a parent-count depth.</strong> A block's height is <em>how many blue blocks precede it in the order</em>, which is well-defined even though the graph isn't a line.",
      "<strong>Reorgs shrink as confirmations grow,</strong> the same intuition as any PoW/PoS chain — a block deep in the blue order is practically immovable."
    ]},
    { t: "h2", text: "Three streams: 2 PoW + 1 PoS" },
    { t: "p", html: "\"TriStream\" means blocks are produced on <strong>three streams</strong>, labeled <strong>A</strong>, <strong>B</strong>, and <strong>C</strong>. All three streams feed the <em>same</em> GhostDAG and the <em>same</em> ledger; they are not three chains." },
    { t: "table", head: ["Stream", "Sybil resistance", "Externally minable?", "Notes"], rows: [
      ["A", "Proof of Work", "Yes", "BLAKE3 + SHA-256 dual-hash PoW. Get work via pyrax_getWork."],
      ["B", "Proof of Work", "Yes", "KAWPOW + RandomX memory-hard PoW, with an AI-compute hook that binds useful compute into mining."],
      ["C", "Proof of Stake", "No", "PoS plus a BLS finality gadget. pyrax_getWork rejects Stream C — there is no external PoW for it."]
    ]},
    { t: "p", html: "Splitting block production across independent streams is how PYRAX raises throughput and diversifies who gets to extend the tip, while consensus still resolves everything into one order. You can read the live configuration with <code>pyrax_consensusInfo</code>:" },
    { t: "code", lang: "json", code: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"result\": {\n    \"mode\": \"dev-single-stream\",\n    \"activeStreams\": [\"C\"],\n    \"singleStreamNote\": \"dev mode (Stream C only)\",\n    \"rewardPolicy\": \"even\"\n  }\n}" },
    { t: "callout", kind: "info", html: "<strong>Single-stream dev mode looks linear.</strong> In the common dev configuration (Stream C only), the DAG degenerates into a straight line, blocks seal instantly, and <strong>blue score equals plain linear height</strong>. The semantics hold identically in multi-stream mode — the only difference is that height is the DAG-aware blue score rather than a naïve counter." },
    { t: "h2", text: "Block number = GhostDAG blue score" },
    { t: "p", html: "This is the single most important consensus fact for contract code. The value your contract reads as <strong>\"block number\"</strong> is the producing block's <strong>GhostDAG blue score</strong> — the size of the ordered blue set up to and including that block. It is <strong>not</strong> a canonical-order array index, and it is <strong>not</strong> revm's frozen default." },
    { t: "table", head: ["Surface", "What you call", "Returns"], rows: [
      ["Solidity / EVM", "block.number (NUMBER opcode)", "blue score"],
      ["WASM SDK", "block_number() -> u64", "blue score"],
      ["Cairo SDK", "pyrax.get_block_number syscall", "blue score"],
      ["Precompile", "CHAIN_CONTEXT at 0x…0110", "chain_id ++ blue score ++ timestamp"],
      ["JSON-RPC", "eth_blockNumber / pyrax_blockNumber", "best blue score (hex / u64)"]
    ]},
    { t: "h3", text: "Why blue score and not a height counter" },
    { t: "p", html: "The blue score is <strong>reorg-stable</strong>: it's intrinsic to the block (derived from the blue set up to it), so it does not shift when the DAG's canonical <em>array index</em> of a block changes due to a reorg. A naïve \"position in the ordered list\" would be reorg-<em>unstable</em> — the same block could land at a different index after a reorg, and seal-time vs. replay-time execution would disagree. That disagreement would be catastrophic for determinism. Because PYRAX uses the reorg-stable blue score, <strong>seal-time and replay-time execution agree</strong>, and every node converges on the same <code>state_root</code>." },
    { t: "callout", kind: "warn", html: "<strong><code>block.number</code> is not a real-time clock or a dense counter.</strong> Treat it as a monotonically increasing, reorg-stable height — fine for \"has N blocks passed\" style logic. Do <strong>not</strong> assume it advances by exactly 1 per wall-clock interval, and do <strong>not</strong> use it as a source of randomness. For time, use <code>block.timestamp</code>. Also: the EVM <code>BLOCKHASH</code> opcode is not wired up in the current devnet slice and returns zero — do not build logic that depends on it." },
    { t: "h2", text: "No uncles" },
    { t: "p", html: "Because GhostDAG keeps every block, there is <strong>no concept of an uncle/ommer block</strong>. The Ethereum uncle RPCs exist for compatibility but are hardcoded: <code>eth_getUncleCountByBlockHash</code> and <code>eth_getUncleCountByBlockNumber</code> always return <code>\"0x0\"</code>. If you're porting a tool that reasons about uncle rate or ommer rewards, that logic is inert on PYRAX." },
    { t: "h2", text: "The deterministic block context" },
    { t: "p", html: "When a block is applied, the ledger sets <strong>four</strong> block-context values together, in one call, and uses the <strong>exact same values</strong> whether the block is being <strong>sealed</strong> (produced) or <strong>replayed</strong> (re-executed by a peer during sync/ingest). Bundling them prevents a consensus path from setting the height while forgetting the fee context, and it's what makes contract execution deterministic across every node." },
    { t: "table", head: ["Context value", "Solidity", "WASM / Cairo", "Meaning"], rows: [
      ["number", "block.number", "block_number() / pyrax.get_block_number", "GhostDAG blue score (reorg-stable height)."],
      ["timestamp", "block.timestamp", "block_timestamp() / pyrax.get_block_timestamp", "Block production time, Unix seconds."],
      ["coinbase", "block.coinbase", "(header coinbase)", "Block producer / beneficiary; receives the validator share of priority tips. Zero address if the producer has no identity."],
      ["basefee", "block.basefee (BASEFEE opcode)", "(informational)", "EIP-1559 base fee per gas for this block."]
    ]},
    { t: "p", html: "These come directly from the sealed <code>DagBlockHeader</code> fields <code>blue_score</code>, <code>timestamp</code>, <code>coinbase</code>, and <code>base_fee</code>. Both replay paths validate them against the header, so a malicious sealer can't smuggle a different context past the network." },
    { t: "callout", kind: "info", html: "<strong>How <code>basefee</code> reaches the EVM.</strong> PYRAX runs revm with <code>gas_price = 0</code> and <code>disable_base_fee = true</code> (the ledger charges and distributes gas at its own layer, so revm must not reject the zero-priced inner tx). The real EIP-1559 base fee is still injected into the block context, so the <code>BASEFEE</code> opcode reports the true value — it's just informational to the opcode; the actual fee accounting happens in the ledger." },
    { t: "h2", text: "Fork choice, BLS finality, and staking" },
    { t: "p", html: "GhostDAG fork choice selects the tip with the <strong>heaviest blue work</strong> (the work accumulated through the selected-parent chain over the blue set), constrained by finality. On top of that, Stream-C provides economic finality through a proof-of-stake gadget:" },
    { t: "list", items: [
      "<strong>Staking.</strong> A validator stakes a minimum of <strong>100,000 PYRX</strong> to participate. Unbonding takes <strong>7 days</strong>.",
      "<strong>BLS-aggregated, height-bound finality.</strong> Validators cast height-bound votes that are aggregated via BLS; a block is finalized once distinct-voter stake reaches <strong>>2/3</strong>. The <code>FinalityState</code> is monotonic in height — once finalized, a height cannot be un-finalized.",
      "<strong>Slashing.</strong> Equivocation (a conflicting finalization vote) is slashable; finality overrides the fork choice, so a finalized block cannot be reorged out.",
      "<strong>Reward split.</strong> The three streams share block rewards under an even policy across the streams; consensus also diversifies 51%-resistance via stream diversity plus the DAG structure."
    ]},
    { t: "h2", text: "Finality and reorg intuition" },
    { t: "p", html: "PYRAX has <strong>probabilistic finality</strong> at the depth level, like other PoW/PoS DAGs, sharpened by the Stream-C BLS finality gadget. There is no instant, irreversible \"this block is final\" flag exposed to contracts. Practical guidance:" },
    { t: "list", items: [
      "<strong>In dev mode (single stream, instant seal):</strong> blocks are effectively final as they appear. Great for fast local iteration; <strong>not</strong> a model for mainnet assumptions.",
      "<strong>In multi-stream / live networks:</strong> wait for confirmations the same way you would on any chain. A few blocks of depth makes a reorg of your transaction very unlikely; more depth makes it negligible.",
      "<strong>Reverts are <em>not</em> reorgs.</strong> A reverted transaction is included in a block, charged for gas, and its receipt has <code>success: false</code>. That is permanent within its block — it does not \"come back\". Reorgs are about whether the <em>block itself</em> stays in the canonical order."
    ]},
    { t: "callout", kind: "warn", html: "<strong>Don't confuse \"best blue score\" with finality.</strong> <code>eth_syncing</code> / <code>pyrax_syncStatus</code> compare your node's local best blue score against the network's best known blue score. That tells you whether you're <em>caught up</em>, not whether a specific block is <em>final</em>. Finality is depth-based plus the BLS gadget — judge it by confirmation depth." },
    { t: "h3", text: "Watching new blocks" },
    { t: "p", html: "To react to the tip advancing, subscribe rather than poll. Over WebSocket: <code>eth_subscribe(\"newHeads\")</code> gives a full Ethereum-shaped block object per new tip; <code>pyrax_subscribeNewHeads</code> gives a native <code>DagTipDto</code> (<code>hash</code>, <code>blueScore</code>, <code>stream</code>) per new tip. Each notification carries the producing <code>stream</code> (<code>\"A\"</code>, <code>\"B\"</code>, or <code>\"C\"</code>), so you can see the TriStream in action. The native hash is <code>pyr</code>-prefixed." },
    { t: "h2", text: "The per-block gas limit" },
    { t: "table", head: ["Constant", "Value", "Where"], rows: [
      ["BLOCK_GAS_LIMIT", "30,000,000", "pyrax-primitives (Phase 10 chunk 8)"]
    ]},
    { t: "p", html: "This is the sum of gas across <strong>all</strong> transactions in a block, across <strong>all</strong> VMs (EVM, WASM, Cairo share the same ledger gas accounting). The block header carries both <code>gas_limit</code> (the cap, 30M) and <code>gas_used</code> (actual consumption, re-derivable by re-execution and validated on replay). The EIP-1559 fee market targets <strong>half</strong> the limit: <code>gas target = gas_limit / GAS_ELASTICITY = 15,000,000</code> (<code>GAS_ELASTICITY = 2</code>). Blocks above target push the base fee up by up to 12.5% per block; below target, down by up to 12.5%; never below <code>MIN_BASE_FEE = 1</code> (<code>BASE_FEE_MAX_CHANGE_DENOMINATOR = 8</code>)." },
    { t: "h2", text: "What to remember" },
    { t: "list", items: [
      "It's a <strong>block DAG</strong> ordered by <strong>GhostDAG</strong>: three streams (A/B PoW, C PoS) feed one shared, totally-ordered ledger.",
      "<strong><code>block.number</code> = blue score</strong> — a reorg-stable height, identical at seal and replay, so contracts are deterministic across nodes.",
      "<strong>No uncles</strong> — <code>eth_getUncleCountByBlock*</code> is always <code>0x0</code>.",
      "The <strong>block context</strong> (<code>number</code>, <code>timestamp</code>, <code>coinbase</code>, <code>basefee</code>) is set once, the same way at seal and replay; <code>basefee</code> is informational to the EVM opcode while the ledger does the real fee accounting.",
      "Fork choice picks the <strong>heaviest blue work</strong> tip, constrained by Stream-C BLS finality (>2/3 distinct-voter stake, min 100,000 PYRX, 7-day unbonding, slashing on equivocation).",
      "<strong>Per-block gas cap is 30,000,000</strong>, shared across all VMs, with a 15M EIP-1559 target."
    ]}
  ]
};


const PAGE_VMS_OVERVIEW: DocPage = {
  slug: "vms-overview",
  title: "Virtual Machines: Overview",
  blocks: [
    { t: "p", html: "PYRAX is a single Layer-1 chain that runs <strong>three virtual machines</strong> over one shared account-and-storage model, inside the same deterministic block-application step. There is no separate \"EVM chain\" and \"WASM chain\": there is one ledger, one set of balances, one 32-byte storage keyspace, and contracts of all three kinds share it byte-for-byte." },
    { t: "h2", text: "The three VMs" },
    { t: "p", html: "Each VM is a pure execution engine wrapping a battle-tested interpreter. The ledger (<code>pyrax-state</code>) lends each engine a staging <em>view</em> of state, collects its writes, and decides whether to keep them." },
    { t: "table", head: ["VM", "Engine", "What you write"], rows: [
      ["EVM", "revm", "Unmodified Ethereum bytecode — Solidity, Vyper, Huff. Drop-in for Foundry / Hardhat / viem / MetaMask."],
      ["WASM", "wasmtime", "Any wasm32 module that imports the \"pyrax\" host ABI and exports memory + call — Rust, AssemblyScript, TinyGo."],
      ["Cairo", "cairo-vm", "Compiled Cairo 0 / CASM programs that reach the chain through the lean pyrax.* hint-syscall ABI."]
    ]},
    { t: "h2", text: "\"Code magic\" auto-detection" },
    { t: "p", html: "When a contract is <strong>created</strong> (a transaction with no <code>to</code> field), PYRAX auto-detects which VM owns it from the <strong>leading bytes of the deploy code</strong> — no opt-in flag, no separate deploy endpoint. You never declare the VM." },
    { t: "table", head: ["Leading magic", "Bytes", "Detected VM"], rows: [
      ["<code>\\0asm</code>", "<code>00 61 73 6d</code>", "WASM (wasmtime)"],
      ["<code>\\0CAIRO</code>", "<code>00 43 41 49 52 4f</code>", "Cairo (cairo-vm)"],
      ["anything else (the default)", "—", "EVM (revm)"]
    ]},
    { t: "p", html: "Because the standard WebAssembly binary format already starts with <code>\\0asm</code>, <strong>any valid wasm module is detected as WASM automatically</strong> — you prepend nothing. Solidity init code from <code>solc</code> starts with EVM opcodes (typically <code>0x60 0x80 0x60 0x40</code>, <code>PUSH1 0x80 PUSH1 0x40</code>), which matches no marker, so a raw <code>CREATE</code> carrying Solidity bytecode deploys to the EVM — which is exactly why MetaMask, Hardhat, and Foundry \"just work.\" Cairo has no natural magic, so you <strong>prepend the six-byte <code>\\0CAIRO</code> marker</strong> to a compiled Cairo program before deploying it." },
    { t: "code", lang: "rust", title: "detect_vm() — the auto-detection rule (pyrax-state)", code: "pub fn detect_vm(code: &[u8]) -> VmKind {\n    if code.starts_with(b\"\\0asm\") { VmKind::Wasm }\n    else if code.starts_with(b\"\\0CAIRO\") { VmKind::Cairo }\n    else { VmKind::Evm }\n}" },
    { t: "h3", text: "Code is stored tagged with its VM" },
    { t: "p", html: "On a later <strong>call</strong>, PYRAX does not re-sniff the calldata. Each contract's runtime code is persisted <strong>tagged with a one-byte VM kind</strong> (<code>Evm = 0</code>, <code>Wasm = 1</code>, <code>Cairo = 2</code>) prepended before hashing with BLAKE3, so an account's <code>code_hash</code> = <code>BLAKE3([tag || code])</code> commits to <em>both</em> the code and the VM that runs it. <code>vm_of(code_hash)</code> reads back the tag to dispatch; <code>eth_getCode</code> strips the tag and returns the runtime bytecode exactly as Ethereum tooling expects. The <code>\\0asm</code> magic is kept (it is real); the <code>\\0CAIRO</code> marker is kept in stored code so the account is self-identifying, but stripped before the program is parsed." },
    { t: "h2", text: "Execution is consensus" },
    { t: "p", html: "Every contract execution — EVM, WASM, or Cairo — runs against a <code>LedgerView</code>: a staging overlay of the committed ledger. Reads fall through to the committed ledger (an unset slot reads as zero everywhere); writes buffer in the overlay and are applied to the real ledger <strong>only on the success path</strong>. A revert or trap drops the overlay unread — but the transaction is still <strong>included</strong> and <strong>still pays gas</strong>. That is the Ethereum model, generalized to three VMs." },
    { t: "p", html: "A multi-node chain only converges if every node computes the same <code>state_root</code> for a block. PYRAX guarantees this by configuring every VM for bit-for-bit determinism and by deriving block context (<strong>number = GhostDAG blue score</strong>, timestamp, base fee, coinbase) identically at seal time and at replay. After the VM returns, the ledger — not the VM — charges <code>gas_used × effective_price</code> and applies the consensus-frozen <a href=\"/concepts/fees/\">EIP-1559 fee split</a> (base fee: 25% burned, 50% PYRAX treasury, 25% DAO; tip: 70% producer, 20% PYRAX, 10% DAO). Every receiving node re-executes the block through the exact same path and must arrive at the same <code>state_root</code> — so <strong>execution is consensus</strong>, and determinism is non-negotiable." },
    { t: "table", head: ["VM", "Native metering unit", "How it maps to gas"], rows: [
      ["EVM", "revm gas, but gas_price = 0", "revm runs the tx zero-priced; the ledger charges the real price afterward"],
      ["WASM", "wasmtime fuel, 1:1 with gas", "per-host-fn charges (SLOAD = 800, SSTORE = 5,000) + 4 × code_len compile gas"],
      ["Cairo", "steps, ≈ 1 step per gas", "gas_used = load_gas + consumed_steps + precompile_gas"]
    ]},
    { t: "callout", kind: "info", html: "<strong>One ledger, three front-ends.</strong> Storage is a map from <code>(address, 32-byte slot) → 32-byte value</code> shared identically across all VMs. The EVM's native word is <code>U256</code>; WASM's <code>storage_get</code>/<code>storage_set</code> take <code>&[u8; 32]</code>; Cairo's <code>pyrax.storage_read</code>/<code>pyrax.storage_write</code> round-trip a <code>felt252</code> to a 32-byte word. A slot written by one VM is readable by another at the same address — which is what makes cross-VM calls work." },
    { t: "h2", text: "Where to go next" },
    { t: "list", items: [
      "<a href=\"/vms/evm/\">EVM (Solidity)</a> — deploy unmodified Ethereum bytecode with Foundry / Hardhat.",
      "<a href=\"/vms/wasm/\">WASM (overview)</a> — the \"pyrax\" host ABI, fuel = gas metering, sandbox caps.",
      "<a href=\"/vms/wasm-rust/\">WASM: Rust</a>, <a href=\"/vms/wasm-assemblyscript/\">AssemblyScript</a>, <a href=\"/vms/wasm-tinygo/\">TinyGo</a> — per-language contract guides.",
      "<a href=\"/vms/cairo/\">Cairo</a> — the lean pyrax.* syscall ABI and felt encoding."
    ]}
  ]
};


const PAGE_EVM: DocPage = {
  slug: "evm",
  title: "EVM (Solidity)",
  blocks: [
    { t: "p", html: "PYRAX runs <strong>unmodified Ethereum bytecode</strong>. The EVM is implemented with <a href=\"https://github.com/bluealloy/revm\">revm</a>, the same execution engine used by Reth and Foundry, so the contracts you already write in Solidity (or Vyper, or Huff) compile and deploy with <strong>no changes</strong>. Your <code>solc</code> output, your Foundry scripts, your <code>viem</code>/<code>ethers</code> clients, and MetaMask all work against a PYRAX dev node exactly as they would against an Ethereum node." },
    { t: "h2", text: "How PYRAX runs the EVM" },
    { t: "p", html: "A contract on PYRAX is just an <strong>account with code and storage</strong>, executed inside L1 block application. There is no separate \"EVM chain\" — every transaction, whether it targets the EVM, WASM, or Cairo, is applied in the same ledger against the same 32-byte-slot storage model. The VM is <strong>auto-detected from the deployed code's leading magic bytes</strong>: Solidity init code starts with EVM opcodes (typically <code>0x60 0x80 0x60 0x40</code>), which matches no magic marker, so a raw <code>CREATE</code> transaction carrying Solidity bytecode deploys to the EVM automatically — you do nothing special." },
    { t: "callout", kind: "info", html: "<strong>block.number = blue score.</strong> The value surfaced to contracts as <code>block.number</code> (the EVM <code>NUMBER</code> opcode) is the <strong>GhostDAG blue score</strong> of the including block — the reorg-stable height analogue in PYRAX's blockDAG. On a single-stream dev chain this equals linear height; in a multi-stream DAG it is the natural height. It is reorg-stable, so seal-time and replay-time execution always agree." },
    { t: "h2", text: "The canonical Counter.sol" },
    { t: "p", html: "Here is the canonical PYRAX Solidity / EVM worked example, verbatim from <code>contracts-solidity/Counter.sol</code>. PYRAX runs unmodified Ethereum bytecode, so this compiles with stock <code>solc</code> and deploys + runs exactly as it would on Ethereum." },
    { t: "code", lang: "solidity", title: "contracts-solidity/Counter.sol", code: "// SPDX-License-Identifier: Apache-2.0\npragma solidity ^0.8.20;\n\n/// @title Counter — the canonical PYRAX **Solidity / EVM** worked example.\n/// @notice A persistent on-chain counter. PYRAX runs unmodified Ethereum bytecode\n/// (revm), so this compiles with stock `solc` and deploys + runs exactly as it would\n/// on Ethereum. `increment()` bumps the stored count and returns the new value.\n///\n/// Compile to deployable init bytecode with:\n///   solc --bin --optimize contracts-solidity/Counter.sol\n/// The `<contract>:Counter` `bin` output is the `init_code` you deploy (a CREATE tx\n/// with empty `to` and that bytecode as `data`).\ncontract Counter {\n    /// The current count (also exposes a free `count()` getter).\n    uint256 public count;\n\n    /// Increment the counter and return the new value.\n    function increment() external returns (uint256) {\n        count += 1;\n        return count;\n    }\n}" },
    { t: "h2", text: "Compile with solc" },
    { t: "p", html: "Produce the deployable init bytecode (<code>bin</code>) and the ABI. The <code>--bin</code> output is the init code (constructor + a copy of the runtime code) — what you put in the <code>data</code> field of a contract-creation transaction." },
    { t: "code", lang: "bash", title: "Build the init bytecode", code: "solc --bin --optimize --overwrite -o build contracts-solidity/Counter.sol\n# → build/Counter.bin  (the deployable init bytecode, hex)" },
    { t: "p", html: "Deploy it as a <code>CREATE</code> transaction (empty <code>to</code>, the init bytecode as <code>data</code>), then call <code>increment()</code> (selector <code>0xd09de08a</code>). With Foundry instead of bare <code>solc</code>:" },
    { t: "code", lang: "bash", title: "Compile with Foundry", code: "forge build           # compiles to out/Counter.sol/Counter.json (abi + bytecode)\nforge inspect Counter bytecode   # init bytecode\nforge inspect Counter abi        # the ABI" },
    { t: "h2", text: "Deploy with Foundry" },
    { t: "p", html: "A deployment is just a transaction with no <code>to</code> field whose <code>data</code> is the init code. <code>cast</code> and <code>forge create</code> speak ordinary Ethereum JSON-RPC, so point them at the dev node (HTTP + WS on one socket; default RPC port 8545)." },
    { t: "code", lang: "bash", title: "Deploy via forge create / cast send", code: "# Point at the PYRAX dev node (HTTP + WS on one socket; default RPC port 8545).\nexport RPC=http://127.0.0.1:8545\nexport PK=0x<your-private-key>\n\n# Deploy with forge:\nforge create Counter \\\n  --rpc-url $RPC \\\n  --private-key $PK \\\n  --broadcast\n\n# …or with cast, sending raw init bytecode:\ncast send --rpc-url $RPC --private-key $PK \\\n  --create $(forge inspect Counter bytecode)" },
    { t: "p", html: "<code>forge create</code> prints the deployed address (read from the receipt's <code>contractAddress</code>). Both submit an EIP-2718 raw transaction to <code>eth_sendRawTransaction</code>; the returned hash is <code>keccak256(raw)</code> — byte-identical to what Ethereum would produce — so explorers and wallets resolve it correctly." },
    { t: "callout", kind: "warn", html: "<strong>Chain ID.</strong> Sign with the right chain ID or the transaction is rejected with <code>ChainMismatch</code>. Query it at runtime (<code>cast chain-id --rpc-url $RPC</code>) — never hardcode. PYRAX's networks (decimal): mainnet <code>563821</code>, testnet <code>104928</code>, devnet2 <code>710823</code> (the default), internal-devnet-live <code>429294</code>, internal-devnet-simulated <code>881109</code>." },
    { t: "h2", text: "Call the contract" },
    { t: "p", html: "A state-changing call is a transaction whose <code>to</code> is the contract and whose <code>data</code> is the ABI-encoded method call. A read-only call is <code>eth_call</code>, which executes against the latest state and returns the output without mutating anything." },
    { t: "code", lang: "bash", title: "Send and read", code: "# increment() — state-changing transaction\ncast send --rpc-url $RPC --private-key $PK <CONTRACT> \"increment()\"\n\n# count() — read-only getter\ncast call --rpc-url $RPC <CONTRACT> \"count()(uint256)\"" },
    { t: "callout", kind: "warn", html: "<strong>eth_call requires <code>to</code>.</strong> <code>eth_call</code> and <code>eth_estimateGas</code> reject a missing <code>to</code> with error <code>-32602</code>. A revert during <code>eth_call</code> is surfaced as an error; a revert in a <em>transaction</em> is included and gas-charged, but the receipt's <code>status</code> is <code>0x0</code>. The <code>blockTag</code> argument is accepted but ignored — PYRAX only serves the latest state for these calls." },
    { t: "h2", text: "End-to-end test (CI)" },
    { t: "p", html: "The <code>solc</code> compile runs in <strong>CI</strong> (it is not a Rust toolchain); that job sets <code>PYRAX_SOLC_BIN</code> to <code>build/Counter.bin</code> and runs the harness, which deploys the compiled contract through the PYRAX EVM and calls <code>increment()</code>. Locally (no <code>solc</code>) the harness skips." },
    { t: "code", lang: "bash", title: "Run the compiled contract through the EVM", code: "PYRAX_SOLC_BIN=$PWD/build/Counter.bin cargo test -p pyrax-vm-evm --test ci_solidity" },
    { t: "h2", text: "What differs from L1 Ethereum" },
    { t: "list", items: [
      "<strong>Nonce-CREATE addresses use a PYRAX-specific domain-separated scheme</strong>, not Ethereum's RLP formula: <code>keccak256(b\"PYRAX-EVM-CREATE\" ++ sender ++ nonce)[12..]</code>. Read the deployed address from the receipt's <code>contractAddress</code>. For deterministic addresses you control, use <strong>CREATE2</strong> (which <em>is</em> identical to EIP-1014: <code>keccak256(0xff ++ deployer ++ salt ++ keccak256(init_code))[12..]</code>).",
      "<strong>revm runs zero-priced.</strong> PYRAX sets <code>gas_price = 0</code>, <code>disable_base_fee = true</code>, and <code>disable_eip3607 = true</code> inside revm; the ledger meters gas and applies the EIP-1559 split outside the VM. The <code>BASEFEE</code> opcode still reports the real base fee (informational inside the VM).",
      "<strong><code>BLOCKHASH</code> returns zero</strong> in the current Phase 10 devnet slice. Do not use <code>blockhash(n)</code> as a reference or randomness source.",
      "<strong>Per-account storage is not yet folded into the state root</strong> (consensus-safe via re-execution; an account's <code>code_hash</code> is committed).",
      "<strong>No DELEGATECALL/CALLCODE to PYRAX system precompiles or to foreign (WASM/Cairo) contracts</strong> — both are rejected with a revert.",
      "<strong>Standard precompiles <code>0x01</code>–<code>0x0a</code> work</strong> (ecRecover, SHA-256, RIPEMD-160, identity, modexp, ecAdd/ecMul/ecPairing, blake2f, KZG); PYRAX adds its own system precompiles above the Ethereum block at <code>0x00..00_01xx</code> (BRIDGE, BLAKE3, SHA256, KECCAK256, ECRECOVER, CHAIN_CONTEXT, SHIELDED_VIEW)."
    ]}
  ]
};


const PAGE_WASM_OVERVIEW: DocPage = {
  slug: "wasm-overview",
  title: "WASM (Overview)",
  blocks: [
    { t: "p", html: "PYRAX runs WebAssembly contracts on a <a href=\"https://wasmtime.dev\">wasmtime</a> sandbox alongside the <a href=\"/vms/evm/\">EVM</a> and the <a href=\"/vms/cairo/\">Cairo VM</a>. All three share one account-and-storage model and one block-application path — they are told apart only by the <strong>code magic</strong> at the front of a contract's bytes. A module whose code begins with the four bytes <code>\\0asm</code> is executed as WASM." },
    { t: "h2", text: "The WASM contract model" },
    { t: "p", html: "A PYRAX WASM contract is <strong>a <code>wasm32</code> module that imports the host functions from the <code>\"pyrax\"</code> module and exports its linear <code>memory</code> plus a <code>call</code> entry point</strong> (and, optionally, a <code>deploy</code> constructor). There is no special \"contract framework\" baked into the chain — if your toolchain can emit a freestanding <code>wasm32-unknown-unknown</code> module of that shape, the chain runs it. Rust, AssemblyScript, and TinyGo all can." },
    { t: "table", head: ["Export", "Required?", "Shape", "Purpose"], rows: [
      ["<code>memory</code>", "Yes", "exported linear memory", "The host reads/writes calldata, storage values, addresses through it. Every contract must export it."],
      ["<code>call</code>", "Yes", "<code>extern \"C\" fn()</code> — no params, no return", "The main entry point. Invoked on every call to the contract."],
      ["<code>deploy</code>", "Optional", "<code>extern \"C\" fn()</code> — no params, no return", "The constructor. Runs once during CREATE if present; if absent, deployment just persists the module."]
    ]},
    { t: "p", html: "A missing or mistyped <code>memory</code>/<code>call</code> export is a hard failure (<code>WasmError::Export</code>), not a revert. By convention the <strong>first 4 bytes of calldata are a method selector</strong>, but this is a convention only — the host does not parse or enforce it." },
    { t: "h2", text: "The \"pyrax\" host ABI" },
    { t: "p", html: "Contracts talk to the chain by importing functions from the <code>\"pyrax\"</code> module. Every parameter is an <code>i32</code> — either a pointer into the contract's linear memory or a length — except the two clock/id reads, which return <code>i64</code>. There are exactly <strong>15 raw imports</strong>." },
    { t: "table", head: ["#", "Import", "Raw signature", "Purpose"], rows: [
      ["1", "<code>input_size</code>", "<code>() -> i32</code>", "Length of the call's calldata, in bytes."],
      ["2", "<code>input_copy</code>", "<code>(dest: i32)</code>", "Copy the full calldata into memory at <code>dest</code>."],
      ["3", "<code>storage_read</code>", "<code>(key_ptr: i32, val_ptr: i32)</code>", "Read the 32-byte slot at the 32-byte key <code>key_ptr</code>; write its value to <code>val_ptr</code> (zero if unset)."],
      ["4", "<code>storage_write</code>", "<code>(key_ptr: i32, val_ptr: i32)</code>", "Write the 32-byte value at <code>val_ptr</code> to the 32-byte slot keyed by <code>key_ptr</code>."],
      ["5", "<code>value_copy</code>", "<code>(dest: i32)</code>", "Copy the 32-byte big-endian call value (msg.value) to <code>dest</code>."],
      ["6", "<code>caller_copy</code>", "<code>(dest: i32)</code>", "Copy the 20-byte caller (immediate sender) address to <code>dest</code>."],
      ["7", "<code>address_copy</code>", "<code>(dest: i32)</code>", "Copy this contract's own 20-byte address to <code>dest</code>."],
      ["8", "<code>emit_log</code>", "<code>(topics_ptr, topics_len, data_ptr, data_len: i32)</code>", "Emit an event log with up to 4 indexed 32-byte topics plus arbitrary data."],
      ["9", "<code>set_output</code>", "<code>(ptr: i32, len: i32)</code>", "Set the call's return data."],
      ["10", "<code>revert</code>", "<code>(ptr: i32, len: i32)</code>", "Revert with <code>ptr..ptr+len</code> as the revert data; <strong>traps</strong> the instance (never returns)."],
      ["11", "<code>chain_id</code>", "<code>() -> i64</code>", "The network chain ID."],
      ["12", "<code>block_number</code>", "<code>() -> i64</code>", "Block height — the reorg-stable GhostDAG blue score (same as the EVM NUMBER opcode)."],
      ["13", "<code>block_timestamp</code>", "<code>() -> i64</code>", "Block timestamp, Unix seconds."],
      ["14", "<code>create2</code>", "<code>(code_ptr, code_len, salt_ptr, addr_out: i32) -> i32</code>", "Deploy a child at a deterministic CREATE2 address; returns 1 on success (writing the 20-byte address) or 0 on failure."],
      ["15", "<code>precompile</code>", "<code>(addr_ptr, input_ptr, input_len, out_ptr, out_cap: i32) -> i32</code>", "Call a read-only PYRAX system precompile; returns the output length or -1 on failure."]
    ]},
    { t: "callout", kind: "info", html: "<strong>You don't call these raw.</strong> In Rust, <code>pyrax-contract-sdk</code> wraps all 15 imports as safe, allocation-aware helpers (<code>input()</code>, <code>selector()</code>, <code>storage_get</code>/<code>storage_set</code>, <code>caller()</code>, <code>address()</code>, <code>value()</code>, <code>chain_id()</code>, <code>block_number()</code>, <code>block_timestamp()</code>, <code>create2()</code>, <code>precompile()</code>, <code>log()</code>, <code>output()</code>, <code>fail()</code>). AssemblyScript and TinyGo have equivalent shims. The raw table is what those shims sit on top of." },
    { t: "h2", text: "Storage: the shared 32-byte slot model" },
    { t: "p", html: "WASM contracts use the <strong>exact same storage model as the EVM</strong>: a flat map from a 32-byte key (the \"slot\") to a 32-byte value, scoped to the contract's own address. <code>storage_read</code> reads the slot (an unset slot reads as 32 zero bytes); <code>storage_write</code> writes it. You choose slot keys yourself — for mappings, derive keys by hashing a domain prefix + the key parts (the bundled ERC-20/721 library keys balances as <code>blake3(\"erc20.bal\" || len || address)</code>). Because the slot model is identical across VMs, an explorer reading <code>eth_getStorageAt</code> sees a WASM contract's storage the same way it sees an EVM contract's." },
    { t: "h2", text: "Gas: fuel metering at 1:1" },
    { t: "p", html: "The WASM executor meters wasmtime <strong>fuel 1:1 with gas</strong> — fuel and gas are the same number. Compile is charged upfront at <code>4 × code_len</code>; the remaining budget is loaded as fuel; each guest instruction and host call burns fuel. Host functions are priced roughly like the EVM so a contract cannot buy permanent state growth for the ~1 fuel a bare <code>call</code> costs." },
    { t: "table", head: ["Host function", "Gas cost", "Constant"], rows: [
      ["read-only queries (input_size, value/caller/address_copy, chain_id, block_number, block_timestamp)", "0", "—"],
      ["<code>input_copy</code>", "<code>8 × input_len</code>", "GAS_PER_BYTE = 8"],
      ["<code>storage_read</code> (SLOAD)", "800", "GAS_SLOAD = 800"],
      ["<code>storage_write</code> (SSTORE)", "5,000", "GAS_SSTORE = 5_000"],
      ["<code>emit_log</code>", "<code>375 + 8 × (topics_len × 32 + data_len)</code>", "GAS_LOG_BASE = 375"],
      ["<code>set_output</code>", "<code>8 × len</code>", "—"],
      ["<code>revert</code>", "0 (the call fails anyway)", "—"],
      ["<code>create2</code>", "<code>32,000 + 8 × code_len</code>", "CREATE2_BASE_GAS = 32_000"],
      ["<code>precompile</code>", "<code>200 + 8 × input_len</code> + the precompile's own metered gas", "GAS_PRECOMPILE_BASE = 200"],
      ["compile (per byte of module)", "<code>4 × code_len</code>", "COMPILE_GAS_PER_BYTE = 4"]
    ]},
    { t: "p", html: "A revert or trap is a <strong>failed-but-valid execution</strong>, not an executor error: the transaction is still included and still charged gas; only the state writes are thrown away. The executor buffers all account/storage writes (and the inbound value transfer) in an overlay and commits only on success." },
    { t: "h2", text: "Determinism and sandbox caps" },
    { t: "p", html: "Consensus requires byte-identical results, so the engine strips every known source of non-determinism: fuel metering on, NaN canonicalization on (deterministic SIMD floats), relaxed-SIMD pinned and disabled, threads off, stack pinned at 512 KiB. Each instance also runs under hard size limits:" },
    { t: "table", head: ["Limit", "Value", "What it bounds"], rows: [
      ["<code>MAX_WASM_CODE</code>", "256 KiB", "Maximum contract module size."],
      ["<code>SandboxLimits.max_memory_bytes</code>", "16 MiB (default)", "Linear-memory growth per instance; breach traps."],
      ["<code>SandboxLimits.max_table_elements</code>", "10,000 (default)", "Table growth per instance; breach traps."],
      ["<code>MAX_LOG_BYTES</code>", "1 MiB", "Total emitted-log bytes per call."],
      ["<code>MAX_OUTPUT_BYTES</code>", "1 MiB", "Returned output / revert-data bytes per call."],
      ["<code>MAX_PRECOMPILE_INPUT</code>", "64 KiB", "Input bytes to a nested precompile."],
      ["<code>MAX_CALL_INPUT</code>", "128 KiB", "Calldata bytes to a nested cross-VM call."],
      ["<code>MAX_CHILD_CODE</code>", "512 KiB", "Child init-code passed to create2."]
    ]},
    { t: "h2", text: "Read-only precompiles" },
    { t: "p", html: "A WASM module has no built-in cryptography. The <code>precompile</code> host function dispatches to PYRAX's <strong>read-only</strong> system precompiles in the reserved <code>0x00..00_01xx</code> block: <code>BLAKE3</code> (<code>0x…0101</code>), <code>SHA256</code> (<code>0x…0102</code>), <code>KECCAK256</code> (<code>0x…0103</code>), <code>ECRECOVER</code> (<code>0x…0104</code>), <code>CHAIN_CONTEXT</code> (<code>0x…0110</code>, <code>chain_id ++ block_number ++ block_timestamp</code>, 96 bytes), and <code>SHIELDED_VIEW</code> (<code>0x…0111</code>, the shielded note-tree anchor, 32 bytes). State-mutating or payable system contracts (the bridge) and calls to other deployed contracts go through the cross-VM <code>call</code> seam instead." },
    { t: "h2", text: "Pick a language" },
    { t: "list", items: [
      "<a href=\"/vms/wasm-rust/\">Rust</a> — the first-class path with <code>pyrax-contract-sdk</code>, a built-in bump allocator, and stock <code>rustc</code>/<code>cargo</code>.",
      "<a href=\"/vms/wasm-assemblyscript/\">AssemblyScript</a> — TypeScript-like, compiled with <code>asc</code>; declare the <code>@external(\"pyrax\", ...)</code> imports.",
      "<a href=\"/vms/wasm-tinygo/\">TinyGo</a> — Go compiled with <code>tinygo build -target=wasm-unknown</code> (freestanding, no WASI)."
    ]}
  ]
};


const PAGE_WASM_RUST: DocPage = {
  slug: "wasm-rust",
  title: "WASM: Rust SDK",
  blocks: [
    { t: "p", html: "The first-class way to write PYRAX WASM contracts is <strong>Rust</strong>, compiled to <code>wasm32-unknown-unknown</code> against the <code>pyrax-contract-sdk</code> crate. A contract is a <code>cdylib</code> that exports <code>call</code> (and optionally <code>deploy</code>) and uses the SDK's safe helpers to talk to the chain. Execution is fully deterministic: the ledger instantiates a fresh module, runs it once, charges fuel (gas) for everything it does, and discards the instance." },
    { t: "h2", text: "Cargo.toml" },
    { t: "p", html: "A contract crate produces a single dynamic library and links against the SDK. <code>crate-type = [\"cdylib\"]</code> is what makes <code>cargo</code> emit a <code>.wasm</code> instead of a Rust <code>.rlib</code>. This is the canonical sample manifest from <code>contracts/counter/Cargo.toml</code>:" },
    { t: "code", lang: "toml", title: "contracts/counter/Cargo.toml", code: "# SPDX-License-Identifier: Apache-2.0\n[package]\nname = \"counter\"\nversion = \"0.1.0\"\nedition = \"2021\"\nlicense = \"Apache-2.0\"\ndescription = \"Sample PYRAX WASM contract: a persistent on-chain counter (proves the contract SDK + ABI).\"\n\n[lib]\ncrate-type = [\"cdylib\"]\n\n[dependencies]\npyrax-contract-sdk = { path = \"../pyrax-contract-sdk\" }" },
    { t: "p", html: "For production contracts, add a size-optimized release profile. The WASM VM caps contract code at <strong>256 KiB</strong> and charges 4 gas per byte just to compile it, so size matters:" },
    { t: "code", lang: "toml", title: "Recommended release profile", code: "# Small, panic-free, deterministic binary.\n[profile.release]\nopt-level = \"s\"     # optimize for size\nlto = true          # link-time optimization trims dead code\npanic = \"abort\"     # no unwinding tables in the wasm\nstrip = true        # drop symbols\ncodegen-units = 1   # better optimization (slower compile)" },
    { t: "h2", text: "The counter contract" },
    { t: "p", html: "This is the canonical PYRAX WASM contract sample, verbatim from <code>contracts/counter/src/lib.rs</code>. <code>call</code> reads the 32-byte big-endian counter at slot 0, increments it, writes it back, emits a log, and returns the new value. It is <code>#![no_std]</code>, brings the SDK into scope, and provides a panic handler that routes into <code>sdk::fail</code>." },
    { t: "code", lang: "rust", title: "contracts/counter/src/lib.rs", code: "// SPDX-License-Identifier: Apache-2.0\n#![no_std]\n//! A persistent on-chain counter — the canonical PYRAX WASM contract sample.\n//!\n//! `call` reads the 32-byte big-endian counter at slot 0, increments it, writes it\n//! back, emits a log, and returns the new value. Compiled to\n//! `wasm32-unknown-unknown`, it deploys + runs through `pyrax-vm-wasm` exactly like\n//! any other contract (auto-detected by the `\\0asm` magic).\n\nuse pyrax_contract_sdk as sdk;\n\n/// Storage slot holding the counter.\nconst SLOT0: [u8; 32] = [0u8; 32];\n\n/// Optional constructor — the counter starts at 0 (slots default to zero), so this\n/// is a no-op; present to exercise the `deploy` entry point.\n#[no_mangle]\npub extern \"C\" fn deploy() {}\n\n/// The contract entry point: increment + persist + log + return the counter.\n#[no_mangle]\npub extern \"C\" fn call() {\n    let mut v = sdk::storage_get(&SLOT0);\n    increment_be(&mut v);\n    sdk::storage_set(&SLOT0, &v);\n    sdk::log(&[[0u8; 32]], &v);\n    sdk::output(&v);\n}\n\n/// Increment a 32-byte big-endian integer in place (wrapping at 2^256).\nfn increment_be(v: &mut [u8; 32]) {\n    for byte in v.iter_mut().rev() {\n        match byte.checked_add(1) {\n            Some(x) => {\n                *byte = x;\n                return;\n            }\n            None => *byte = 0, // carry into the next-more-significant byte\n        }\n    }\n}\n\n#[panic_handler]\nfn panic(_: &core::panic::PanicInfo) -> ! {\n    sdk::fail(b\"panic\")\n}" },
    { t: "callout", kind: "warn", html: "<strong>The panic handler is mandatory.</strong> <code>no_std</code> crates have no default panic handler, so the crate will not link without one. Route panics straight into <code>sdk::fail</code> so an unexpected panic (an out-of-bounds index, an <code>unwrap()</code> on <code>None</code>) becomes a clean, gas-charged revert with deterministic revert data. <code>sdk::fail</code> returns <code>!</code>, satisfying the panic handler's <code>-> !</code> signature." },
    { t: "h3", text: "You get an allocator for free" },
    { t: "p", html: "The SDK installs a <strong>bump allocator</strong> as the global allocator on <code>wasm32</code>. Because a contract instance is created, run once, and thrown away, memory is never freed — each allocation just bumps a cursor and grows linear memory on demand. It is deterministic (no OS allocator), dependency-free (no <code>wee_alloc</code>/<code>dlmalloc</code>), and automatic (<code>Vec</code>, <code>alloc::vec!</code>, slices all work via <code>extern crate alloc</code>). You write no allocator code." },
    { t: "h2", text: "The SDK helper API" },
    { t: "p", html: "All helpers live at the crate root (<code>pyrax_contract_sdk::*</code>). Read-only context queries are free; storage and byte-moving operations are not." },
    { t: "table", head: ["Helper", "Signature", "Gas"], rows: [
      ["<code>input</code>", "<code>fn input() -> Vec&lt;u8&gt;</code>", "8 × len"],
      ["<code>selector</code>", "<code>fn selector() -> [u8; 4]</code>", "8 × len (reads full input)"],
      ["<code>storage_get</code>", "<code>fn storage_get(key: &[u8; 32]) -> [u8; 32]</code>", "800"],
      ["<code>storage_set</code>", "<code>fn storage_set(key: &[u8; 32], val: &[u8; 32])</code>", "5,000"],
      ["<code>caller</code>", "<code>fn caller() -> [u8; 20]</code>", "0"],
      ["<code>address</code>", "<code>fn address() -> [u8; 20]</code>", "0"],
      ["<code>value</code>", "<code>fn value() -> [u8; 32]</code>", "0"],
      ["<code>chain_id</code>", "<code>fn chain_id() -> u64</code>", "0"],
      ["<code>block_number</code>", "<code>fn block_number() -> u64</code>", "0"],
      ["<code>block_timestamp</code>", "<code>fn block_timestamp() -> u64</code>", "0"],
      ["<code>log</code>", "<code>fn log(topics: &[[u8; 32]], data: &[u8])</code>", "375 + 8 × (topics·32 + data)"],
      ["<code>output</code>", "<code>fn output(data: &[u8])</code>", "8 × len"],
      ["<code>fail</code>", "<code>fn fail(msg: &[u8]) -> !</code>", "0 (call fails)"],
      ["<code>create2</code>", "<code>fn create2(code: &[u8], salt: &[u8; 32]) -> Option&lt;[u8; 20]&gt;</code>", "32,000 + 8 × code_len"],
      ["<code>precompile</code>", "<code>fn precompile(addr: &[u8; 20], input: &[u8]) -> Option&lt;Vec&lt;u8&gt;&gt;</code>", "200 + 8 × input_len (+ precompile cost)"]
    ]},
    { t: "p", html: "Precompile address constants are available as <code>pyrax_contract_sdk::precompiles::*</code> (each a <code>[u8; 20]</code> in the reserved <code>0x00..00_01xx</code> block): <code>BLAKE3</code>, <code>SHA256</code>, <code>KECCAK256</code>, <code>ECRECOVER</code>, <code>CHAIN_CONTEXT</code>, <code>SHIELDED_VIEW</code>. Usage is a one-liner:" },
    { t: "code", lang: "rust", title: "Hash via the BLAKE3 precompile", code: "let digest = sdk::precompile(&sdk::precompiles::BLAKE3, data).unwrap();" },
    { t: "h2", text: "Building for wasm32" },
    { t: "p", html: "Compile to the bare WebAssembly target in release mode. The committed sample build (used as a test fixture) builds the contracts workspace; for a standalone crate:" },
    { t: "code", lang: "bash", title: "Build commands", code: "rustup target add wasm32-unknown-unknown            # one time\ncargo build --release --target wasm32-unknown-unknown\n\n# The committed sample fixture is built from the contracts workspace:\ncargo build --manifest-path contracts/Cargo.toml --target wasm32-unknown-unknown --release" },
    { t: "p", html: "The artifact lands at <code>target/wasm32-unknown-unknown/release/counter.wasm</code>. Verify the magic bytes (<code>00 61 73 6d</code>) and size (≤ 256 KiB) before deploying — the VM auto-detects WASM from the leading <code>\\0asm</code>:" },
    { t: "code", lang: "bash", title: "Sanity-check the module", code: "# First four bytes should be: 00 61 73 6d\nxxd -l 4 target/wasm32-unknown-unknown/release/counter.wasm\nls -l  target/wasm32-unknown-unknown/release/counter.wasm" },
    { t: "h2", text: "End-to-end test (CI)" },
    { t: "p", html: "The sample build output is committed as a test fixture at <code>crates/pyrax-vm-wasm/tests/fixtures/counter.wasm</code>, which the <code>pyrax-vm-wasm</code> integration test (<code>tests/real_contract.rs</code>) runs through the VM; CI recompiles it fresh and re-runs that test end to end." }
  ]
};


const PAGE_WASM_ASSEMBLYSCRIPT: DocPage = {
  slug: "wasm-assemblyscript",
  title: "WASM: AssemblyScript",
  blocks: [
    { t: "p", html: "PYRAX's WebAssembly VM (wasmtime) is <strong>language-agnostic</strong>: it runs any <code>wasm32</code> module that imports the <code>\"pyrax\"</code> host ABI and exports <code>memory</code> plus a <code>call</code> entry point. <strong>AssemblyScript</strong> — a TypeScript-like language that compiles straight to clean <code>wasm32</code> with <code>asc</code> — is one such path. The module is auto-detected by its <code>\\0asm</code> magic; no glue, no WASI." },
    { t: "h2", text: "The @external host imports" },
    { t: "p", html: "Every host function lives in the import module named <code>\"pyrax\"</code>. In AssemblyScript you bring an import into scope with a <code>declare function</code> plus the <code>@external(module, name)</code> decorator. The first string is the <strong>module</strong> (always <code>\"pyrax\"</code>); the second is the <strong>function name</strong>. The <code>// @ts-ignore: decorator</code> comment silences editor tooling that doesn't recognize AssemblyScript's decorator; <code>asc</code> understands it natively. Declare only the functions your contract actually uses — the counter needs just three:" },
    { t: "code", lang: "typescript", title: "The three @external host imports the counter uses", code: "// --- PYRAX host ABI (the \"pyrax\" import module; all params are i32 ptr/len) ---\n// @ts-ignore: decorator\n@external(\"pyrax\", \"storage_read\")\ndeclare function storage_read(keyPtr: i32, valPtr: i32): void;\n// @ts-ignore: decorator\n@external(\"pyrax\", \"storage_write\")\ndeclare function storage_write(keyPtr: i32, valPtr: i32): void;\n// @ts-ignore: decorator\n@external(\"pyrax\", \"set_output\")\ndeclare function set_output(ptr: i32, len: i32): void;" },
    { t: "callout", kind: "info", html: "Every parameter is an <code>i32</code> — a pointer into your module's linear memory, or a length — never a high-level object. A storage slot key and value are each exactly 32 bytes; an address is 20 bytes; the call value is a 32-byte big-endian integer. <code>emit_log</code> takes a <strong>count</strong> of topics (max 4), not a byte length. The two clock/id reads (<code>chain_id</code>, <code>block_number</code>, <code>block_timestamp</code>) return <code>i64</code>." },
    { t: "h2", text: "The complete counter (assembly/counter.ts)" },
    { t: "p", html: "This is the exact, compiling source from <code>contracts-assemblyscript/assembly/counter.ts</code>. It declares the three host functions it needs, exports a no-op <code>deploy</code> and a real <code>call</code>, and uses two fixed 32-byte scratch buffers placed well above the module's small static data (this contract makes no heap allocations, so fixed offsets never collide)." },
    { t: "code", lang: "typescript", title: "contracts-assemblyscript/assembly/counter.ts", code: "// SPDX-License-Identifier: Apache-2.0\n//\n// The canonical PYRAX AssemblyScript / WASM worked example: a persistent counter.\n//\n// AssemblyScript compiles TypeScript-like source to a `wasm32` module. PYRAX's WASM VM\n// is language-agnostic — any module that imports the `\"pyrax\"` host ABI and exports\n// `memory`, `deploy`, and `call` runs, auto-detected by the `\\0asm` magic. On each\n// `call` this reads storage slot 0, increments it, writes it back, and returns the new\n// 32-byte big-endian value.\n//\n// Compile with:  asc assembly/counter.ts --config asconfig.json --target release\n\n// --- PYRAX host ABI (the \"pyrax\" import module; all params are i32 ptr/len) ---\n// @ts-ignore: decorator\n@external(\"pyrax\", \"storage_read\")\ndeclare function storage_read(keyPtr: i32, valPtr: i32): void;\n// @ts-ignore: decorator\n@external(\"pyrax\", \"storage_write\")\ndeclare function storage_write(keyPtr: i32, valPtr: i32): void;\n// @ts-ignore: decorator\n@external(\"pyrax\", \"set_output\")\ndeclare function set_output(ptr: i32, len: i32): void;\n\n// Two 32-byte scratch regions in linear memory, placed well above the module's small\n// static data so they never collide (this contract makes no heap allocations).\nconst KEY: i32 = 4096; // storage slot key (32 zero bytes => slot 0)\nconst VAL: i32 = 4128; // the 32-byte counter value\n\n// Optional constructor — slots default to zero, so this is a no-op.\nexport function deploy(): void {}\n\n// Increment + persist + return the counter.\nexport function call(): void {\n  // slot 0 = 32 zero bytes.\n  for (let i = 0; i < 32; i++) store<u8>(KEY + i, 0);\n  storage_read(KEY, VAL);\n  // Increment the big-endian value's low byte (the counter stays small in the demo).\n  store<u8>(VAL + 31, <u8>(load<u8>(VAL + 31) + 1));\n  storage_write(KEY, VAL);\n  set_output(VAL, 32);\n}" },
    { t: "callout", kind: "warn", html: "<strong>Memory layout is your responsibility.</strong> Fixed offsets work only because this contract performs no heap allocations. The moment you allocate (<code>new</code>, arrays, strings, <code>__new</code>), the managed heap can grow into hard-coded offsets and corrupt your scratch. Either stay allocation-free with fixed offsets well above static data, or allocate scratch with <code>__new</code>/<code>memory.data</code> and never hard-code offsets. There is <strong>no <code>memory</code> declaration in the source</strong> — <code>asc</code> exports it automatically, and that export is what lets the host read your <code>KEY</code>/<code>VAL</code> buffers." },
    { t: "h2", text: "asconfig.json" },
    { t: "p", html: "PYRAX contracts use the <strong><code>stub</code></strong> runtime (a minimal bump allocator, no GC, no free) so the module imports <strong>only</strong> the <code>\"pyrax\"</code> functions you declare and exports only <code>memory</code>/<code>deploy</code>/<code>call</code>. This is the real config from <code>contracts-assemblyscript/asconfig.json</code>:" },
    { t: "code", lang: "json", title: "contracts-assemblyscript/asconfig.json", code: "{\n  \"targets\": {\n    \"release\": {\n      \"outFile\": \"build/counter.wasm\",\n      \"optimize\": true,\n      \"optimizeLevel\": 3,\n      \"shrinkLevel\": 1,\n      \"runtime\": \"stub\"\n    }\n  },\n  \"options\": {\n    \"exportRuntime\": false,\n    \"bindings\": \"raw\"\n  }\n}" },
    { t: "p", html: "<code>runtime: \"stub\"</code> = no-GC bump allocator; <code>exportRuntime: false</code> keeps exports to <code>memory</code>/<code>deploy</code>/<code>call</code>; <code>bindings: \"raw\"</code> skips JS glue so the import surface is exactly your <code>@external</code> declarations." },
    { t: "h2", text: "Building" },
    { t: "p", html: "AssemblyScript is a Node tool, not a Rust toolchain. From inside <code>contracts-assemblyscript</code>:" },
    { t: "code", lang: "bash", title: "Build to build/counter.wasm", code: "cd contracts-assemblyscript\nnpm install      # fetch the assemblyscript compiler (asc)\nnpm run build    # asc assembly/counter.ts --config asconfig.json --target release" },
    { t: "p", html: "The <code>build</code> script (from <code>package.json</code>) is <code>asc assembly/counter.ts --config asconfig.json --target release</code>; the compiler comes from the <code>assemblyscript@^0.27.29</code> devDependency, the version CI uses. Sanity-check that the output is a real wasm module — the first four bytes must be <code>\\0asm</code>:" },
    { t: "code", lang: "bash", title: "Verify the magic bytes", code: "xxd -l 4 build/counter.wasm\n# 0000000: 0061 736d                                .asm" },
    { t: "h2", text: "End-to-end test (CI)" },
    { t: "p", html: "Because <code>asc</code> is a Node tool, PYRAX compiles the AssemblyScript example in <strong>CI</strong>, then runs the compiled <code>.wasm</code> through the actual WASM VM. The job sets <code>PYRAX_AS_WASM</code> to the artifact path; the test deploys it and calls it three times, proving the counter persists. Locally (no <code>asc</code>) the test skips." },
    { t: "code", lang: "bash", title: "Run the compiled AssemblyScript contract through the VM", code: "PYRAX_AS_WASM=$PWD/contracts-assemblyscript/build/counter.wasm \\\n  cargo test -p pyrax-vm-wasm --test ci_assemblyscript" }
  ]
};


const PAGE_WASM_TINYGO: DocPage = {
  slug: "wasm-tinygo",
  title: "WASM: TinyGo",
  blocks: [
    { t: "p", html: "<a href=\"https://tinygo.org\">TinyGo</a> compiles Go to a small, freestanding WebAssembly module — which makes Go a first-class language for writing PYRAX contracts. PYRAX's WASM VM runs <strong>any</strong> module that imports the <code>\"pyrax\"</code> host ABI and exports <code>memory</code>, <code>deploy</code>, and <code>call</code>; the engine auto-detects WASM from the <code>\\0asm</code> code magic. TinyGo produces exactly such a module, so a Go contract runs through the same wasmtime-backed VM, with the same gas model, as a Rust or AssemblyScript contract." },
    { t: "callout", kind: "warn", html: "<strong>Use TinyGo, never <code>go build</code>.</strong> Stock Go emits <code>GOOS=js</code> modules (importing the <code>js</code> namespace) or <code>GOOS=wasip1</code> modules (importing <code>wasi_snapshot_preview1</code>). PYRAX provides neither, so such a module traps at instantiation (<code>WasmError::Load</code>). Only <code>tinygo build -target=wasm-unknown</code> produces a clean, freestanding module whose <em>only</em> imports are the <code>//go:wasmimport pyrax …</code> host functions you declare." },
    { t: "h2", text: "Declaring the host ABI with //go:wasmimport" },
    { t: "p", html: "The host ABI is a flat set of functions in the import module named <code>\"pyrax\"</code>. Every parameter is an <code>i32</code> — a pointer (a byte offset into linear memory) or a length; the block-context functions return <code>i64</code>. In Go you declare each one as an unimplemented function annotated with <code>//go:wasmimport pyrax &lt;host_name&gt;</code>; TinyGo wires the call directly to the import. The module token must be <code>pyrax</code> and the field must be the exact host name (<code>storage_read</code>, not <code>storageRead</code>) — the Go function name is yours to choose." },
    { t: "callout", kind: "info", html: "<strong><code>//go:wasmimport</code> argument types are restricted.</strong> Only scalar types are permitted (<code>int32</code>, <code>uint32</code>, <code>int64</code>, <code>uint64</code>, <code>float32</code>, <code>float64</code>, <code>unsafe.Pointer</code>). You cannot pass a Go slice, string, or struct across the boundary — pass its <strong>address as an <code>int32</code></strong> (and a separate length), exactly the pointer/length convention the PYRAX ABI uses." },
    { t: "h2", text: "The full counter contract (counter.go)" },
    { t: "p", html: "This is the canonical PYRAX TinyGo worked example, <code>contracts-tinygo/counter.go</code>, verbatim. On each <code>call</code> it reads storage slot 0, increments the low byte of the 32-byte big-endian value, writes it back, and returns the new value. Slot 0's key is all-zeros — just a zeroed package-global buffer, which Go zero-initializes for free." },
    { t: "code", lang: "go", title: "contracts-tinygo/counter.go", code: "// SPDX-License-Identifier: Apache-2.0\n\n// The canonical PYRAX TinyGo / WASM worked example: a persistent counter.\n//\n// TinyGo compiles Go to a freestanding wasm32 module (target `wasm-unknown`, which has\n// no WASI imports). PYRAX's WASM VM runs any module that imports the \"pyrax\" host ABI\n// and exports `memory`, `deploy`, and `call` (auto-detected by the `\\0asm` magic). On\n// each call this reads storage slot 0, increments it, writes it back, and returns the\n// new 32-byte big-endian value.\n//\n// Compile with:  tinygo build -target=wasm-unknown -o build/counter.wasm .\npackage main\n\nimport \"unsafe\"\n\n//go:wasmimport pyrax storage_read\nfunc storageRead(keyPtr, valPtr int32)\n\n//go:wasmimport pyrax storage_write\nfunc storageWrite(keyPtr, valPtr int32)\n\n//go:wasmimport pyrax set_output\nfunc setOutput(ptr, length int32)\n\n// 32-byte scratch buffers in linear memory: the slot-0 key (all zeros) + the value.\nvar key [32]byte\nvar val [32]byte\n\n//export deploy\nfunc deploy() {}\n\n//export call\nfunc call() {\n\tkp := int32(uintptr(unsafe.Pointer(&key[0])))\n\tvp := int32(uintptr(unsafe.Pointer(&val[0])))\n\tstorageRead(kp, vp)\n\tval[31]++ // increment the big-endian value's low byte (counter stays small)\n\tstorageWrite(kp, vp)\n\tsetOutput(vp, 32)\n}\n\n// main is required by Go but unused — the contract entry points are deploy/call.\nfunc main() {}" },
    { t: "p", html: "And the <code>go.mod</code> — a minimal module declaration, no dependencies:" },
    { t: "code", lang: "go", title: "contracts-tinygo/go.mod", code: "module pyrax-tinygo-counter\n\ngo 1.21" },
    { t: "callout", kind: "info", html: "<strong>Pin buffers as package globals.</strong> Globals live at a stable address in linear memory for the lifetime of the instance, so the <code>int32</code> you compute stays valid for the whole call. Take the address of <strong>element 0</strong> (<code>&buf[0]</code>), not of the array. <code>main</code> must exist (Go requires it for <code>package main</code>) but stays empty — the VM never calls it; the entry points are <code>deploy</code>/<code>call</code>." },
    { t: "h2", text: "The wasm-unknown build target" },
    { t: "p", html: "<code>-target=wasm-unknown</code> is what keeps the module free of WASI imports, so the only imports are the <code>//go:wasmimport pyrax …</code> host functions PYRAX provides. From the contract directory:" },
    { t: "code", lang: "bash", title: "Build to build/counter.wasm", code: "cd contracts-tinygo\nmkdir -p build\ntinygo build -target=wasm-unknown -o build/counter.wasm ." },
    { t: "callout", kind: "warn", html: "<strong>Watch the code size.</strong> PYRAX hard-caps contract code at <code>MAX_WASM_CODE = 256 KiB</code> and charges <code>4</code> gas per byte to compile it. TinyGo's <code>wasm-unknown</code> output is lean, but pulling in large Go packages grows the binary fast. Build with size-reducing flags when needed (<code>-no-debug</code> strips DWARF; <code>-opt=z</code> optimizes for size) and keep contracts small and dependency-free. The standard library is mostly unavailable on <code>wasm-unknown</code> — for block context use the host functions (<code>block_number</code>, <code>block_timestamp</code>, <code>chain_id</code>)." },
    { t: "h2", text: "End-to-end test (CI)" },
    { t: "p", html: "<code>tinygo</code> is not a Rust toolchain, so the compile happens in <strong>CI</strong> (the <code>tinygo-contracts</code> job pins TinyGo 0.33.0 and Go 1.22). The job compiles <code>counter.go</code>, then runs the freshly-built <code>.wasm</code> through the real PYRAX WASM VM via the <code>PYRAX_TINYGO_WASM</code> env var; the harness deploys it and calls it three times, asserting the counter reaches 3 and slot 0 persists. Locally (no <code>tinygo</code>) the test skips." },
    { t: "code", lang: "bash", title: "Reproduce the end-to-end run locally", code: "# 1. Compile the contract.\ncd contracts-tinygo\nmkdir -p build\ntinygo build -target=wasm-unknown -o build/counter.wasm .\ncd ..\n\n# 2. Run the compiled module through the VM.\nPYRAX_TINYGO_WASM=\"$PWD/contracts-tinygo/build/counter.wasm\" \\\n  cargo test -p pyrax-vm-wasm --test ci_tinygo" }
  ]
};


const PAGE_CAIRO: DocPage = {
  slug: "cairo",
  title: "Cairo",
  blocks: [
    { t: "p", html: "PYRAX runs <strong>Cairo</strong> as a first-class smart-contract VM, alongside the <a href=\"/vms/evm/\">EVM</a> (revm) and <a href=\"/vms/wasm/\">WebAssembly</a> (wasmtime). A Cairo contract is an ordinary account whose code is a compiled Cairo program; it executes inside L1 block application over the <strong>same 32-byte storage slots</strong> every other VM shares, charges gas, and either commits or reverts atomically." },
    { t: "p", html: "What makes the Cairo path different is <strong>how a program reaches the chain</strong>. There is no Starknet <code>blockifier</code>, no account-abstraction entrypoint, no contract-class/declare/sierra pipeline. PYRAX runs the raw <a href=\"https://github.com/lambdaclass/cairo-vm\">cairo-vm</a> interpreter over a small, purpose-built set of <strong>hint-based syscalls</strong> — the <code>pyrax.*</code> ABI. A program exports <code>main</code> (the entry the ledger calls)." },
    { t: "callout", kind: "warn", html: "<strong>This is a custom hint ABI, not Starknet.</strong> PYRAX-Cairo implements <strong>only the <code>pyrax.*</code> syscalls</strong>. A program that uses Starknet's <code>starknet::syscalls</code>, the <code>#[starknet::contract]</code> macro, Sierra class hashes, or any non-<code>pyrax.*</code> hint <strong>will not run</strong> — an unknown hint is rejected loudly and deterministically. You write to the <code>pyrax.*</code> ABI directly: a small, auditable host surface, not a Starknet-compatibility layer." },
    { t: "h2", text: "How a Cairo contract is identified" },
    { t: "p", html: "PYRAX auto-detects the VM from the code's leading bytes when a contract is deployed. The Cairo marker is the constant <code>CAIRO_RUNTIME_MAGIC = b\"\\0CAIRO\"</code> (bytes <code>00 43 41 49 52 4f</code>). When you deploy a Cairo contract you <strong>prefix the compiled program with these six bytes</strong>. PYRAX keeps the marker in the stored runtime code (so the account is self-identifying), strips it before parsing for validation/execution, and charges load gas for the actual program bytes only — not the 6-byte marker." },
    { t: "h2", text: "The sum.cairo sample" },
    { t: "p", html: "The repo ships a minimal pure-computation Cairo program, <code>contracts-cairo/sum.cairo</code>, verbatim. CI compiles it with <code>cairo-compile</code> and runs it through <code>pyrax-vm-cairo</code>'s <code>CairoExecutor</code> to prove a real Cairo source → CASM → PYRAX VM path. (The PYRAX syscall handlers are proven separately by the crate's unit tests, which drive them directly.)" },
    { t: "code", lang: "cairo", title: "contracts-cairo/sum.cairo", code: "// SPDX-License-Identifier: Apache-2.0\n// A minimal Cairo 0 program: deterministic pure computation. Compiled by\n// `cairo-compile` in CI and run through `pyrax-vm-cairo`'s CairoExecutor to prove a\n// real Cairo source → CASM → PYRAX VM path. (The PYRAX syscall handlers are proven\n// separately by the `pyrax-vm-cairo` unit tests, which drive them directly.)\nfunc main() {\n    let x = 2 + 3;\n    assert x = 5;\n    return ();\n}" },
    { t: "h2", text: "Compile with cairo-compile" },
    { t: "p", html: "PYRAX executes <strong>Cairo 0 / CASM program JSON</strong> — the artifact <code>cairo-compile</code> produces — run by <code>cairo-vm</code>'s <code>cairo_run_program</code>. The toolchain (<code>cairo-lang</code>) is a separate, non-Rust toolchain, so compilation happens in a dedicated CI job:" },
    { t: "code", lang: "bash", title: "Install cairo-lang and compile", code: "python3 -m venv ~/cairo-venv\nsource ~/cairo-venv/bin/activate\npip install cairo-lang            # the Cairo 0 compiler (Python)\n\n# Compile a .cairo program to the program JSON PYRAX runs.\ncairo-compile contracts-cairo/sum.cairo --output sum.json" },
    { t: "p", html: "Run the compiled sample through the PYRAX Cairo VM end to end (the CI harness reads <code>PYRAX_CAIRO_SAMPLE</code>):" },
    { t: "code", lang: "bash", title: "Run sum.json through the VM", code: "PYRAX_CAIRO_SAMPLE=$PWD/sum.json cargo test -p pyrax-vm-cairo --test ci_cairo" },
    { t: "h2", text: "The \\0CAIRO deploy prefix" },
    { t: "p", html: "The compiled <code>counter.json</code> is the program. To deploy on PYRAX you prepend the <code>\\0CAIRO</code> marker to the raw JSON bytes — that prefix is what makes the ledger route the account to the Cairo VM. Submit the result as the init code of a contract-creation transaction (<code>to = None</code>):" },
    { t: "code", lang: "bash", title: "Prepend the marker to build deploy init code", code: "# Compile.\ncairo-compile counter.cairo --output counter.json\n\n# Prepend the \\0CAIRO marker so the ledger routes the account to the Cairo VM.\nprintf '\\0CAIRO' | cat - counter.json > counter.cairo.deploy" },
    { t: "callout", kind: "info", html: "<strong>Marker optional only for local testing.</strong> <code>strip_cairo_magic</code> returns the input unchanged if the <code>\\0CAIRO</code> prefix is absent, so unit-test fixtures and <code>cairo-vm</code> programs loaded directly (not through the ledger) work without it. For an on-chain deploy, the marker is mandatory. Note that a deploy <strong>does not run</strong> the program — there is no constructor on CREATE; the contract's <code>main</code> runs on the first call. Gate any init logic on a first-call state flag inside <code>main</code>." },
    { t: "h2", text: "The pyrax.* syscall ABI" },
    { t: "p", html: "There are <strong>15 syscalls</strong>, each a hint whose code string is the constant shown (e.g. <code>%{ pyrax.storage_read %}</code>). The hint processor reads/writes named local variables (<code>ids.*</code>); for arrays it reads a pointer variable (<code>ids.&lt;name&gt;</code>) and a length variable (<code>ids.&lt;name&gt;_len</code>). All addresses and values cross as <strong>felts</strong>; byte arrays cross as <strong>one byte per felt</strong> (the byte in the felt's low byte). Storage operates on the calling contract's own account, using the shared 32-byte-slot model (a felt is always <code>&lt; 2^252</code>, so it fits losslessly in a 32-byte word)." },
    { t: "table", head: ["Syscall (hint code)", "Reads (ids.*)", "Writes (ids.*)", "Gas"], rows: [
      ["<code>pyrax.storage_read</code>", "key", "value", "1 word"],
      ["<code>pyrax.storage_write</code>", "key, value", "—", "1 word"],
      ["<code>pyrax.get_caller_address</code>", "—", "value", "0"],
      ["<code>pyrax.get_contract_address</code>", "—", "value", "0"],
      ["<code>pyrax.get_chain_id</code>", "—", "value", "0"],
      ["<code>pyrax.get_block_number</code>", "—", "value (blue score)", "0"],
      ["<code>pyrax.get_block_timestamp</code>", "—", "value", "0"],
      ["<code>pyrax.calldata_len</code>", "—", "value", "0"],
      ["<code>pyrax.calldata</code>", "ptr", "(writes felts at ptr)", "calldata len"],
      ["<code>pyrax.emit_event</code>", "keys, keys_len, data, data_len", "—", "keys + data len"],
      ["<code>pyrax.set_output</code>", "ptr, len", "—", "output len"],
      ["<code>pyrax.revert</code>", "ptr, len", "— (records data, traps)", "revert-data len"],
      ["<code>pyrax.create2</code>", "code, code_len, salt", "address (0 on failure)", "code-felt len"],
      ["<code>pyrax.precompile</code>", "addr, input, input_len", "out, out_len, ok", "input + output + precompile gas"],
      ["<code>pyrax.call</code>", "target, value, input, input_len", "out, out_len, ok", "input + output + callee gas"]
    ]},
    { t: "callout", kind: "warn", html: "<strong>Non-canonical slot values revert.</strong> <code>pyrax.storage_read</code> validates the slot holds a canonical felt (<code>value.to_felt().to_bytes_be() == value</code>). A value <code>&gt;= p</code> could only have been written by a non-Cairo VM (the EVM/WASM share these slots); rather than silently reduce it mod the prime, the syscall reverts with <code>\"non-canonical felt in storage slot\"</code>." },
    { t: "h2", text: "Worked example: a counter" },
    { t: "p", html: "A minimal counter that stores a value at slot <code>0</code>, dispatches on the <strong>first calldata felt</strong> (a method id — your own convention; PYRAX imposes no selector format for Cairo), emits an event on increment, and returns the new value. The syscalls are inline hints; the surrounding Cairo allocates the <code>ids.*</code> locals each hint reads/writes." },
    { t: "code", lang: "cairo", title: "counter.cairo (illustrative)", code: "%builtins range_check\n\n// ---- pyrax.* syscall thin wrappers (one hint each) ----\n\n// storage_read(key) -> value\nfunc st_read{}(key: felt) -> (value: felt) {\n    alloc_locals;\n    local value;\n    %{ pyrax.storage_read %}   // reads ids.key, writes ids.value\n    return (value=value);\n}\n\n// storage_write(key, value)\nfunc st_write{}(key: felt, value: felt) {\n    %{ pyrax.storage_write %}  // reads ids.key, ids.value\n    return ();\n}\n\n// emit_event(keys[keys_len], data[data_len])\nfunc emit{}(keys: felt*, keys_len: felt, data: felt*, data_len: felt) {\n    %{ pyrax.emit_event %}     // reads ids.keys/keys_len, ids.data/data_len\n    return ();\n}\n\n// set_output(ptr[len])\nfunc set_output{}(ptr: felt*, len: felt) {\n    %{ pyrax.set_output %}     // reads ids.ptr, ids.len\n    return ();\n}\n\n// calldata_len() -> value ; calldata(ptr)\nfunc calldata_len{}() -> (value: felt) {\n    local value;\n    %{ pyrax.calldata_len %}   // writes ids.value\n    return (value=value);\n}\n\n// ---- contract body ----\n\nconst SLOT_COUNT = 0;          // storage slot for the counter\nconst METHOD_INCREMENT = 1;    // our calldata[0] convention\nconst METHOD_GET = 2;\n\nfunc main{range_check_ptr}() {\n    alloc_locals;\n\n    // Read the method id from calldata[0].\n    let (n) = calldata_len();\n    let (cd) = alloc();\n    let ptr = cd;\n    %{ pyrax.calldata %}       // copies calldata felts into [ids.ptr ..]\n    let method = cd[0];\n\n    // increment: count += 1, emit, return new value\n    if (method == METHOD_INCREMENT) {\n        let (cur) = st_read(key=SLOT_COUNT);\n        let next = cur + 1;\n        st_write(key=SLOT_COUNT, value=next);\n\n        // event: one key (topic), one data felt (the new value)\n        let (keys) = alloc();\n        assert keys[0] = 'Increment';     // a short-string topic\n        let (data) = alloc();\n        assert data[0] = next;\n        emit(keys=keys, keys_len=1, data=data, data_len=1);\n\n        let (out) = alloc();\n        assert out[0] = next;\n        set_output(ptr=out, len=1);\n        return ();\n    }\n\n    // get: return the current value\n    if (method == METHOD_GET) {\n        let (cur) = st_read(key=SLOT_COUNT);\n        let (out) = alloc();\n        assert out[0] = cur;\n        set_output(ptr=out, len=1);\n        return ();\n    }\n\n    // unknown method: revert\n    let (msg) = alloc();\n    assert msg[0] = 'bad method';\n    %{ pyrax.revert %}         // reads ids.ptr, ids.len (point them at msg) — traps\n    return ();\n}" },
    { t: "h2", text: "Gas and limits" },
    { t: "p", html: "Gas on the Cairo path is <strong>steps + a load charge + nested-call gas</strong>, all metered by <code>cairo-vm</code>'s <code>RunResources</code>. <code>1 Cairo step ≈ 1 gas</code>; <code>gas_used = load_gas + consumed_steps + precompile_gas</code>, where <code>load_gas = program_bytes × CAIRO_LOAD_GAS_PER_BYTE</code> (4 gas/byte, over the program <em>without</em> the marker). A revert, fault, or out-of-steps is a valid, includable, gas-charged failed execution — not a Rust error." },
    { t: "table", head: ["Constant", "Value", "What it bounds"], rows: [
      ["<code>MAX_CAIRO_CODE</code>", "512 KiB", "Hard cap on compiled program size (parse-bomb DoS guard)"],
      ["<code>CAIRO_LOAD_GAS_PER_BYTE</code>", "4 gas/byte", "Deterministic load charge (priced by program length)"],
      ["<code>SandboxLimits.max_steps</code> (default)", "4,000,000", "Default per-run step cap"],
      ["<code>MAX_FELT_ARRAY</code>", "4096 felts", "Max felts a single syscall may move (also caps create2 child code = 4096 bytes)"],
      ["<code>MAX_SYSCALL_WORDS</code>", "262,144 (2^18)", "Cumulative felts moved across the whole run"],
      ["<code>MAX_EVENT_KEYS</code>", "255", "Max event keys (receipt encodes the count in one byte)"],
      ["<code>PRECOMPILE_CAIRO_GAS</code>", "50,000,000", "Gas budget handed to a nested precompile"]
    ]},
    { t: "h2", text: "How PYRAX-Cairo differs from Starknet" },
    { t: "table", head: ["Starknet", "PYRAX-Cairo"], rows: [
      ["Sierra + class hash + declare/deploy", "Compiled Cairo 0 / CASM program JSON, prefixed with \\0CAIRO, stored as account code"],
      ["#[starknet::contract], #[external], ABI dispatch", "A single main entrypoint; you dispatch on calldata yourself (no enforced selector)"],
      ["starknet::syscalls::* (e.g. call_contract_syscall)", "The pyrax.* hint ABI only — any other hint is rejected"],
      ["Storage via LegacyMap/storage_var keyed by hashed paths", "Raw 32-byte slots, shared with the EVM and WASM"],
      ["Account abstraction / __execute__", "None — a contract is a plain account; the caller is the immediate sender"],
      ["L2 block number / Starknet time", "PYRAX blue score (get_block_number) and Unix timestamp (get_block_timestamp)"],
      ["Gas in Cairo resource units", "Cairo steps (1 ≈ 1 gas) + a 4 gas/byte load charge + nested-call gas"],
      ["blockifier transaction execution", "cairo-vm's cairo_run_program run directly (LayoutName::all_cairo, secure_run = false)"]
    ]}
  ]
};


const PAGE_CONNECT_TOOLING: DocPage = {
  slug: "connect-tooling",
  title: "Connect your tooling",
  blocks: [
    { t: "p", html: "PYRAX is EVM-compatible: the EVM runs on <code>revm</code> as an always-on, L1-integrated execution target, so your existing Ethereum tooling — MetaMask, viem, ethers, Hardhat, and Foundry — works unchanged. You only need two things: the <strong>RPC URL</strong> of a PYRAX node and the <strong>chain ID</strong> of the network you are targeting." },
    { t: "p", html: "A local dev node serves HTTP <em>and</em> WebSocket JSON-RPC on a single socket, for example <code>http://127.0.0.1:8545</code>. Examples on this page default to <strong>Devnet2</strong> (the current public dev network), chain id <code>710823</code> (hex <code>0xad8a7</code>). The native token is <strong>PYRX</strong> with <strong>18 decimals</strong>." },
    { t: "table", head: ["Network", "Chain ID (decimal)", "Block time", "Faucet"], rows: [
      ["Internal Devnet 1.0", "881109", "5s", "—"],
      ["Internal Live", "429294", "5s", "✓"],
      ["Devnet2", "710823", "5s", "✓"],
      ["Testnet", "104928", "6s", "✓"],
      ["Mainnet", "563821", "6s", "—"]
    ] },
    { t: "callout", kind: "info", html: "Chain IDs are canonical in <strong>decimal</strong>. Devnet2 = <code>710823</code> = <code>0xad8a7</code>. (Some older docs show <code>0xad8e7</code> — that is a typo.)" },
    { t: "h2", text: "MetaMask (EIP-3085)" },
    { t: "p", html: "Add PYRAX to MetaMask programmatically with <code>wallet_addEthereumChain</code>. Users can also add the same fields manually in the network settings." },
    { t: "code", lang: "typescript", title: "Add PYRAX to MetaMask (EIP-3085)", code: "await window.ethereum.request({\n  method: \"wallet_addEthereumChain\",\n  params: [\n    {\n      chainId: \"0xad8a7\", // 710823 — Devnet2\n      chainName: \"PYRAX Devnet2\",\n      nativeCurrency: { name: \"PYRX\", symbol: \"PYRX\", decimals: 18 },\n      rpcUrls: [\"http://127.0.0.1:8545\"],\n    },\n  ],\n});" },
    { t: "h2", text: "viem — defineChain + client" },
    { t: "p", html: "Define the chain once with <code>defineChain</code> and reuse it for every public and wallet client. <code>getChainId()</code> returns <code>710823</code>; <code>getBlockNumber()</code> returns the current blue score as a <code>bigint</code>." },
    { t: "code", lang: "typescript", title: "viem — chain definition + client", code: "import { createPublicClient, http, defineChain } from \"viem\";\n\nexport const pyraxDevnet2 = defineChain({\n  id: 710823,\n  name: \"PYRAX Devnet 2\",\n  nativeCurrency: { name: \"PYRAX\", symbol: \"PYRX\", decimals: 18 },\n  rpcUrls: { default: { http: [\"http://127.0.0.1:8545\"] } },\n});\n\nconst client = createPublicClient({ chain: pyraxDevnet2, transport: http() });\n\nconst chainId = await client.getChainId();         // 710823\nconst blockNumber = await client.getBlockNumber();  // bigint, the current blue score\nconsole.log({ chainId, blockNumber });" },
    { t: "h2", text: "ethers v6" },
    { t: "p", html: "With ethers v6, pin the network with <code>Network.from</code> and pass <code>staticNetwork</code> so the provider never re-detects the chain. The example sends a 1 PYRX transfer." },
    { t: "code", lang: "typescript", title: "Send a PYRX transfer with ethers v6", code: "import { JsonRpcProvider, Wallet, Network, parseEther } from \"ethers\";\n\nconst network = Network.from({ name: \"pyrax-devnet2\", chainId: 710823 });\nconst provider = new JsonRpcProvider(\"http://127.0.0.1:8545\", network, {\n  staticNetwork: network,\n});\nconst wallet = new Wallet(process.env.PYRAX_PRIVATE_KEY!, provider);\n\nconst tx = await wallet.sendTransaction({\n  to: \"0xRecipient\",\n  value: parseEther(\"1.0\"), // 1 PYRX\n});\nconst receipt = await tx.wait();" },
    { t: "h2", text: "Hardhat" },
    { t: "p", html: "Add PYRAX networks to <code>hardhat.config.ts</code> by URL and chain id. Keep your funded private key in the environment, never in source." },
    { t: "code", lang: "typescript", title: "hardhat.config.ts", code: "import { HardhatUserConfig } from \"hardhat/config\";\nimport \"@nomicfoundation/hardhat-toolbox\";\n\nconst config: HardhatUserConfig = {\n  solidity: \"0.8.24\",\n  networks: {\n    pyraxDevnet2: {\n      url: \"http://127.0.0.1:8545\",\n      chainId: 710823,\n      accounts: [process.env.PYRAX_PRIVATE_KEY ?? \"\"],\n    },\n    pyraxTestnet: {\n      url: \"http://127.0.0.1:8545\",\n      chainId: 104928,\n      accounts: [process.env.PYRAX_PRIVATE_KEY ?? \"\"],\n    },\n  },\n};\n\nexport default config;" },
    { t: "h2", text: "Foundry" },
    { t: "p", html: "Register named RPC endpoints in <code>foundry.toml</code>; then <code>forge</code> and <code>cast</code> can reference them by alias with <code>--rpc-url pyrax_devnet2</code>." },
    { t: "code", lang: "toml", title: "foundry.toml", code: "[profile.default]\nsrc = \"src\"\nout = \"out\"\nlibs = [\"lib\"]\n\n[rpc_endpoints]\npyrax_devnet2 = \"http://127.0.0.1:8545\"\npyrax_testnet = \"http://127.0.0.1:8545\"   # your testnet node's RPC URL" },
    { t: "callout", kind: "info", html: "Because PYRAX speaks the full Ethereum JSON-RPC surface (read/state methods, native <code>eth_sendRawTransaction</code>, blocks/receipts/logs, EIP-1559 fee methods, log filters, and <code>eth_subscribe</code> over WebSocket), no PYRAX-specific transport adapter is required — point standard clients at the node and they connect as-is." }
  ]
};

const PAGE_DEPLOY_AND_CALL: DocPage = {
  slug: "deploy-and-call",
  title: "Deploy and call a contract",
  blocks: [
    { t: "p", html: "On PYRAX a contract is an <strong>account with code and storage</strong>, and <code>CREATE</code>/<code>CALL</code> execute <em>inside</em> L1 block application — every node re-executes identically, so execution <em>is</em> consensus. Deployment, calls, reverts, and gas accounting follow the Ethereum model. The examples below deploy and exercise the canonical persistent counter." },
    { t: "h2", text: "The contract" },
    { t: "code", lang: "solidity", title: "Counter.sol", code: "// SPDX-License-Identifier: Apache-2.0\npragma solidity ^0.8.20;\n\ncontract Counter {\n    uint256 public count;\n\n    function increment() external returns (uint256) {\n        count += 1;\n        return count;\n    }\n}" },
    { t: "callout", kind: "info", html: "The VM is auto-detected from the deployed code's magic bytes: <code>\\0asm</code> routes to WASM, <code>\\0CAIRO</code> routes to Cairo, and anything else is treated as EVM (the default) — so raw Ethereum init code just works." },
    { t: "h2", text: "Foundry / cast" },
    { t: "p", html: "Fund an account, deploy with <code>forge create</code>, then change state with <code>cast send</code> and read it back with <code>cast call</code>. <code>cast call</code> is a free, read-only execution that returns the decoded value." },
    { t: "code", lang: "bash", title: "Compile + deploy + call with Foundry / cast", code: "export RPC=http://127.0.0.1:8545\nexport PK=0x<your-funded-private-key>\nexport ME=$(cast wallet address --private-key $PK)\ncast balance $ME --rpc-url $RPC\n\n# Deploy with forge:\nforge create Counter --rpc-url $RPC --private-key $PK --broadcast\n\n# Call (state change) + read:\ncast send --rpc-url $RPC --private-key $PK $COUNTER \"increment()\"\ncast call --rpc-url $RPC $COUNTER \"count()(uint256)\"   # => 1" },
    { t: "h2", text: "viem" },
    { t: "p", html: "viem separates a <strong>public client</strong> (reads) from a <strong>wallet client</strong> (writes). <code>deployContract</code> returns a tx hash; wait for the receipt to get the <code>contractAddress</code>, then bind a contract handle for <code>write.*</code> (state-changing) and <code>read.*</code> (view) calls." },
    { t: "code", lang: "typescript", title: "Deploy + call with viem", code: "import {\n  createPublicClient, createWalletClient, http, defineChain, getContract,\n} from \"viem\";\nimport { privateKeyToAccount } from \"viem/accounts\";\nimport { readFileSync } from \"node:fs\";\n\nexport const pyraxDevnet2 = defineChain({\n  id: 710823,\n  name: \"PYRAX Devnet2\",\n  nativeCurrency: { name: \"PYRAX\", symbol: \"PYRX\", decimals: 18 },\n  rpcUrls: { default: { http: [\"http://127.0.0.1:8545\"] } },\n});\n\nconst account = privateKeyToAccount(\"0x<your-funded-private-key>\");\nconst publicClient = createPublicClient({ chain: pyraxDevnet2, transport: http() });\nconst walletClient = createWalletClient({ account, chain: pyraxDevnet2, transport: http() });\n\nconst abi = JSON.parse(readFileSync(\"build/Counter.abi\", \"utf8\"));\nconst bytecode = \"0x\" + readFileSync(\"build/Counter.bin\", \"utf8\").trim();\n\nconst deployHash = await walletClient.deployContract({ abi, bytecode });\nconst receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });\n\nconst counter = getContract({\n  address: receipt.contractAddress, abi,\n  client: { public: publicClient, wallet: walletClient },\n});\nawait counter.write.increment();\nconst value = await counter.read.count(); // 1n" },
    { t: "h2", text: "Read state without a transaction" },
    { t: "p", html: "Reading state never costs gas and needs no signer. Over raw JSON-RPC, a view call is <code>eth_call</code>; storage can also be read directly with <code>eth_getStorageAt</code>, and deployed code with <code>eth_getCode</code>. In the snippets above, <code>cast call</code> and viem's <code>read.count()</code> both resolve to <code>eth_call</code> under the hood." },
    { t: "list", items: [
      "<code>eth_call</code> — execute a function in a simulated context and return its decoded result.",
      "<code>eth_getStorageAt</code> — read a raw 32-byte storage slot (e.g. slot 0 holds <code>count</code>).",
      "<code>eth_getCode</code> — fetch the deployed runtime bytecode at an address.",
      "<code>eth_getBalance</code> — read an account's PYRX balance (in base units, 18 decimals)."
    ] },
    { t: "callout", kind: "warn", html: "On the test networks you need a funded key before deploying. Claim PYRX from the faucet (500 PYRX per claim, 12-hour cooldown) — see <a href=\"/guides/local-dev-and-testing\">Local dev &amp; testing</a>." }
  ]
};

const PAGE_EVENTS_AND_LOGS: DocPage = {
  slug: "events-and-logs",
  title: "Events & logs",
  blocks: [
    { t: "p", html: "PYRAX emits and indexes EVM logs exactly like Ethereum, and exposes the full query surface: one-shot historical queries (<code>eth_getLogs</code>), stateful filters (<code>eth_newFilter</code> + <code>eth_getFilterChanges</code>), and live push subscriptions (<code>eth_subscribe</code>) over WebSocket. A single local node serves HTTP and WebSocket on the same socket." },
    { t: "h2", text: "Emit an event" },
    { t: "p", html: "Declare and <code>emit</code> events in Solidity as usual. Indexed parameters become searchable log topics." },
    { t: "code", lang: "solidity", title: "Counter.sol — with an event", code: "// SPDX-License-Identifier: Apache-2.0\npragma solidity ^0.8.20;\n\ncontract Counter {\n    uint256 public count;\n\n    event Incremented(address indexed by, uint256 newCount);\n\n    function increment() external returns (uint256) {\n        count += 1;\n        emit Incremented(msg.sender, count);\n        return count;\n    }\n}" },
    { t: "h2", text: "Query historical logs — eth_getLogs" },
    { t: "p", html: "Query past logs by block range, address, and topics. Topic 0 is the event signature hash (<code>keccak256(\"Incremented(address,uint256)\")</code>); indexed arguments follow as additional topics." },
    { t: "code", lang: "bash", title: "eth_getLogs over JSON-RPC", code: "curl -s http://127.0.0.1:8545 \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getLogs\",\"params\":[{\n        \"fromBlock\":\"0x0\",\n        \"toBlock\":\"latest\",\n        \"address\":\"0x<counter-address>\",\n        \"topics\":[\"0x<keccak of Incremented(address,uint256)>\"]\n      }]}'" },
    { t: "p", html: "The same query in viem decodes results against the ABI for you:" },
    { t: "code", lang: "typescript", title: "getLogs with viem", code: "import { parseAbiItem } from \"viem\";\n\nconst logs = await publicClient.getLogs({\n  address: \"0x<counter-address>\",\n  event: parseAbiItem(\"event Incremented(address indexed by, uint256 newCount)\"),\n  fromBlock: 0n,\n  toBlock: \"latest\",\n});\nfor (const log of logs) console.log(log.args.by, log.args.newCount);" },
    { t: "h2", text: "Stateful filters" },
    { t: "p", html: "When you want to poll for new matches, install a filter once and pull only what is new each call. PYRAX implements the full filter family:" },
    { t: "table", head: ["Method", "Purpose"], rows: [
      ["eth_newFilter", "Install a log filter (address/topics/range); returns a filter id."],
      ["eth_newBlockFilter", "Notify on each new block."],
      ["eth_newPendingTransactionFilter", "Notify on each new pending transaction."],
      ["eth_getFilterChanges", "Return only entries since the last poll for a filter id."],
      ["eth_getFilterLogs", "Return all logs matching an installed filter."],
      ["eth_uninstallFilter", "Tear down a filter when finished."]
    ] },
    { t: "code", lang: "bash", title: "Install a filter, then poll it", code: "# 1) Install a log filter -> returns a filter id\ncurl -s http://127.0.0.1:8545 -H 'Content-Type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_newFilter\",\"params\":[{\n        \"address\":\"0x<counter-address>\",\"fromBlock\":\"latest\"}]}'\n# {\"jsonrpc\":\"2.0\",\"id\":1,\"result\":\"0x<filter-id>\"}\n\n# 2) Poll for new matches since the last call\ncurl -s http://127.0.0.1:8545 -H 'Content-Type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"eth_getFilterChanges\",\"params\":[\"0x<filter-id>\"]}'" },
    { t: "h2", text: "Live subscriptions — eth_subscribe over WebSocket" },
    { t: "p", html: "Over a WebSocket connection, <code>eth_subscribe</code> pushes events as they happen — no polling. PYRAX supports the <code>newHeads</code>, <code>logs</code>, and <code>newPendingTransactions</code> subscription types, plus <code>eth_unsubscribe</code> to cancel." },
    { t: "code", lang: "typescript", title: "Subscribe to logs over WebSocket (viem)", code: "import { createPublicClient, webSocket, parseAbiItem } from \"viem\";\n\nconst ws = createPublicClient({\n  chain: pyraxDevnet2,\n  transport: webSocket(\"ws://127.0.0.1:8545\"),\n});\n\n// Push new logs as they are mined (eth_subscribe: logs):\nconst unwatch = ws.watchEvent({\n  address: \"0x<counter-address>\",\n  event: parseAbiItem(\"event Incremented(address indexed by, uint256 newCount)\"),\n  onLogs: (logs) => logs.forEach((l) => console.log(\"new log\", l.args)),\n});\n\n// Push every new block header (eth_subscribe: newHeads):\nconst unwatchBlocks = ws.watchBlocks({\n  onBlock: (block) => console.log(\"new head\", block.number),\n});" },
    { t: "callout", kind: "info", html: "Subscription types supported by <code>eth_subscribe</code>: <code>newHeads</code> (block headers), <code>logs</code> (filtered logs), and <code>newPendingTransactions</code>. Cancel any of them with <code>eth_unsubscribe</code>." }
  ]
};

const PAGE_CROSS_VM_CALLS: DocPage = {
  slug: "cross-vm-calls",
  title: "Cross-VM calls",
  blocks: [
    { t: "p", html: "PYRAX runs three L1-integrated VMs — <strong>EVM</strong> (<code>revm</code>), <strong>WASM</strong> (<code>wasmtime</code> + the <code>pyrax-contract-sdk</code>), and <strong>Cairo</strong> (<code>cairo-vm</code>) — and a contract on any VM can call a contract on any other VM <strong>in-chain</strong>. These are full <strong>any↔any</strong> calls, not bridges: same block, same atomic execution, same consensus." },
    { t: "h2", text: "What is guaranteed across a cross-VM call" },
    { t: "list", items: [
      "<strong>Value-bearing</strong> — calls carry value, with a correct <code>msg.value</code> visible to the callee.",
      "<strong>EIP-150 63/64 gas rule</strong> — a caller forwards at most 63/64 of its remaining gas into the child frame, in each VM's own gas unit.",
      "<strong>STATICCALL-correct</strong> — a static call context is preserved across the VM boundary; a state write attempted under it reverts.",
      "<strong>Depth-capped at 1024</strong> — the call stack is bounded at 1024 frames across all VMs combined.",
      "<strong>Child-revert isolated</strong> — a reverted child frame rolls back its own state and is gas-charged, following the Ethereum revert model uniformly across the three VMs."
    ] },
    { t: "callout", kind: "info", html: "Because execution runs inside L1 block application, a cross-VM call is just another frame in the same transaction. There is no message-passing latency, no separate settlement, and no trust assumption between VMs — every node re-executes the whole call tree identically." },
    { t: "h2", text: "Calling another contract" },
    { t: "p", html: "From the caller's perspective a cross-VM call looks like an ordinary contract call: you call an address with a value and calldata, and the target's VM is resolved from the code stored at that address (detected from its magic bytes at deploy time). An EVM contract calling a WASM or Cairo contract uses the same <code>call</code>/<code>staticcall</code> path it would use for another EVM contract." },
    { t: "code", lang: "solidity", title: "An EVM contract calling across VMs", code: "// SPDX-License-Identifier: Apache-2.0\npragma solidity ^0.8.20;\n\ninterface ICounter {\n    function increment() external returns (uint256);\n    function count() external view returns (uint256);\n}\n\ncontract Caller {\n    // `target` may be an EVM, WASM, or Cairo contract — the call is\n    // resolved to the target's VM in-chain. msg.value is forwarded.\n    function bump(address target) external payable returns (uint256) {\n        return ICounter(target).increment();\n    }\n\n    // A view path is STATICCALL-correct across the VM boundary:\n    function read(address target) external view returns (uint256) {\n        return ICounter(target).count();\n    }\n}" },
    { t: "h2", text: "Deploying an EVM child from a WASM or Cairo factory" },
    { t: "p", html: "A non-EVM contract can deploy an EVM (Solidity) child. Because <code>revm</code> exposes no API to place code at a chosen address, PYRAX implements this via a <strong>CREATE2-proxy-at-factory</strong> mechanism: the EVM child lands at the uniform EIP-1014 CREATE2 address, the same address every VM would compute for that <code>(deployer, salt, init_code)</code> tuple. The factory deploys, then can immediately call into the freshly deployed EVM child across the VM boundary." },
    { t: "callout", kind: "warn", html: "The CREATE2-proxy factory path is guarded by a <strong>re-entrancy guard</strong> and a <strong>reserved-system-address guard</strong> (so a factory cannot deploy over a precompile or system address). Both were added during adversarial review." },
    { t: "h2", text: "The shared address space" },
    { t: "p", html: "All three VMs share one account/address space and one set of <strong>system precompiles</strong> in the reserved <code>0x00..00_01xx</code> block — including <code>BLAKE3</code>, <code>SHA256</code>, <code>KECCAK256</code>, <code>ECRECOVER</code>, <code>CHAIN_CONTEXT</code>, the <code>BRIDGE</code>, and <code>SHIELDED_VIEW</code>. These are how the deliberately crypto-free WASM and Cairo VMs hash and recover signatures, and they are callable from every VM, including nested (contract-internal) dispatch." }
  ]
};

const PAGE_CREATE2: DocPage = {
  slug: "create2",
  title: "Deterministic deploys with CREATE2",
  blocks: [
    { t: "p", html: "PYRAX implements <strong>EIP-1014 CREATE2</strong> uniformly across all three VMs: the EVM <code>CREATE2</code> opcode, and a <code>create2</code> host-function (WASM) / syscall (Cairo), all resolve to the <em>same</em> <code>create2_address</code> computation. That means a contract gets the <strong>same address on every VM</strong> for the same inputs, and you can compute that address off-chain before deploying." },
    { t: "h2", text: "The address formula" },
    { t: "p", html: "The CREATE2 address is the low 20 bytes of the Keccak-256 hash of a 85-byte preimage:" },
    { t: "code", lang: "bash", title: "The CREATE2 address derivation", code: "address = keccak256( 0xff ++ deployer ++ salt ++ keccak256(init_code) )[12:]\n\n#  0xff        1 byte   (the CREATE2 prefix)\n#  deployer   20 bytes  (the deploying contract's address)\n#  salt       32 bytes  (caller-chosen)\n#  keccak256(init_code)  32 bytes\n#  ---------------------\n#  preimage   85 bytes; take the low 20 bytes of its keccak256" },
    { t: "h2", text: "Compute it off-chain" },
    { t: "p", html: "This pure function reproduces the on-chain derivation, so you can know a deployment address before sending the transaction (useful for counterfactual instantiation, pre-funding an address, or cross-VM coordination)." },
    { t: "code", lang: "typescript", title: "CREATE2 — off-chain address computation", code: "import { keccak256, concat, getBytes, hexlify } from \"ethers\";\n\nfunction create2Address(deployer: string, salt: string, initCode: string): string {\n  const codeHash = keccak256(initCode);\n  const preimage = concat([\"0xff\", deployer, salt, codeHash]); // 85 bytes\n  const digest = keccak256(preimage);\n  return hexlify(getBytes(digest).slice(12)); // low 20 bytes\n}\n// address = keccak256(0xff ++ deployer ++ salt ++ keccak256(init_code))[12:]" },
    { t: "callout", kind: "info", html: "Because the derivation is identical in every VM, a salt-and-init-code pair deployed from a WASM or Cairo factory lands at the same address an EVM factory would produce. This is exactly the mechanism that lets a non-EVM factory deploy an EVM child at a predictable EIP-1014 address (see <a href=\"/guides/cross-vm-calls\">Cross-VM calls</a>)." },
    { t: "h2", text: "Tips" },
    { t: "list", items: [
      "The <code>salt</code> is yours to choose — vary it to deploy multiple instances of the same init code at distinct, predictable addresses.",
      "<code>keccak256(init_code)</code> hashes the <em>creation</em> (init) code, not the deployed runtime code.",
      "Changing any constructor argument changes the init code and therefore the resulting address.",
      "The system enforces a reserved-system-address guard: a CREATE2 deploy can never land on a precompile or reserved address."
    ] }
  ]
};

const PAGE_LOCAL_DEV_AND_TESTING: DocPage = {
  slug: "local-dev-and-testing",
  title: "Local dev & testing",
  blocks: [
    { t: "p", html: "The fastest loop is a local dev node: build the node from source, run it with <code>--dev</code> so it seals blocks on demand, and point your tooling at its JSON-RPC endpoint. A local dev node serves HTTP <em>and</em> WebSocket JSON-RPC on a single socket." },
    { t: "h2", text: "Build & run a dev node" },
    { t: "code", lang: "bash", title: "Build & run a dev node", code: "git clone https://github.com/pyrax-network/pyrax.git\ncd pyrax\ncargo build -p pyrax-node --features rpc --release\n\ncargo run -p pyrax-node --features rpc --release -- \\\n  --dev \\\n  --datadir ./pyrax-data \\\n  --rpc-port 8545" },
    { t: "list", items: [
      "<code>--dev</code> runs the instant-seal dev loop: submit a transaction and the DAG advances and state updates immediately.",
      "<code>--datadir</code> selects an isolated data directory for this instance.",
      "<code>--rpc-port</code> sets the JSON-RPC port (HTTP + WebSocket on the same socket)."
    ] },
    { t: "callout", kind: "info", html: "Prefer a one-click setup? The <strong>Inferno Node</strong> desktop app bundles a compiled node, so you can run a node, mine, stake, and contribute AI compute without a Rust toolchain. The <strong>PYRAX CLI</strong> also creates and runs multiple named node instances with auto-allocated, non-conflicting RPC/P2P/metrics ports." },
    { t: "h2", text: "Verify the endpoint" },
    { t: "p", html: "Confirm the node is up and which chain it serves with two quick calls — the standard <code>eth_chainId</code> and the native <code>pyrax_blockNumber</code>." },
    { t: "code", lang: "bash", title: "eth_chainId", code: "curl -s http://127.0.0.1:8545 \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_chainId\",\"params\":[]}'\n# {\"jsonrpc\":\"2.0\",\"id\":1,\"result\":\"0xad8a7\"}" },
    { t: "code", lang: "bash", title: "pyrax_blockNumber (native)", code: "curl -s http://127.0.0.1:8545 \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"pyrax_blockNumber\",\"params\":[]}'\n# {\"jsonrpc\":\"2.0\",\"id\":3,\"result\":5}" },
    { t: "h2", text: "Get funds from the faucet" },
    { t: "p", html: "To exercise transfers and deploys you need a funded account. On the <strong>test networks</strong> the faucet drips <strong>500 PYRX per claim</strong> with a <strong>12-hour cooldown</strong>. The faucet is available on Internal Live, Devnet2, and Testnet — and never on Mainnet." },
    { t: "table", head: ["Network", "Chain ID (decimal)", "Block time", "Faucet"], rows: [
      ["Internal Devnet 1.0", "881109", "5s", "—"],
      ["Internal Live", "429294", "5s", "✓"],
      ["Devnet2", "710823", "5s", "✓"],
      ["Testnet", "104928", "6s", "✓"],
      ["Mainnet", "563821", "6s", "—"]
    ] },
    { t: "callout", kind: "warn", html: "There is no Mainnet faucet, and Mainnet activates only after the external audit gate. Never put real-money keys into dev/test tooling." },
    { t: "h2", text: "Iterate" },
    { t: "p", html: "A typical inner loop on a local dev node:" },
    { t: "list", items: [
      "Edit the contract and rebuild artifacts (e.g. <code>forge build</code> or your WASM/Cairo build).",
      "Deploy against <code>http://127.0.0.1:8545</code> with Foundry, viem, or ethers (see <a href=\"/guides/deploy-and-call\">Deploy &amp; call a contract</a>).",
      "Drive state-changing calls and read results back with <code>eth_call</code> / <code>cast call</code>.",
      "Watch events live with <code>eth_subscribe</code> over WebSocket, or poll with <code>eth_getFilterChanges</code> (see <a href=\"/guides/events-and-logs\">Events &amp; logs</a>).",
      "Reset by pointing <code>--datadir</code> at a fresh directory to start from a clean genesis."
    ] },
    { t: "h2", text: "Useful JSON-RPC methods while testing" },
    { t: "table", head: ["Group", "Methods"], rows: [
      ["Chain & state", "eth_chainId, eth_blockNumber, eth_getBalance, eth_call, eth_getCode, eth_getStorageAt"],
      ["Transactions", "eth_sendRawTransaction, eth_getTransactionByHash, eth_getTransactionReceipt, eth_estimateGas"],
      ["Blocks, logs & filters", "eth_getBlockByNumber, eth_getLogs, eth_newFilter, eth_getFilterChanges"],
      ["Fees (EIP-1559)", "eth_gasPrice, eth_maxPriorityFeePerGas, eth_feeHistory"],
      ["WebSocket subscriptions", "eth_subscribe, eth_unsubscribe"],
      ["PYRAX native", "pyrax_blockNumber, pyrax_dialPeers, + native node helpers"]
    ] },
    { t: "callout", kind: "info", html: "Execution limits to keep in mind: a <strong>30,000,000</strong> block gas limit, the <strong>EIP-150 63/64</strong> cross-VM call gas rule, and a call depth <strong>capped at 1024</strong>. Engines: revm 22 (EVM), wasmtime 33 (WASM), cairo-vm 2.5 (Cairo)." }
  ]
};


const PAGE_JSON_RPC: DocPage = {
  slug: "json-rpc",
  title: "JSON-RPC reference",
  blocks: [
    { t: "p", html: "The PYRAX dev node exposes a <strong>JSON-RPC 2.0</strong> API over a <strong>single socket</strong> that serves both HTTP and WebSocket. Point any Ethereum tool (MetaMask, ethers.js, viem, Hardhat, Foundry) at it for the <code>eth_*</code> / <code>net_*</code> / <code>web3_*</code> subset, and use the <code>pyrax_*</code> namespace for PYRAX-native features (the GhostDAG, the shielded pool, the mixnet, external mining, and DAG-aware subscriptions). The trait behind it is <code>NodeApi</code> in <code>pyrax-rpc</code>." },
    { t: "h2", text: "Conventions" },
    { t: "table", head: ["Concept", "Convention"], rows: [
      ["Transport", "HTTP POST and WebSocket on the same socket. The dev node listens on --rpc-port (default 8545)."],
      ["Quantities", "Integers are 0x-prefixed hex strings (e.g. \"0x1f4\" = 500), per the Ethereum quantity encoding."],
      ["Byte data", "0x-prefixed hex strings. Empty data is \"0x\"."],
      ["Addresses (input)", "20-byte addresses accept 0x-prefixed hex, bare hex, or pyr-prefixed PYRAX form."],
      ["Hashes (input)", "32-byte hashes accept pyr-prefixed, 0x-prefixed, or bare hex."],
      ["Native hashes (output)", "pyrax_* methods return pyr-prefixed hashes; eth_* methods return 0x-prefixed hashes."],
      ["Block tags", "\"latest\", \"earliest\", \"pending\", \"safe\", \"finalized\", a 0x hex number, or a decimal number."],
      ["\"Block number\"", "The number surfaced everywhere is the GhostDAG blue score — the reorg-stable height analogue, not a canonical-order index."],
      ["State queries", "Only the latest state is queryable. A blockTag on eth_getBalance / eth_getTransactionCount is accepted but ignored."],
      ["Native token", "PYRX. Balances and values are in base units (18 decimals)."]
    ]},
    { t: "callout", kind: "info", html: "The socket serves both protocols: you do not run a separate WebSocket port. Send subscriptions (<code>eth_subscribe</code>, <code>pyrax_subscribeNewHeads</code>) over a WS connection to the same <code>--rpc-port</code>; send everything else over HTTP POST (or WS — both work)." },
    { t: "h2", text: "eth_* — Ethereum-compatible surface" },
    { t: "h3", text: "Chain & state" },
    { t: "table", head: ["Method", "Description"], rows: [
      ["eth_chainId", "EIP-155 chain id as a hex quantity."],
      ["eth_blockNumber", "Current tip's blue score (chain height) as a hex quantity."],
      ["eth_getBalance", "Latest balance of an account, in base units (hex). blockTag accepted but ignored."],
      ["eth_getTransactionCount", "Account's next nonce (transaction count), as a hex quantity."],
      ["eth_getCode", "Deployed runtime code at an address; \"0x\" for an EOA. Returns the VM-tagged code regardless of VM."],
      ["eth_getStorageAt", "32-byte value at a contract storage slot (the flat 32-byte-slot model shared across all VMs). Zero if unset."],
      ["eth_call", "Read-only message call against the latest state; returns output bytes. A revert is surfaced as an error. to required (missing → -32602); gas defaults to 30M."],
      ["eth_estimateGas", "Gas a call would consume. Same call-object fields as eth_call."]
    ]},
    { t: "h3", text: "Blocks" },
    { t: "p", html: "Block numbers are blue scores in canonical (blue-score) order. PYRAX is a blockDAG with <strong>no uncles</strong>, so the uncle-count methods always return <code>\"0x0\"</code>. Shielded transactions are filtered out of full-tx views." },
    { t: "table", head: ["Method", "Description"], rows: [
      ["eth_getBlockByNumber", "A block by number/tag. fullTransactions toggles full tx objects vs. tx hashes."],
      ["eth_getBlockByHash", "A block by hash. The number field is the block's blue score."],
      ["eth_getBlockTransactionCountByNumber", "Tx count in a block, by number/tag (hex), or null."],
      ["eth_getBlockTransactionCountByHash", "Tx count in a block, by hash (hex), or null."],
      ["eth_getBlockReceipts", "Every receipt in a block; accepts either a number/tag or a block hash."],
      ["eth_getUncleCountByBlockHash", "Always \"0x0\" — PYRAX has no ommer/uncle blocks."],
      ["eth_getUncleCountByBlockNumber", "Always \"0x0\"."]
    ]},
    { t: "h3", text: "Transactions" },
    { t: "table", head: ["Method", "Description"], rows: [
      ["eth_sendRawTransaction", "Submits a raw, externally-signed EIP-2718 transaction; decodes + recovers the sender immediately, admits it as a native Tx::Ethereum. Returns 0x keccak256(raw)."],
      ["eth_getTransactionByHash", "A mined transaction with block context, or null. Shielded txs yield null."],
      ["eth_getTransactionByBlockHashAndIndex", "A transaction by block hash + position."],
      ["eth_getTransactionByBlockNumberAndIndex", "A transaction by block number/tag + position."]
    ]},
    { t: "h3", text: "Receipts & logs" },
    { t: "p", html: "A reverted transaction is <strong>still included</strong> and gas-charged — its receipt has <code>status: \"0x1\"</code> only on success (<code>\"0x0\"</code> on revert)." },
    { t: "table", head: ["Method", "Description"], rows: [
      ["eth_getTransactionReceipt", "Receipt + block context for a mined tx, or null (unknown / not yet mined / reorged out)."],
      ["eth_getLogs", "Logs matching a filter, in (block, tx, log) order. Filter: fromBlock, toBlock, blockHash (overrides range), address, per-position topics."]
    ]},
    { t: "h3", text: "Fee market (EIP-1559)" },
    { t: "table", head: ["Method", "Description"], rows: [
      ["eth_gasPrice", "next_base_fee + suggested_priority_fee, so a legacy sender clears the base fee."],
      ["eth_maxPriorityFeePerGas", "Suggested priority tip per gas for prompt inclusion."],
      ["eth_feeHistory", "Historical base fees, gas-used ratios, and optional priority-fee percentiles over a window. baseFeePerGas has length blockCount + 1 (trailing pending entry)."]
    ]},
    { t: "h3", text: "Tooling helpers (web3_* / net_*)" },
    { t: "table", head: ["Method", "Description"], rows: [
      ["net_version", "The chain id as a decimal string (legacy net_version form)."],
      ["net_listening", "Whether the node is accepting connections — always true."],
      ["net_peerCount", "Active peer count as a hex quantity (same value as pyrax_peerCount)."],
      ["web3_clientVersion", "The node's client version string (from CARGO_PKG_VERSION), e.g. \"PYRAX/v0.5.0-dev/rust\"."],
      ["web3_sha3", "Keccak-256 of the input (Ethereum's web3_sha3 is keccak-256, not SHA-3)."],
      ["eth_syncing", "false when synced; else { startingBlock, currentBlock, highestBlock } (local vs. network best blue score)."]
    ]},
    { t: "h3", text: "Filters (poll API)" },
    { t: "p", html: "Stateful, pollable filters for clients that cannot hold a WebSocket open. Bounds: <code>MAX_FILTERS = 1024</code> (LRU eviction of the least-recently-polled) and <code>MAX_FILTER_CHANGES = 4096</code> (entries/blocks per poll)." },
    { t: "table", head: ["Method", "Description"], rows: [
      ["eth_newFilter", "Creates a log-query filter (same shape as eth_getLogs). Returns a 0x hex filter id."],
      ["eth_newBlockFilter", "Filter reporting block hashes for blocks sealed after creation (starts at tip + 1)."],
      ["eth_newPendingTransactionFilter", "Filter draining the pending-tx broadcast it subscribes to at creation."],
      ["eth_getFilterChanges", "Polls a filter for new entries since the last poll (logs / block hashes / tx hashes by type). Unknown id → \"filter not found\" (-32602)."],
      ["eth_getFilterLogs", "All logs in a log filter's full original range [floor, ceil], regardless of poll cursor."],
      ["eth_uninstallFilter", "Removes a filter; true if it existed, false for an unknown id (not an error)."]
    ]},
    { t: "h3", text: "Subscriptions (WebSocket)" },
    { t: "table", head: ["Method", "Description"], rows: [
      ["eth_subscribe", "Ethereum-style subscription. kind: \"newHeads\", \"logs\", or \"newPendingTransactions\". Notification method eth_subscription; unsubscribe via eth_unsubscribe."],
      ["eth_unsubscribe", "Cancels an eth_subscribe subscription (auto-registered)."],
      ["pyrax_subscribeNewHeads", "PYRAX-native new-heads subscription; pushes a DagTipDto per new tip. Notification pyrax_newHead; unsubscribe pyrax_unsubscribeNewHeads."]
    ]},
    { t: "callout", kind: "warn", html: "<strong>Best-effort delivery.</strong> All subscriptions and pending-tx feeds deliver over bounded broadcast channels. Under sustained load the oldest buffered messages are dropped; transactions admitted before you subscribe are never seen. Reconcile against receipts." },
    { t: "h2", text: "pyrax_* — native namespace" },
    { t: "h3", text: "Chain, DAG & consensus" },
    { t: "table", head: ["Method", "Returns / Description"], rows: [
      ["pyrax_blockNumber", "u64 — current height (best blue score)."],
      ["pyrax_syncStatus", "{ height, target, syncing } — local best vs. network max known blue score."],
      ["pyrax_consensusInfo", "ConsensusInfo { mode, activeStreams, singleStreamNote, rewardPolicy }. mode is \"dev-single-stream\" or \"dev-tristream\"."],
      ["pyrax_dagTips", "Vec<DagTipDto> — current DAG tips, each { hash, blueScore, stream } (stream A/B/C)."],
      ["pyrax_dagRecent", "Vec<DagBlockDto> via BFS from tips, newest first. limit default 64, clamped to [1, 512]."],
      ["pyrax_getBlock", "Option<DagBlock> by hash — { header, transactions } or null."]
    ]},
    { t: "h3", text: "State & accounts" },
    { t: "table", head: ["Method", "Returns / Description"], rows: [
      ["pyrax_getBalance", "String — latest balance (0x hex base units). Latest state only."],
      ["pyrax_nonce", "u64 — next expected transaction nonce for an address."],
      ["pyrax_sendTransaction", "Submits a native Tx envelope (Ethereum / Transparent / Shielded); returns a pyr-prefixed hash."]
    ]},
    { t: "h3", text: "Shielded pool (read-only)" },
    { t: "p", html: "These expose only <strong>public</strong> shielded-pool data. Spending keys never reach the node — the wallet's own prover scans this data and builds spend witnesses locally." },
    { t: "table", head: ["Method", "Returns / Description"], rows: [
      ["pyrax_noteState", "NoteState { anchor, noteCount, nullifierCount } — a pool snapshot."],
      ["pyrax_shieldedChainData", "ShieldedChainData { leaves, items (ciphertext, leafIndex), anchor, nullifiers } — the full public dataset a wallet-side prover needs. No keys."]
    ]},
    { t: "h3", text: "Networking & node identity" },
    { t: "table", head: ["Method", "Returns / Description"], rows: [
      ["pyrax_peerCount", "u64 — active peer count from the mesh."],
      ["pyrax_peers", "Vec<PeerInfoDto> — each { id, address, direction, latencyMs }."],
      ["pyrax_nodeInfo", "NodeInfoDto { peerId, listenAddrs, p2pPort }."],
      ["pyrax_dialPeers", "Dials peers at runtime (multiaddrs); returns usize = count of addresses passed."],
      ["pyrax_bandwidth", "BandwidthStatsDto { bytesIn, bytesOut } — cumulative gossip bandwidth since start."]
    ]},
    { t: "h3", text: "External mining" },
    { t: "p", html: "Stream A and Stream B are Proof-of-Work and externally minable. Stream C is Proof-of-Stake — requesting work for <code>\"C\"</code> is an error." },
    { t: "table", head: ["Method", "Returns / Description"], rows: [
      ["pyrax_getWork", "WorkUnit { stream, parent, bodyRoot, target ([u8;32]), timestamp }. stream must be \"A\" or \"B\"."],
      ["pyrax_submitWork", "Submits a WorkSolution; dual-hash PoW (BLAKE3 + SHA-256) is verified, the node seals a block, returns its pyr hash."]
    ]},
    { t: "h3", text: "Mixnet anonymous transfer" },
    { t: "table", head: ["Method", "Returns / Description"], rows: [
      ["pyrax_streamAddress", "String — this node's shareable anonymous-transfer address (hex relay descriptor)."],
      ["pyrax_streamSend", "Sends a file over the mixnet (recipient, name, data_hex, relays); returns a transfer id."],
      ["pyrax_streamSendLink", "Sends a Cast (a media/stream URL) over the mixnet; returns a transfer id."],
      ["pyrax_streamInbox", "Vec<ReceivedFileDto> — { id, name, size, kind } (\"file\" or \"link\"), newest first."],
      ["pyrax_streamRead", "String — hex bytes of a received transfer (raw file bytes, or the URL hex for a Cast)."]
    ]},
    { t: "h3", text: "Seed-list signing" },
    { t: "p", html: "In-node signing so publisher keys never leave the node. Both methods require the <code>PYRAX_SEED_RPC_TOKEN</code> env var; otherwise they return <code>-32004</code>. An invalid token returns <code>-32001</code> (constant-time comparison)." },
    { t: "table", head: ["Method", "Returns / Description"], rows: [
      ["pyrax_seedKeygen", "SeedKeypairDto { secretHex, publicHex } — generates an Ed25519 publisher keypair."],
      ["pyrax_seedListSign", "String — JSON SignedSeedList signed in-node (token, secret_hex, chain_id, valid_until, sequence, seeds)."]
    ]},
    { t: "h2", text: "Example request/response" },
    { t: "code", lang: "bash", title: "eth_chainId", code: "curl -s http://localhost:8545 -H 'Content-Type: application/json' -d '{\n  \"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_chainId\",\"params\":[]\n}'" },
    { t: "code", lang: "json", title: "response (Devnet2 = 710823)", code: "{ \"jsonrpc\": \"2.0\", \"id\": 1, \"result\": \"0xad8a7\" }" },
    { t: "callout", kind: "info", html: "<code>0xad8a7</code> is Devnet2 (decimal <strong>710823</strong>), the default network. <code>net_version</code> returns the same id as the decimal string <code>\"710823\"</code>. See the gas-and-limits and errors-and-glossary pages for the full chain-id table." },
    { t: "h2", text: "Data transfer objects (DTOs)" },
    { t: "h3", text: "RpcReceipt" },
    { t: "table", head: ["Field", "Type", "Description"], rows: [
      ["tx_hash", "Hash", "The transaction id."],
      ["block_hash", "Hash", "Hash of the including block."],
      ["block_number", "u64", "Canonical (blue-score) number of the including block."],
      ["tx_index", "u64", "Index of the transaction within its block."],
      ["from", "Address", "Recovered sender."],
      ["to", "Option<Address>", "Recipient, or None for a contract creation."],
      ["contract_address", "Option<Address>", "Address of a contract this tx created, if any."],
      ["success", "bool", "Whether execution succeeded. A revert is false but still included and gas-charged."],
      ["gas_used", "u64", "Gas this transaction consumed."],
      ["cumulative_gas_used", "u64", "Cumulative gas in the block up to and including this tx."],
      ["logs", "Vec<RpcLog>", "Logs this transaction emitted."]
    ]},
    { t: "h3", text: "RpcLog" },
    { t: "table", head: ["Field", "Type", "Description"], rows: [
      ["address", "Address", "Contract that emitted the log (20 bytes)."],
      ["topics", "Vec<Hash>", "Indexed topics; topics[0] is usually the event signature hash."],
      ["data", "Vec<u8>", "ABI-encoded non-indexed log data."],
      ["block_number", "u64", "Canonical number of the emitting tx's block."],
      ["block_hash", "Hash", "Hash of that block."],
      ["tx_hash", "Hash", "Hash of the emitting transaction."],
      ["tx_index", "u64", "Index of the emitting transaction within its block."],
      ["log_index", "u64", "Index of this log within the block (across all transactions)."]
    ]},
    { t: "h3", text: "RpcTransaction" },
    { t: "table", head: ["Field", "Type", "Description"], rows: [
      ["tx_hash", "Hash", "The transaction id."],
      ["block_hash", "Hash", "Hash of the including block."],
      ["block_number", "u64", "Canonical number of the including block."],
      ["tx_index", "u64", "Index of the transaction within its block."],
      ["from", "Address", "Recovered sender."],
      ["to", "Option<Address>", "Recipient, or None for a contract creation."],
      ["nonce", "u64", "Sender nonce."],
      ["value", "Amount", "Value transferred (base units; Amount wraps u128)."],
      ["gas", "u64", "Gas limit."],
      ["gas_price", "u128", "Gas price (base units per gas)."],
      ["input", "Vec<u8>", "Call data / init code."]
    ]},
    { t: "h3", text: "FeeMarket (feeHistory)" },
    { t: "table", head: ["Field", "Type", "Description"], rows: [
      ["next_base_fee", "u128", "Base fee per gas the next (pending) block will charge."],
      ["suggested_priority_fee", "u128", "Suggested priority tip per gas for prompt inclusion."],
      ["oldest_block", "u64", "The window's first block (oldestBlock)."],
      ["base_fee_per_gas", "Vec<u128>", "Per-block base fee, ascending, plus one trailing pending entry. Length = blocks + 1."],
      ["gas_used_ratio", "Vec<f64>", "Per-block gas_used / gas_limit in [0, 1], one per block (no pending entry)."]
    ]},
    { t: "h3", text: "LogFilter" },
    { t: "table", head: ["Field", "Type", "Description"], rows: [
      ["from_block", "Option<u64>", "Inclusive lower bound (defaults to genesis)."],
      ["to_block", "Option<u64>", "Inclusive upper bound (defaults to the tip)."],
      ["block_hash", "Option<Hash>", "Restrict to a single block; overrides the block range when set."],
      ["address", "Vec<Address>", "Any of these addresses (empty = any)."],
      ["topics", "Vec<Option<Vec<Hash>>>", "Per-position: Some(set) requires the i-th topic to be in set; None matches any."]
    ]},
    { t: "h2", text: "Error codes" },
    { t: "table", head: ["Code", "Variant / context", "Meaning"], rows: [
      ["-32602", "InvalidParams", "Malformed params: parse/type errors, invalid hex, missing required fields (e.g. eth_call with no to), or an unknown filter id."],
      ["-32004", "NotFound / service unavailable", "Resource not found (block, tx, receipt, received file); also mixnet stream-RPC service errors and seed RPCs when PYRAX_SEED_RPC_TOKEN is not configured."],
      ["-32003", "TxRejected", "Transaction rejected by the mempool (application error)."],
      ["-32001", "Seed RPC auth failure", "\"unauthorized: invalid seed RPC token\" (constant-time comparison)."],
      ["-32603", "Internal", "Internal node error (e.g. database I/O, consensus failure)."]
    ]},
    { t: "callout", kind: "warn", html: "A revert during <code>eth_sendRawTransaction</code> / <code>pyrax_sendTransaction</code> execution is <strong>not</strong> an RPC error — the transaction is mined, gas is charged, and the receipt reports <code>success: false</code> (<code>status: \"0x0\"</code>). RPC errors are reserved for malformed requests and node-internal faults. <code>eth_call</code> is the one exception: being read-only with no receipt, it returns a JSON-RPC error on revert." }
  ]
};


const PAGE_PRECOMPILES: DocPage = {
  slug: "precompiles",
  title: "Precompiles reference",
  blocks: [
    { t: "p", html: "PYRAX ships a set of <strong>system precompiles</strong>: privileged, deterministic operations that live at fixed reserved addresses and run the same way no matter which VM (or which transaction kind) invokes them. They give every VM one vetted set of cryptographic hashes, signature recovery, and chain-context reads — including WASM and Cairo, which have no built-in crypto of their own." },
    { t: "p", html: "A precompile is not a deployed contract. It is dispatched directly by the ledger (<code>pyrax_contracts::dispatch</code>) when a call's <code>to</code> matches a reserved address, executed over a staging overlay of L1 state. A precompile that fails is <strong>still included and gas-charged</strong> (the Ethereum model): it returns <code>success = false</code>, never an error, and its staged writes are discarded." },
    { t: "h2", text: "The precompile address block" },
    { t: "p", html: "All system precompiles occupy the reserved <code>0x00…00_01xx</code> block — addresses whose first 18 bytes are zero and whose byte 18 is <code>0x01</code>. This sits <strong>above</strong> the Ethereum precompile block (<code>0x01</code>–<code>0x0a</code>), so a revm EVM contract's own built-in precompiles never collide with these. <code>address::ALL</code> in <code>pyrax-contracts</code> is the single source of truth for the set; it is exactly what <code>is_precompile()</code> returns true for." },
    { t: "table", head: ["Address", "Name", "Purpose", "Gas", "Payable", "Static-safe"], rows: [
      ["0x0000000000000000000000000000000000000100", "BRIDGE", "L1↔rollup bridge (deposit / withdraw / postCommitment)", "varies — see the bridge page", "deposit only", "no (state-mutating)"],
      ["0x0000000000000000000000000000000000000101", "BLAKE3", "BLAKE3-256 of the input", "15 + 3/word", "no", "yes"],
      ["0x0000000000000000000000000000000000000102", "SHA256", "SHA-256 of the input", "60 + 12/word", "no", "yes"],
      ["0x0000000000000000000000000000000000000103", "KECCAK256", "Keccak-256 of the input", "30 + 6/word", "no", "yes"],
      ["0x0000000000000000000000000000000000000104", "ECRECOVER", "secp256k1 public-key → address recovery", "3000 (flat)", "no", "yes"],
      ["0x0000000000000000000000000000000000000110", "CHAIN_CONTEXT", "chain_id ++ block_number ++ block_timestamp (96 bytes)", "60 (flat)", "no", "yes"],
      ["0x0000000000000000000000000000000000000111", "SHIELDED_VIEW", "shielded note-tree anchor (32 bytes)", "60 (flat)", "no", "yes"]
    ]},
    { t: "p", html: "A <em>word</em> is 32 bytes, rounded <strong>up</strong>: a 1-byte and a 32-byte input both cost one word; 33 bytes cost two. The exact helper is <code>base + per_word × ceil(len / 32)</code> (<code>cost_words</code>), saturating so an enormous length can never wrap." },
    { t: "callout", kind: "warn", html: "<strong>The treasury block is NOT precompiles.</strong> The <code>0x00…00_02xx</code> addresses — <code>PYRAX_TREASURY</code> (…0200), <code>DAO_TREASURY</code> (…0201), <code>FAUCET</code> (…0202), and <code>AI_COMPUTE_POOL</code> (…0203) — are plain reserved <em>accounts</em>, not precompiles. They hold balance but carry no dispatch logic; <code>is_precompile()</code> returns <code>false</code> for them and a call to one is an ordinary value transfer." },
    { t: "h2", text: "Common semantics" },
    { t: "list", items: [
      "<strong>Failure is included.</strong> A precompile that cannot complete returns <code>success = false</code>; its overlay writes are discarded but the transaction and its gas charge are still committed. This mirrors a VM revert exactly.",
      "<strong>True out-of-gas</strong> — the caller did not authorize enough gas to cover the op's cost. The precompile consumes the <em>entire</em> <code>gas_limit</code> (<code>PrecompileOutcome::fail</code>).",
      "<strong>Logical failure (a revert)</strong> — the precompile ran but hit a bad input, unmet precondition, or rejected proof. It charges only the <em>gas the op actually costs</em> (<code>PrecompileOutcome::reverted</code>), matching the VM revert path.",
      "<strong>Value semantics.</strong> The crypto and context precompiles are non-payable: a call carrying non-zero <code>value</code> is a logical failure, so value is never stranded. Only the bridge's <code>deposit</code> is payable.",
      "<strong>Static execution.</strong> The crypto and context precompiles are pure reads — allowed inside <code>eth_call</code> / a STATICCALL, emit no logs. The bridge's mutating entry points must fail under static execution.",
      "<strong>Storage scope.</strong> When a precompile reads/writes storage it addresses its own account's slots; the crypto and context precompiles touch no storage."
    ]},
    { t: "h2", text: "Cryptographic precompiles" },
    { t: "p", html: "Pure functions of their input: deterministic, no state access, no logs. Gas is metered per 32-byte input word to mirror Ethereum's precompile costs, so cross-tool gas estimates line up. Each computes the same digest the <code>pyrax-crypto</code> crate produces." },
    { t: "table", head: ["Precompile", "Input", "Output", "Gas"], rows: [
      ["BLAKE3 — 0x…0101", "arbitrary-length bytes (hashed verbatim)", "32-byte BLAKE3-256 digest", "15 + 3 × ceil(len/32)"],
      ["SHA256 — 0x…0102", "arbitrary-length bytes", "32-byte SHA-256 digest", "60 + 12 × ceil(len/32) (matches Ethereum 0x02)"],
      ["KECCAK256 — 0x…0103", "arbitrary-length bytes", "32-byte Keccak-256 digest (the EVM hash / Solidity keccak256 / web3_sha3)", "30 + 6 × ceil(len/32) (matches the KECCAK256 opcode)"],
      ["ECRECOVER — 0x…0104", "128 bytes: hash(32) ++ v(32) ++ r(32) ++ s(32)", "on success 32 bytes 0x000…00 ++ address(20); on unrecoverable input empty (success still true)", "3000 (flat)"]
    ]},
    { t: "h3", text: "ECRECOVER field rules" },
    { t: "list", items: [
      "<code>v</code> lives in <code>input[32..64]</code>: Ethereum encodes <code>27</code> or <code>28</code> in the last byte and zero in the rest. Bytes <code>input[32..63]</code> must all be zero, and <code>input[63]</code> must be <code>27</code> or <code>28</code> — anything else (including raw 0/1 recids) is rejected.",
      "<code>r = input[64..96]</code>, <code>s = input[96..128]</code>. The input is zero-padded on the right if shorter, truncated if longer.",
      "<strong>High-<code>s</code> signatures are accepted</strong> — low-<code>s</code> is a transaction-admission rule only; the EVM ECRECOVER opcode accepts high-<code>s</code>, and PYRAX matches it so ported contracts behave identically."
    ]},
    { t: "callout", kind: "warn", html: "<strong>ECRECOVER does not revert on bad input.</strong> A malformed/unrecoverable signature is not an execution failure: the precompile returns <code>success = true</code> with empty output, which a caller reads as <code>address(0)</code>. Always compare the recovered address against zero. The only way it reports <code>success = false</code> is true out-of-gas (limit below 3000) or a non-zero value." },
    { t: "h2", text: "Context precompiles" },
    { t: "p", html: "Read-only introspection exposed uniformly to all VMs. The EVM has opcodes for some of this (<code>CHAINID</code>, <code>NUMBER</code>, <code>TIMESTAMP</code>), but WASM and Cairo do not. Both are non-payable, allowed in static execution, and emit no logs. Input is ignored." },
    { t: "h3", text: "CHAIN_CONTEXT — 0x…0110" },
    { t: "p", html: "Output is 96 bytes — three big-endian 32-byte words. Each value is a <code>u64</code> encoded right-aligned (bytes [24..32] of its word):" },
    { t: "table", head: ["Bytes", "Word", "Field"], rows: [
      ["[24..32]", "word 0", "chain_id"],
      ["[56..64]", "word 1", "block_number (GhostDAG blue score)"],
      ["[88..96]", "word 2", "block_timestamp"]
    ]},
    { t: "callout", kind: "info", html: "<code>chain_id</code> is the network's id (decimal): <code>563821</code> mainnet, <code>104928</code> testnet, <code>710823</code> devnet2 (default), <code>881109</code> internal-devnet-simulated, <code>429294</code> internal-devnet-live. The <code>block_number</code> here is the GhostDAG <strong>blue score</strong>, identical to the EVM NUMBER opcode and the WASM/Cairo <code>block_number</code> SDK call." },
    { t: "h3", text: "SHIELDED_VIEW — 0x…0111" },
    { t: "p", html: "Output is the 32-byte current shielded note-tree anchor (the note-commitment-tree root). A contract can attest against the shielded pool's current state without learning any private note contents. This is the same anchor surfaced by <code>pyrax_noteState</code> and <code>pyrax_shieldedChainData</code>." },
    { t: "h2", text: "Calling precompiles from each VM" },
    { t: "p", html: "From the <strong>EVM (Solidity)</strong>, treat a precompile like any contract at its fixed address and use <code>staticcall</code> for the read-only crypto/context precompiles — the input/output layout matches the corresponding Ethereum precompiles (only the addresses differ). From <strong>WASM</strong>, use <code>sdk::precompile(addr, input)</code> (read-only). From <strong>Cairo</strong>, use the <code>pyrax.precompile</code> syscall (byte-per-felt)." },
    { t: "code", lang: "solidity", title: "EVM — PyraxPrecompiles library", code: "// SPDX-License-Identifier: Apache-2.0\npragma solidity ^0.8.20;\n\nlibrary PyraxPrecompiles {\n    address constant BLAKE3        = 0x0000000000000000000000000000000000000101;\n    address constant SHA256        = 0x0000000000000000000000000000000000000102;\n    address constant KECCAK256     = 0x0000000000000000000000000000000000000103;\n    address constant ECRECOVER     = 0x0000000000000000000000000000000000000104;\n    address constant CHAIN_CONTEXT = 0x0000000000000000000000000000000000000110;\n    address constant SHIELDED_VIEW = 0x0000000000000000000000000000000000000111;\n\n    function blake3(bytes memory data) internal view returns (bytes32 digest) {\n        (bool ok, bytes memory out) = BLAKE3.staticcall(data);\n        require(ok && out.length == 32, \"blake3 failed\");\n        digest = bytes32(out);\n    }\n\n    /// Returns address(0) on an unrecoverable signature (the call still succeeds).\n    function ecrecover_(bytes32 hash, uint8 v, bytes32 r, bytes32 s)\n        internal view returns (address signer)\n    {\n        (bool ok, bytes memory out) =\n            ECRECOVER.staticcall(abi.encode(hash, uint256(v), r, s));\n        require(ok, \"ecrecover out of gas\");\n        if (out.length == 0) return address(0);\n        signer = address(uint160(uint256(bytes32(out))));\n    }\n\n    function chainContext()\n        internal view returns (uint256 chainId, uint256 number, uint256 timestamp)\n    {\n        (bool ok, bytes memory out) = CHAIN_CONTEXT.staticcall(\"\");\n        require(ok && out.length == 96, \"chain_context failed\");\n        (chainId, number, timestamp) = abi.decode(out, (uint256, uint256, uint256));\n    }\n}" },
    { t: "code", lang: "rust", title: "WASM (Rust, pyrax-contract-sdk)", code: "// SPDX-License-Identifier: Apache-2.0\nuse pyrax_contract_sdk as sdk;\n\n#[no_mangle]\npub extern \"C\" fn call() {\n    let data = sdk::input();\n\n    // BLAKE3-256 of the calldata (digest.len() == 32).\n    let digest = sdk::precompile(&sdk::precompiles::BLAKE3, &data).expect(\"blake3\");\n\n    // CHAIN_CONTEXT: 96 bytes = chain_id ++ block_number ++ block_timestamp.\n    let ctx = sdk::precompile(&sdk::precompiles::CHAIN_CONTEXT, &[]).expect(\"ctx\");\n    let mut be = [0u8; 8];\n    be.copy_from_slice(&ctx[24..32]);\n    let chain_id = u64::from_be_bytes(be); // word 0, bytes [24..32]\n\n    sdk::output(&digest);\n}" },
    { t: "code", lang: "cairo", title: "Cairo (pyrax.precompile syscall)", code: "// pyrax.precompile syscall: READ-ONLY dispatch to a system precompile.\n//   ids.addr      — 20-byte precompile address, one byte per felt (low byte)\n//   ids.input     — input bytes, one byte per felt\n//   ids.input_len — number of input felts\n//   ids.out       — output bytes, one byte per felt (written by the host)\n//   ids.out_len   — number of output felts (written)\n//   ids.ok        — 1 on success, 0 on failure (written)\n%{\n    syscall_handler.precompile(\n        addr=ids.addr,\n        input=ids.input,\n        input_len=ids.input_len,\n        out=ids.out,\n        out_len=ids.out_len,\n        ok=ids.ok,\n    )\n%}" },
    { t: "callout", kind: "info", html: "<strong>Nested precompile gas.</strong> When a WASM or Cairo contract calls a precompile, the VM charges a dispatch base plus a per-input-byte cost on top of the precompile's own metered gas (<code>GAS_PRECOMPILE_BASE = 200</code> + 8/byte in WASM; an equivalent word charge in Cairo), then charges the precompile's cost back against the call's budget. The precompile's <em>intrinsic</em> cost is exactly the table above." },
    { t: "h2", text: "Worked gas examples" },
    { t: "table", head: ["Call", "Input length", "Gas"], rows: [
      ["BLAKE3(\"\")", "0 bytes (0 words)", "15"],
      ["BLAKE3(32 bytes)", "1 word", "15 + 3 = 18"],
      ["SHA256(64 bytes)", "2 words", "60 + 24 = 84"],
      ["KECCAK256(\"Transfer(address,address,uint256)\")", "34 bytes → 2 words", "30 + 12 = 42"],
      ["ECRECOVER(...)", "always 128 bytes", "3000 flat"],
      ["CHAIN_CONTEXT()", "ignored", "60 flat"],
      ["SHIELDED_VIEW()", "ignored", "60 flat"]
    ]}
  ]
};


const PAGE_WASM_HOST_ABI: DocPage = {
  slug: "wasm-host-abi",
  title: "WASM host ABI reference",
  blocks: [
    { t: "p", html: "A PYRAX WASM contract is a WebAssembly module that imports a small, fixed set of host functions from a module named <code>\"pyrax\"</code> (implemented by <code>pyrax-vm-wasm</code>, wasmtime). These functions are the contract's only way to reach the chain: read calldata, read/write storage, learn who called it, emit logs, return data, revert, read block context, call precompiles, and deploy children. Everything else runs purely inside the sandbox." },
    { t: "callout", kind: "info", html: "If you write contracts in Rust you will normally use the safe wrappers in <a href=\"/reference/rust-sdk/\">the contract SDK</a> (<code>pyrax-contract-sdk</code>) rather than these raw imports. This page documents the layer underneath — the contract you compile imports exactly these functions." },
    { t: "h2", text: "How the ABI works" },
    { t: "code", lang: "rust", title: "the \"pyrax\" import module", code: "#[link(wasm_import_module = \"pyrax\")]\nextern \"C\" {\n    fn input_size() -> i32;\n    fn input_copy(dest: i32);\n    fn storage_read(key_ptr: i32, val_ptr: i32);\n    fn storage_write(key_ptr: i32, val_ptr: i32);\n    fn value_copy(dest: i32);\n    fn caller_copy(dest: i32);\n    fn address_copy(dest: i32);\n    fn emit_log(topics_ptr: i32, topics_len: i32, data_ptr: i32, data_len: i32);\n    fn set_output(ptr: i32, len: i32);\n    fn revert(ptr: i32, len: i32);\n    fn chain_id() -> i64;\n    fn block_number() -> i64;\n    fn block_timestamp() -> i64;\n    fn create2(code_ptr: i32, code_len: i32, salt_ptr: i32, addr_out: i32) -> i32;\n    fn precompile(addr_ptr: i32, input_ptr: i32, input_len: i32, out_ptr: i32, out_cap: i32) -> i32;\n}" },
    { t: "h3", text: "Pointer and length conventions" },
    { t: "list", items: [
      "Every parameter is an <code>i32</code> or <code>i64</code> — no aggregate types cross the boundary, only scalars and raw byte ranges in linear memory.",
      "A <strong>pointer</strong> (<code>*_ptr</code>, <code>dest</code>, <code>out_ptr</code>) is a byte offset into the contract's exported <code>\"memory\"</code>. On wasm32 the usize→i32 cast is exact.",
      "A <strong>length</strong> (<code>*_len</code>, <code>len</code>, <code>out_cap</code>) is a byte count; the host reads it as i32 then reinterprets as u32 (a negative wasm value becomes a large positive count that runs into the relevant cap).",
      "<strong>Fixed-width ranges are implicit</strong> — a 32-byte word (key/value/value) or a 20-byte address has no length parameter; the host always reads/writes exactly the fixed width.",
      "Every memory access is <strong>bounds-checked</strong>; an out-of-range pointer/length traps the call deterministically."
    ]},
    { t: "h3", text: "Required and optional exports" },
    { t: "table", head: ["Export", "Required", "Role"], rows: [
      ["memory", "Yes", "The contract's linear memory; the host reads/writes all pointers into it."],
      ["call", "Yes", "Main entry point. Takes no parameters; invoked for every call to the contract."],
      ["deploy", "Optional", "Constructor. If present, runs once during contract creation (CREATE), then is discarded."]
    ]},
    { t: "p", html: "A contract is detected as WASM purely by its code magic: a module begins with the bytes <code>\\0asm</code>. (Cairo is detected by a <code>\\0CAIRO</code> marker; anything else is treated as EVM bytecode.) Storage is the 32-byte-slot model, scoped to the contract's own address. By convention the first 4 calldata bytes are a method selector." },
    { t: "h3", text: "Gas is wasmtime fuel, 1:1" },
    { t: "p", html: "PYRAX meters WASM execution with wasmtime <strong>fuel</strong>, and 1 fuel = 1 gas. Every host function that does real work deducts fuel before it acts; an underflow traps with out-of-gas. Two costs frame everything: <strong>compile gas</strong> = <code>4 × code_len</code> (<code>COMPILE_GAS_PER_BYTE = 4</code>) charged up front, and the <strong>execution budget</strong> = <code>gas_limit − compile_gas</code>. Final <code>gas_used = compile_gas + (exec_budget − fuel_left)</code>." },
    { t: "callout", kind: "warn", html: "A revert or trap is <strong>not</strong> an error — it is a failed-but-valid execution. The transaction is still included and charged for the gas consumed up to the failure; storage writes, logs, and pending child deploys are discarded, but the gas is gone." },
    { t: "h2", text: "Summary table" },
    { t: "table", head: ["Function", "Signature", "Returns", "Gas charged", "Hard cap"], rows: [
      ["input_size", "() -> i32", "calldata length (bytes)", "0", "—"],
      ["input_copy", "(dest: i32)", "—", "8 × input_len", "—"],
      ["storage_read", "(key_ptr, val_ptr: i32)", "—", "800 (GAS_SLOAD)", "—"],
      ["storage_write", "(key_ptr, val_ptr: i32)", "—", "5_000 (GAS_SSTORE)", "—"],
      ["value_copy", "(dest: i32)", "—", "0", "—"],
      ["caller_copy", "(dest: i32)", "—", "0", "—"],
      ["address_copy", "(dest: i32)", "—", "0", "—"],
      ["emit_log", "(topics_ptr, topics_len, data_ptr, data_len: i32)", "—", "375 + 8 × (topics_len × 32 + data_len)", "≤ 4 topics; MAX_LOG_BYTES = 1 MiB/call"],
      ["set_output", "(ptr, len: i32)", "—", "8 × len", "MAX_OUTPUT_BYTES = 1 MiB"],
      ["revert", "(ptr, len: i32)", "traps", "0", "data clamped to 1 MiB"],
      ["chain_id", "() -> i64", "chain id", "0", "—"],
      ["block_number", "() -> i64", "blue score", "0", "—"],
      ["block_timestamp", "() -> i64", "Unix seconds", "0", "—"],
      ["create2", "(code_ptr, code_len, salt_ptr, addr_out: i32) -> i32", "1 ok / 0 fail", "32_000 + 8 × code_len", "MAX_CHILD_CODE = 512 KiB"],
      ["precompile", "(addr_ptr, input_ptr, input_len, out_ptr, out_cap: i32) -> i32", "out length / -1", "200 + 8 × input_len + callee gas", "MAX_PRECOMPILE_INPUT = 64 KiB"]
    ]},
    { t: "p", html: "Gas constants (<code>pyrax-vm-wasm</code>): <code>GAS_SLOAD = 800</code>, <code>GAS_SSTORE = 5_000</code>, <code>GAS_LOG_BASE = 375</code>, <code>GAS_PER_BYTE = 8</code>, <code>GAS_PRECOMPILE_BASE = 200</code>, <code>GAS_CALL_BASE = 700</code>, <code>CREATE2_BASE_GAS = 32_000</code>, <code>COMPILE_GAS_PER_BYTE = 4</code>. Size caps: <code>MAX_WASM_CODE = 256 KiB</code> (the module itself), <code>MAX_CHILD_CODE = 512 KiB</code>, <code>MAX_LOG_BYTES = MAX_OUTPUT_BYTES = 1 MiB</code>, <code>MAX_PRECOMPILE_INPUT = 64 KiB</code>, <code>MAX_CALL_INPUT = 128 KiB</code>." },
    { t: "callout", kind: "info", html: "<strong>Sandbox limits.</strong> Each instance is bounded by <code>SandboxLimits</code>: <code>max_memory_bytes</code> defaults to 16 MiB and <code>max_table_elements</code> to 10,000; growth past these traps the instance. The wasm stack is pinned at 512 KiB for deterministic trapping." },
    { t: "h2", text: "Behavior notes per group" },
    { t: "h3", text: "Calldata" },
    { t: "p", html: "<code>input_size()</code> is a pure length read (0 gas); <code>input_copy(dest)</code> copies the <em>full</em> calldata to <code>dest</code> for <code>8 × input_len</code> gas (no partial-copy form). SDK wrappers: <code>input()</code>, <code>selector()</code>." },
    { t: "h3", text: "Storage" },
    { t: "p", html: "32-byte key → 32-byte value, scoped to the executing contract. <code>storage_read</code> first consults the call's write overlay then the backend; an unset slot reads as 32 zero bytes; a backend error is fatal to the call (not a normal revert). <code>storage_write</code> lands in the overlay and commits only if the call succeeds; a write under a read-only (STATICCALL) context fails the call. SDK wrappers: <code>storage_get</code>, <code>storage_set</code>." },
    { t: "h3", text: "Context & block" },
    { t: "p", html: "<code>value_copy</code> (32-byte big-endian call value), <code>caller_copy</code> (20-byte immediate sender — the calling contract in a cross-contract call, not tx origin), and <code>address_copy</code> (this contract's 20-byte address) all charge 0 gas. <code>chain_id()</code>, <code>block_number()</code> (the GhostDAG blue score), and <code>block_timestamp()</code> (Unix seconds) return i64 and charge 0 gas; the SDK reinterprets the i64 as u64." },
    { t: "h3", text: "Logs, output, revert" },
    { t: "p", html: "<code>emit_log</code> packs the topics as one contiguous <code>topics_len × 32</code> block; more than 4 topics traps (\"too many log topics (max 4)\"), and the per-call cumulative log byte count is hard-capped at 1 MiB. <code>set_output</code> sets return data (cap checked before the gas charge); calling it again replaces it. <code>revert</code> records the message, clamps it to 1 MiB, and traps — it charges no gas of its own but everything before it is still charged. SDK: <code>log</code>, <code>output</code>, <code>fail(msg) -> !</code>." },
    { t: "h3", text: "create2" },
    { t: "p", html: "Charges <code>32_000 + 8 × code_len</code> up front, derives the deterministic EIP-1014 child address with the injected derivation function, writes it to <code>addr_out</code>, and <em>records</em> a pending create — the ledger runs the child's constructor and persists it after this run. The child's VM is auto-detected from its code magic. Returns <code>0</code> when <code>code_len > 512 KiB</code>, no derivation function is injected, or a collision is detected (existing contract or duplicate pending create). The child is not callable in the same execution; pending creates survive only if the call succeeds." },
    { t: "h3", text: "precompile" },
    { t: "p", html: "Calls a system precompile <strong>read-only</strong> (<code>is_static = true</code>): a state-mutating/payable precompile (the bridge) fails here and returns <code>-1</code>. The return value is the precompile's <em>full</em> output length even if it exceeds <code>out_cap</code> (only <code>min(output_len, out_cap)</code> bytes are written); the SDK exploits this with a 128-byte first buffer and an exact re-call. Returns <code>-1</code> on input > 64 KiB, a non-precompile address, or a failed/mutating call. The host forwards all remaining fuel as the precompile's budget and charges back its metered cost." },
    { t: "table", head: ["Precompile", "Address", "Effect"], rows: [
      ["BLAKE3", "0x0000000000000000000000000000000000000101", "BLAKE3-256 of the input"],
      ["SHA256", "0x0000000000000000000000000000000000000102", "SHA-256 of the input"],
      ["KECCAK256", "0x0000000000000000000000000000000000000103", "Keccak-256 of the input"],
      ["ECRECOVER", "0x0000000000000000000000000000000000000104", "secp256k1 signature → address recovery"],
      ["CHAIN_CONTEXT", "0x0000000000000000000000000000000000000110", "chain_id ++ block_number ++ block_timestamp (96 bytes)"],
      ["SHIELDED_VIEW", "0x0000000000000000000000000000000000000111", "The shielded note-tree anchor (32 bytes)"]
    ]},
    { t: "callout", kind: "info", html: "There is also a host <code>call</code> import (<code>GAS_CALL_BASE = 700</code> + 8/byte, <code>MAX_CALL_INPUT = 128 KiB</code>) for synchronous cross-VM calls, which forwards 63/64 of remaining fuel (EIP-150) to the callee. The current <code>pyrax-contract-sdk</code> wraps <code>precompile</code> and <code>create2</code> but not yet the general cross-contract <code>call</code>; see the gas-and-limits page." }
  ]
};

const PAGE_RUST_SDK: DocPage = {
  slug: "rust-sdk",
  title: "Rust SDK reference (pyrax-contract-sdk)",
  blocks: [
    { t: "p", html: "The <code>pyrax-contract-sdk</code> crate is the guest-side library for writing PYRAX smart contracts in Rust that compile to WebAssembly. It is the safe counterpart to the host ABI implemented by <code>pyrax-vm-wasm</code>: each function wraps one raw host import, handles pointer/length marshalling into your contract's linear memory, and gives you an ergonomic Rust signature. The crate is <code>#![no_std]</code>." },
    { t: "h2", text: "What a PYRAX WASM contract is" },
    { t: "p", html: "A contract is an account that holds <strong>code + storage</strong>, executed inside L1 block application. A WASM contract is a <code>cdylib</code> Wasm module that <strong>exports <code>memory</code></strong> (required), <strong>exports <code>call</code></strong> (the main entry point, required), and optionally <strong>exports <code>deploy</code></strong> (a constructor, run once at creation). The VM is auto-detected from the code's magic bytes: a module beginning with <code>\\0asm</code> dispatches to the WASM executor." },
    { t: "h2", text: "Setup" },
    { t: "code", lang: "toml", title: "Cargo.toml", code: "[package]\nname = \"counter\"\nversion = \"0.1.0\"\nedition = \"2021\"\n\n[lib]\ncrate-type = [\"cdylib\"]\n\n[dependencies]\npyrax-contract-sdk = { path = \"../pyrax/contracts/pyrax-contract-sdk\" }\n\n[profile.release]\nopt-level = \"z\"   # optimize for size — smaller code = lower compile gas\nlto = true\npanic = \"abort\"" },
    { t: "code", lang: "rust", title: "Crate root (a minimal counter)", code: "#![no_std]\nuse pyrax_contract_sdk as sdk;\n\nconst SLOT0: [u8; 32] = [0u8; 32];\n\n/// Required entry point: runs on every call.\n#[no_mangle]\npub extern \"C\" fn call() {\n    let mut v = sdk::storage_get(&SLOT0);\n    v[31] = v[31].wrapping_add(1);\n    sdk::storage_set(&SLOT0, &v);\n    sdk::output(&v);\n}\n\n/// Optional constructor: runs once at deployment.\n#[no_mangle]\npub extern \"C\" fn deploy() {\n    sdk::storage_set(&SLOT0, &[0u8; 32]);\n}\n\n/// Required: route panics into a deterministic revert.\n#[panic_handler]\nfn panic(_: &core::panic::PanicInfo) -> ! {\n    sdk::fail(b\"panic\")\n}" },
    { t: "code", lang: "bash", title: "Building", code: "cargo build --release --target wasm32-unknown-unknown" },
    { t: "callout", kind: "warn", html: "<strong>Hard size cap:</strong> a contract's Wasm code must be ≤ 256 KiB (<code>MAX_WASM_CODE</code>). Compilation also costs gas — 4 gas per byte (<code>COMPILE_GAS_PER_BYTE</code>) charged upfront before your <code>call</code>/<code>deploy</code> runs — so keeping the module small directly lowers deploy and call cost." },
    { t: "p", html: "On wasm32 the SDK installs a <strong>bump allocator</strong> as the <code>#[global_allocator]</code>. A contract instance is one-shot (instantiated, run once, discarded), so memory is never freed: every allocation is a pointer bump that grows linear memory in 64 KiB pages on demand, and <code>dealloc</code> is a no-op. It starts at <code>__heap_base</code> and returns null on overflow rather than wrapping. The per-instance memory ceiling is 16 MiB by default (<code>SandboxLimits::max_memory_bytes</code>)." },
    { t: "h2", text: "Complete API at a glance" },
    { t: "table", head: ["Item", "Signature", "Gas"], rows: [
      ["input", "fn input() -> Vec<u8>", "8 × len"],
      ["selector", "fn selector() -> [u8; 4]", "8 × len (reads calldata)"],
      ["storage_get", "fn storage_get(key: &[u8; 32]) -> [u8; 32]", "800"],
      ["storage_set", "fn storage_set(key: &[u8; 32], val: &[u8; 32])", "5_000"],
      ["caller", "fn caller() -> [u8; 20]", "0"],
      ["address", "fn address() -> [u8; 20]", "0"],
      ["value", "fn value() -> [u8; 32]", "0"],
      ["chain_id", "fn chain_id() -> u64", "0"],
      ["block_number", "fn block_number() -> u64", "0"],
      ["block_timestamp", "fn block_timestamp() -> u64", "0"],
      ["log", "fn log(topics: &[[u8; 32]], data: &[u8])", "375 + 8 × (topics×32 + data)"],
      ["output", "fn output(data: &[u8])", "8 × len"],
      ["fail", "fn fail(msg: &[u8]) -> !", "0 (call still charged)"],
      ["create2", "fn create2(code: &[u8], salt: &[u8; 32]) -> Option<[u8; 20]>", "32_000 + 8 × len"],
      ["precompile", "fn precompile(addr: &[u8; 20], input: &[u8]) -> Option<Vec<u8>>", "200 + 8 × len + callee"]
    ]},
    { t: "h2", text: "Input / calldata" },
    { t: "p", html: "<code>input() -> Vec&lt;u8&gt;</code> returns the full calldata (internally <code>input_size()</code> at 0 gas then <code>input_copy</code> at <code>8 × len</code>). <code>selector() -> [u8; 4]</code> returns the first 4 calldata bytes (zero-padded if shorter) — the conventional method dispatcher. <code>selector()</code> calls <code>input()</code> under the hood, so it pays the same copy cost; if you also need args, call <code>input()</code> once and slice." },
    { t: "h2", text: "Storage" },
    { t: "p", html: "32-byte key → 32-byte value, scoped to your contract's address; unset slots read all-zero. This is byte-for-byte the same model the EVM and Cairo VMs use, so slot layouts are portable. <code>storage_set</code> lands in an overlay and commits only if the call succeeds. For maps, derive keys with a hash precompile (e.g. <code>keccak256(prefix ++ address)</code>)." },
    { t: "h2", text: "Context" },
    { t: "p", html: "<code>caller()</code> (the 20-byte immediate caller — may be another contract), <code>address()</code> (this contract's own 20-byte address), <code>value()</code> (the 32-byte big-endian call value in PYRX base units), <code>chain_id()</code>, <code>block_number()</code> (the GhostDAG blue score), <code>block_timestamp()</code> (Unix seconds) — all 0 gas. The block-context values match the EVM opcodes and the <code>CHAIN_CONTEXT</code> precompile exactly." },
    { t: "callout", kind: "warn", html: "Never trust <code>caller()</code> blindly: it is the <em>immediate</em> sender, which may itself be another contract. For authorization, store and compare against a known owner/admin address — do not assume <code>caller()</code> is an externally-owned account." },
    { t: "h2", text: "Logging & output" },
    { t: "p", html: "<code>log(topics, data)</code> emits an event with up to 4 indexed 32-byte topics plus data (gas <code>375 + 8 × (topics×32 + data)</code>, total log bytes ≤ 1 MiB). <code>output(data)</code> sets return data (gas <code>8 × len</code>, ≤ 1 MiB; calling it again replaces it). Logs and output are kept only if the call succeeds." },
    { t: "h2", text: "Control" },
    { t: "p", html: "<code>fail(msg: &[u8]) -> !</code> aborts the call with <code>msg</code> as revert data, discards all state changes in this frame, and never returns (the host traps the instance). The revert itself charges 0 gas but the call has already consumed gas up to that point, which is still charged. Use it in your <code>#[panic_handler]</code> so Rust panics/unwraps become clean reverts." },
    { t: "h2", text: "Deploy (CREATE2)" },
    { t: "p", html: "<code>create2(code, salt) -> Option&lt;[u8; 20]&gt;</code> deploys a child at a deterministic CREATE2 address; <code>Some(address)</code> on success, <code>None</code> on failure/collision. Gas <code>32_000 + 8 × code_len</code>; child code ≤ 512 KiB. The child's VM is auto-detected from its code magic (a single WASM factory can deploy WASM, Cairo, or EVM children). The address is <code>keccak256(0xff ++ factory ++ salt ++ keccak256(init_code))[12..]</code>; the constructor runs and the child is persisted after this call returns (it can't be called within the same execution yet)." },
    { t: "h2", text: "Precompiles" },
    { t: "p", html: "<code>precompile(addr: &[u8; 20], input: &[u8]) -> Option&lt;Vec&lt;u8&gt;&gt;</code> calls a system precompile <strong>read-only</strong>, returning output bytes or <code>None</code>. WASM contracts have no built-in crypto, so this is how you hash, recover signatures, and read chain/shielded context. Gas <code>200 + 8 × input_len</code> plus the precompile's own metered cost; input ≤ 64 KiB. The wrapper uses a 128-byte initial buffer and re-calls with an exact buffer if a precompile returns more. <code>None</code> for a non-precompile address, an over-large input, or a state-mutating/payable op (the bridge)." },
    { t: "table", head: ["Const (sdk::precompiles)", "Address (0x…)", "Input → Output"], rows: [
      ["BLAKE3", "…0000000101", "bytes → 32-byte BLAKE3-256 digest"],
      ["SHA256", "…0000000102", "bytes → 32-byte SHA-256 digest"],
      ["KECCAK256", "…0000000103", "bytes → 32-byte Keccak-256 digest"],
      ["ECRECOVER", "…0000000104", "secp256k1 recovery → 20-byte address"],
      ["CHAIN_CONTEXT", "…0000000110", "(no input) → 96 bytes: chain_id ++ block_number ++ block_timestamp"],
      ["SHIELDED_VIEW", "…0000000111", "(no input) → 32-byte shielded note-tree anchor"]
    ]},
    { t: "callout", kind: "info", html: "<code>KECCAK256</code> is the original Keccak (the one Ethereum/Solidity call <code>keccak256</code> and <code>web3_sha3</code>), <strong>not</strong> NIST SHA3-256. Use it to match EVM event-signature hashes or selectors." },
    { t: "h2", text: "Full example: a minimal token" },
    { t: "code", lang: "rust", title: "selectors + storage + context + events + output + reverts", code: "#![no_std]\nextern crate alloc;\nuse pyrax_contract_sdk as sdk;\n\nconst BAL_SLOT: [u8; 32] = [0u8; 32];\n\n#[no_mangle]\npub extern \"C\" fn deploy() {\n    let mut v = [0u8; 32];\n    v[16..32].copy_from_slice(&1_000_000u128.to_be_bytes());\n    sdk::storage_set(&BAL_SLOT, &v);\n}\n\n#[no_mangle]\npub extern \"C\" fn call() {\n    match sdk::selector() {\n        // balanceOf() -> uint256\n        [0x70, 0xa0, 0x82, 0x31] => {\n            sdk::output(&sdk::storage_get(&BAL_SLOT));\n        }\n        // burn(uint256)\n        [0x42, 0x96, 0x6c, 0x68] => {\n            let data = sdk::input();\n            if data.len() < 4 + 32 { sdk::fail(b\"bad calldata\"); }\n            let amount = u128::from_be_bytes(data[4 + 16..4 + 32].try_into().unwrap());\n\n            let cur_raw = sdk::storage_get(&BAL_SLOT);\n            let cur = u128::from_be_bytes(cur_raw[16..32].try_into().unwrap());\n            let next = match cur.checked_sub(amount) {\n                Some(n) => n,\n                None => sdk::fail(b\"insufficient balance\"),\n            };\n\n            let mut v = [0u8; 32];\n            v[16..32].copy_from_slice(&next.to_be_bytes());\n            sdk::storage_set(&BAL_SLOT, &v);\n\n            let sig = sdk::precompile(&sdk::precompiles::KECCAK256, b\"Burn(address,uint256)\").unwrap();\n            let mut topic0 = [0u8; 32]; topic0.copy_from_slice(&sig);\n            let mut who = [0u8; 32]; who[12..].copy_from_slice(&sdk::caller());\n            sdk::log(&[topic0, who], &amount.to_be_bytes());\n        }\n        _ => sdk::fail(b\"unknown selector\"),\n    }\n}\n\n#[panic_handler]\nfn panic(_: &core::panic::PanicInfo) -> ! {\n    sdk::fail(b\"panic\")\n}" }
  ]
};


const PAGE_CAIRO_SYSCALLS: DocPage = {
  slug: "cairo-syscalls",
  title: "Cairo syscall reference",
  blocks: [
    { t: "p", html: "PYRAX runs Cairo contracts on a <a href=\"/vms/cairo/\">cairo-vm</a> executor (<code>pyrax-vm-cairo</code>) that exposes its host interface as a set of <strong>inline hints</strong> — small string-tagged callbacks the program triggers mid-execution. Each hint is named <code>pyrax.&lt;name&gt;</code>, and the executor's <code>PyraxHintProcessor</code> dispatches on that exact string. An unknown hint is rejected — the lean PYRAX-Cairo ABI is <code>pyrax.*</code> only." },
    { t: "h2", text: "The runtime marker" },
    { t: "code", lang: "rust", title: "pyrax-vm-cairo", code: "pub const CAIRO_RUNTIME_MAGIC: &[u8] = b\"\\0CAIRO\";" },
    { t: "list", items: [
      "<strong>VM auto-detection.</strong> The ledger's <code>detect_vm()</code> inspects leading code bytes: <code>\\0asm</code> → WASM, <code>\\0CAIRO</code> → Cairo, anything else → EVM.",
      "<strong>Kept in storage, stripped before parse.</strong> The marker stays in the stored runtime (so the contract stays self-identifying for cross-VM calls) and is removed by <code>strip_cairo_magic(code)</code> before the program JSON is parsed.",
      "<strong>Load gas on the full stored length.</strong> The executor charges <code>CAIRO_LOAD_GAS_PER_BYTE = 4</code> gas per byte of stored program up front."
    ]},
    { t: "callout", kind: "warn", html: "<code>MAX_CAIRO_CODE = 512 KiB</code>: a compiled Cairo program may not exceed <code>512 * 1024</code> bytes. An over-size program is a charged failure (<code>success = false</code>, <code>gas_used = gas_limit</code>)." },
    { t: "h2", text: "felt ↔ Word encoding" },
    { t: "list", items: [
      "PYRAX's native value type is <code>Word</code> (<code>[u8; 32]</code>, big-endian). A Cairo <code>felt252</code> is < 2^252, so it always fits in 32 bytes; the executor round-trips with <code>Word::to_felt()</code> / <code>Word::from_felt()</code>.",
      "For byte-oriented payloads (precompile/call input/output, child init-code), the convention is <strong>one byte per felt</strong>, taken from the felt's low byte (<code>Word.0[31]</code>).",
      "A 20-byte address is left-padded to a 32-byte <code>Word</code> (low 20 bytes, <code>Word.0[12..]</code>); read back from bytes [12..].",
      "<code>ids.*</code> names (<code>ids.key</code>, <code>ids.value</code>, <code>ids.ptr</code>, …) are the Cairo locals the hint expects in scope at the call site."
    ]},
    { t: "h2", text: "Syscall summary" },
    { t: "table", head: ["Syscall", "Hint string", "Reads (ids.*)", "Writes (ids.*)", "Gas (words)"], rows: [
      ["storage_read", "pyrax.storage_read", "key", "value", "1 word"],
      ["storage_write", "pyrax.storage_write", "key, value", "—", "1 word"],
      ["get_caller_address", "pyrax.get_caller_address", "—", "value", "0"],
      ["get_contract_address", "pyrax.get_contract_address", "—", "value", "0"],
      ["get_chain_id", "pyrax.get_chain_id", "—", "value", "0"],
      ["get_block_number", "pyrax.get_block_number", "—", "value", "0"],
      ["get_block_timestamp", "pyrax.get_block_timestamp", "—", "value", "0"],
      ["calldata_len", "pyrax.calldata_len", "—", "value", "0"],
      ["calldata", "pyrax.calldata", "ptr", "(copies to ptr)", "calldata.len() words"],
      ["emit_event", "pyrax.emit_event", "keys, keys_len, data, data_len", "—", "keys + data words"],
      ["set_output", "pyrax.set_output", "ptr, len", "—", "output-len words"],
      ["revert", "pyrax.revert", "ptr, len", "—", "revert-len words"],
      ["create2", "pyrax.create2", "code, code_len, salt", "address", "code-len words"],
      ["precompile", "pyrax.precompile", "addr, input, input_len", "out, out_len, ok", "input + output + metered"],
      ["call", "pyrax.call", "target, value, input, input_len", "out, out_len, ok", "input + callee gas_used"]
    ]},
    { t: "p", html: "\"Gas\" here is the cumulative-syscall-cap charge (<code>charge_words</code>). The total reported <code>gas_used</code> also includes load gas and consumed Cairo steps — see Gas model below. Single-felt context syscalls charge 0 words; array-moving syscalls charge one word per felt moved." },
    { t: "h2", text: "Storage syscalls" },
    { t: "p", html: "<code>storage_read</code> reads the slot at <code>key</code> for the contract's own address, checking the per-run overlay before the backend; the returned slot is validated to be a canonical felt — if the raw 32-byte slot does not round-trip through the field (a value written by a non-Cairo VM) it reverts with <code>\"non-canonical felt in storage slot\"</code>. <code>storage_write</code> lands in the per-run overlay (<code>sto_overlay</code>), flushed only on success; a write under a static context fails the frame when it tries to flush, and <code>is_static</code> propagates into nested calls." },
    { t: "h2", text: "Context syscalls" },
    { t: "p", html: "<code>get_caller_address</code> / <code>get_contract_address</code> write the immediate caller / this contract's address as a left-padded felt. <code>get_chain_id</code> writes the network chain id (e.g. 563821 mainnet, 104928 testnet, 710823 devnet2). <code>get_block_number</code> writes the block height — the ledger's reorg-stable <strong>blue score</strong> (matching the EVM NUMBER opcode and the WASM <code>block_number()</code>). <code>get_block_timestamp</code> writes the Unix-seconds timestamp. All charge 0 words." },
    { t: "h2", text: "Calldata syscalls" },
    { t: "p", html: "A Cairo call's calldata is a <code>Vec&lt;Word&gt;</code> (felts). <code>calldata_len</code> writes the felt count (0 words); <code>calldata</code> copies every calldata felt into VM memory at <code>ids.ptr</code>, charging the whole length against the cumulative cap before the copy." },
    { t: "h2", text: "Event and output syscalls" },
    { t: "p", html: "<code>emit_event</code> records a <code>CairoEvent { address: self_addr, keys, data }</code>; the key count is validated against <code>MAX_EVENT_KEYS = 255</code> (the receipt-log key count is 1 byte), else <code>\"too many event keys (max 255)\"</code>. <code>set_output</code> stores the felts at <code>[ptr..ptr+len]</code> as the call's return data. <code>revert</code> records the revert data and <strong>traps the run</strong>; the data is surfaced in <code>ExecutionResult.output</code> on the failure path. Events are dropped on revert or fault." },
    { t: "callout", kind: "warn", html: "A revert is a failed-but-valid execution, not an executor error: the ledger still includes the transaction and charges gas. On the failure path all storage writes are discarded, events are empty, <code>success = false</code>, and <code>gas_used = load_gas + consumed_steps + precompile_gas</code> (capped at <code>gas_limit</code>)." },
    { t: "h2", text: "create2" },
    { t: "p", html: "Reads <code>code</code> as one byte per felt (bounded to <code>MAX_FELT_ARRAY = 4096</code> bytes — a larger child deploys via a top-level transaction), reads <code>salt</code> as a 32-byte Word, derives the child address via the ledger-injected derivation (<code>keccak256(0xff ++ factory ++ salt ++ keccak256(init_code))[12..]</code>), checks for a collision (existing contract code or a duplicate pending create → writes <code>0</code>), otherwise records a <code>PendingCreate { address, code, salt }</code> and writes the child address (left-padded felt) to <code>ids.address</code>. The child's VM is auto-detected; pending creates are processed by the ledger only on success. <code>0</code> means failure." },
    { t: "h2", text: "precompile" },
    { t: "p", html: "Calls a <strong>read-only</strong> system precompile. The host extracts the 20-byte address from the low bytes of <code>ids.addr</code>, reads the input one byte per felt, dispatches over <code>CairoPrecompileCtx</code> with <code>is_static: true</code> and a budget of <code>PRECOMPILE_CAIRO_GAS = 50_000_000</code>, then writes the output one byte per felt to <code>ids.out</code> with <code>ids.out_len</code> and <code>ids.ok</code>. The precompile's <code>gas_used</code> is charged against the cumulative cap (so a loop can't do unbounded host CPU) and folded into the run's reported gas. An unrecognized address yields <code>ok = 0</code>." },
    { t: "table", head: ["Precompile", "Address", "Purpose"], rows: [
      ["BLAKE3", "0x0000000000000000000000000000000000000101", "BLAKE3 hash"],
      ["SHA256", "0x0000000000000000000000000000000000000102", "SHA-256 hash"],
      ["KECCAK256", "0x0000000000000000000000000000000000000103", "keccak256 hash"],
      ["ECRECOVER", "0x0000000000000000000000000000000000000104", "secp256k1 signature recovery"],
      ["CHAIN_CONTEXT", "0x0000000000000000000000000000000000000110", "chain_id ++ block_number ++ block_timestamp (96 bytes)"],
      ["SHIELDED_VIEW", "0x0000000000000000000000000000000000000111", "shielded note-tree anchor (32 bytes)"]
    ]},
    { t: "h2", text: "call" },
    { t: "p", html: "Synchronously calls another contract (any VM) or precompile. The host extracts the 20-byte target from the low bytes, the <code>u128</code> value from the value felt, and the calldata one byte per felt; it then invokes the injected cross-VM caller over this run's overlay (<code>CairoCtxVmState</code>), forwarding <strong>63/64 of the remaining step budget</strong> (EIP-150) to the callee. The callee's <code>gas_used</code> is charged against the cumulative cap and folded into the run's reported gas; results are written one byte per felt with <code>ids.out_len</code> and <code>ids.ok</code>." },
    { t: "callout", kind: "info", html: "<code>call</code> requires an injected cross-VM caller; without it (<code>cross_vm == None</code>) it fails. A failed callee's state changes are discarded (overlay isolation), <code>is_static</code> propagates into the callee, and the synchronous call depth is capped at <code>MAX_CALL_DEPTH = 1024</code> (matching the EVM call-stack limit)." },
    { t: "h2", text: "Caps and limits" },
    { t: "table", head: ["Constant", "Value", "Meaning"], rows: [
      ["MAX_CAIRO_CODE", "512 * 1024 bytes", "Hard cap on compiled program size (parse-bomb guard)."],
      ["CAIRO_LOAD_GAS_PER_BYTE", "4 gas/byte", "Gas charged per byte of stored program to load/parse it."],
      ["MAX_FELT_ARRAY", "4096 felts", "Per-call cap on keys/data/output/input/code felts a single syscall may move."],
      ["MAX_SYSCALL_WORDS", "2^18 = 262_144 felts", "Cumulative cap across the whole run on felts moved through syscalls (+ metered precompile/call gas)."],
      ["MAX_EVENT_KEYS", "255", "Max event keys per emit_event (receipt-log key count is 1 byte)."],
      ["PRECOMPILE_CAIRO_GAS", "50_000_000", "Gas budget handed to a nested precompile from Cairo."],
      ["SandboxLimits.max_steps", "4_000_000 (default)", "Default Cairo step cap per run."]
    ]},
    { t: "callout", kind: "warn", html: "Exceeding the cumulative cap reverts with <code>\"syscall data limit exceeded\"</code>. <code>MAX_FELT_ARRAY</code> bounds any single syscall array; <code>MAX_SYSCALL_WORDS</code> additionally bounds the cumulative felt traffic, because a loop can call a syscall millions of times." },
    { t: "h2", text: "Gas model" },
    { t: "code", lang: "text", title: "reported gas_used", code: "gas_used = load_gas + consumed_steps + precompile_gas\n\nload_gas    = strip_cairo_magic(program).len() * CAIRO_LOAD_GAS_PER_BYTE  (= len * 4)\nstep_budget = gas_limit - load_gas\nmax_steps   = min(step_budget, SandboxLimits.max_steps)   // floored to >= 1" },
    { t: "table", head: ["Failure", "gas_used"], rows: [
      ["Reverted / faulted (after running)", "load_gas + consumed_steps + precompile_gas, capped at gas_limit (consumed = max_steps − remaining)"],
      ["Over-size program, can't afford load, or unparseable", "gas_limit (a charged failure: success = false)"]
    ]},
    { t: "h2", text: "Executor types" },
    { t: "code", lang: "rust", title: "pyrax-vm-cairo request/result shapes", code: "pub struct DeployRequest {\n    pub from: Address,        // deploying account\n    pub address: Address,     // deterministic address the contract is created at\n    pub program: Vec<u8>,     // compiled Cairo program (with the \\0CAIRO marker)\n    pub value: Word,          // value sent with deployment\n    pub gas_limit: u64,       // gas (steps + load) budget\n}\n\npub struct CallRequest {\n    pub from: Address,        // caller account\n    pub to: Address,          // target contract\n    pub calldata: Vec<Word>,  // calldata felts (exposed via calldata_len / calldata)\n    pub value: Word,          // value transferred\n    pub gas_limit: u64,       // gas budget\n}\n\npub struct ExecutionResult {\n    pub success: bool,             // false = reverted or faulted\n    pub output: Vec<Word>,         // set_output felts (or revert data on failure)\n    pub gas_used: u64,             // load + steps + precompile gas\n    pub events: Vec<CairoEvent>,   // empty on revert/fault\n    pub created: Option<Address>,  // new contract address on a successful deploy\n    pub creates: Vec<PendingCreate>, // children requested via create2 (success only)\n}\n\npub struct CairoEvent {\n    pub address: Address,   // emitting contract\n    pub keys: Vec<Word>,    // indexed topics (<= 255)\n    pub data: Vec<Word>,    // unindexed data\n}" },
    { t: "callout", kind: "info", html: "Unlike the byte-oriented EVM and WASM calldata, a Cairo <code>CallRequest.calldata</code> is a <code>Vec&lt;Word&gt;</code> (an array of felts). The byte-per-felt convention only applies to <code>precompile</code> / <code>call</code> input/output and <code>create2</code> code, where the payload is genuinely bytes." }
  ]
};

const PAGE_BRIDGE: DocPage = {
  slug: "bridge",
  title: "L1↔rollup bridge reference",
  blocks: [
    { t: "p", html: "The <strong>bridge</strong> is the L1 anchor for PYRAX's ZK rollup. It is a single system account that locks native PYRX on L1, tracks the rollup's canonical state root, records per-batch withdrawal Merkle roots, and guards against double-withdrawal with a claimed-set. You interact with it by calling one address with a small, byte-packed calldata layout — no Solidity ABI, no deployed user contract." },
    { t: "callout", kind: "warn", html: "<strong>No batch finalizes yet.</strong> The validity-proof verifier wired into the bridge today is the <code>DeferredVerifier</code>, which <strong>rejects every proof</strong>. Every other rule — batch ordering, root chaining, deposit accounting, withdrawal Merkle verification — is live and tested, but <code>postCommitment</code> cannot succeed and therefore <strong>no withdrawal can be claimed</strong> until Phase 11 wires the real plonky2 verifier. Treat <code>deposit</code> as the only currently-usable write path." },
    { t: "h2", text: "The bridge precompile address" },
    { t: "table", head: ["Name", "Address"], rows: [
      ["BRIDGE", "0x0000000000000000000000000000000000000100"]
    ]},
    { t: "p", html: "The bridge is a <strong>precompile</strong>: a system account whose behavior is implemented in the node rather than by deployed bytecode. Deposited value is held as the bridge account's <strong>L1 balance</strong> (so value conservation is committed to the state root like any other account); its <strong>storage slots</strong> hold the rollup root, withdrawal roots, deposit counters, and the claimed-set. You reach it with any transaction (or cross-VM call) whose <code>to</code> is <code>0x…0100</code> and whose <code>data</code> begins with one of the three selectors." },
    { t: "h2", text: "Operations at a glance" },
    { t: "table", head: ["Op", "Selector preimage", "Payable", "Gas", "Output"], rows: [
      ["deposit", "pyrax.bridge.deposit", "yes (value = amount locked)", "30_000", "deposit index, u64 right-aligned in a 32-byte word"],
      ["postCommitment", "pyrax.bridge.post_commitment", "no (value must be 0)", "60_000", "empty"],
      ["withdraw", "pyrax.bridge.withdraw", "no (value must be 0)", "30_000 + 200 per Merkle sibling", "empty"]
    ]},
    { t: "p", html: "Selectors are the <strong>first 4 bytes of <code>blake3(preimage)</code></strong> (a PYRAX-native domain-tagged selector, <em>not</em> keccak256 of a Solidity signature), produced by <code>deposit_selector()</code>, <code>post_commitment_selector()</code>, and <code>withdraw_selector()</code> in <code>pyrax-contracts</code>. The canonical packed layouts are produced by <code>encode_deposit</code>, <code>encode_post_commitment</code>, and <code>encode_withdraw</code>. All multi-byte integers are <strong>big-endian</strong>. Every op follows the Ethereum failure model: a malformed call, rule violation, or rejected proof is failed-but-included (recorded, gas charged, staged writes discarded)." },
    { t: "h2", text: "deposit" },
    { t: "p", html: "Locks the call's <code>value</code> on L1 and records a deposit crediting an L2 recipient. Calldata is <strong>24 bytes</strong>: <code>selector(4) ++ l2_recipient(20)</code> — the amount to lock is the call's <code>value</code>, not part of calldata." },
    { t: "table", head: ["Field", "Bytes", "Type", "Meaning"], rows: [
      ["selector", "4", "[u8; 4]", "blake3(\"pyrax.bridge.deposit\")[0..4]"],
      ["l2_recipient", "20", "Address", "the L2 account credited with the deposit"]
    ]},
    { t: "p", html: "Value must be non-zero (else <code>ValueMismatch</code>). The bridge reads the current <code>deposit_count</code> as the new <code>index</code>, folds the deposit into a rolling accumulator, increments the count, and emits a <code>Deposit</code> log. Output is the deposit index as a <code>u64</code> right-aligned in a 32-byte word. Calling <code>deposit</code> in a static context reverts (it mutates state)." },
    { t: "code", lang: "text", title: "deposit accumulator fold", code: "acc' = blake3(\"pyrax.bridge.dacc\" ++ acc ++ l2_recipient(20) ++ value(16, BE) ++ index(8, BE))" },
    { t: "h2", text: "postCommitment" },
    { t: "p", html: "Advances the canonical rollup root by <strong>exactly one batch</strong>, after the batch's validity proof is accepted by the host verifier. Non-payable; in Phase 10 it <strong>always fails</strong> (the verifier rejects all proofs). Calldata minimum is <strong>116 bytes</strong> (4 selector + 112 fixed fields); <code>proof</code> is variable-length and may be empty." },
    { t: "table", head: ["Field", "Bytes", "Type", "Meaning"], rows: [
      ["selector", "4", "[u8; 4]", "blake3(\"pyrax.bridge.post_commitment\")[0..4]"],
      ["batch_index", "8", "u64 BE", "must equal the bridge's next expected batch index"],
      ["prev_root", "32", "Hash", "rollup root before the batch; must equal the canonical root"],
      ["post_root", "32", "Hash", "rollup root after the batch (becomes the new canonical root)"],
      ["withdrawals_root", "32", "Hash", "Merkle root over the L1 withdrawals this batch authorizes"],
      ["deposit_count_consumed", "8", "u64 BE", "cumulative deposits this batch has consumed"],
      ["proof", "variable", "bytes", "the batch validity proof, checked by the host verifier"]
    ]},
    { t: "code", lang: "rust", title: "StateCommitment", code: "pub struct StateCommitment {\n    pub batch_index: u64,            // monotonic; must equal next expected batch\n    pub prev_root: Hash,             // must equal the canonical rollup root\n    pub post_root: Hash,             // becomes the new canonical root\n    pub withdrawals_root: Hash,      // root over L1 withdrawals this batch authorizes\n    pub deposit_count_consumed: u64, // cumulative deposits consumed (monotonic)\n}" },
    { t: "p", html: "Validation order (each failure is failed-but-included): (1) <strong>batch ordering</strong> — <code>batch_index</code> must equal the next expected index, else <code>BatchOutOfOrder { expected, got }</code>; (2) <strong>root chaining</strong> — <code>prev_root</code> must equal the canonical root (batch 0 chains from <code>GENESIS_ROOT = Hash::ZERO</code>), else <code>RootMismatch</code>; (3) <strong>deposit accounting</strong> — <code>deposit_count_consumed</code> must be monotonic and ≤ the recorded deposit count, else <code>BadDepositConsumed</code>; (4) <strong>validity proof</strong> — the host verifier must accept <code>proof</code>, else <code>ProofRejected</code> (<strong>always, in Phase 10</strong>). On success (Phase 11+) the bridge writes the new root, the next index, the consumed count, and the per-batch withdrawals root, and emits <code>CommitmentPosted</code>." },
    { t: "h2", text: "withdraw" },
    { t: "callout", kind: "warn", html: "<strong>Unreachable until Phase 11.</strong> <code>withdraw</code> requires the batch to be finalized (<code>batch_index &lt; next_batch_index</code>), and no batch can finalize while the <code>DeferredVerifier</code> is wired — so <code>withdraw</code> cannot succeed today. The verification path is fully implemented and tested via the bridge core functions directly; only the live finalize boundary is closed." },
    { t: "p", html: "Releases locked value on L1 against a Merkle proof of inclusion in a finalized batch's <code>withdrawals_root</code>, then nullifies it in the claimed-set. Non-payable. Calldata minimum is <strong>65 bytes</strong> (4 selector + 60 fixed fields + 1 length byte, zero siblings)." },
    { t: "table", head: ["Field", "Bytes", "Type", "Meaning"], rows: [
      ["selector", "4", "[u8; 4]", "blake3(\"pyrax.bridge.withdraw\")[0..4]"],
      ["batch_index", "8", "u64 BE", "the finalized batch whose withdrawals_root contains the leaf"],
      ["recipient", "20", "Address", "L1 recipient of the released value"],
      ["amount", "16", "u128 BE", "released amount (base units)"],
      ["nonce", "8", "u64 BE", "disambiguator so identical withdrawals get distinct leaves"],
      ["index", "8", "u64 BE", "leaf index in the withdrawals tree (selects left/right per level)"],
      ["siblings_len", "1", "u8", "number of Merkle authentication-path siblings (≤ 32)"],
      ["siblings", "siblings_len · 32", "[Hash]", "authentication path, bottom (leaf-adjacent) to top"]
    ]},
    { t: "callout", kind: "warn", html: "<code>nonce</code> is a <strong>u64</strong> (8 bytes) and <code>amount</code> is a <strong>u128</strong> (16 bytes); both are big-endian. Getting these widths wrong shifts every following field and the leaf hash will not match." },
    { t: "p", html: "The withdrawal leaf binds the fields that authorize a release; <code>index</code> and <code>siblings</code> are the proof path, not part of the leaf. The sequencer and the bridge both use <code>withdrawal_leaf(&w)</code> so leaves agree byte-for-byte." },
    { t: "code", lang: "text", title: "leaf hash + the three tree domains", code: "leaf = blake3(\"pyrax.bridge.wleaf\" ++ batch_index(8,BE) ++ recipient(20) ++ amount(16,BE) ++ nonce(8,BE))\n\nnode = blake3(\"pyrax.bridge.node\"  ++ left(32) ++ right(32))   // internal node\nroot = blake3(\"pyrax.bridge.mroot\" ++ inner(32))              // folded root, domain-wrapped\n\n// folding the leaf up its path; bit j of index selects left/right:\ncur = if (index >> j) & 1 == 0 { node(cur, sib) } else { node(sib, cur) };" },
    { t: "p", html: "The root-domain wrap is deliberate: without it a single-leaf tree's root would <em>be</em> a leaf, collapsing the leaf/root distinction and inviting depth-confusion attacks. The canonical builder <code>withdrawals_root(&leaves)</code> yields <code>Hash::ZERO</code> for an empty list, otherwise builds a binary tree (padding an odd level with a zero leaf) and root-domain-wraps the top." },
    { t: "p", html: "Validation order: (1) <strong>proof depth</strong> ≤ <code>MAX_TREE_DEPTH = 32</code>, else <code>ProofTooDeep</code>; (2) <strong>recipient</strong> not the bridge or zero address, else <code>BadRecipient</code>; (3) <strong>finalization</strong> — <code>batch_index &lt; next_batch_index</code>, else <code>BadWithdrawalProof</code>; (4) <strong>claimed-set</strong> empty, else <code>AlreadyClaimed</code>; (5) <strong>Merkle inclusion</strong> reproduces the stored root, else <code>BadWithdrawalProof</code>; (6) <strong>locked value</strong> ≥ amount, else <code>InsufficientLocked</code>; (7) <strong>overflow</strong> on credit, else <code>Overflow</code>. On success: debit the bridge, credit the recipient, write the claimed-set entry, emit <code>Withdrawal</code>." },
    { t: "code", lang: "text", title: "claimed-set nullifier", code: "claimed_slot = blake3(\"pyrax.bridge.claimed\" ++ leaf(32))\n// written as word_u64(1); a claim is recognized by storage(claimed_slot) != Hash::ZERO" },
    { t: "h2", text: "Storage layout" },
    { t: "table", head: ["Slot", "Derivation", "Holds"], rows: [
      ["canonical root", "blake3(\"pyrax.bridge.root\")", "the current rollup state root (Hash::ZERO ⇒ GENESIS_ROOT)"],
      ["next batch", "blake3(\"pyrax.bridge.next_batch\")", "next expected batch index, as word_u64"],
      ["deposit count", "blake3(\"pyrax.bridge.deposit_count\")", "total deposits recorded on L1, as word_u64"],
      ["deposit accumulator", "blake3(\"pyrax.bridge.deposit_acc\")", "rolling commitment to the ordered deposit sequence"],
      ["consumed", "blake3(\"pyrax.bridge.consumed\")", "cumulative deposits consumed by finalized batches"],
      ["per-batch withdrawals root", "blake3(\"pyrax.bridge.wroot\" ++ batch_index(8,BE))", "the batch's withdrawals_root"],
      ["claimed-set entry", "blake3(\"pyrax.bridge.claimed\" ++ leaf(32))", "nullifier; non-zero ⇒ withdrawal already claimed"]
    ]},
    { t: "p", html: "The bridge's <strong>locked value</strong> is not a storage slot — it is the bridge account's L1 balance, queryable like any account balance over JSON-RPC. Word encodings: <code>word_u64(v)</code> is 8 BE bytes right-aligned in a 32-byte word; <code>word_u128(v)</code> is 16 BE bytes right-aligned." },
    { t: "h2", text: "The DeferredVerifier (no batch finalizes)" },
    { t: "code", lang: "rust", title: "the verifier wired into production for Phase 10", code: "pub trait BridgeProofVerifier {\n    fn verify(&self, commitment: &StateCommitment, proof: &[u8]) -> Result<(), BridgeError>;\n}\n\nimpl BridgeProofVerifier for DeferredVerifier {\n    fn verify(&self, _commitment: &StateCommitment, _proof: &[u8]) -> Result<(), BridgeError> {\n        Err(BridgeError::ProofRejected)\n    }\n}" },
    { t: "p", html: "It rejects every proof <strong>cleanly</strong> rather than panicking — a panic in consensus would halt a node, whereas a clean rejection keeps every node live while simply never finalizing a batch. This is a deliberate, consensus-safe boundary: a missing proof can never advance the rollup root. When <code>pyrax-rollup</code>'s plonky2 prover lands in Phase 11, the real verifier replaces <code>DeferredVerifier</code> and <code>postCommitment</code> becomes reachable." },
    { t: "h2", text: "Errors" },
    { t: "table", head: ["BridgeError", "Op", "Cause"], rows: [
      ["Malformed", "any", "calldata too short / wrong length for the selected op"],
      ["ValueMismatch", "deposit / others", "deposit carried no value, or a non-payable op carried value"],
      ["BatchOutOfOrder { expected, got }", "postCommitment", "batch index was not the next expected one"],
      ["RootMismatch", "postCommitment", "prev_root ≠ the canonical rollup root"],
      ["BadDepositConsumed", "postCommitment", "deposit_count_consumed regressed or exceeded recorded deposits"],
      ["ProofRejected", "postCommitment", "validity proof rejected (always, via DeferredVerifier)"],
      ["BadWithdrawalProof", "withdraw", "Merkle proof didn't reproduce the root, or batch not finalized"],
      ["AlreadyClaimed", "withdraw", "the withdrawal leaf is already in the claimed-set"],
      ["BadRecipient", "withdraw", "recipient is the bridge itself or the zero address"],
      ["InsufficientLocked", "withdraw", "bridge holds less locked value than the release"],
      ["ProofTooDeep", "withdraw", "Merkle proof claimed more than MAX_TREE_DEPTH = 32 siblings"],
      ["Overflow", "withdraw", "crediting the recipient would overflow its balance"]
    ]},
    { t: "h2", text: "Constants reference" },
    { t: "table", head: ["Constant", "Value", "Meaning"], rows: [
      ["DEPOSIT_GAS", "30_000", "flat gas for deposit"],
      ["POST_COMMITMENT_GAS", "60_000", "flat gas for postCommitment"],
      ["WITHDRAW_BASE_GAS", "30_000", "base gas for withdraw"],
      ["WITHDRAW_PER_SIBLING_GAS", "200", "extra gas per Merkle authentication-path step"],
      ["MAX_TREE_DEPTH", "32", "max withdrawals-tree depth a proof may claim (≤ 2³² leaves)"],
      ["GENESIS_ROOT", "Hash::ZERO", "the prev_root batch 0 must chain from"]
    ]}
  ]
};


const PAGE_GAS_AND_LIMITS: DocPage = {
  slug: "gas-and-limits",
  title: "Gas & limits reference",
  blocks: [
    { t: "p", html: "This page is the authoritative table of every gas constant, economic parameter, sandbox cap, and code-size limit enforced by a PYRAX node. PYRAX is a multi-VM L1 — EVM (revm), WASM (wasmtime), and Cairo (cairo-vm) — and each VM meters execution against the same ledger gas model but with VM-specific host-call charges and resource ceilings." },
    { t: "callout", kind: "info", html: "<strong>Unit conventions.</strong> <em>Gas</em> is the ledger's metering unit. In the WASM VM, gas equals wasmtime <em>fuel</em> 1:1. In the Cairo VM, gas equals Cairo <em>steps</em> (≈1 step per gas) plus a flat load charge. In the EVM, gas is metered natively by revm. A <em>base unit</em> is the smallest denomination of the native token <strong>PYRX</strong> (18 decimals). \"Block number\" surfaced to contracts is the GhostDAG <strong>blue score</strong>." },
    { t: "h2", text: "Engine versions" },
    { t: "p", html: "The three VM backends are <strong>exact-pinned</strong> because each backs consensus-critical accounting — a version bump can shift gas / the success boundary:" },
    { t: "table", head: ["VM", "Engine", "Pinned version", "Meters"], rows: [
      ["EVM", "revm", "=22.0.1", "native EVM gas"],
      ["WASM", "wasmtime", "=33.0.2", "fuel, 1:1 as gas"],
      ["Cairo", "cairo-vm", "=2.5.0", "steps (≈1 step = 1 gas) + load charge"]
    ]},
    { t: "h2", text: "Block & transaction economics" },
    { t: "table", head: ["Constant", "Value", "Crate", "Meaning"], rows: [
      ["BLOCK_GAS_LIMIT", "30_000_000", "pyrax-primitives", "Maximum total gas all transactions in one block may consume; also the upper bound any single tx's gas_limit may declare."],
      ["GAS_PER_TRANSFER", "21_000", "pyrax-state", "Flat intrinsic gas for a transparent transfer; the gas floor every executed tx is charged at least (gas_used = max(metered, 21_000)); the minimum gas_limit a tx may declare."],
      ["SHIELDED_FEE", "100", "pyrax-state", "Flat fee (base units) every shielded spend burns as anti-DoS (shield / transfer / deshield). Too little ⇒ InsufficientFee."],
      ["MIN_BASE_FEE", "1", "pyrax-primitives", "Floor for the EIP-1559 base fee per gas."],
      ["INITIAL_BASE_FEE", "1", "pyrax-primitives", "EIP-1559 base fee per gas at genesis (= MIN_BASE_FEE)."],
      ["GAS_ELASTICITY", "2", "pyrax-primitives", "Gas target = BLOCK_GAS_LIMIT / 2 = 15_000_000; a full block runs at twice target."],
      ["BASE_FEE_MAX_CHANGE_DENOMINATOR", "8", "pyrax-primitives", "Maximum per-block base-fee change of 1/8 = 12.5%, up or down."],
      ["SUGGESTED_PRIORITY_FEE", "1", "pyrax-node", "Suggested priority tip per gas (eth_maxPriorityFeePerGas; eth_gasPrice = next_base_fee + 1)."]
    ]},
    { t: "callout", kind: "warn", html: "A transaction whose declared <code>gas_limit</code> is below <code>GAS_PER_TRANSFER</code> (21,000) or above <code>BLOCK_GAS_LIMIT</code> (30,000,000) is rejected outright. Provision somewhere in <code>[21_000, 30_000_000]</code>." },
    { t: "h2", text: "Fee distribution" },
    { t: "p", html: "Once executed, a tx's fee (<code>gas_used × effective_price</code>) is split into a <strong>base portion</strong> (<code>gas_used × min(base_fee, effective_price)</code>) and a <strong>tip portion</strong> (the remainder). Each is divided by frozen per-mille constants (consensus-frozen in <code>pyrax-state</code>); the DAO absorbs the rounding remainder so value is conserved exactly." },
    { t: "table", head: ["Portion", "Recipient", "Share", "Constant"], rows: [
      ["Base fee", "Burned (removed from supply)", "25%", "BASE_BURN_PERMILLE = 250"],
      ["Base fee", "PYRAX treasury (0x…0200)", "50%", "BASE_PYRAX_PERMILLE = 500"],
      ["Base fee", "DAO treasury (0x…0201)", "25%", "remainder"],
      ["Priority tip", "Coinbase / block producer", "70%", "TIP_VALIDATOR_PERMILLE = 700"],
      ["Priority tip", "PYRAX treasury (0x…0200)", "20%", "TIP_PYRAX_PERMILLE = 200"],
      ["Priority tip", "DAO treasury (0x…0201)", "10%", "remainder"]
    ]},
    { t: "h2", text: "WASM sandbox & host-call gas" },
    { t: "p", html: "The WASM VM (wasmtime) meters with fuel at 1 fuel = 1 gas. The module is charged a compile cost up front; each host call charges a fixed and/or per-byte amount. Execution budget = <code>gas_limit − compile_gas</code>; <code>gas_used = compile_gas + (exec_budget − fuel_left)</code>." },
    { t: "table", head: ["Constant", "Value", "Meaning"], rows: [
      ["MAX_WASM_CODE", "256 KiB (262_144)", "Hard cap on a deployed WASM module's size; over-cap ⇒ charged failure."],
      ["COMPILE_GAS_PER_BYTE", "4", "Gas per code byte to compile, paid upfront (code.len() × 4)."],
      ["MAX_CHILD_CODE", "512 KiB (524_288)", "Cap on child init-code passed to create2."],
      ["MAX_LOG_BYTES", "1 MiB", "Hard cap on total emitted-log bytes per call."],
      ["MAX_OUTPUT_BYTES", "1 MiB", "Hard cap on returned output / revert-data bytes per call."],
      ["MAX_PRECOMPILE_INPUT", "64 KiB", "Cap on input bytes to a nested precompile call."],
      ["MAX_CALL_INPUT", "128 KiB", "Cap on calldata bytes to a nested cross-VM call."],
      ["max_memory_bytes", "16 MiB", "Default max linear-memory growth per instance; breach traps."],
      ["max_table_elements", "10_000", "Default max table-element growth per instance; breach traps."],
      ["max_wasm_stack", "512 KiB", "Pinned stack size for deterministic stack-depth trapping."]
    ]},
    { t: "p", html: "Wasmtime is configured for determinism: fuel metering on, NaN canonicalization on, relaxed-SIMD forced deterministic and disabled, threads disabled." },
    { t: "table", head: ["Host function", "Gas", "Notes"], rows: [
      ["input_size()", "0", "Read-only query."],
      ["input_copy(dest)", "8 × input_len", "GAS_PER_BYTE = 8."],
      ["storage_read", "800", "GAS_SLOAD."],
      ["storage_write", "5_000", "GAS_SSTORE."],
      ["value_copy / caller_copy / address_copy", "0", "Read-only context queries."],
      ["chain_id / block_number / block_timestamp", "0", "Read-only scalar queries."],
      ["emit_log(topics, data)", "375 + 8 × (topics_len × 32 + data_len)", "GAS_LOG_BASE = 375; ≤ 4 topics; hard-capped at MAX_LOG_BYTES."],
      ["set_output(ptr, len)", "8 × len", "Hard-capped at MAX_OUTPUT_BYTES."],
      ["revert(ptr, len)", "0", "Call fails regardless; data clamped to MAX_OUTPUT_BYTES."],
      ["create2(code, …)", "32_000 + 8 × code_len", "CREATE2_BASE_GAS = 32_000; code_len capped at MAX_CHILD_CODE. Returns 1/0."],
      ["precompile(addr, input, …)", "200 + 8 × input_len + callee gas", "GAS_PRECOMPILE_BASE = 200; input capped at MAX_PRECOMPILE_INPUT; precompile's metered cost charged back."],
      ["call(target, value, input, …)", "700 + 8 × input_len + callee gas", "GAS_CALL_BASE = 700; input capped at MAX_CALL_INPUT; forwards 63/64 of remaining fuel (EIP-150)."]
    ]},
    { t: "h2", text: "Cairo sandbox & syscall limits" },
    { t: "p", html: "The Cairo VM meters at ≈1 gas per step plus a flat program-load charge. Syscalls charge against both per-call and cumulative caps." },
    { t: "table", head: ["Constant", "Value", "Meaning"], rows: [
      ["MAX_CAIRO_CODE", "512 KiB (524_288)", "Hard cap on compiled Cairo program size (parse-bomb DoS guard). Over-cap ⇒ charged failure."],
      ["CAIRO_LOAD_GAS_PER_BYTE", "4", "Gas per program byte to load/validate, by stored length."],
      ["SandboxLimits.max_steps", "4_000_000", "Default Cairo step cap. Actual max_steps = min(gas_limit − load_gas, 4_000_000)."],
      ["MAX_FELT_ARRAY", "4_096", "Per-call cap on any syscall felt array."],
      ["MAX_SYSCALL_WORDS", "2^18 = 262_144", "Cumulative cap across the whole run on total felts moved through syscalls."],
      ["MAX_EVENT_KEYS", "255", "Max indexed keys per emitted event (receipt-log key count is 1 byte)."],
      ["PRECOMPILE_CAIRO_GAS", "50_000_000", "Gas budget handed to a nested precompile invoked from Cairo."]
    ]},
    { t: "code", lang: "text", title: "Cairo gas accounting", code: "load_gas    = strip_cairo_magic(program).len() × CAIRO_LOAD_GAS_PER_BYTE  (= len × 4)\nstep_budget = gas_limit - load_gas\nmax_steps   = min(step_budget, SandboxLimits.max_steps)   // floored to >= 1\ngas_used    = load_gas + consumed_steps + precompile_gas  // capped at gas_limit on failure" },
    { t: "h2", text: "Cross-VM & deploy limits" },
    { t: "table", head: ["Constant", "Value", "Meaning"], rows: [
      ["MAX_CALL_DEPTH", "1_024", "Maximum cross-VM call depth (matches the EVM CALL_STACK_LIMIT)."],
      ["MAX_DEPLOY_DEPTH", "4", "Maximum nested contract-initiated deploy depth."],
      ["EIP-150 gas forwarding", "63/64", "A cross-VM call forwards 63/64 of the caller's remaining gas/fuel/steps to the callee; the callee's gas_used is charged back."]
    ]},
    { t: "p", html: "CREATE2 base gas is VM-specific: <strong>WASM</strong> <code>create2</code> = <code>32_000 + 8 × code_len</code>; <strong>Cairo</strong> <code>pyrax.create2</code> charges per code felt against <code>MAX_SYSCALL_WORDS</code> with child code bounded to <code>MAX_FELT_ARRAY</code> (4,096) bytes; <strong>EVM</strong> children deployed from a WASM/Cairo factory use the real CREATE2 opcode at the identical EIP-1014 address, so EVM gas rules apply natively." },
    { t: "h2", text: "Code-size caps across VMs" },
    { t: "table", head: ["VM", "Deployed-code cap", "Constant", "Child init-code cap"], rows: [
      ["WASM", "256 KiB", "MAX_WASM_CODE", "512 KiB (MAX_CHILD_CODE)"],
      ["Cairo", "512 KiB", "MAX_CAIRO_CODE", "4_096 bytes (MAX_FELT_ARRAY, via syscall)"],
      ["EVM", "— (see note)", "—", "—"]
    ]},
    { t: "callout", kind: "warn", html: "<strong>EIP-3860 is not enforced in the Phase 10 devnet slice.</strong> Ethereum mainnet caps init-code at 49152 bytes and meters init-code words via EIP-3860; the PYRAX Phase 10 slice does not yet implement it — no init-code word cost and no explicit EVM deploy-size constant. Do not rely on a 49152-byte EVM init-code ceiling being enforced today. WASM and Cairo enforce their own caps above." },
    { t: "h2", text: "Block context values" },
    { t: "p", html: "Not gas constants, but values contracts read and that fees compute against — surfaced identically across the EVM <code>NUMBER</code> opcode, the WASM <code>block_number()</code> host call, the Cairo <code>pyrax.get_block_number</code> syscall, and the <code>CHAIN_CONTEXT</code> precompile." },
    { t: "table", head: ["Field", "Source", "Meaning"], rows: [
      ["block.number", "header blue_score", "The GhostDAG blue score (reorg-stable height), not a linear canonical index. Equals linear height on a dev single-stream chain."],
      ["block.timestamp", "header timestamp", "Block production time in Unix seconds."],
      ["block.basefee", "header base_fee", "EIP-1559 base fee per gas. Informational inside revm (the EVM runs with gas_price = 0; fees charged at the ledger layer)."],
      ["block.coinbase", "header coinbase", "Block producer / beneficiary; receives the 70% validator tip share. Zero address if no producer identity."],
      ["block.gas_limit", "header gas_limit", "BLOCK_GAS_LIMIT (30,000,000) for standard blocks."]
    ]},
    { t: "callout", kind: "warn", html: "<strong>BLOCKHASH</strong> returns zero in the Phase 10 devnet slice — historical block hashes are not yet exposed to contracts. Treat it as a known limitation." },
    { t: "h2", text: "Error codes for gas/fee rejection" },
    { t: "table", head: ["Condition", "StateError", "RPC code"], rows: [
      ["Execution exhausts the gas limit", "OutOfGas", "-32003 (TxRejected)"],
      ["gas_limit outside [21_000, 30_000_000]", "rejected at validation", "-32003"],
      ["cap < base_fee (un-includable)", "FeeCapBelowBaseFee", "-32003"],
      ["Shielded spend underpays the flat fee", "InsufficientFee", "-32003"],
      ["Sender can't cover value + fees", "InsufficientBalance", "-32003"]
    ]}
  ]
};

const PAGE_ERRORS_AND_GLOSSARY: DocPage = {
  slug: "errors-and-glossary",
  title: "Errors & glossary",
  blocks: [
    { t: "p", html: "Your decoder ring for two things: the <strong>errors</strong> PYRAX returns (at the JSON-RPC boundary and from the ledger when a transaction is rejected), and the <strong>vocabulary</strong> that runs through the rest of these docs." },
    { t: "h2", text: "Two error surfaces" },
    { t: "table", head: ["Surface", "Who raises it", "What it tells you"], rows: [
      ["JSON-RPC error (code + message)", "The RPC server, before or instead of touching the ledger", "Your request was malformed, the resource doesn't exist, or the node failed internally."],
      ["Validity / StateError", "The ledger, while applying a transaction", "Your transaction was rejected on the merits (bad nonce, no funds, failed proof, etc.)."]
    ]},
    { t: "callout", kind: "info", html: "<strong>A contract revert is not an error.</strong> A reverted call is a successful-but-failed execution — the transaction is still included, gas is still charged, and you get a receipt with <code>success: false</code>. Reverts surface as receipt status, not a JSON-RPC error code. The one exception is <code>eth_call</code>, which is read-only and returns the JSON-RPC error on revert (no receipt to record)." },
    { t: "h2", text: "JSON-RPC error codes" },
    { t: "p", html: "The four core variants come from the RPC layer's <code>RpcError</code> enum (<code>pyrax-rpc/src/error.rs</code>); the rest are context-specific codes raised inside the server." },
    { t: "table", head: ["Code", "Variant / context", "Meaning"], rows: [
      ["-32602", "InvalidParams", "Malformed parameters: bad hex, wrong type, invalid address, missing required field (e.g. eth_call with no to), or an unknown filter id in eth_getFilterChanges/eth_getFilterLogs."],
      ["-32004", "NotFound", "The requested resource — block, transaction, receipt, or received stream file — does not exist (unknown hash, not yet mined, or reorged out). Also mixnet stream-RPC service errors and seed RPCs when PYRAX_SEED_RPC_TOKEN is not configured."],
      ["-32003", "TxRejected", "The transaction was rejected by the mempool (an application-level validity failure). The message carries the reason — usually a StateError below."],
      ["-32001", "Seed RPC auth failure", "\"unauthorized: invalid seed RPC token\" — the token passed to a pyrax_seed* method did not match (constant-time comparison)."],
      ["-32603", "Internal", "An internal node error (database I/O, consensus failure, etc.)."]
    ]},
    { t: "callout", kind: "info", html: "<code>-32602</code> is for <em>malformed input</em>; <code>-32004</code> is for <em>valid input that points at nothing</em>. A typo in an address is <code>-32602</code>; a perfectly valid hash of a block that doesn't exist is <code>-32004</code>. <code>eth_getTransactionReceipt</code> / <code>eth_getTransactionByHash</code> / <code>eth_getBlockBy*</code> return JSON <code>null</code> (not an error) when the resource is unknown — a <code>null</code> receipt almost always means the tx is still pending." },
    { t: "h2", text: "Validity / StateError" },
    { t: "p", html: "When the ledger applies a transaction and rejects it, the reason is a <code>StateError</code> (<code>pyrax-state/src/lib.rs</code>). At the RPC boundary this surfaces as <code>-32003</code> (TxRejected) with the reason in the message. These are consensus-level rules every node enforces identically." },
    { t: "table", head: ["StateError variant", "What went wrong", "Typical fix"], rows: [
      ["InsufficientBalance", "Sender didn't have enough to cover value + fees.", "Fund the account, or lower value/gas."],
      ["InvalidNonce { expected, got }", "The tx nonce didn't match the account's next expected nonce.", "Re-read the nonce (pyrax_nonce / eth_getTransactionCount) and resubmit; don't reuse or skip nonces."],
      ["OutOfGas", "Execution ran out of gas (or the limit was set too low to even start).", "Raise gas_limit; use eth_estimateGas to size it."],
      ["ChainMismatch { expected, got }", "The tx's chain id didn't match this network (replay protection).", "Sign for the right chain id."],
      ["InvalidSignature(String)", "A transparent tx's signature did not recover a valid sender.", "Re-sign; verify the signing payload and key."],
      ["BalanceOverflow", "Crediting the recipient would overflow its balance.", "Practically unreachable; indicates a malformed/extreme value."],
      ["UnsupportedTransaction(String)", "The tx shape isn't supported by the current slice.", "Reshape the tx."],
      ["FeeCapBelowBaseFee", "The gas-price cap (legacy gasPrice / EIP-1559 maxFeePerGas) was below the block's base fee — un-includable.", "Raise the cap above the current base fee (eth_gasPrice / eth_feeHistory)."],
      ["DoubleSpend", "A shielded tx reused an already-spent nullifier, or listed the same nullifier twice.", "Rebuild the spend from unspent notes."],
      ["InvalidProof(String)", "A shielded tx's zero-knowledge proof failed verification.", "Regenerate the proof against the current anchor."],
      ["UnknownAnchor(Hash)", "A shielded tx anchored to a note-tree root this chain never produced.", "Re-fetch chain data (pyrax_shieldedChainData) and re-anchor."],
      ["ShieldedPoolUnderflow", "A deshield tried to release more value than the shielded pool holds.", "Reduce the deshield amount."],
      ["InsufficientFee", "A shielded spend didn't carry enough value_balance to pay the flat SHIELDED_FEE (100 base units).", "Include the shielded fee in the value balance."],
      ["Storage(String)", "The underlying storage layer failed.", "Node-side; not a tx problem."],
      ["Genesis(String)", "Genesis input was malformed.", "Node configuration problem, not a tx."]
    ]},
    { t: "callout", kind: "warn", html: "None of the above fire when a contract simply <code>revert</code>s. A revert means the tx <em>was valid</em> — good nonce, enough balance, enough gas to run — but the contract chose to undo its work. The tx lands in a block, gas is charged for the work done up to the revert, state changes from that frame are discarded, and the receipt reads <code>success: false</code>. Use <code>eth_getTransactionReceipt</code> to distinguish \"rejected (never mined)\" from \"mined but reverted.\"" },
    { t: "h2", text: "Glossary — Consensus & DAG" },
    { t: "list", items: [
      "<strong>GhostDAG</strong> — the block-ordering protocol. Blocks form a directed acyclic graph; each can reference multiple parents (parents[0] is the selected parent). GhostDAG partitions blocks into a blue and red set, then produces a total order — letting PYRAX have a high block rate without orphaning work.",
      "<strong>Blue score</strong> — the size of the ordered blue set up to a block (blue_score: u64). PYRAX's height analogue and the \"block number\" surfaced to contracts (the EVM NUMBER opcode, the WASM/Cairo block_number, and CHAIN_CONTEXT all read it). Reorg-stable, so a block executes identically at seal and replay time.",
      "<strong>Blue work</strong> — accumulated difficulty across the blue set (blue_work: u128); the quantity fork choice compares (more blue work wins).",
      "<strong>DAA score</strong> — the difficulty-adjustment-algorithm score (daa_score: u64) driving difficulty retargeting.",
      "<strong>TriStream</strong> — three parallel streams A, B, C. A and B are Proof-of-Work and externally minable (pyrax_getWork/pyrax_submitWork accept only \"A\"/\"B\"); C is Proof-of-Stake (requesting work for \"C\" is an error). A node reports mode via pyrax_consensusInfo: \"dev-single-stream\" or \"dev-tristream\".",
      "<strong>Dual-hash PoW</strong> — Stream A/B work is sealed with two hashes, a BLAKE3 digest and a SHA-256 digest, both over the same preimage; pyrax_submitWork verifies both.",
      "<strong>Coinbase</strong> — the block producer/beneficiary address; receives the 70% validator share of priority tips. Zero address if the producer has no identity.",
      "<strong>Tip</strong> — a childless block (a current DAG leaf); pyrax_dagTips returns them. \"Best blue score\" is the highest blue score among the tips."
    ]},
    { t: "h2", text: "Glossary — VMs & execution" },
    { t: "list", items: [
      "<strong>Multi-VM</strong> — a PYRAX account can hold code for EVM (revm), WASM (wasmtime), or Cairo (cairo-vm), all sharing one state model. A contract is an account with code and storage.",
      "<strong>VM magic / VM tag</strong> — the VM is auto-detected from the first bytes (detect_vm): <code>\\0asm</code> → WASM, <code>\\0CAIRO</code> → Cairo, anything else → EVM. Stored runtime is VM-tagged (1-byte tag 0=EVM/1=WASM/2=Cairo prepended; code_hash = blake3([tag || code])).",
      "<strong>Storage slot</strong> — a 32-byte key mapped to a 32-byte value, identical across all three VMs. Read any slot with eth_getStorageAt.",
      "<strong>Fuel</strong> — wasmtime's metering unit for WASM; fuel is gas 1:1. storage_read = 800, storage_write = 5,000, per-byte copies = 8. When fuel hits zero the instance traps (a valid, gas-charged failure).",
      "<strong>Step</strong> — Cairo's metering unit; ≈1 step = 1 gas. gas_used = load_gas + consumed_steps + precompile_gas, where load_gas = program_length × 4.",
      "<strong>Overlay</strong> — the buffer where in-flight account/storage writes (and value transfers) accumulate; flushed to the backend only on success. On revert/trap/fault the overlay is discarded — which is exactly why child-call effects are isolated.",
      "<strong>Cross-VM call</strong> — a contract in one VM calling a contract in another; PYRAX detects the callee's VM magic and routes the call. Gas is forwarded under the EIP-150 63/64 rule, value-transfer and STATICCALL semantics are preserved, and depth is capped at MAX_CALL_DEPTH = 1024.",
      "<strong>Counterfactual address</strong> — a contract's address computed before deployment. CREATE (nonce-based): keccak256(domain ++ sender ++ nonce)[12..] with VM-separated domains; CREATE2 (EIP-1014): keccak256(0xff ++ sender ++ salt ++ keccak256(init_code))[12..]."
    ]},
    { t: "h2", text: "Glossary — Fees & gas" },
    { t: "list", items: [
      "<strong>Base fee</strong> — the EIP-1559 per-gas floor a block charges (INITIAL_BASE_FEE/MIN_BASE_FEE = 1). Retargets every block toward a gas target of gas_limit/2 (GAS_ELASTICITY = 2), at most ±12.5%/block (BASE_FEE_MAX_CHANGE_DENOMINATOR = 8). The base-fee portion is split 25% burned / 50% PYRAX treasury / 25% DAO (250/500/250).",
      "<strong>Priority tip</strong> — the extra per-gas amount above the base fee (maxPriorityFeePerGas). Effective price = min(cap, base_fee + max_priority); cap below base fee ⇒ FeeCapBelowBaseFee. The tip portion is split 70% producer / 20% PYRAX treasury / 10% DAO (700/200/100).",
      "<strong>Block gas limit</strong> — BLOCK_GAS_LIMIT = 30,000,000; the base-fee target is half of this.",
      "<strong>Intrinsic gas</strong> — GAS_PER_TRANSFER = 21,000 (a transparent transfer); SHIELDED_FEE = 100 (a flat anti-DoS fee every shielded spend burns)."
    ]},
    { t: "h2", text: "Glossary — Tokens, accounts & privacy" },
    { t: "list", items: [
      "<strong>PYRX</strong> — the native token (ticker PYRX, 18 decimals, 50B cap, genesis $0.0025, mining cap 12.5B, 25% base-fee burn). All balances, value, gas fees, and treasury splits are denominated in PYRX base units; RPC returns hex base units.",
      "<strong>EOA</strong> — an externally-owned account with no code (eth_getCode returns 0x).",
      "<strong>Nonce</strong> — the per-account sequence number; each tx must use the exact next nonce, else InvalidNonce.",
      "<strong>Note</strong> — a shielded value commitment (an encrypted \"coin\"). The pool publishes commitments (leaves) and ciphertexts (items) via pyrax_shieldedChainData; the wallet trial-decrypts to find its own notes.",
      "<strong>Nullifier</strong> — a one-time tag revealed when a note is spent, preventing double-spends. Reusing one triggers DoubleSpend.",
      "<strong>Anchor</strong> — the current root of the note-commitment tree. Shielded spends prove membership against an anchor; proving against a root the chain never produced triggers UnknownAnchor."
    ]},
    { t: "callout", kind: "info", html: "<strong>Keys never leave the wallet.</strong> The shielded prover is wallet-side. The node only serves <em>public</em> data (commitments, ciphertexts, anchor, spent nullifiers); no spending keys ever reach the node." },
    { t: "h2", text: "Glossary — System contracts" },
    { t: "p", html: "A <strong>precompile</strong> is a built-in, contract-like routine at a reserved address that any VM can call. Precompiles are read-only (they cannot mutate state). The <strong>bridge</strong> at <code>0x…0100</code> is the L1↔L2 rollup entry point; the <strong>treasury / DAO / faucet</strong> accounts live in the <code>0x…02xx</code> block." },
    { t: "table", head: ["Address", "Account / precompile", "Purpose"], rows: [
      ["0x…0100", "BRIDGE (precompile)", "rollup deposit / postCommitment / withdraw"],
      ["0x…0101", "BLAKE3", "BLAKE3 hash"],
      ["0x…0102", "SHA256", "SHA-256 hash"],
      ["0x…0103", "KECCAK256", "keccak256 hash"],
      ["0x…0104", "ECRECOVER", "secp256k1 signature recovery"],
      ["0x…0110", "CHAIN_CONTEXT", "chain_id ++ block_number ++ block_timestamp (96 bytes)"],
      ["0x…0111", "SHIELDED_VIEW", "shielded note-tree anchor (32 bytes)"],
      ["0x…0200", "PYRAX_TREASURY (account)", "base-fee 50% + tip 20% share"],
      ["0x…0201", "DAO_TREASURY (account)", "base-fee 25% + tip 10% share"],
      ["0x…0202", "FAUCET (account)", "seeds test accounts (testnet / internal-devnet-live / devnet2)"],
      ["0x…0203", "AI_COMPUTE_POOL (account)", "genesis-seeded reserve paying NEURAX compute providers"]
    ]},
    { t: "h2", text: "Glossary — Networks" },
    { t: "p", html: "PYRAX has five networks, each with its own chain id (used for replay protection; a mismatch raises <code>ChainMismatch</code>). Chain ids are shown in <strong>decimal</strong>:" },
    { t: "table", head: ["Network", "Label", "Chain id (decimal)"], rows: [
      ["Internal Devnet 1.0", "internal-devnet-simulated", "881109"],
      ["Internal Devnet (Live)", "internal-devnet-live", "429294"],
      ["Devnet2 (default)", "devnet2", "710823"],
      ["Testnet (public, has faucet)", "testnet", "104928"],
      ["Mainnet (production)", "mainnet", "563821"]
    ]},
    { t: "callout", kind: "info", html: "<code>eth_chainId</code> returns the id as hex (Devnet2 = <code>0xad8a7</code> = decimal 710823); <code>net_version</code> returns it as a decimal string." },
    { t: "h2", text: "Node roles" },
    { t: "p", html: "A node runs in one of three roles (<code>--role</code>): <strong>full</strong> (mines/produces + validates + joins the AI job pool), <strong>relay</strong> (backbone — relays blocks/txs and serves discovery, no mining), or <strong>verifier</strong> (validates every block/proof, no mining, not a discovery backbone)." },
    { t: "h2", text: "Known limitations to keep in mind" },
    { t: "list", items: [
      "<strong>BLOCKHASH returns zero</strong> — historical block hashes by number aren't implemented in the current devnet slice.",
      "<strong>Per-account storage trie isn't folded into state_root yet</strong> — consensus stays safe because nodes re-execute peer blocks rather than trusting their storage roots; deterministic execution converges.",
      "<strong>Block-tag arguments are accepted but largely ignored</strong> — eth_getBalance, eth_getTransactionCount, etc. always query latest state.",
      "<strong>Pending-tx feeds are best-effort</strong> — treat eth_newPendingTransactionFilter / eth_subscribe(\"newPendingTransactions\") as lossy.",
      "<strong>The bridge finalizes no batch</strong> — postCommitment always returns ProofRejected (DeferredVerifier) until the Phase-11 plonky2 verifier is wired; only deposit is a usable write path today."
    ]}
  ]
};


const PAGE_NEURAX_OVERVIEW: DocPage = {
  slug: "neurax-overview",
  title: "NEURAX — Overview",
  blocks: [
    { t: "p", html: "<strong>NEURAX</strong> is PYRAX's proprietary, multimodal generative <strong>and</strong> compute AI — the workload of the decentralized GPU datacenter that runs on the PYRAX node fleet and settles through the on-chain job market (PYRAX <strong>Phase 9</strong>). It is a <strong>federation of tiered specialist experts behind one agentic router</strong>, not a single monolith — the architecture that runs across heterogeneous GPUs from a consumer gaming card up to a datacenter H200." },
    { t: "p", html: "NEURAX is <strong>local-first</strong>. The baseline is designed to run comfortably on a consumer <strong>RTX 3060 (12 GB target, 8 GB lite floor)</strong> — fully local, private, offline — with bigger and frontier variants opt-in via a larger GPU, a local cohort of pooled GPUs, or a Tier-T datacenter. The on-chain market and GPU pooling are the economy and scale-out layer, not the product itself." },
    { t: "h2", text: "The six pillars" },
    { t: "table", head: ["Pillar", "What it does"], rows: [
      ["Text", "A tiered MoE family + a vision adapter — the federation's Tier-1 brain: chat, code, reasoning, tool-use, vision-language understanding."],
      ["Image", "Rectified-flow Diffusion-Transformers; ControlNet/IP-Adapter/LoRA; img2img / inpaint / upscale."],
      ["Video", "Latent video diffusion (text→video, image→video). Honest: 480–720p / 3–5 s in minutes on a 24 GB card; long/HD is datacenter or fleet-sharded."],
      ["Audio", "Music, TTS + consent-gated voice cloning, SFX, ASR — the broadest-monetizable tier (an 8 GB card is a viable worker)."],
      ["ML + Data platform", "Distributed training, fine-tune/LoRA/distill-as-a-service, classical ML (XGBoost/LightGBM/cuML), Ray/Dask ETL, AutoML sweeps, batch embeddings."],
      ["PYRAX Copilot", "An autonomous agent expert in PYRAX — RAG over the corpus + a PYRAX-specialist coding model + a guarded agent that scaffolds, compiles, tests, and (Simulated/Devnet-only) deploys PYRAX code."]
    ]},
    { t: "h2", text: "The route: Local / Cohort / Network" },
    { t: "p", html: "Every request resolves to exactly one of three places to run, decided deterministically from the detected VRAM and the requested model. The decision <strong>delegates to the real on-chain scheduler eligibility math</strong> (<code>match_job</code> then <code>match_cohort</code>), so \"run local\" is provably the same decision the network would make." },
    { t: "list", items: [
      "<strong>Local</strong> — runs on a single local GPU that fits the model.",
      "<strong>Cohort</strong> — runs across a local cohort of pooled GPUs (the 9.5 pooling path) when no single card fits but the box's GPUs together do.",
      "<strong>Network</strong> — cannot run locally; hand to the marketplace / Tier-T via the gateway. The reason is one of <code>NoLocalWorker</code>, <code>TierShortfall</code>, or <code>VramShortfall</code> — never a silent impossible route."
    ]},
    { t: "h2", text: "Trust tiers O / S / T" },
    { t: "p", html: "Trust tiers are a hard <code>match_job</code> rule. The model registry stores the real tier (<code>Open</code> / <code>Secure</code> / <code>Trusted</code>), and the scheduler enforces it as <code>TrustTier::{Open, Secure, Trusted}</code> before any bytes move. A consumer node is always <strong>Open and never attested</strong>, so a higher-tier model can never run locally regardless of VRAM." },
    { t: "table", head: ["Tier", "Meaning", "Where it runs"], rows: [
      ["Tier-O (Open)", "Open-lineage weights, public capabilities.", "Any consumer GPU."],
      ["Tier-S (Secure)", "Open models sharded across consumer GPUs for deterrence (not proof) — sharding is the mechanism, not the tier name.", "A pooled cohort of consumer GPUs."],
      ["Tier-T (Trusted)", "TEE-attested datacenter GPUs only: proprietary weights, jobs sealed from the operator, confidential training.", "Attested datacenter GPUs."]
    ]},
    { t: "callout", kind: "info", html: "Sealing a job from the operator and protecting NEURAX's proprietary weights are the <em>same</em> problem, solved once by Tier-T. Consumer pools are labeled <strong>relay-blind, not operator-sealed</strong>." },
    { t: "h2", text: "Reuse, not reinvent" },
    { t: "p", html: "NEURAX adds no new on-chain primitive it doesn't have to. Weights and datasets ride <code>pyrax-stream</code> via the <code>pyrax-weights</code> superchunk layer; settlement is ONE canonical <code>ComputeMeter → ComputeReceipt → SettleHook</code> (unit <strong>CU-milli</strong>); jobs are the existing <code>pyrax-job-market</code> <code>JobKind::{Inference, Training, Compute}</code> enum with modality/tier/params living in the content-addressed spec at <code>Job.spec_hash</code>." }
  ]
};

const PAGE_NEURAX_MODELS: DocPage = {
  slug: "neurax-models",
  title: "NEURAX — Model Catalog",
  blocks: [
    { t: "p", html: "NEURAX ships a brand-id model catalog: a <code>models.json</code> that binds a stable, human-meaningful model id to everything a node needs to run it — its weights commitment, the VRAM floor, the trust tier, the modality (<code>kind</code>), and the on-disk format. The catalog ids are <strong>brand ids only</strong>; no native model-family names appear in any shipped catalog." },
    { t: "p", html: "The <code>vram_required_gb</code> field is the realistic <strong>floor</strong> — the smallest viable profile. Each model carries a <code>profiles</code> map (e.g. 16 / 12 / 8 GB flag sets), and the node picks the fitting profile at run time. The catalog stores the authoritative VRAM and tier; a pack row or the in-app gate can never advertise a smaller VRAM than the model actually needs." },
    { t: "h2", text: "The shipped catalog" },
    { t: "table", head: ["Brand id", "Modality (kind)", "VRAM floor", "Recommended", "Tier", "Format"], rows: [
      ["neurax-coder@1.0.0", "Text", "8 GB", "8 GB", "open", "gguf"],
      ["neurax-coder-mini@1.0.0", "Text", "2 GB", "2 GB", "open", "gguf"],
      ["neurax-image@1.0.0", "Image", "8 GB", "16 GB", "open", "safetensors"],
      ["neurax-image-lite@1.0.0", "Image", "2 GB", "6 GB", "open", "safetensors"],
      ["neurax-image-xl@2.1.0", "Image", "12 GB", "16 GB", "open", "safetensors"],
      ["neurax-scribe@1.0.0", "Audio (ASR)", "3 GB", "3 GB", "open", "ggml"],
      ["neurax-speech@1.0.0", "Audio (TTS)", "1 GB", "1 GB", "open", "onnx"],
      ["neurax-music@1.0.0", "Audio (music)", "8 GB", "14 GB", "open", "safetensors"],
      ["neurax-spatial@1.0.0", "Audio (spatial DSP)", "1 GB", "1 GB", "open", "dsp"],
      ["neurax-embed@1.0.0", "Embedding", "1 GB", "1 GB", "open", "onnx"],
      ["neurax-video@1.0.0", "Video", "8 GB", "16 GB", "open", "safetensors"]
    ]},
    { t: "h2", text: "VRAM tiers and downshift-never-up" },
    { t: "p", html: "A node's detected VRAM is classified into one of four tiers. The founder directive pins <strong>12 GB = Baseline</strong> (the comfortable RTX 3060 target), <strong>8 GB = Lite</strong> (the floor), <strong>sub-8 GB = Cpu</strong> (small models / CPU fallback), and <strong>24 GB+ = Large</strong> (a bigger single card, or the cohort-pooled target)." },
    { t: "table", head: ["VramTier", "Detected VRAM", "Meaning"], rows: [
      ["Cpu", "< 8 GiB", "Small models / CPU fallback only."],
      ["Lite", "8–11 GiB", "The lite floor."],
      ["Baseline", "12–23 GiB", "The comfortable consumer baseline (RTX 3060)."],
      ["Large", "≥ 24 GiB", "A bigger single card, or the cohort-pooled target."]
    ]},
    { t: "p", html: "A pack table maps <code>(modality, VRAM-tier) → ModelId</code>. Selection <strong>downshifts</strong> to the next-lower tier that has a pack — so a selected model always fits the detected VRAM, and it never selects a tier above what was asked. If no pack exists at or below the detected tier (the model only exists larger), the caller routes to the network." },
    { t: "code", lang: "json", title: "neurax-packs.json (the (kind, tier) → model_id index)", code: "[\n  { \"kind\": \"Text\",      \"tier\": \"Baseline\", \"model_id\": \"neurax-coder@1.0.0\" },\n  { \"kind\": \"Text\",      \"tier\": \"Lite\",     \"model_id\": \"neurax-coder@1.0.0\" },\n  { \"kind\": \"Text\",      \"tier\": \"Cpu\",      \"model_id\": \"neurax-coder-mini@1.0.0\" },\n  { \"kind\": \"Image\",     \"tier\": \"Baseline\", \"model_id\": \"neurax-image@1.0.0\" },\n  { \"kind\": \"Image\",     \"tier\": \"Lite\",     \"model_id\": \"neurax-image-lite@1.0.0\" },\n  { \"kind\": \"Image\",     \"tier\": \"Large\",    \"model_id\": \"neurax-image-xl@2.1.0\" },\n  { \"kind\": \"Audio\",     \"tier\": \"Baseline\", \"model_id\": \"neurax-scribe@1.0.0\" },\n  { \"kind\": \"Audio\",     \"tier\": \"Lite\",     \"model_id\": \"neurax-scribe@1.0.0\" },\n  { \"kind\": \"Embedding\", \"tier\": \"Baseline\", \"model_id\": \"neurax-embed@1.0.0\" },\n  { \"kind\": \"Embedding\", \"tier\": \"Lite\",     \"model_id\": \"neurax-embed@1.0.0\" },\n  { \"kind\": \"Video\",     \"tier\": \"Baseline\", \"model_id\": \"neurax-video@1.0.0\" },\n  { \"kind\": \"Video\",     \"tier\": \"Lite\",     \"model_id\": \"neurax-video@1.0.0\" },\n  { \"kind\": \"Video\",     \"tier\": \"Large\",    \"model_id\": \"neurax-video@1.0.0\" }\n]" },
    { t: "callout", kind: "warn", html: "A model's authoritative <code>vram_required_gb</code>, <code>min_tier</code>, and <code>kind</code> always come from the <strong>registry entry</strong>, never from the pack row — the pack row is only a <code>(modality, tier) → ModelId</code> index. An unknown model id is an error, not a silent default." }
  ]
};

const PAGE_NEURAX_ROUTE_CLI: DocPage = {
  slug: "neurax-route-cli",
  title: "NEURAX — The neurax-route CLI",
  blocks: [
    { t: "p", html: "The node exposes the local-vs-cohort-vs-network decision as <code>pyrax-node neurax-route</code>. It is the single, deterministic source of truth: the app (and any client) call the node for the route rather than re-deriving the decision in TypeScript. The command answers <em>where</em> a job should run — the risky parts (spawning sidecars, pulling weights) stay in the app's supervisor behind the frozen decision boundary." },
    { t: "h2", text: "Invocation" },
    { t: "code", lang: "bash", title: "pyrax-node neurax-route", code: "pyrax-node neurax-route --request <json> --packs <packs.json path> --models <models.json path>" },
    { t: "p", html: "The command reads the two catalog files, computes the route, prints the response JSON, and returns an exit code: <strong>0</strong> ok, <strong>2</strong> usage, <strong>1</strong> error." },
    { t: "code", lang: "bash", title: "Example", code: "pyrax-node neurax-route \\\n  --request '{\"gpus_gib\":[12],\"kind\":\"text\"}' \\\n  --packs packs.json \\\n  --models models.json\n# -> {\"decision\":\"local\",\"reason\":null,\"worker\":\"local#0\",\"members\":[],\"model_id\":\"neurax-coder@1.0.0\",\"vram_required_gb\":8,\"min_tier\":\"open\"}" },
    { t: "h2", text: "The request shape" },
    { t: "p", html: "The detected local GPUs plus what's being asked for. An explicit <code>model_id</code> takes precedence over <code>kind</code>; the <code>spec_hash</code> is carried through (informational for routing)." },
    { t: "code", lang: "rust", title: "RouteRequest (verbatim)", code: "/// A route request from the app: the detected local GPUs + what's being asked for.\n#[derive(Debug, Clone, Deserialize)]\npub struct RouteRequest {\n    /// Detected VRAM per local GPU, in whole GiB — one entry per physical GPU. Empty ⇒ no local\n    /// GPU (routes to the network).\n    #[serde(default)]\n    pub gpus_gib: Vec<u32>,\n    /// The modality to run (\"text\"/\"image\"/\"audio\"/\"video\"/\"embedding\"/\"ml-platform\").\n    /// Used for the modality-default pack when `model_id` is not given.\n    #[serde(default)]\n    pub kind: Option<String>,\n    /// An explicit catalog model id (e.g. a chosen audio engine) — takes precedence over `kind`.\n    #[serde(default)]\n    pub model_id: Option<String>,\n    /// The job's content-addressed spec hash (carried through; informational for routing).\n    #[serde(default)]\n    pub spec_hash: String,\n}" },
    { t: "h2", text: "The decision shape" },
    { t: "p", html: "The response the app acts on. <code>decision</code> is <code>\"local\"</code> | <code>\"cohort\"</code> | <code>\"network\"</code>; for a network route, <code>reason</code> is <code>\"no_local_worker\"</code> | <code>\"tier_shortfall\"</code> | <code>\"vram_shortfall\"</code>." },
    { t: "code", lang: "rust", title: "RouteResponse (verbatim)", code: "/// The route decision the app acts on.\n#[derive(Debug, Clone, PartialEq, Eq, Serialize)]\npub struct RouteResponse {\n    /// \"local\" | \"cohort\" | \"network\".\n    pub decision: String,\n    /// For `network`: \"no_local_worker\" | \"tier_shortfall\" | \"vram_shortfall\".\n    pub reason: Option<String>,\n    /// For `local`: the chosen GPU worker id. For `cohort`: the coordinator id.\n    pub worker: Option<String>,\n    /// For `cohort`: the pooled member worker ids (in cohort order).\n    pub members: Vec<String>,\n    /// The resolved catalog model id the route is for.\n    pub model_id: String,\n    /// The model's VRAM requirement (GiB), as resolved from the registry.\n    pub vram_required_gb: u32,\n    /// The model's minimum trust tier (\"open\"/\"secure\"/\"trusted\").\n    pub min_tier: String,\n}" },
    { t: "h2", text: "The underlying RouteDecision" },
    { t: "p", html: "The string response is rendered from the typed <code>RouteDecision</code> produced by <code>decide_route</code>, which delegates to the real scheduler: a single local GPU (<code>match_job</code>), else a local cohort (<code>match_cohort</code>), else the network." },
    { t: "code", lang: "rust", title: "RouteDecision + RouteReason (verbatim)", code: "/// Why a job could not run locally (or in a local cohort) and must go to the network.\n#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]\npub enum RouteReason {\n    /// No local GPU was detected/registered.\n    NoLocalWorker,\n    /// The model needs a higher trust tier than a consumer (Open, unattested) node can provide —\n    /// it must run on a Tier-T datacenter worker.\n    TierShortfall,\n    /// Even pooling the local GPUs cannot reach the model's VRAM requirement.\n    VramShortfall,\n}\n\n/// Where a job runs.\n#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]\npub enum RouteDecision {\n    /// Runs on a single local GPU.\n    Local(WorkerId),\n    /// Runs across a local cohort of GPUs (the 9.5 pooling path).\n    Cohort(Cohort),\n    /// Cannot run locally — hand to the marketplace / Tier-T via the gateway.\n    Network {\n        /// Why it could not run locally.\n        reason: RouteReason,\n    },\n}" },
    { t: "h2", text: "Worked routes" },
    { t: "table", head: ["Request", "Decision", "Why"], rows: [
      ["12 GB GPU, text", "Local (local#0)", "neurax-coder fits on one card."],
      ["2× 12 GB GPUs, a 24 GB model", "Cohort (members local#0, local#1; coordinator local#0)", "No single card fits; pool both, lexmin coordinator."],
      ["12 GB GPU, a 24 GB Open model", "Network { vram_shortfall }", "No pooling room to reach the VRAM floor."],
      ["12 GB GPU, a Trusted model", "Network { tier_shortfall }", "A Trusted model can never run on a consumer Open/unattested node."],
      ["No local GPU, text", "Network { no_local_worker }", "Nothing registered locally."]
    ]}
  ]
};

const PAGE_NEURAX_GATEWAY: DocPage = {
  slug: "neurax-gateway",
  title: "NEURAX — The Gateway",
  blocks: [
    { t: "p", html: "The gateway is the product edge: one service speaking an <strong>OpenAI-compatible</strong> HTTP/WS API so unchanged OpenAI tooling (the SDKs, LangChain, and so on) connects, <strong>plus</strong> a PYRAX-native streaming dialect that rides <code>pyrax-stream</code> over the mixnet. Any operator can run their own gateway, and the mixnet dialect needs no gateway at all — so no single ingress is load-bearing." },
    { t: "h2", text: "Endpoints" },
    { t: "list", items: [
      "<code>/v1/chat/completions</code> — chat / text generation.",
      "<code>/v1/images/generations</code> — image generation.",
      "<code>/v1/audio/*</code> — audio (ASR / TTS / music).",
      "video and embeddings endpoints (additive NEURAX extensions upstream clients ignore).",
      "<code>/v1/models</code> — lists every model with its honest per-model tier, <code>vram_min</code>, and quant, so a caller can tell which models fit an 8–24 GB card vs. need a datacenter pool.",
      "<code>/openapi.json</code> — the single OpenAPI spec the SDKs generate types from."
    ]},
    { t: "h2", text: "What a request does" },
    { t: "p", html: "Each request is converted into a <code>pyrax-job-market</code> Job; the gateway quotes a PYRX price, escrows it, routes via the federation router, and streams the result back. Billing is <strong>incremental escrow-ceiling streaming</strong> with auto-refund on a dropped connection — an idempotent <code>job_id</code> plus resumable pull lets a client reconnect mid-generation." },
    { t: "callout", kind: "info", html: "Keys are <strong>wallet-bound</strong> — a signed challenge, escrow-capped, not a stealable bearer secret — and rate-limited by escrow balance. A model that cannot be served returns <code>model_unavailable</code> with a price hint, never a silent impossible route." },
    { t: "h2", text: "Client SDKs" },
    { t: "p", html: "The TypeScript SDK (<code>@neurax/sdk</code>) and Python SDK (<code>neurax</code>) are typed surfaces over the gateway (HTTPS) or the mixnet dialect. Both ship an OpenAI drop-in shim: <code>@neurax/openai-shim</code> returns an OpenAI instance pointed at the gateway, and <code>from neurax.openai import OpenAI</code> mirrors the <code>openai</code> client surface. Both generate types from the gateway's OpenAPI spec and run a conformance suite against the real <code>openai</code> SDKs." },
    { t: "h3", text: "TypeScript (illustrative)" },
    { t: "code", lang: "typescript", title: "OpenAI-compatible gateway (illustrative)", code: "// The NEURAX gateway speaks the OpenAI surface, pointed at a wallet-bound, escrow-capped key.\nimport { createNeuraxOpenAI } from \"@neurax/openai-shim\";\n\nconst client = createNeuraxOpenAI({ /* PYRAX wallet-bound, escrow-capped key */ });\n\nconst res = await client.chat.completions.create({\n  model: \"neurax-coder\",\n  messages: [{ role: \"user\", content: \"Write a Solidity ERC-20.\" }],\n});\n// Each request -> a job market Job -> PYRX quote -> escrow -> route -> streamed result." },
    { t: "h3", text: "Python (illustrative)" },
    { t: "code", lang: "typescript", title: "Python drop-in (illustrative)", code: "# The neurax SDK mirrors the openai client surface.\nfrom neurax.openai import OpenAI\n\nclient = OpenAI()  # PYRAX wallet-bound, escrow-capped key\n\nres = client.chat.completions.create(\n    model=\"neurax-coder\",\n    messages=[{\"role\": \"user\", \"content\": \"Write a Solidity ERC-20.\"}],\n)\n# NEURAX-only fields (music / video) are additive extensions upstream clients ignore." },
    { t: "callout", kind: "warn", html: "The SDK call shapes above are <strong>illustrative</strong> reconstructions of the OpenAI-compatible surface. The native job/spec/route shapes (<code>RouteRequest</code>, <code>JobDispatchSpec</code>, <code>Job</code>) are the verbatim-safe contracts." }
  ]
};

const PAGE_NEURAX_ECONOMY: DocPage = {
  slug: "neurax-economy",
  title: "NEURAX — Economy & Settlement",
  blocks: [
    { t: "p", html: "NEURAX settles through the existing on-chain job market: a requester escrows PYRX, a worker runs the job, the result is verified, and the escrow releases. There is ONE canonical settlement seam — <code>ComputeMeter → ComputeReceipt → SettleHook</code> — generalized from the Phase-8.5 relay-accounting seam. No second receipt, escrow, or token is ever invented." },
    { t: "h2", text: "The job lifecycle" },
    { t: "code", lang: "bash", title: "submit → escrow → match → execute → verify → settle", code: "submit -> escrow -> match -> execute -> verify -> pay" },
    { t: "p", html: "A job moves through a strict state machine: <code>Submitted → Escrowed → Matched → Executed → Settled</code>, and may drop to <code>Refunded</code> from any pre-settlement state (no worker matched, execution failed, or verification rejected the result). <code>Settled</code> and <code>Refunded</code> are terminal." },
    { t: "h2", text: "Escrow lifecycle" },
    { t: "p", html: "When a job is submitted the requester's reward is locked in escrow. On a verified result the escrow releases to the worker; on failure or a successful dispute it refunds the requester. Two additions serve long-running and pooled jobs:" },
    { t: "list", items: [
      "<strong>Drip-release checkpoints</strong> — a long or streaming job pays incrementally as it progresses, so an abandoned job auto-refunds only the unspent remainder.",
      "<strong>Multi-party <code>release_split</code></strong> — one pooled-cohort job's escrow is divided pro-rata across the GPUs that served it (rounding dust to the last share, so the escrow is fully distributed)."
    ]},
    { t: "code", lang: "rust", title: "The Escrow trait (verbatim)", code: "/// Locks, releases, drip-releases, splits, and refunds job payments.\npub trait Escrow {\n    /// Lock `amount` from `requester` against `job`.\n    fn lock(&mut self, job: &JobId, requester: &str, amount: u128) -> crate::Result<()>;\n\n    /// Release the full escrowed amount for `job` to `worker`.\n    fn release(&mut self, job: &JobId, worker: &str) -> crate::Result<()>;\n\n    /// Refund the escrowed amount for `job` back to the original requester.\n    fn refund(&mut self, job: &JobId) -> crate::Result<()>;\n\n    /// Currently escrowed balance for `job`, if any.\n    fn balance(&self, job: &JobId) -> crate::Result<Option<u128>>;\n\n    /// Release a partial `amount` of `job`'s escrow to `worker` (a drip checkpoint),\n    /// leaving the rest escrowed for further drips or a final settle/refund.\n    fn release_drip(&mut self, job: &JobId, worker: &str, amount: u128) -> crate::Result<()>;\n\n    /// Release `job`'s full remaining escrow split across `shares` ((worker, weight))\n    /// pro-rata by weight — a pooled-cohort settlement that pays each GPU for its share.\n    fn release_split(&mut self, job: &JobId, shares: &[(String, u64)]) -> crate::Result<()>;\n}" },
    { t: "h2", text: "The 4B pool and 8 PYRX/CU" },
    { t: "p", html: "Work normalizes to a <strong>Compute Unit (CU)</strong>: 1 CU = one reference-GPU-hour. The ratified rate card is a fixed <strong>8 PYRX per CU</strong> (DAO-tunable). Metering granularity is the <strong>CU-milli</strong> (1/1000 CU) — it changes neither the rate nor the tokenomics. The program is subsidized at launch from the <strong>4,000,000,000 PYRX AI Compute pool</strong>, with a monthly budget of ≈ 70,000,000 PYRX, then transitions to revenue-funded." },
    { t: "code", lang: "rust", title: "The ratified rate (verbatim)", code: "/// PYRX base-unit decimals (18, EVM-style: 1 PYRX = 10^18 base units).\nconst PYRX_DECIMALS: u32 = 18;\n\n/// The ratified base rate: **8 PYRX per Compute Unit** (AI_COMPUTE_PROGRAM.md; DAO-tunable).\npub const PYRX_PER_CU: u128 = 8;\n\n/// Base units paid per Compute Unit = 8 PYRX × 10^18.\npub const BASE_UNITS_PER_CU: u128 = PYRX_PER_CU * 10u128.pow(PYRX_DECIMALS);\n\n/// Converts metered CU-milli to PYRX base units at the ratified fixed rate.\npub fn cu_milli_to_base_units(cu_milli: u64) -> u128 {\n    (cu_milli as u128).saturating_mul(BASE_UNITS_PER_CU) / 1000\n}" },
    { t: "p", html: "At settle, the requester-funded escrow pays the worker in full; the shared pool tops up <strong>only the metered shortfall</strong> (<code>owed − escrow</code> at 8 PYRX/CU), clamped to the remaining pool — exhaustion pays 0 and never underflows." },
    { t: "h2", text: "The per-job drawdown cap" },
    { t: "p", html: "A hard, on-chain per-job ceiling bounds the shared 4B pool's exposure to any one settlement. Combined with the requirement that only the configured <code>settle_authority</code> may draw the pool, a single forged or colluding settlement can never drain it — defense-in-depth on the fund-safety path." },
    { t: "code", lang: "rust", title: "MAX_POOL_DRAWDOWN_PER_JOB (verbatim)", code: "/// The maximum AI-compute-pool **gap-fill a single job may draw**, in base units — an on-chain\n/// per-job drawdown cap that bounds the shared 4 B-PYRX pool's exposure to any one settlement\n/// (NEURAX 9.D fund-safety, defense-in-depth on top of the `settle_authority` gate). 10,000 PYRX\n/// = 1,250 CU (~1,250 reference-GPU-hours on ONE job) — absurdly generous for a real job, yet a\n/// hard ceiling so a single forged/colluding settlement can never drain the pool. DAA/DAO-tunable;\n/// READ on-chain by `apply_escrow`, never the off-chain meter (which a requester could influence).\npub const MAX_POOL_DRAWDOWN_PER_JOB: u128 = 10_000 * 1_000_000_000_000_000_000;\n\n/// Clamp a computed pool gap-fill to the per-job drawdown cap (MAX_POOL_DRAWDOWN_PER_JOB).\npub fn clamp_pool_drawdown(pool_pay: u128) -> u128 {\n    pool_pay.min(MAX_POOL_DRAWDOWN_PER_JOB)\n}" },
    { t: "h2", text: "The ComputeReceipt" },
    { t: "p", html: "A meter accumulates a worker's metered work and snapshots a payable receipt, carrying the canonical CU-milli unit plus pool and attestation provenance — a pooled cohort settles via <code>release_split</code>, and a Tier-T enclave's output is marked <code>attested</code>." },
    { t: "code", lang: "rust", title: "ComputeReceipt (verbatim)", code: "/// A payable claim for a worker's metered compute over a period — the canonical settlement\n/// unit (CU-milli) plus pool + attestation provenance.\n#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]\npub struct ComputeReceipt {\n    /// The worker's 32-byte identity (its public relay/stream key).\n    pub worker: [u8; 32],\n    /// The settlement period this receipt covers.\n    pub period: u64,\n    /// Normalized billable compute (the rate-card unit).\n    pub cu_milli: u64,\n    /// Raw GPU device-milliseconds (metadata).\n    pub gpu_ms: u64,\n    /// Tokens generated (inference metadata).\n    pub tokens: u64,\n    /// Denoise/training steps (metadata).\n    pub steps: u64,\n    /// Set when this work was part of a pooled cohort (settled via release_split).\n    pub pool_id: Option<[u8; 32]>,\n    /// Set when produced inside a Tier-T TEE enclave (attested integrity).\n    pub attested: bool,\n}" },
    { t: "h2", text: "The verification ladder (honest)" },
    { t: "p", html: "Trustless verification of arbitrary GPU compute is an open problem, so PYRAX treats verification as a per-job-kind strategy and is honest about each rung's limits." },
    { t: "table", head: ["Rung", "What it does", "Honest limit"], rows: [
      ["Exact-hash quorum (in kernel class)", "Redundant execution: N workers must commit to the same output hash, compared ONLY within a pinned KernelClass (same weights + quant + runtime build + decode params).", "Only deterministic outputs in the same class are comparable; a legitimate cross-class difference is never a disagreement and is never auto-slashed."],
      ["Semantic / perceptual detection", "Published FAR/FRR detection across classes for non-bit-reproducible outputs (image/video/music).", "Never auto-slash on a fuzzy mismatch — advisory only."],
      ["Optimistic + bisection fraud-proof", "Optimistic-accept with a block-height challenge window; a dispute bisects to the first divergent step and re-executes just that one step to rule.", "One re-execution settles a dispute; adjudication is challenger-independent (an honest defender always wins)."],
      ["TEE attestation (Tier-T)", "The only scalable defense against substitution: a Trusted-tier accepted output must carry a valid bound attestation.", "CC-GPU supply is scarce and cloud-concentrated; sequenced behind a 2-vendor attestation spike."],
      ["ZK-ML", "Zero-knowledge proof of the forward pass.", "Feasible only for ≤ ~50M-param models + recursive aggregation; does NOT verify a 7–70B forward pass with today's proving systems."]
    ]},
    { t: "callout", kind: "warn", html: "WAN consumer <strong>training</strong> has no compute proof — it relies on stake + reputation + audit only, capped by job value." }
  ]
};


const CAT_GET_STARTED: DocCategory = {
  name: "Get Started",
  pages: [PAGE_INTRODUCTION, PAGE_GETTING_STARTED, PAGE_NETWORKS],
};

const CAT_CONCEPTS: DocCategory = {
  name: "Concepts",
  pages: [PAGE_ACCOUNTS, PAGE_TRANSACTIONS, PAGE_GAS_AND_FEES, PAGE_CONSENSUS],
};

const CAT_VMS: DocCategory = {
  name: "Virtual Machines",
  pages: [
    PAGE_VMS_OVERVIEW,
    PAGE_EVM,
    PAGE_WASM_OVERVIEW,
    PAGE_WASM_RUST,
    PAGE_WASM_ASSEMBLYSCRIPT,
    PAGE_WASM_TINYGO,
    PAGE_CAIRO,
  ],
};

const CAT_GUIDES: DocCategory = {
  name: "Guides",
  pages: [
    PAGE_CONNECT_TOOLING,
    PAGE_DEPLOY_AND_CALL,
    PAGE_EVENTS_AND_LOGS,
    PAGE_CROSS_VM_CALLS,
    PAGE_CREATE2,
    PAGE_LOCAL_DEV_AND_TESTING,
  ],
};

const CAT_REFERENCE: DocCategory = {
  name: "Reference",
  pages: [
    PAGE_JSON_RPC,
    PAGE_PRECOMPILES,
    PAGE_WASM_HOST_ABI,
    PAGE_RUST_SDK,
    PAGE_CAIRO_SYSCALLS,
    PAGE_BRIDGE,
    PAGE_GAS_AND_LIMITS,
    PAGE_ERRORS_AND_GLOSSARY,
  ],
};

const CAT_NEURAX: DocCategory = {
  name: "Build with NEURAX",
  pages: [
    PAGE_NEURAX_OVERVIEW,
    PAGE_NEURAX_MODELS,
    PAGE_NEURAX_ROUTE_CLI,
    PAGE_NEURAX_GATEWAY,
    PAGE_NEURAX_ECONOMY,
  ],
};

export const DOCS: DocCategory[] = [
  CAT_GET_STARTED,
  CAT_CONCEPTS,
  CAT_VMS,
  CAT_GUIDES,
  CAT_REFERENCE,
  CAT_NEURAX,
];

