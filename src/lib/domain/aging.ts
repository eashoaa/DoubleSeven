import {
  daysOverdueOnNextUnpaidInstallment,
  netPaidCents,
  type StatusInstallment,
  type StatusTransaction,
} from "./status";

export type AgingBucketKey = "current" | "31-60" | "61-90" | "91-180" | "over180";

export const AGING_BUCKET_LABEL: Record<AgingBucketKey, string> = {
  current: "Current (0-30 days)",
  "31-60": "31-60 days",
  "61-90": "61-90 days",
  "91-180": "91-180 days",
  over180: "Over 180 days",
};

/**
 * Standard AR aging granularity (finer than the 60/180 status cutoffs, which
 * is fine for a report — the bug being fixed is that the prototype derived
 * this from a *different* reference date than status did (last payment vs.
 * due date), not the bucket boundaries themselves. Both now go through
 * daysOverdueOnNextUnpaidInstallment.
 */
export function agingBucketForDays(days: number): AgingBucketKey {
  if (days <= 30) return "current";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  if (days <= 180) return "91-180";
  return "over180";
}

export interface AgingContract {
  id: string;
  clientId: string;
  priceCents: number;
  transactions: StatusTransaction[];
  installments: StatusInstallment[];
}

export interface AgingRow {
  contractId: string;
  clientId: string;
  balanceCents: number;
  daysOverdue: number;
  bucket: AgingBucketKey;
}

/**
 * One row per contract that still has an outstanding balance and is
 * currently overdue (daysOverdue > 0). Contracts that are paid off, or
 * current on their schedule, are excluded — mirroring the prototype's
 * "only show accounts that actually owe something" intent, but keyed off
 * the same due-date logic as status derivation.
 */
export function buildAgingReport(
  contracts: AgingContract[],
  today: Date = new Date()
): AgingRow[] {
  const rows: AgingRow[] = [];

  for (const c of contracts) {
    const paidCents = netPaidCents(c.transactions);
    const balanceCents = Math.max(0, c.priceCents - paidCents);
    if (balanceCents <= 0) continue;

    const days = daysOverdueOnNextUnpaidInstallment(c.installments, paidCents, today);
    if (days === null || days <= 0) continue;

    rows.push({
      contractId: c.id,
      clientId: c.clientId,
      balanceCents,
      daysOverdue: days,
      bucket: agingBucketForDays(days),
    });
  }

  return rows.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export function summarizeAgingBuckets(
  rows: AgingRow[]
): Record<AgingBucketKey, number> {
  const summary: Record<AgingBucketKey, number> = {
    current: 0,
    "31-60": 0,
    "61-90": 0,
    "91-180": 0,
    over180: 0,
  };
  for (const row of rows) {
    summary[row.bucket] += row.balanceCents;
  }
  return summary;
}
