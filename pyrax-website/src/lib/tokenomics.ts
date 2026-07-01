// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Code-verified tokenomics — the single source for the /token page and the investor pitch deck.
// Every figure here is lifted from the v4 technical whitepaper (§14 Economics, §15 Governance,
// §16 The Four Networks). Do not fabricate or round away from these; they are consensus-frozen.

export const TOKEN = {
  name: "PYRAX",
  ticker: "PYRX",
  decimals: 18,
  baseUnit: "ash", // 1 PYRX = 10^18 ash; EVM wei ↔ base unit is 1:1
  maxSupply: 50_000_000_000, // hard cap enforced in consensus (assert_genesis_supply)
  composition: "37.5B premine + 12.5B mined = 50B",
  genesisPrice: 0.0025, // USD / PYRX
  fdvAtGenesis: 125_000_000, // ~$125M fully diluted
  initialCirculating: "≈ 27.1B (~54%)",
};

// Genesis distribution (the premine), % of the 50B hard cap.
export const ALLOCATIONS: { label: string; amount: number; pct: number; color: string; note: string }[] = [
  { label: "Public distribution", amount: 25_000_000_000, pct: 50, color: "#f58722", note: "Genesis event — sold + 25% utility bonus" },
  { label: "Mining emissions", amount: 12_500_000_000, pct: 25, color: "#60b8cc", note: "Minted to coinbase over ~26 yr; the only inflation" },
  { label: "Ecosystem & liquidity", amount: 5_000_000_000, pct: 10, color: "#34d399", note: "40% at TGE + 60% linear over 24 months" },
  { label: "AI-Compute pool", amount: 4_000_000_000, pct: 8, color: "#7c5cff", note: "Streamed over 48 months; funds NEURAX payouts" },
  { label: "Team & advisors", amount: 2_500_000_000, pct: 5, color: "#f5a623", note: "12-month cliff, then 36-month linear" },
  { label: "DAO treasury & reserve", amount: 1_000_000_000, pct: 2, color: "#fcd03d", note: "10% liquid at TGE; accrues fee share ongoing" },
];

export const GENESIS = {
  sold: "20B PYRX @ $0.0025 = $50,000,000",
  bonus: "25% utility bonus (5B PYRX) — network access / compute credits, never a return",
  received: "25B PYRX to genesis participants (the full public pool)",
};

export const EMISSIONS = {
  initialSubsidy: "300 PYRX / block",
  halving: "every 21,000,000 blocks (~4 years)",
  cap: "12.5B mined, then fees only",
  toCap: "~26 years to the cap · ~80% in the first ~8 years",
  split: "Emergent one-third per stream (each stream mines ≈⅓ of blocks)",
};

// EIP-1559 fee market — the split is consensus-frozen (no governance vote can change it).
export const FEES = {
  baseFee: [
    { label: "Burned", pct: 25, color: "#fb6f73" },
    { label: "PYRAX treasury", pct: 50, color: "#f58722" },
    { label: "DAO", pct: 25, color: "#fcd03d" },
  ],
  tip: [
    { label: "Block producer", pct: 70, color: "#f58722" },
    { label: "PYRAX treasury", pct: 20, color: "#60b8cc" },
    { label: "DAO", pct: 10, color: "#fcd03d" },
  ],
  shielded: "Flat shielded fee (100 base units) is burned per shielded transfer",
  gasLimit: "30,000,000 block gas · base fee moves ±12.5%/block",
};

export const STAKING = {
  minStake: "32 PYRX",
  unbonding: "~7 days",
  slash: "5% equivocation slash + 10% reporter bounty",
  earns: "Stream-C emission share · 70% producer tip · staking rewards",
};

export const GOVERNANCE = {
  governable: ["block_gas_limit (≤ 64×)", "min_validator_stake (≤ 1024×)", "unbonding_period (≤ 64×)"],
  deposit: "1,000 PYRX (burned if quorum fails, else refunded)",
  quorum: "≥ 1/3 of bonded stake",
  pass: "> 2/3 of voting stake",
  frozen: "Fee split, the 12.5B emission cap + halving, and the governance rules themselves — frozen forever",
};

export const COMPUTE = {
  perCu: "8 PYRX / CU",
  cu: "1 CU = 1 reference-GPU-hour (RTX-4090-class)",
  poolBudget: "~70M PYRX / month (4B ÷ ~57 months)",
  drawdownCap: "10,000 PYRX per job (1,250 CU)",
  usd: "≈ $0.02 / GPU-hour at the genesis price",
  transition: "Bootstrap from the 4B pool → revenue-funded as coverage rises → unspent returns to the DAO",
};

export const fmt = (n: number): string => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + "M";
  return n.toLocaleString();
};
