// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// The developer code-examples used by the in-site docs (the /build page). Every snippet is
// verbatim-from-docs or minimal-standard-and-correct (see the assessment brief). Default network in
// examples = Devnet2 (chain id 710823 = 0xad8a7). Native token PYRX (18 decimals). Brand-only NEURAX
// names. This module also renders code blocks (with copy) + language tabs.

import { esc, icon } from "./ui.js";

export type Snippet = { lang: string; title: string; code: string };

/* ----------------------------------------------------------------------------
 * A — Connect / add the network
 * -------------------------------------------------------------------------- */
export const EX_ADD_METAMASK: Snippet = {
  lang: "typescript",
  title: "Add PYRAX to MetaMask (EIP-3085)",
  code: `await window.ethereum.request({
  method: "wallet_addEthereumChain",
  params: [
    {
      chainId: "0xad8a7", // 710823 — Devnet2
      chainName: "PYRAX Devnet2",
      nativeCurrency: { name: "PYRX", symbol: "PYRX", decimals: 18 },
      rpcUrls: ["http://127.0.0.1:8545"],
    },
  ],
});`,
};

export const EX_VIEM_CLIENT: Snippet = {
  lang: "typescript",
  title: "viem — chain definition + client",
  code: `import { createPublicClient, http, defineChain } from "viem";

export const pyraxDevnet2 = defineChain({
  id: 710823,
  name: "PYRAX Devnet 2",
  nativeCurrency: { name: "PYRAX", symbol: "PYRX", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

const client = createPublicClient({ chain: pyraxDevnet2, transport: http() });

const chainId = await client.getChainId();         // 710823
const blockNumber = await client.getBlockNumber();  // bigint, the current blue score
console.log({ chainId, blockNumber });`,
};

export const EX_HARDHAT: Snippet = {
  lang: "typescript",
  title: "hardhat.config.ts",
  code: `import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    pyraxDevnet2: {
      url: "http://127.0.0.1:8545",
      chainId: 710823,
      accounts: [process.env.PYRAX_PRIVATE_KEY ?? ""],
    },
    pyraxTestnet: {
      url: "http://127.0.0.1:8545",
      chainId: 104928,
      accounts: [process.env.PYRAX_PRIVATE_KEY ?? ""],
    },
  },
};

export default config;`,
};

export const EX_FOUNDRY: Snippet = {
  lang: "toml",
  title: "foundry.toml",
  code: `[profile.default]
src = "src"
out = "out"
libs = ["lib"]

[rpc_endpoints]
pyrax_devnet2 = "http://127.0.0.1:8545"
pyrax_testnet = "http://127.0.0.1:8545"   # your testnet node's RPC URL`,
};

export const EX_BUILD_NODE: Snippet = {
  lang: "bash",
  title: "Build & run a dev node",
  code: `git clone https://github.com/pyrax-network/pyrax.git
cd pyrax
cargo build -p pyrax-node --features rpc --release

cargo run -p pyrax-node --features rpc --release -- \\
  --dev \\
  --datadir ./pyrax-data \\
  --rpc-port 8545`,
};

/* ----------------------------------------------------------------------------
 * B — Deploy an EVM (Solidity) contract
 * -------------------------------------------------------------------------- */
export const EX_COUNTER_SOL: Snippet = {
  lang: "solidity",
  title: "Counter.sol",
  code: `// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract Counter {
    uint256 public count;

    function increment() external returns (uint256) {
        count += 1;
        return count;
    }
}`,
};

export const EX_FOUNDRY_DEPLOY: Snippet = {
  lang: "bash",
  title: "Compile + deploy + call with Foundry / cast",
  code: `export RPC=http://127.0.0.1:8545
export PK=0x<your-funded-private-key>
export ME=$(cast wallet address --private-key $PK)
cast balance $ME --rpc-url $RPC

# Deploy with forge:
forge create Counter --rpc-url $RPC --private-key $PK --broadcast

# Call (state change) + read:
cast send --rpc-url $RPC --private-key $PK $COUNTER "increment()"
cast call --rpc-url $RPC $COUNTER "count()(uint256)"   # => 1`,
};

export const EX_VIEM_DEPLOY: Snippet = {
  lang: "typescript",
  title: "Deploy + call with viem",
  code: `import {
  createPublicClient, createWalletClient, http, defineChain, getContract,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";

export const pyraxDevnet2 = defineChain({
  id: 710823,
  name: "PYRAX Devnet2",
  nativeCurrency: { name: "PYRAX", symbol: "PYRX", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

const account = privateKeyToAccount("0x<your-funded-private-key>");
const publicClient = createPublicClient({ chain: pyraxDevnet2, transport: http() });
const walletClient = createWalletClient({ account, chain: pyraxDevnet2, transport: http() });

const abi = JSON.parse(readFileSync("build/Counter.abi", "utf8"));
const bytecode = "0x" + readFileSync("build/Counter.bin", "utf8").trim();

const deployHash = await walletClient.deployContract({ abi, bytecode });
const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });

const counter = getContract({
  address: receipt.contractAddress, abi,
  client: { public: publicClient, wallet: walletClient },
});
await counter.write.increment();
const value = await counter.read.count(); // 1n`,
};

export const EX_ETHERS_DEPLOY: Snippet = {
  lang: "typescript",
  title: "Send a PYRX transfer with ethers v6",
  code: `import { JsonRpcProvider, Wallet, Network, parseEther } from "ethers";

const network = Network.from({ name: "pyrax-devnet2", chainId: 710823 });
const provider = new JsonRpcProvider("http://127.0.0.1:8545", network, {
  staticNetwork: network,
});
const wallet = new Wallet(process.env.PYRAX_PRIVATE_KEY!, provider);

const tx = await wallet.sendTransaction({
  to: "0xRecipient",
  value: parseEther("1.0"), // 1 PYRX
});
const receipt = await tx.wait();`,
};

/* ----------------------------------------------------------------------------
 * C — WASM contracts (Rust / AssemblyScript / TinyGo)
 * -------------------------------------------------------------------------- */
export const EX_RUST_CONTRACT: Snippet = {
  lang: "rust",
  title: "contracts/counter/src/lib.rs",
  code: `// SPDX-License-Identifier: Apache-2.0
#![no_std]
//! A persistent on-chain counter — the canonical PYRAX WASM contract sample.
use pyrax_contract_sdk as sdk;

const SLOT0: [u8; 32] = [0u8; 32];

#[no_mangle]
pub extern "C" fn deploy() {}

#[no_mangle]
pub extern "C" fn call() {
    let mut v = sdk::storage_get(&SLOT0);
    increment_be(&mut v);
    sdk::storage_set(&SLOT0, &v);
    sdk::output(&v);
}

fn increment_be(v: &mut [u8; 32]) {
    for byte in v.iter_mut().rev() {
        match byte.checked_add(1) {
            Some(x) => { *byte = x; return; }
            None => *byte = 0, // carry into the next-more-significant byte
        }
    }
}

#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! { sdk::fail(b"panic") }`,
};

export const EX_RUST_CARGO: Snippet = {
  lang: "toml",
  title: "Cargo.toml (the release profile matters)",
  code: `[lib]
crate-type = ["cdylib"]

[dependencies]
pyrax-contract-sdk = { path = "../pyrax/contracts/pyrax-contract-sdk" }

[profile.release]
opt-level = "s"   # optimise for size
lto = true        # link-time optimisation
panic = "abort"   # wasm32 has no unwinder; panics must abort
strip = true      # strip symbols / debuginfo`,
};

export const EX_RUST_BUILD: Snippet = {
  lang: "bash",
  title: "Build the WASM module",
  code: `rustup target add wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --release
xxd -l 4 target/wasm32-unknown-unknown/release/counter.wasm   # 00 61 73 6d  (\\0asm magic)`,
};

export const EX_AS_CONTRACT: Snippet = {
  lang: "typescript",
  title: "AssemblyScript — assembly/counter.ts",
  code: `// SPDX-License-Identifier: Apache-2.0
// --- PYRAX host ABI (the "pyrax" import module; all params are i32 ptr/len) ---
// @ts-ignore: decorator
@external("pyrax", "storage_read")
declare function storage_read(keyPtr: i32, valPtr: i32): void;
// @ts-ignore: decorator
@external("pyrax", "storage_write")
declare function storage_write(keyPtr: i32, valPtr: i32): void;
// @ts-ignore: decorator
@external("pyrax", "set_output")
declare function set_output(ptr: i32, len: i32): void;

const KEY: i32 = 4096; // storage slot key (32 zero bytes => slot 0)
const VAL: i32 = 4128; // the 32-byte counter value

export function deploy(): void {}

export function call(): void {
  for (let i = 0; i < 32; i++) store<u8>(KEY + i, 0);
  storage_read(KEY, VAL);
  store<u8>(VAL + 31, <u8>(load<u8>(VAL + 31) + 1));
  storage_write(KEY, VAL);
  set_output(VAL, 32);
}`,
};

export const EX_TINYGO_CONTRACT: Snippet = {
  lang: "go",
  title: "TinyGo — counter.go  (build with tinygo, never go build)",
  code: `// SPDX-License-Identifier: Apache-2.0
package main

import "unsafe"

//go:wasmimport pyrax storage_read
func storageRead(keyPtr, valPtr int32)

//go:wasmimport pyrax storage_write
func storageWrite(keyPtr, valPtr int32)

//go:wasmimport pyrax set_output
func setOutput(ptr, length int32)

var key [32]byte
var val [32]byte

//export deploy
func deploy() {}

//export call
func call() {
	kp := int32(uintptr(unsafe.Pointer(&key[0])))
	vp := int32(uintptr(unsafe.Pointer(&val[0])))
	storageRead(kp, vp)
	val[31]++ // increment the big-endian value's low byte
	storageWrite(kp, vp)
	setOutput(vp, 32)
}

func main() {} // required by Go but unused — entry points are deploy/call`,
};

/* ----------------------------------------------------------------------------
 * D — Cairo
 * -------------------------------------------------------------------------- */
export const EX_CAIRO: Snippet = {
  lang: "cairo",
  title: "sum.cairo",
  code: `// SPDX-License-Identifier: Apache-2.0
func main() {
    let x = 2 + 3;
    assert x = 5;
    return ();
}`,
};

export const EX_CAIRO_BUILD: Snippet = {
  lang: "bash",
  title: "Compile + the Cairo deploy prefix",
  code: `cairo-compile sum.cairo --output sum.json
# Deploy bytes are prefixed with the Cairo code magic \\0CAIRO:
printf '\\0CAIRO' | cat - sum.json > sum.cairo.deploy`,
};

/* ----------------------------------------------------------------------------
 * E — JSON-RPC
 * -------------------------------------------------------------------------- */
export const EX_RPC_CHAINID: Snippet = {
  lang: "bash",
  title: "eth_chainId",
  code: `curl -s http://127.0.0.1:8545 \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
# {"jsonrpc":"2.0","id":1,"result":"0xad8a7"}`,
};

export const EX_RPC_BLOCK: Snippet = {
  lang: "bash",
  title: "pyrax_blockNumber (native)",
  code: `curl -s http://127.0.0.1:8545 \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":3,"method":"pyrax_blockNumber","params":[]}'
# {"jsonrpc":"2.0","id":3,"result":5}`,
};

/* ----------------------------------------------------------------------------
 * F — CREATE2
 * -------------------------------------------------------------------------- */
export const EX_CREATE2: Snippet = {
  lang: "typescript",
  title: "CREATE2 — off-chain address computation",
  code: `import { keccak256, concat, getBytes, hexlify } from "ethers";

function create2Address(deployer: string, salt: string, initCode: string): string {
  const codeHash = keccak256(initCode);
  const preimage = concat(["0xff", deployer, salt, codeHash]); // 85 bytes
  const digest = keccak256(preimage);
  return hexlify(getBytes(digest).slice(12)); // low 20 bytes
}
// address = keccak256(0xff ++ deployer ++ salt ++ keccak256(init_code))[12:]`,
};

/* ----------------------------------------------------------------------------
 * G — Use NEURAX
 * -------------------------------------------------------------------------- */
export const EX_NEURAX_ROUTE: Snippet = {
  lang: "bash",
  title: "Route a job from the node CLI",
  code: `pyrax-node neurax-route \\
  --request '{"gpus_gib":[12],"kind":"text","model_id":"neurax-coder","spec_hash":"0x..."}' \\
  --packs packs.json \\
  --models models.json
# -> { decision, reason, worker, members, model_id, vram_required_gb, min_tier }
# decision is one of Local(worker) / Cohort(members) / Network{reason}.`,
};

export const EX_NEURAX_GATEWAY: Snippet = {
  lang: "typescript",
  title: "OpenAI-compatible gateway (illustrative)",
  code: `// The NEURAX gateway speaks the OpenAI surface, pointed at a wallet-bound, escrow-capped key.
import { createNeuraxOpenAI } from "@neurax/openai-shim";

const client = createNeuraxOpenAI({ /* PYRAX wallet-bound, escrow-capped key */ });

const res = await client.chat.completions.create({
  model: "neurax-coder",
  messages: [{ role: "user", content: "Write a Solidity ERC-20." }],
});
// Each request -> a job market Job -> escrow -> match -> execute -> verify -> settle.`,
};

/* ----------------------------------------------------------------------------
 * Renderers
 * -------------------------------------------------------------------------- */
const langTone: Record<string, string> = {
  solidity: "var(--color-bolt)",
  typescript: "var(--color-bolt-bright)",
  rust: "var(--color-brand)",
  go: "var(--color-bolt)",
  cairo: "var(--color-violet)",
  bash: "var(--color-positive)",
  toml: "var(--color-gold)",
};

/** A single code block: a labeled bar (language + title + copy) over the escaped code. */
export function codeBlock(s: Snippet): string {
  const tone = langTone[s.lang] ?? "var(--color-muted)";
  return `
  <figure class="code-block">
    <figcaption class="code-bar">
      <span class="code-lang" style="color:${tone}">${s.lang}</span>
      <span class="code-title">${esc(s.title)}</span>
      <button type="button" class="code-copy" data-copy>${icon("check", "h-3.5 w-3.5")}<span>Copy</span></button>
    </figcaption>
    <pre><code>${esc(s.code)}</code></pre>
  </figure>`;
}

/** A tabbed multi-language group (click to switch). */
export function tabbed(tabs: { label: string; snippet: Snippet }[]): string {
  return `
  <div class="code-tabs" data-tabs>
    <div class="code-tablist" role="tablist">
      ${tabs.map((t, i) => `<button type="button" role="tab" class="code-tab ${i === 0 ? "is-active" : ""}" data-tab="${i}">${t.label}</button>`).join("")}
    </div>
    ${tabs.map((t, i) => `<div class="${i === 0 ? "" : "hidden"}" data-tabpanel="${i}">${codeBlock(t.snippet)}</div>`).join("")}
  </div>`;
}

/** Wire copy buttons + tab switching for all code on the page. */
export function wireCode(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const code = btn.closest("figure")?.querySelector("code")?.textContent ?? "";
      try {
        await navigator.clipboard.writeText(code);
        const span = btn.querySelector("span");
        if (span) {
          const orig = span.textContent;
          span.textContent = "Copied!";
          window.setTimeout(() => {
            span.textContent = orig;
          }, 1400);
        }
      } catch {
        /* clipboard unavailable — no-op */
      }
    });
  });
  document.querySelectorAll<HTMLElement>("[data-tabs]").forEach((group) => {
    const tabs = Array.from(group.querySelectorAll<HTMLButtonElement>("[data-tab]"));
    const panels = Array.from(group.querySelectorAll<HTMLElement>("[data-tabpanel]"));
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const i = tab.dataset.tab;
        tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === i));
        panels.forEach((p) => p.classList.toggle("hidden", p.dataset.tabpanel !== i));
      });
    });
  });
}
