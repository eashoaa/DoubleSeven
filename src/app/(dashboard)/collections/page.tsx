import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
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

interface CollectionRow {
  id: string;
  paidAt: string;
  clientName: string;
  lotDisplayId: string;
  type: string;
  netCents: number;
  method: string | null;
  voided: boolean;
}

async function getCollections(): Promise<CollectionRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];

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
      lotDisplayId: lot?.display_id ?? "—",
      type: row.type,
      netCents: row.gross_cents - row.discount_cents,
      method: row.method,
      voided: row.voided,
    };
  });
}

export default async function CollectionsPage() {
  const rows = await getCollections();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Collections</h1>
        <p className="text-sm text-muted-foreground">
          Recent payments across every lot, most recent first.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payments recorded yet"
          description="Payments recorded by staff, or migrated as opening balances, will show up here."
        />
      ) : (
        <div className="rounded-2xl border border-hairline">
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
                  <TableCell className="text-muted-foreground">{row.method ?? "—"}</TableCell>
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
