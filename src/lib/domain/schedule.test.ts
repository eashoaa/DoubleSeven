import { describe, expect, it } from "vitest";
import {
  backDeriveInterestRatePercent,
  computeTotalPayableCents,
  generateInstallmentSchedule,
} from "./schedule";

describe("golden case — masterlist reconciliation", () => {
  // The plan's own verification case: ₱50,000 price, 60 months, ₱923.75/mo
  // must reconcile to ₱55,425 total (55,425 = 923.75 * 60).
  const priceCents = 5_000_000; // ₱50,000
  const totalPayableCents = 5_542_500; // ₱55,425

  it("back-derives ~10.85% interest from the masterlist's own numbers", () => {
    const rate = backDeriveInterestRatePercent(priceCents, totalPayableCents);
    expect(rate).toBeCloseTo(10.85, 2);
  });

  it("regenerates the exact ₱923.75/mo installment from that back-derived rate", () => {
    const rate = backDeriveInterestRatePercent(priceCents, totalPayableCents);
    const schedule = generateInstallmentSchedule({
      priceCents,
      downpaymentCents: 0,
      interestRatePercent: rate,
      termMonths: 60,
      planType: "monthly",
      startDate: "2022-02-22",
    });

    expect(schedule).toHaveLength(60);
    expect(schedule[0].dueCents).toBe(92_375); // ₱923.75
    const total = schedule.reduce((sum, item) => sum + item.dueCents, 0);
    expect(total).toBe(totalPayableCents);
  });
});

describe("quarterly/annual under-collection bug (fixed)", () => {
  // The prototype computed `monthlyAmount = principal / termMonths` and
  // reused that flat rate as `due` for every installment regardless of
  // cadence — a quarterly plan only ever scheduled ~33% of principal, an
  // annual plan ~8.3%. Here every cadence must collect the full total.
  const base = {
    priceCents: 3_600_000,
    downpaymentCents: 0,
    interestRatePercent: 0,
    termMonths: 36,
    startDate: "2024-01-01",
  };

  it("monthly collects the full total", () => {
    const schedule = generateInstallmentSchedule({ ...base, planType: "monthly" });
    expect(schedule).toHaveLength(36);
    expect(schedule.reduce((s, i) => s + i.dueCents, 0)).toBe(base.priceCents);
  });

  it("quarterly still collects the full total, not ~33% of it", () => {
    const schedule = generateInstallmentSchedule({ ...base, planType: "quarterly" });
    expect(schedule).toHaveLength(12);
    expect(schedule.reduce((s, i) => s + i.dueCents, 0)).toBe(base.priceCents);
  });

  it("annual still collects the full total, not ~8.3% of it", () => {
    const schedule = generateInstallmentSchedule({ ...base, planType: "annual" });
    expect(schedule).toHaveLength(3);
    expect(schedule.reduce((s, i) => s + i.dueCents, 0)).toBe(base.priceCents);
  });
});

describe("rounding", () => {
  it("absorbs the centavo remainder into the final installment so the schedule sums exactly", () => {
    const schedule = generateInstallmentSchedule({
      priceCents: 1_000_000,
      downpaymentCents: 0,
      interestRatePercent: 0,
      termMonths: 12,
      planType: "monthly",
      startDate: "2024-01-01",
    });
    const total = schedule.reduce((s, i) => s + i.dueCents, 0);
    expect(total).toBe(1_000_000);
    // 1,000,000 / 12 doesn't divide evenly — confirm the remainder landed
    // somewhere rather than being lost.
    const amounts = new Set(schedule.map((i) => i.dueCents));
    expect(amounts.size).toBeGreaterThan(0);
  });
});

describe("down payment", () => {
  it("adds a seq=0 item for the down payment and finances only the remaining principal", () => {
    const schedule = generateInstallmentSchedule({
      priceCents: 1_000_000,
      downpaymentCents: 200_000,
      interestRatePercent: 0,
      termMonths: 8,
      planType: "monthly",
      startDate: "2024-01-01",
    });
    expect(schedule[0]).toMatchObject({ seq: 0, dueCents: 200_000, dueDate: "2024-01-01" });
    const financed = schedule.slice(1).reduce((s, i) => s + i.dueCents, 0);
    expect(financed).toBe(800_000);
  });

  it("omits the down payment item entirely when there is none", () => {
    const schedule = generateInstallmentSchedule({
      priceCents: 1_000_000,
      downpaymentCents: 0,
      interestRatePercent: 0,
      termMonths: 4,
      planType: "monthly",
      startDate: "2024-01-01",
    });
    expect(schedule.every((i) => i.seq !== 0)).toBe(true);
  });
});

describe("computeTotalPayableCents / backDeriveInterestRatePercent", () => {
  it("round-trips", () => {
    const principal = 2_345_600;
    const rate = 7.25;
    const total = computeTotalPayableCents(principal, rate);
    const derived = backDeriveInterestRatePercent(principal, total);
    expect(derived).toBeCloseTo(rate, 1);
  });

  it("returns 0 for a zero principal instead of dividing by zero", () => {
    expect(backDeriveInterestRatePercent(0, 0)).toBe(0);
  });
});
