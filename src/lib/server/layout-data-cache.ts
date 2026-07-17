import { unstable_cache } from "next/cache";
import { buildAgingReport, type AgingContract } from "@/lib/domain/aging";
import type { NotificationPreview } from "@/components/layout/notification-bell";

/**
 * The dashboard layout runs on every single navigation, and now needs the
 * overdue list (for the bell) and two pending-item counts (for sidebar
 * badges) — real Supabase queries that were previously either absent or
 * a hardcoded []. Doing them live on every navigation is exactly the
 * "sidebar is slow" pattern already fixed once this session (see
 * current-user.ts's profile cache) — this is the same fix applied to the
 * layout's other cross-cutting data. Plain fetch + service-role key
 * (not the cookie-bound client) because unstable_cache forbids dynamic
 * APIs like cookies() inside its callback; safe here because none of this
 * is scoped to the requesting user — it's the same company-wide overdue
 * list and counts for every admin.
 */
async function restFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) return [] as T;
  return res.json();
}

interface RawContract {
  id: string;
  lot_id: string;
  client_id: string;
  price_cents: number;
  status: "delinquent" | "defaulted";
  clients: { name: string } | null;
  lots: { display_id: string } | null;
}

async function computeOverdue(): Promise<NotificationPreview[]> {
  const contracts = await restFetch<RawContract[]>(
    "contracts?select=id,lot_id,client_id,price_cents,status,clients(name),lots(display_id)&status=in.(delinquent,defaulted)&deleted_at=is.null"
  );
  if (contracts.length === 0) return [];

  const ids = contracts.map((c) => c.id).join(",");
  const [installmentRows, transactionRows] = await Promise.all([
    restFetch<{ contract_id: string; seq: number; due_date: string; due_cents: number }[]>(
      `installments?select=contract_id,seq,due_date,due_cents&contract_id=in.(${ids})`
    ),
    restFetch<{ contract_id: string | null; type: string; gross_cents: number; discount_cents: number; voided: boolean }[]>(
      `transactions?select=contract_id,type,gross_cents,discount_cents,voided&contract_id=in.(${ids})`
    ),
  ]);

  const installmentsByContract = new Map<string, AgingContract["installments"]>();
  for (const row of installmentRows) {
    if (!installmentsByContract.has(row.contract_id)) installmentsByContract.set(row.contract_id, []);
    installmentsByContract.get(row.contract_id)!.push({ seq: row.seq, dueDate: row.due_date, dueCents: row.due_cents });
  }
  const transactionsByContract = new Map<string, AgingContract["transactions"]>();
  for (const row of transactionRows) {
    if (!row.contract_id) continue;
    if (!transactionsByContract.has(row.contract_id)) transactionsByContract.set(row.contract_id, []);
    transactionsByContract.get(row.contract_id)!.push({
      type: row.type,
      grossCents: row.gross_cents,
      discountCents: row.discount_cents,
      voided: row.voided,
    });
  }

  const agingInput: AgingContract[] = contracts.map((c) => ({
    id: c.id,
    clientId: c.client_id,
    priceCents: c.price_cents,
    transactions: transactionsByContract.get(c.id) ?? [],
    installments: installmentsByContract.get(c.id) ?? [],
  }));
  const aging = buildAgingReport(agingInput);
  const agingById = new Map(aging.map((a) => [a.contractId, a]));

  const rows: NotificationPreview[] = [];
  for (const c of contracts) {
    const agingRow = agingById.get(c.id);
    if (!agingRow) continue;
    rows.push({
      id: c.id,
      clientName: c.clients?.name ?? "Unknown client",
      lotDisplayId: c.lots?.display_id ?? "-",
      overdueDays: agingRow.daysOverdue,
      priceCents: c.price_cents,
    });
  }
  return rows.sort((a, b) => (b.overdueDays ?? 0) - (a.overdueDays ?? 0));
}

async function computeBadgeCounts(): Promise<{ pending: number; requisitions: number }> {
  const [pending, requisitions] = await Promise.all([
    restFetch<{ id: string }[]>("pending_verifications?select=id&status=eq.pending"),
    restFetch<{ id: string }[]>("requisitions?select=id&status=eq.pending"),
  ]);
  return { pending: pending.length, requisitions: requisitions.length };
}

/** Revalidates every 45s — overdue status and pending counts don't need
 * to be second-fresh, and this is what keeps every navigation from
 * paying for 3+ extra Supabase round trips. */
export const getCachedLayoutData = unstable_cache(
  async () => {
    const [overdue, badgeCounts] = await Promise.all([computeOverdue(), computeBadgeCounts()]);
    return { overdue, badgeCounts };
  },
  ["layout-overdue-and-badges"],
  { revalidate: 45 }
);
