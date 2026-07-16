import { describe, expect, it } from "vitest";
import { suggestedLotPriceCents } from "./pricing";

describe("suggestedLotPriceCents", () => {
  const section = { priceMinCents: 4_500_000, priceMaxCents: 9_600_000 };
  const midpoint = (section.priceMinCents + section.priceMaxCents) / 2;

  it("applies the tier multiplier: the prototype's assignNewClient ignored tier entirely", () => {
    expect(suggestedLotPriceCents(section, "regular")).toBe(Math.round(midpoint * 1.0));
    expect(suggestedLotPriceCents(section, "premium")).toBe(Math.round(midpoint * 1.15));
    expect(suggestedLotPriceCents(section, "prime")).toBe(Math.round(midpoint * 1.35));
  });

  it("prime is strictly more than premium is strictly more than regular", () => {
    const regular = suggestedLotPriceCents(section, "regular");
    const premium = suggestedLotPriceCents(section, "premium");
    const prime = suggestedLotPriceCents(section, "prime");
    expect(prime).toBeGreaterThan(premium);
    expect(premium).toBeGreaterThan(regular);
  });
});
