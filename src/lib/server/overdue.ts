import { createClient } from "@/lib/supabase/server";
import { getOverdueContractsMerged } from "@/lib/domain/dev-masterlist";
import { buildAgingReport, type AgingContract } from "@/lib/domain/aging";
import { netPaidCents, outstandingBalanceCents } from "@/lib/domain/status";
import type { LotStatus } from "@/types/domain";

export interface OverdueRow {
  id: string;
  lotId: string;
  clientName: string;
  lotDisplayId: string;
  status: LotStatus;
  priceCents: number;
  paidCents: number;
  penaltyCents: number;
  balanceCents: number;
  overdueDays: number;
}

/**
 * Real, live overdue contracts from Supabase — replaces the static
 * masterlist-snapshot version (getOverdueContractsMerged), which never
 * reflected any payment logged after the original migration. Reuses the
 * same tested aging/status domain logic (buildAgingReport), just fed from
 * real rows instead of the frozen masterlist. Shared by the /overdue page
 * and the notification bell.
 */
async function getOverdueContractsReal(): Promise<OverdueRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contracts")
    .select("id, lot_id, client_id, price_cents, status, clients(name), lots(display_id)")
    .in("status", ["delinquent", "defaulted"])
    .is("deleted_at", null);

  if (!data || data.length === 0) return [];

  const contractIds = data.map((c) => c.id);
  const [{ data: installmentRows }, { data: transactionRows }, { data: penaltyRows }] = await Promise.all([
    supabase.from("installments").select("contract_id, seq, due_date, due_cents").in("contract_id", contractIds),
    supabase
      .from("transactions")
      .select("contract_id, type, gross_cents, discount_cents, voided")
      .in("contract_id", contractIds),
    supabase
      .from("penalties")
      .select("contract_id, amount_cents")
      .in("contract_id", contractIds)
      .is("waived_at", null),
  ]);

  const penaltyCentsByContract = new Map<string, number>();
  for (const row of penaltyRows ?? []) {
    penaltyCentsByContract.set(row.contract_id, (penaltyCentsByContract.get(row.contract_id) ?? 0) + row.amount_cents);
  }

  const installmentsByContract = new Map<string, AgingContract["installments"]>();
  for (const row of installmentRows ?? []) {
    if (!installmentsByContract.has(row.contract_id)) installmentsByContract.set(row.contract_id, []);
    installmentsByContract
      .get(row.contract_id)!
      .push({ seq: row.seq, dueDate: row.due_date, dueCents: row.due_cents });
  }
  const transactionsByContract = new Map<string, AgingContract["transactions"]>();
  for (const row of transactionRows ?? []) {
    if (!row.contract_id) continue;
    if (!transactionsByContract.has(row.contract_id)) transactionsByContract.set(row.contract_id, []);
    transactionsByContract
      .get(row.contract_id)!
      .push({ type: row.type, grossCents: row.gross_cents, discountCents: row.discount_cents, voided: row.voided });
  }

  const agingInput: AgingContract[] = data.map((c) => ({
    id: c.id,
    clientId: c.client_id,
    priceCents: c.price_cents,
    transactions: transactionsByContract.get(c.id) ?? [],
    installments: installmentsByContract.get(c.id) ?? [],
    penaltyCents: penaltyCentsByContract.get(c.id) ?? 0,
  }));
  const aging = buildAgingReport(agingInput);
  const agingById = new Map(aging.map((a) => [a.contractId, a]));

  const rows: OverdueRow[] = [];
  for (const c of data) {
    const agingRow = agingById.get(c.id);
    if (!agingRow) continue;
    const client = c.clients as unknown as { name: string } | null;
    const lot = c.lots as unknown as { display_id: string } | null;
    const paidCents = netPaidCents(transactionsByContract.get(c.id) ?? []);
    const penaltyCents = penaltyCentsByContract.get(c.id) ?? 0;
    rows.push({
      id: c.id,
      lotId: c.lot_id,
      clientName: client?.name ?? "Unknown client",
      lotDisplayId: lot?.display_id ?? "-",
      status: c.status,
      priceCents: c.price_cents,
      paidCents,
      penaltyCents,
      balanceCents: outstandingBalanceCents({ priceCents: c.price_cents, paidCents, penaltyCents }),
      overdueDays: agingRow.daysOverdue,
    });
  }
  return rows.sort((a, b) => b.overdueDays - a.overdueDays);
}

export async function getOverdueRows(): Promise<OverdueRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const devRows = await getOverdueContractsMerged();
    return devRows.map((c) => ({
      id: c.id,
      lotId: c.lotDisplayId,
      clientName: c.clientName,
      lotDisplayId: c.lotDisplayId,
      status: c.status,
      priceCents: c.priceCents,
      paidCents: c.paidCents,
      penaltyCents: 0,
      balanceCents: outstandingBalanceCents({ priceCents: c.priceCents, paidCents: c.paidCents }),
      overdueDays: c.overdueDays ?? 0,
    }));
  }
  return getOverdueContractsReal();
}
