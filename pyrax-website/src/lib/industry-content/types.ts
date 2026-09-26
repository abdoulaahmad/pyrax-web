// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The rich per-business-type content shape rendered by /industries/[category]/[business]. Each of the
// 100 business types provides one IndustryContent object; category files export a Record keyed by the
// business slug. Financial figures should be the most recent available with the source year noted.

export interface MarketStat { label: string; value: string }
export interface PyraxSolution { feature: string; how: string } // a PYRAX network element → how it applies
export interface DappIdea { name: string; desc: string; tags?: string[] } // buildathon-ready dApp idea

export interface IndustryContent {
  overview: string;            // 2–3 sentences: the sector + why PYRAX fits
  marketSize: string;          // current size, e.g. "$3.1T (2024)"
  projection: string;          // forward projection, e.g. "$5.4T by 2030 · ~9.8% CAGR"
  source: string;             // attribution + year, e.g. "Grand View Research, 2024"
  stats: MarketStat[];         // 3–4 headline market figures
  painPoints: string[];        // 3–4 problems the sector faces that PYRAX addresses
  solutions: PyraxSolution[];  // 4–6 PYRAX capabilities mapped to concrete uses
  dapps: DappIdea[];           // 5–10 buildathon dApp ideas
}

export type CategoryContent = Record<string, IndustryContent>; // keyed by business slug

