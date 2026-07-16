"use server";

import { getDevMasterlist, MASTERLIST_SNAPSHOT_DATE } from "@/lib/domain/dev-masterlist";
import { listCollections } from "@/lib/server/local-store";
import { createClient } from "@/lib/supabase/server";

export interface ClientHistoryRow {
  id: string;
  date: string;
  lotDisplayId: string;
  type: string;
  method: string | null;
  amountCents: number;
  source: "masterlist" | "logged";
}

async function getSupabaseClientHistory(clientId: string): Promise<ClientHistoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("id, paid_at, type, method, gross_cents, discount_cents, voided, lots(display_id)")
    .eq("client_id", clientId)
    .order("paid_at", { ascending: false });

  return (data ?? [])
    .filter((row) => !row.voided)
    .map((row) => {
      const lot = row.lots as unknown as { display_id: string } | null;
      return {
        id: row.id,
        date: row.paid_at,
        lotDisplayId: lot?.display_id ?? "-",
        type: row.type,
        method: row.method,
        amountCents: row.gross_cents - row.discount_cents,
        source: "logged" as const,
      };
    });
}

export async function getClientHistoryAction(
  clientId: string,
  clientName: string
): Promise<ClientHistoryRow[]> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return getSupabaseClientHistory(clientId);
  }

  const rows: ClientHistoryRow[] = [];

  const { contracts } = getDevMasterlist();
  for (const c of contracts) {
    if (c.clientId === clientId && c.paidCents > 0) {
      rows.push({
        id: c.id,
        date: MASTERLIST_SNAPSHOT_DATE,
        lotDisplayId: c.lotDisplayId,
        type: "opening_balance",
        method: null,
        amountCents: c.paidCents,
        source: "masterlist",
      });
    }
  }

  const logged = await listCollections();
  for (const row of logged) {
    if (row.clientId === clientId || row.clientName === clientName) {
      rows.push({
        id: row.id,
        date: row.paidAt,
        lotDisplayId: row.lotDisplayId ?? "-",
        type: row.type,
        method: row.method,
        amountCents: row.grossCents,
        source: "logged",
      });
    }
  }

  return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
}
