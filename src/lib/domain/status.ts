import type { LotStatus } from "@/types/domain";

export interface StatusTransaction {
  type: string;
  grossCents: number;
  discountCents: number;
  voided: boolean;
}

export interface StatusInstallment {
  seq: number;
  dueDate: string;
  dueCents: number;
}

/**
 * Net amount applied to the lot's price. interment/maintenance fees are
 * separate line items, not part of the lot payoff; refunds subtract. Mirror
 * of the SQL sum in recompute_contract_status() (supabase/migrations
 * 20260714000006) — keep the two in sync.
 */
export function netPaidCents(transactions: StatusTransaction[]): number {
  let total = 0;
  for (const t of transactions) {
    if (t.voided) continue;
    if (t.type === "refund") total -= t.grossCents - t.discountCents;
    else if (t.type === "interment" || t.type === "maintenance") continue;
    else total += t.grossCents - t.discountCents;
  }
  return total;
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * The earliest installment whose cumulative due exceeds what's been paid —
 * the first installment not yet fully covered. Returns null once payments
 * cover every scheduled installment.
 */
export function findNextUnpaidInstallment(
  installments: StatusInstallment[],
  paidCents: number
): StatusInstallment | null {
  const sorted = [...installments].sort((a, b) => a.seq - b.seq);
  let cumulative = 0;
  for (const inst of sorted) {
    cumulative += inst.dueCents;
    if (cumulative > paidCents) return inst;
  }
  return null;
}

/**
 * Days overdue on the next unpaid installment, or null if there is none (all
 * installments are covered, or there simply are none). Used by both status
 * derivation and aging reports so the two always agree on "how overdue" a
 * contract is — the prototype's aging table bucketed off the last *payment*
 * date while its status used a different day-count entirely, so a client
 * could show one urgency in the aging report and a different one on the map.
 */
export function daysOverdueOnNextUnpaidInstallment(
  installments: StatusInstallment[],
  paidCents: number,
  today: Date = new Date()
): number | null {
  const next = findNextUnpaidInstallment(installments, paidCents);
  if (!next) return null;
  const dueDate = new Date(`${next.dueDate}T00:00:00Z`);
  const days = Math.floor((startOfDay(today).getTime() - dueDate.getTime()) / 86_400_000);
  return days;
}

/**
 * Due-date based delinquency (decision #8), replacing the prototype's "days
 * since last payment" heuristic (recomputeStatus, cemetery_dashboard.jsx
 * ~line 379). Thresholds (60/180 days overdue) intentionally match the
 * prototype's cutoffs — only the reference date changes, from "last
 * payment" to "next unpaid due date". Mirror of the SQL function
 * recompute_contract_status(); keep the two in sync.
 */
export function deriveLotStatus(input: {
  priceCents: number;
  transactions: StatusTransaction[];
  installments: StatusInstallment[];
  today?: Date;
}): LotStatus {
  const today = input.today ?? new Date();
  const paidCents = netPaidCents(input.transactions);

  if (input.priceCents > 0 && paidCents >= input.priceCents) return "paid";
  if (paidCents <= 0) return "reserved";

  const overdueDays = daysOverdueOnNextUnpaidInstallment(input.installments, paidCents, today);

  if (overdueDays === null || overdueDays <= 0) return "active";
  if (overdueDays > 180) return "defaulted";
  if (overdueDays > 60) return "delinquent";
  return "active";
}
