"use server";

import { getDevMasterlist, MASTERLIST_SNAPSHOT_DATE } from "@/lib/domain/dev-masterlist";
import { listCollections } from "@/lib/server/local-store";

export interface ClientHistoryRow {
  id: string;
  date: string;
  lotDisplayId: string;
  type: string;
  method: string | null;
  amountCents: number;
  source: "masterlist" | "logged";
}

export async function getClientHistoryAction(
  clientId: string,
  clientName: string
): Promise<ClientHistoryRow[]> {
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
