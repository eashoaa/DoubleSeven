export interface TrendPoint {
  key: string;
  label: string;
  totalCents: number;
}

export interface TrendableRow {
  paidAt: string;
  netCents: number;
  voided: boolean;
}

/** Collected total per month for the trailing 12 months. Shared by /collections and /reports. */
export function monthlyTrend(rows: TrendableRow[]): TrendPoint[] {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      totalCents: 0,
    };
  });
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const r of rows) {
    if (r.voided) continue;
    const bucket = byKey.get(r.paidAt.slice(0, 7));
    if (bucket) bucket.totalCents += r.netCents;
  }
  return months;
}
