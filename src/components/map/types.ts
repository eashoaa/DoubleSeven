import type { LotStatus, Tier } from "@/types/domain";

export interface MapLot {
  id: string;
  displayId: string;
  section: string;
  tier: Tier;
  status: LotStatus;
  points: [number, number][];
  clientName: string | null;
  priceCents: number;
}

export type PaintMode = "status" | "tier";
