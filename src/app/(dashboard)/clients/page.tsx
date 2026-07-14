import { Users } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
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

interface ClientRow {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  since: string;
  contractCount: number;
}

async function getClients(): Promise<ClientRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, contact, email, since")
    .is("deleted_at", null)
    .order("name");

  if (!clients || clients.length === 0) return [];

  const { data: contracts } = await supabase
    .from("contracts")
    .select("client_id")
    .is("deleted_at", null);

  const contractCountByClient = new Map<string, number>();
  for (const c of contracts ?? []) {
    contractCountByClient.set(c.client_id, (contractCountByClient.get(c.client_id) ?? 0) + 1);
  }

  return clients.map((c) => ({
    ...c,
    contractCount: contractCountByClient.get(c.id) ?? 0,
  }));
}

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Clients</h1>
        <p className="text-sm text-muted-foreground">
          Everyone who owns or is reserving a lot at Heaven&apos;s Gate.
        </p>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Clients created here, or migrated from the masterlist, will show up in this list."
        />
      ) : (
        <div className="rounded-2xl border border-hairline">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Name
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Contact
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Client since
                </TableHead>
                <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Contracts
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium text-foreground">{client.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.contact ?? client.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(client.since)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {client.contractCount}
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
