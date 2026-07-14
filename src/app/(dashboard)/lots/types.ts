import type { LotStatus, SectionCode, Tier } from "@/types/domain";

export interface LotsRow {
  id: string;
  displayId: string;
  section: SectionCode;
  tier: Tier;
  status: LotStatus;
  priceCents: number;
  clientName: string | null;
}
