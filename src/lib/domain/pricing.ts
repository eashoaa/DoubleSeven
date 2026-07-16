import { TIER_MULTIPLIER, type Tier } from "@/types/domain";

/**
 * The single canonical pricing function: the prototype had three
 * divergent paths (seed's tier multiplier, the masterlist's raw override,
 * and `assignNewClient`'s tier-blind average) that could produce three
 * different prices for the same section+tier. This always applies the tier
 * multiplier; `priceMinCents`/`priceMaxCents` are a soft suggestion for the
 * new-lot-assignment form, not a hard default staff can't override.
 */
export function suggestedLotPriceCents(
  section: { priceMinCents: number; priceMaxCents: number },
  tier: Tier
): number {
  const midpoint = (section.priceMinCents + section.priceMaxCents) / 2;
  return Math.round(midpoint * TIER_MULTIPLIER[tier]);
}
