import { Wallet, Banknote, FileText, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getDevMasterlist, MASTERLIST_SNAPSHOT_DATE } from "@/lib/domain/dev-masterlist";
import { listCollections, listLocalClients } from "@/lib/server/local-store";
import { LogPaymentDialog } from "@/components/collections/log-payment-dialog";
import { MarkDepositedButton } from "@/components/collections/mark-deposited-button";
import { PageHeader } from "@/components/layout/page-header";

interface CollectionRow {
  id: string;
  paidAt: string;
  clientName: string;
  lotDisplayId: string;
  type: string;
  netCents: number;
  method: string | null;
  voided: boolean;
  deposited: boolean;
  receiptId: string | null;
  loggedThroughApp: boolean;
}

/**
 * Each masterlist contract carries one cumulative "opening balance" figure
 * (total paid as of the 2026-05-03 snapshot), not per-payment history, so
 * those rows are one per contract, not a real payment ledger. Payments
 * logged through the app (log-payment-dialog) are real, individual rows on
 * top of that, from lib/server/local-store.
 */
async function getDevFallbackCollections(): Promise<CollectionRow[]> {
  const fromMasterlist: CollectionRow[] = getDevMasterlist()
    .contracts.filter((c) => c.paidCents > 0)
    .map((c) => ({
      id: c.id,
      paidAt: MASTERLIST_SNAPSHOT_DATE,
      clientName: c.clientName,
      lotDisplayId: c.lotDisplayId,
      type: "opening_balance",
      netCents: c.paidCents,
      method: null,
      voided: false,
      deposited: true,
      receiptId: null,
      loggedThroughApp: false,
    }));

  const logged = await listCollections();
  const fromLocal: CollectionRow[] = logged.map((row) => ({
    id: row.id,
    paidAt: row.paidAt,
    clientName: row.clientName,
    lotDisplayId: row.lotDisplayId ?? "-",
    type: row.type,
    netCents: row.grossCents,
    method: row.method,
    voided: row.voided,
    deposited: row.deposited,
    receiptId: row.receiptId,
    loggedThroughApp: true,
  }));

  return [...fromLocal, ...fromMasterlist].sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1));
}

async function getCollections(): Promise<CollectionRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return getDevFallbackCollections();

  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("id, paid_at, type, gross_cents, discount_cents, method, voided, clients(name), lots(display_id)")
    .order("paid_at", { ascending: false })
    .limit(50);

  if (!data) return [];

  return data.map((row) => {
    const client = row.clients as unknown as { name: string } | null;
    const lot = row.lots as unknown as { display_id: string } | null;
    return {
      id: row.id,
      paidAt: row.paid_at,
      clientName: client?.name ?? "Unknown client",
      lotDisplayId: lot?.display_id ?? "-",
      type: row.type,
      netCents: row.gross_cents - row.discount_cents,
      method: row.method,
      voided: row.voided,
      deposited: true,
      receiptId: null,
      loggedThroughApp: true,
    };
  });
}

async function getClientOptions(): Promise<{ id: string; name: string }[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { clients } = getDevMasterlist();
    const local = await listLocalClients();
    return [...clients, ...local].map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));
  }
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("id, name").is("deleted_at", null).order("name");
  return data ?? [];
}

export default async function CollectionsPage() {
  const [rows, clientOptions] = await Promise.all([getCollections(), getClientOptions()]);

  const undeposited = rows.filter((r) => !r.deposited && !r.voided);
  const undepositedTotal = undeposited.reduce((sum, r) => sum + r.netCents, 0);
  const collectedTotal = rows.filter((r) => !r.voided).reduce((sum, r) => sum + r.netCents, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader titleKey="page.collections.title" descriptionKey="page.collections.desc" />
        <div className="flex items-center gap-2">
          <Link
            href="/api/export/ledger"
            className="flex items-center gap-2 rounded-full border border-hairline bg-white/70 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-white"
          >
            <FileSpreadsheet className="size-4" strokeWidth={2} />
            Export ledger (.xlsx)
          </Link>
          <LogPaymentDialog clients={clientOptions} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          icon={Wallet}
          tone="indigo"
          label="Total collected on record"
          value={<Money centavos={collectedTotal} />}
        />
        <StatCard
          icon={Banknote}
          tone="amber"
          label="Cash not yet deposited"
          value={<Money centavos={undepositedTotal} />}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payments recorded yet"
          description="Payments recorded by staff, or migrated as opening balances, will show up here."
        />
      ) : (
        <div className="shadow-card rounded-2xl border border-hairline">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Date
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Client
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Lot
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Type
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Method
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Receipt
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Deposit
                </TableHead>
                <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground">{formatDate(row.paidAt)}</TableCell>
                  <TableCell className="font-medium text-foreground">{row.clientName}</TableCell>
                  <TableCell className="text-muted-foreground">{row.lotDisplayId}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">
                    {row.type.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="text-muted-foreground capitalize">
                    {row.method?.replace(/_/g, " ") ?? "-"}
                  </TableCell>
                  <TableCell>
                    {row.receiptId ? (
                      <Link
                        href={`/api/receipts/${row.receiptId}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
                      >
                        <FileText className="size-3" strokeWidth={2} />
                        View
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.deposited ? (
                      <span className="text-xs text-muted-foreground">Deposited</span>
                    ) : (
                      <MarkDepositedButton id={row.id} />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.voided ? (
                      <Badge variant="outline" className="text-muted-foreground line-through">
                        <Money centavos={row.netCents} />
                      </Badge>
                    ) : (
                      <Money centavos={row.netCents} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
