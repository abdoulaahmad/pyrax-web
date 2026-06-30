// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Genesis block — the chain's block 0 and its full allocation. Shows the genesis
// header (read live from the selected network) plus the ratified genesis allocation
// that funds the chain at height 0. The dev/test networks all share ONE
// mainnet-faithful allocation (keyless protocol pools + documented operational
// accounts); each account's live balance is read back so you can verify it on-chain.

import { mountShell } from "../lib/shell.js";
import { subscribe, getSelectedNetwork } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";
import * as rpc from "../lib/rpc.js";
import { pageHead, card, kv, loading, errorPanel, offlinePanel, addrLink, copyable, mono, badge, wireCopy } from "../lib/widgets.js";
import { commas, fullTime, hexToInt, toPyrx } from "../lib/format.js";

const main = mountShell("genesis");
let chainId = getSelectedNetwork().chainId;

// The uniform dev/test genesis (mirrors the chainspec). Keyless protocol pools +
// documented operational accounts (public Hardhat/Anvil dev keys — TEST/DEV ONLY,
// never mainnet). `amount` is whole PYRX. Mainnet's allocation is governance-defined
// and intentionally NOT listed here.
type Alloc = { label: string; address: string; amount: string; note: string; tone?: string };
const GENESIS_ALLOC: Alloc[] = [
  { label: "AI-compute pool", address: "0x0000000000000000000000000000000000000203", amount: "4000000000", note: "Pays NEURAX compute (escrow-settled)", tone: "violet" },
  { label: "DAO treasury", address: "0x0000000000000000000000000000000000000201", amount: "1000000000", note: "Governance reserve" },
  { label: "Protocol treasury", address: "0x0000000000000000000000000000000000000200", amount: "1000000000", note: "Fee-funded on mainnet; seeded on dev" },
  { label: "Faucet pool", address: "0x0000000000000000000000000000000000000202", amount: "1000000000", note: "Test-token reserve" },
  { label: "Marketing", address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", amount: "1000000000", note: "On-chain notifications / event relayer", tone: "brand" },
  { label: "Faucet operator", address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", amount: "1000000000", note: "Public faucet dispensing wallet", tone: "brand" },
  { label: "Dev / team", address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", amount: "1000000000", note: "General team testing" },
];
// Networks that carry the uniform dev/test allocation above (NOT the Pyrax One Network 563821).
const DEV_TEST_CHAINS = new Set([881109, 710823, 104928]);

function frame(): void {
  main.innerHTML = `
    ${pageHead("Genesis block", "Block 0 — the immutable base of the chain and the allocation that funds it at launch.")}
    <div data-gen-block>${loading("Reading the genesis block…")}</div>
    <div data-gen-alloc></div>`;
}

function headerCard(b: rpc.RpcBlock): string {
  const diff = (b as unknown as { difficulty?: string }).difficulty;
  const stateRoot = (b as unknown as { stateRoot?: string }).stateRoot;
  return card(`
    <div class="expl-card-head"><h2>Genesis header</h2>${badge("BLOCK 0", "positive")}</div>
    ${kv("Block", "#0")}
    ${kv("Hash", copyable(b.hash))}
    ${kv("Parent", mono(b.parentHash))}
    ${stateRoot ? kv("State root", copyable(stateRoot)) : ""}
    ${kv("Timestamp", b.timestamp ? fullTime(hexToInt(b.timestamp)) : "—")}
    ${kv("Gas limit", commas(hexToInt(b.gasLimit)))}
    ${diff ? kv("Difficulty", commas(hexToInt(diff))) : ""}
    ${kv("Size", commas(hexToInt(b.size)) + " bytes")}
  `);
}

async function allocCard(net: rpc.Net): Promise<string> {
  if (!DEV_TEST_CHAINS.has(net.chainId)) {
    return card(`<div class="expl-card-head"><h2>Genesis allocation</h2></div>
      <div class="expl-empty">This network's genesis allocation is governance-defined and finalized separately.</div>`);
  }
  // Read each account's live balance so the on-chain state can be verified.
  const live = await Promise.all(
    GENESIS_ALLOC.map((a) => rpc.getBalance(a.address, "latest").then((h) => toPyrx(h, 4)).catch(() => "—")),
  );
  const rows = GENESIS_ALLOC.map((a, i) => `
    <div class="expl-row">
      <div class="expl-row-main">
        <div class="expl-row-top">${a.label}${a.tone ? " " + badge(a.tone === "brand" ? "operational" : "pool", a.tone) : ""}</div>
        <div class="expl-row-sub">${addrLink(a.address)} · ${a.note}</div>
      </div>
      <div style="text-align:right">
        <div class="expl-row-chip">${commas(Number(a.amount))} PYRX</div>
        <div class="expl-row-age">now: ${live[i]} PYRX</div>
      </div>
    </div>`).join("");
  return card(`
    <div class="expl-card-head"><h2>Genesis allocation</h2>${badge("MAINNET-FAITHFUL", "positive")}</div>
    <p class="expl-card-note">Keyless protocol pools + operational accounts funded at height 0. The dev/test networks share this one allocation; the live balance is read from the chain so you can verify it.</p>
    ${rows}`);
}

async function load(): Promise<void> {
  const net = getSelectedNetwork();
  const blockEl = main.querySelector("[data-gen-block]");
  const allocEl = main.querySelector("[data-gen-alloc]");
  if (!net.rpc) {
    if (blockEl) blockEl.innerHTML = offlinePanel(net.name);
    if (allocEl) allocEl.innerHTML = "";
    return;
  }
  try {
    const b = await rpc.getBlockByNumber(0, false);
    if (!b) throw new Error("genesis block not found");
    if (blockEl) blockEl.innerHTML = headerCard(b);
    if (allocEl) allocEl.innerHTML = await allocCard(net);
    wireCopy(main);
  } catch (e) {
    if (blockEl) blockEl.innerHTML = errorPanel((e as Error)?.message ?? "Failed to read the genesis block.");
    if (allocEl) allocEl.innerHTML = "";
  }
}

frame();
void load();

subscribe((s: NetSnapshot) => {
  if (s.selected.chainId !== chainId) {
    chainId = s.selected.chainId;
    frame();
    void load();
  }
});
