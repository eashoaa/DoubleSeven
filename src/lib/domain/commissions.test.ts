import { describe, expect, it } from "vitest";
import { allocatePayout, calculateCommissionCents } from "./commissions";

describe("calculateCommissionCents", () => {
  it("computes a percentage of the net amount", () => {
    expect(calculateCommissionCents(100_000, 5)).toBe(5000);
  });

  it("rounds to the nearest centavo", () => {
    expect(calculateCommissionCents(33_333, 5)).toBe(1667); // 1666.65 -> 1667
  });
});

describe("allocatePayout", () => {
  it("settles oldest transactions first: the prototype iterated lot-insertion order instead", () => {
    const unpaid = [
      { id: "newest", amountCents: 1000, transactionDate: "2026-03-01" },
      { id: "oldest", amountCents: 1000, transactionDate: "2026-01-01" },
      { id: "middle", amountCents: 1000, transactionDate: "2026-02-01" },
    ];
    const result = allocatePayout(2000, unpaid);
    expect(result.settledIds).toEqual(["oldest", "middle"]);
    expect(result.leftoverCents).toBe(0);
  });

  it("reports leftover instead of silently dropping it", () => {
    const unpaid = [{ id: "a", amountCents: 1000, transactionDate: "2026-01-01" }];
    const result = allocatePayout(1500, unpaid);
    expect(result.settledIds).toEqual(["a"]);
    expect(result.leftoverCents).toBe(500);
  });

  it("does not partially settle a commission it can't fully cover", () => {
    const unpaid = [
      { id: "a", amountCents: 1000, transactionDate: "2026-01-01" },
      { id: "b", amountCents: 1000, transactionDate: "2026-02-01" },
    ];
    const result = allocatePayout(1500, unpaid);
    expect(result.settledIds).toEqual(["a"]);
    expect(result.leftoverCents).toBe(500);
  });
});
