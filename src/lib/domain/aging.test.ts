import { describe, expect, it } from "vitest";
import { agingBucketForDays, buildAgingReport, summarizeAgingBuckets, type AgingContract } from "./aging";

describe("agingBucketForDays", () => {
  it.each([
    [0, "current"],
    [30, "current"],
    [31, "31-60"],
    [60, "31-60"],
    [61, "61-90"],
    [90, "61-90"],
    [91, "91-180"],
    [180, "91-180"],
    [181, "over180"],
  ] as const)("%i days -> %s", (days, bucket) => {
    expect(agingBucketForDays(days)).toBe(bucket);
  });
});

describe("buildAgingReport", () => {
  const today = new Date("2026-07-14T00:00:00Z");

  it("excludes contracts with no outstanding balance", () => {
    const contracts: AgingContract[] = [
      {
        id: "c1",
        clientId: "cl1",
        priceCents: 100_000,
        transactions: [{ type: "amortization", grossCents: 100_000, discountCents: 0, voided: false }],
        installments: [{ seq: 1, dueDate: "2020-01-01", dueCents: 100_000 }],
      },
    ];
    expect(buildAgingReport(contracts, today)).toHaveLength(0);
  });

  it("excludes contracts that are current (not overdue)", () => {
    const contracts: AgingContract[] = [
      {
        id: "c1",
        clientId: "cl1",
        priceCents: 200_000,
        transactions: [{ type: "amortization", grossCents: 100_000, discountCents: 0, voided: false }],
        installments: [
          { seq: 1, dueDate: "2026-06-01", dueCents: 100_000 },
          { seq: 2, dueDate: "2026-08-01", dueCents: 100_000 },
        ],
      },
    ];
    expect(buildAgingReport(contracts, today)).toHaveLength(0);
  });

  it("surfaces overdue balances sorted oldest-most-overdue first", () => {
    const contracts: AgingContract[] = [
      {
        id: "recent",
        clientId: "cl1",
        priceCents: 200_000,
        transactions: [{ type: "amortization", grossCents: 1, discountCents: 0, voided: false }],
        installments: [{ seq: 1, dueDate: "2026-06-01", dueCents: 100_000 }], // ~43 days overdue
      },
      {
        id: "oldest",
        clientId: "cl2",
        priceCents: 200_000,
        transactions: [{ type: "amortization", grossCents: 1, discountCents: 0, voided: false }],
        installments: [{ seq: 1, dueDate: "2025-10-01", dueCents: 100_000 }], // >180 days overdue
      },
    ];
    const rows = buildAgingReport(contracts, today);
    expect(rows.map((r) => r.contractId)).toEqual(["oldest", "recent"]);
    expect(rows[0].bucket).toBe("over180");
  });

  it("aggregates into bucket totals", () => {
    const contracts: AgingContract[] = [
      {
        id: "c1",
        clientId: "cl1",
        priceCents: 200_000,
        transactions: [{ type: "amortization", grossCents: 1, discountCents: 0, voided: false }],
        installments: [{ seq: 1, dueDate: "2025-10-01", dueCents: 100_000 }],
      },
    ];
    const rows = buildAgingReport(contracts, today);
    const summary = summarizeAgingBuckets(rows);
    expect(summary.over180).toBe(199_999); // balance = 200,000 - 1
    expect(summary.current).toBe(0);
  });
});
