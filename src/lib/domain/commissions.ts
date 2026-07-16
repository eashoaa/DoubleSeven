export function calculateCommissionCents(
  netAmountCents: number,
  ratePercent: number
): number {
  return Math.round((netAmountCents * ratePercent) / 100);
}

export interface UnpaidCommission {
  id: string;
  amountCents: number;
  /** ISO date the underlying transaction was recorded. */
  transactionDate: string;
}

export interface PayoutAllocation {
  settledIds: string[];
  leftoverCents: number;
}

/**
 * Allocates a payout amount against a set of unpaid commission_ledger rows,
 * oldest transaction first. Fixes two prototype bugs (recordPayout,
 * cemetery_dashboard.jsx ~3779-3807): it iterated `Object.entries(lots)`
 * (lot-insertion order: not chronological, so payouts didn't necessarily
 * settle the oldest commissions first), and any leftover amount that didn't
 * evenly divide across commissions was just dropped with no record. Here
 * the leftover is returned explicitly so the caller can store/report it
 * instead of silently losing it.
 */
export function allocatePayout(
  payoutCents: number,
  unpaidCommissions: UnpaidCommission[]
): PayoutAllocation {
  const sorted = [...unpaidCommissions].sort((a, b) =>
    a.transactionDate.localeCompare(b.transactionDate)
  );

  let remaining = payoutCents;
  const settledIds: string[] = [];

  for (const commission of sorted) {
    if (remaining < commission.amountCents) break;
    settledIds.push(commission.id);
    remaining -= commission.amountCents;
  }

  return { settledIds, leftoverCents: remaining };
}
