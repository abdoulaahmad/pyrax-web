// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Shared tokenomics DATA strings (allocation names/notes, fee-split labels, emissions/staking/
// governance/compute copy) rendered on the Token page and the pitch deck. Kept here so the same
// figures translate everywhere. Figures and tokens (PYRX, %, ×) stay; translators localize the words.
export const tokData = {
  // ALLOCATIONS — label + note, in array order
  alloc0Label: "Public distribution",
  alloc0Note: "Genesis event — sold + 25% utility bonus",
  alloc1Label: "Mining emissions",
  alloc1Note: "Minted to coinbase over ~26 yr; the only inflation",
  alloc2Label: "Ecosystem & developer grants",
  alloc2Note: "Funds ecosystem development, developer grants, bug bounties & liquidity",
  alloc3Label: "AI-Compute pool",
  alloc3Note: "Streamed over 48 months; funds compute payouts",
  alloc4Label: "Team & advisors",
  alloc4Note: "12-month cliff, then 36-month linear",
  alloc5Label: "DAO treasury & reserve",
  alloc5Note: "10% liquid at TGE; accrues fee share ongoing",
  // GENESIS
  genesisSold: "20B PYRX @ $0.0025 = $50,000,000",
  genesisBonus: "25% utility bonus (5B PYRX) — network access / compute credits, never a return",
  genesisReceived: "25B PYRX to genesis participants (the full public pool)",
  // EMISSIONS
  emInitialSubsidy: "300 PYRX / block",
  emHalving: "every 21,000,000 blocks (~4 years)",
  emCap: "12.5B mined, then fees only",
  emToCap: "~26 years to the cap · ~80% in the first ~8 years",
  emSplit: "Emergent one-third per stream (each stream mines ≈⅓ of blocks)",
  // FEES — labels are looked up by the English text (unique set)
  feeBurned: "Burned",
  feePyraxTreasury: "PYRAX treasury",
  feeDao: "DAO",
  feeBlockProducer: "Block producer",
  feeShielded: "Flat shielded fee (100 Ash) is burned per shielded transfer",
  feeGasLimit: "30,000,000 block gas · base fee moves ±12.5%/block · gas priced in Cinders (1 Cinder = 10⁹ Ash)",
  // STAKING
  stakeMinStake: "32 PYRX",
  stakeUnbonding: "~7 days",
  stakeSlash: "5% equivocation slash + 10% reporter bounty",
  stakeEarns: "Stream-C emission share · 70% producer tip · staking rewards",
  // GOVERNANCE
  govParam0: "block_gas_limit (≤ 64×)",
  govParam1: "min_validator_stake (≤ 1024×)",
  govParam2: "unbonding_period (≤ 64×)",
  govDeposit: "1,000 PYRX (burned if quorum fails, else refunded)",
  govQuorum: "≥ 1/3 of bonded stake",
  govPass: "> 2/3 of voting stake",
  govFrozen: "Fee split, the 12.5B emission cap + halving, and the governance rules themselves — frozen forever",
  // COMPUTE
  computePerCu: "8 PYRX / CU",
  computeCu: "1 CU = 1 reference-GPU-hour (RTX-4090-class)",
  computePoolBudget: "~70M PYRX / month (4B ÷ ~57 months)",
  computeDrawdownCap: "10,000 PYRX per job (1,250 CU)",
  computeUsd: "≈ $0.02 / GPU-hour at the genesis price",
  computeTransition: "Bootstrap from the 4B pool → revenue-funded as coverage rises → unspent returns to the DAO",
  burnBody: "Every EIP-1559 transaction permanently burns 25% of its base fee, while every private transaction burns a flat 100 Ash anti-DoS fee directly from the circulating supply.",
};
