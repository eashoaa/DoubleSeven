"use server";

import { generateAllLots, SECTION_DEFINITIONS } from "../../../scripts/seed/lot-geometry";
import { suggestedLotPriceCents } from "@/lib/domain/pricing";
import { getMergedLotStatusById } from "@/lib/domain/dev-masterlist";
import { SECTION_LABEL, type SectionCode } from "@/types/domain";

export interface AvailableLot {
  displayId: string;
  section: SectionCode;
  sectionLabel: string;
  tier: string;
  suggestedPriceCents: number;
}

export async function getAvailableLotsAction(): Promise<AvailableLot[]> {
  const lotStatusById = await getMergedLotStatusById();
  const sectionByCode = new Map(SECTION_DEFINITIONS.map((s) => [s.code, s]));

  return generateAllLots()
    .filter((lot) => !lotStatusById.has(lot.displayId))
    .map((lot) => {
      const section = sectionByCode.get(lot.section)!;
      return {
        displayId: lot.displayId,
        section: lot.section,
        sectionLabel: SECTION_LABEL[lot.section] ?? lot.section,
        tier: lot.tier,
        suggestedPriceCents: suggestedLotPriceCents(
          { priceMinCents: section.priceMinCents, priceMaxCents: section.priceMaxCents },
          lot.tier
        ),
      };
    })
    .sort((a, b) => a.displayId.localeCompare(b.displayId));
}
