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
import { getMergedLotStatusById } from "@/lib/domain/dev-masterlist";
import { generateAllLots, SECTION_DEFINITIONS } from "../../../../scripts/seed/lot-geometry";
import { suggestedLotPriceCents } from "@/lib/domain/pricing";
import { SECTION_LABEL, type SectionCode } from "@/types/domain";
import { PageSearchInput } from "@/components/shared/page-search-input";
import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import type { LotsRow } from "./types";
import { PageHeader } from "@/components/layout/page-header";

async function getDevFallbackLots(): Promise<LotsRow[]> {
  const lotStatusById = await getMergedLotStatusById();
  const sectionByCode = new Map(SECTION_DEFINITIONS.map((s) => [s.code, s]));
  return generateAllLots().map((lot) => {
    const section = sectionByCode.get(lot.section)!;
    const live = lotStatusById.get(lot.displayId);
    return {
      id: lot.displayId,
      displayId: lot.displayId,
      section: lot.section,
      tier: lot.tier,
      status: live?.status ?? "available",
      priceCents: suggestedLotPriceCents(
        { priceMinCents: section.priceMinCents, priceMaxCents: section.priceMaxCents },
        lot.tier
      ),
      clientName: live?.clientName ?? null,
    };
  });
}

async function getLots(): Promise<LotsRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return await getDevFallbackLots();

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

export default async function LotsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const [{ q, status }, allLots] = await Promise.all([searchParams, getLots()]);
  let lots = q
    ? allLots.filter(
        (l) =>
          l.displayId.toLowerCase().includes(q.toLowerCase()) ||
          (l.clientName ?? "").toLowerCase().includes(q.toLowerCase())
      )
    : allLots;
  if (status === "occupied") {
    lots = lots.filter((l) => l.status !== "available");
  } else if (status) {
    lots = lots.filter((l) => l.status === status);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader titleKey="page.lots.title" descriptionKey="page.lots.desc" />
        <div className="flex items-center gap-2">
          <Link
            href="/api/export/ledger"
            className="flex shrink-0 items-center gap-2 rounded-full border border-hairline bg-white/70 px-4 py-2.5 text-sm font-medium whitespace-nowrap text-foreground hover:bg-white"
          >
            <FileSpreadsheet className="size-4 shrink-0" strokeWidth={2} />
            Export ledger (.xlsx)
          </Link>
          <PageSearchInput basePath="/lots" defaultValue={q ?? ""} placeholder="Filter by lot or client…" />
        </div>
      </div>

      {lots.length === 0 ? (
        <EmptyState
          icon={Rows3}
          title={q ? `No lots matching "${q}"` : "No inventory seeded yet"}
          description={
            q
              ? "Try a different lot number or client name."
              : "Run scripts/seed-inventory.ts against your Supabase project to populate this list."
          }
        />
      ) : (
        <div className="shadow-card rounded-2xl border border-hairline">
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
                  <TableCell className="font-medium text-foreground">
                    <Link href={`/map?lot=${encodeURIComponent(lot.displayId)}`} className="hover:underline">
                      {lot.displayId}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {SECTION_LABEL[lot.section] ?? lot.section}
                  </TableCell>
                  <TableCell>
                    <TierBadge tier={lot.tier} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lot.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lot.clientName ?? "-"}</TableCell>
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
