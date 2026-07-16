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
import { ClickableRow } from "@/components/shared/clickable-row";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getDevMasterlist } from "@/lib/domain/dev-masterlist";
import { listLocalClients, listLocalContracts, getContactOverrides } from "@/lib/server/local-store";
import { PageSearchInput } from "@/components/shared/page-search-input";
import { PageHeader } from "@/components/layout/page-header";
import { EditContactDialog } from "@/components/clients/edit-contact-dialog";

interface ClientRow {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  since: string;
  contractCount: number;
}

async function getClients(): Promise<ClientRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { clients } = getDevMasterlist();
    const local = await listLocalClients();
    const [localContracts, overrides] = await Promise.all([listLocalContracts(), getContactOverrides()]);

    const localContractCountByClient = new Map<string, number>();
    for (const c of localContracts) {
      localContractCountByClient.set(c.clientId, (localContractCountByClient.get(c.clientId) ?? 0) + 1);
    }

    const merged: ClientRow[] = [
      ...clients.map((c) => ({ ...c, contractCount: c.contractCount + (localContractCountByClient.get(c.id) ?? 0) })),
      ...local.map((c) => ({ ...c, contractCount: localContractCountByClient.get(c.id) ?? 0 })),
    ];

    return merged
      .map((c) => {
        const override = overrides[c.id];
        return { ...c, contact: override?.contact ?? c.contact, email: override?.email ?? c.email };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

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

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, clients] = await Promise.all([searchParams, getClients()]);
  const filtered = q
    ? clients.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    : clients;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader titleKey="page.clients.title" descriptionKey="page.clients.desc" />
        <PageSearchInput basePath="/clients" defaultValue={q ?? ""} placeholder="Filter by name…" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? `No clients matching "${q}"` : "No clients yet"}
          description={
            q
              ? "Try a different name."
              : "Clients created here, or migrated from the masterlist, will show up in this list."
          }
        />
      ) : (
        <div className="shadow-card rounded-2xl border border-hairline">
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
              {filtered.map((client) => (
                <ClickableRow key={client.id} href={`/clients/${client.id}`}>
                  <TableCell className="font-medium text-foreground">{client.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>{client.contact ?? client.email ?? "-"}</span>
                      <EditContactDialog
                        clientId={client.id}
                        clientName={client.name}
                        contact={client.contact}
                        email={client.email}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(client.since)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {client.contractCount}
                  </TableCell>
                </ClickableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
