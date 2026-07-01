// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Aggregates the 10 per-category content files into one lookup keyed by "<category>/<business>".
// Resilient by design: a business type without content yet returns null and the detail page renders a
// graceful "detailed brief in progress" state instead of 404ing.
import type { IndustryContent } from "./types";
import { content as financeBanking } from "./finance-banking";
import { content as supplyChainLogistics } from "./supply-chain-logistics";
import { content as healthcareLifeSciences } from "./healthcare-life-sciences";
import { content as gamingEntertainment } from "./gaming-entertainment";
import { content as realEstateProperty } from "./real-estate-property";
import { content as energySustainability } from "./energy-sustainability";
import { content as governmentPublicSector } from "./government-public-sector";
import { content as retailCommerce } from "./retail-commerce";
import { content as mediaArtCreator } from "./media-art-creator";
import { content as aiDataCompute } from "./ai-data-compute";

const BY_CATEGORY: Record<string, Record<string, IndustryContent>> = {
  "finance-banking": financeBanking,
  "supply-chain-logistics": supplyChainLogistics,
  "healthcare-life-sciences": healthcareLifeSciences,
  "gaming-entertainment": gamingEntertainment,
  "real-estate-property": realEstateProperty,
  "energy-sustainability": energySustainability,
  "government-public-sector": governmentPublicSector,
  "retail-commerce": retailCommerce,
  "media-art-creator": mediaArtCreator,
  "ai-data-compute": aiDataCompute,
};

export function contentFor(category: string, business: string): IndustryContent | null {
  return BY_CATEGORY[category]?.[business] ?? null;
}
export type { IndustryContent };
