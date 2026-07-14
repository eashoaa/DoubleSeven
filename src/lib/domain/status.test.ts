import { describe, expect, it } from "vitest";
import { deriveLotStatus, netPaidCents, type StatusInstallment, type StatusTransaction } from "./status";

function tx(overrides: Partial<StatusTransaction> = {}): StatusTransaction {
  return { type: "amortization", grossCents: 0, discountCents: 0, voided: false, ...overrides };
}

function inst(seq: number, dueDate: string, dueCents: number): StatusInstallment {
  return { seq, dueDate, dueCents };
}

describe("netPaidCents", () => {
  it("excludes voided transactions", () => {
    expect(netPaidCents([tx({ grossCents: 1000 }), tx({ grossCents: 500, voided: true })])).toBe(1000);
  });

  it("subtracts discounts", () => {
    expect(netPaidCents([tx({ grossCents: 1000, discountCents: 100 })])).toBe(900);
  });

  it("excludes interment and maintenance fees from the lot payoff", () => {
    expect(
      netPaidCents([
        tx({ grossCents: 1000 }),
        tx({ type: "interment", grossCents: 5000 }),
        tx({ type: "maintenance", grossCents: 2000 }),
      ])
    ).toBe(1000);
  });

  it("subtracts refunds", () => {
    expect(netPaidCents([tx({ grossCents: 1000 }), tx({ type: "refund", grossCents: 300 })])).toBe(700);
  });
});

describe("deriveLotStatus", () => {
  const today = new Date("2026-07-14T00:00:00Z");

  it("is reserved with zero payments, regardless of how overdue installments look", () => {
    const status = deriveLotStatus({
      priceCents: 100_000,
      transactions: [],
      installments: [inst(1, "2020-01-01", 100_000)],
      today,
    });
    expect(status).toBe("reserved");
  });

  it("is active when caught up (next unpaid installment is in the future)", () => {
    const status = deriveLotStatus({
      priceCents: 200_000,
      transactions: [tx({ grossCents: 100_000 })],
      installments: [inst(1, "2026-06-01", 100_000), inst(2, "2026-08-01", 100_000)],
      today,
    });
    expect(status).toBe("active");
  });

  it("is delinquent between 60 and 180 days overdue", () => {
    const status = deriveLotStatus({
      priceCents: 200_000,
      transactions: [tx({ grossCents: 1 })],
      installments: [inst(1, "2026-05-01", 100_000)], // ~74 days before "today"
      today,
    });
    expect(status).toBe("delinquent");
  });

  it("is defaulted past 180 days overdue", () => {
    const status = deriveLotStatus({
      priceCents: 200_000,
      transactions: [tx({ grossCents: 1 })],
      installments: [inst(1, "2025-10-01", 100_000)], // >180 days before "today"
      today,
    });
    expect(status).toBe("defaulted");
  });

  it("is paid once payments meet or exceed the price", () => {
    const status = deriveLotStatus({
      priceCents: 100_000,
      transactions: [tx({ grossCents: 100_000 })],
      installments: [inst(1, "2020-01-01", 100_000)],
      today,
    });
    expect(status).toBe("paid");
  });

  it("cancelled is a manual override the caller applies on top — this function never returns it", () => {
    // deriveLotStatus intentionally has no concept of "cancelled": that's
    // lots.status_override in the DB, layered on top of this derivation.
    const status = deriveLotStatus({
      priceCents: 100_000,
      transactions: [],
      installments: [],
      today,
    });
    expect(status).not.toBe("cancelled");
  });
});
