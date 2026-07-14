export type PlanType = "monthly" | "quarterly" | "annual";

const MONTHS_PER_INSTALLMENT: Record<PlanType, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

export interface ScheduleInput {
  priceCents: number;
  downpaymentCents: number;
  /** Percent flat markup over the financed principal, e.g. 10.85 = 10.85%. */
  interestRatePercent: number;
  termMonths: number;
  planType: PlanType;
  /** ISO date (YYYY-MM-DD) the contract starts. */
  startDate: string;
}

export interface ScheduleItem {
  /** 0 = down payment, 1..n = installments. */
  seq: number;
  dueDate: string;
  dueCents: number;
}

/**
 * Total amount actually payable once interest/markup is applied — decision
 * #9 (model interest/markup explicitly so contract totals reconcile with
 * the masterlist). A flat markup over the financed principal, not compound
 * monthly interest: the masterlist's own numbers back-derive cleanly this
 * way (see backDeriveInterestRatePercent below).
 */
export function computeTotalPayableCents(
  principalCents: number,
  interestRatePercent: number
): number {
  return Math.round(principalCents * (1 + interestRatePercent / 100));
}

/**
 * Inverse of computeTotalPayableCents — used by the masterlist migration to
 * back-derive each real contract's interest rate from `ma * tm` vs `p`,
 * since the source data has no explicit rate field.
 */
export function backDeriveInterestRatePercent(
  principalCents: number,
  totalPayableCents: number
): number {
  if (principalCents <= 0) return 0;
  return ((totalPayableCents - principalCents) / principalCents) * 100;
}

function addMonthsUTC(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * Generates the real due-date installment schedule. Fixes the prototype's
 * quarterly/annual under-collection bug (cemetery_dashboard.jsx ~4446-4485):
 * it computed `monthlyAmount = principal / termMonths` and reused that flat
 * monthly rate as the `due` amount for every installment regardless of
 * cadence, so a quarterly plan only ever scheduled ~33% of principal and an
 * annual plan ~8.3%. Here `due` is always `totalPayable / installmentsCount`
 * for whatever cadence is chosen, with the last installment absorbing any
 * centavo-rounding remainder so the schedule sums to the centavo.
 */
export function generateInstallmentSchedule(input: ScheduleInput): ScheduleItem[] {
  const principal = input.priceCents - input.downpaymentCents;
  const totalPayable = computeTotalPayableCents(principal, input.interestRatePercent);
  const monthsPerInstallment = MONTHS_PER_INSTALLMENT[input.planType];
  const installmentsCount = Math.max(1, Math.ceil(input.termMonths / monthsPerInstallment));

  const base = Math.floor(totalPayable / installmentsCount);
  const remainder = totalPayable - base * installmentsCount;

  const items: ScheduleItem[] = [];

  if (input.downpaymentCents > 0) {
    items.push({ seq: 0, dueDate: input.startDate, dueCents: input.downpaymentCents });
  }

  for (let i = 1; i <= installmentsCount; i++) {
    const dueCents = i === installmentsCount ? base + remainder : base;
    items.push({
      seq: i,
      dueDate: addMonthsUTC(input.startDate, i * monthsPerInstallment),
      dueCents,
    });
  }

  return items;
}
