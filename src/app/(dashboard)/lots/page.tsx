import { Rows3 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { TierBadge } from "@/components/shared/tier-badge";
import { Money } from "@/components/shared/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { SECTION_LABEL, type SectionCode } from "@/types/domain";
import type { LotsRow } from "./types";

async function getLots(): Promise<LotsRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];

  const supabase = await createClient();
  const { data: lots } = await supabase
    .from("lots_with_status")
    .select("id, display_id, section, tier, base_price_cents, effective_status, active_client_id")
    .order("display_id");

  if (!lots || lots.length === 0) return [];

  const clientIds = [...new Set(lots.map((l) => l.active_client_id).filter((id): id is string => !!id))];
  const clientNameById = new Map<string, string>();
  if (clientIds.length > 0) {
    const { data: clients } = await supabase.from("clients").select("id, name").in("id", clientIds);
    for (const c of clients ?? []) clientNameById.set(c.id, c.name);
  }

  return lots.map((lot) => ({
    id: lot.id,
    displayId: lot.display_id,
    section: lot.section as SectionCode,
    tier: lot.tier,
    status: lot.effective_status,
    priceCents: lot.base_price_cents,
    clientName: lot.active_client_id ? (clientNameById.get(lot.active_client_id) ?? null) : null,
  }));
}

export default async function LotsPage() {
  const lots = await getLots();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Lots &amp; Ledger</h1>
        <p className="text-sm text-muted-foreground">
          Every inventory unit, its current status, and who holds it.
        </p>
      </div>

      {lots.length === 0 ? (
        <EmptyState
          icon={Rows3}
          title="No inventory seeded yet"
          description="Run scripts/seed-inventory.ts against your Supabase project to populate this list."
        />
      ) : (
        <div className="rounded-2xl border border-hairline">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Lot
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Section
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Tier
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Status
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Client
                </TableHead>
                <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Price
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot) => (
                <TableRow key={lot.id}>
                  <TableCell className="font-medium text-foreground">{lot.displayId}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {SECTION_LABEL[lot.section] ?? lot.section}
                  </TableCell>
                  <TableCell>
                    <TierBadge tier={lot.tier} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lot.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lot.clientName ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Money centavos={lot.priceCents} />
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
