import { ParkMap } from "@/components/map/park-map";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/server";
import type { MapLot } from "@/components/map/types";
import { Map as MapIcon } from "lucide-react";
import { generateAllLots, SECTION_DEFINITIONS } from "../../../../scripts/seed/lot-geometry";
import { suggestedLotPriceCents } from "@/lib/domain/pricing";
import type { LotStatus } from "@/types/domain";

const DEV_STATUS_CYCLE: LotStatus[] = [
  "available",
  "reserved",
  "active",
  "delinquent",
  "defaulted",
  "paid",
];

/** Phase 0 fallback — lets the map be reviewed before a Supabase project exists. */
function getDevFallbackLots(): MapLot[] {
  const sectionByCode = new Map(SECTION_DEFINITIONS.map((s) => [s.code, s]));
  return generateAllLots().map((lot, i) => {
    const section = sectionByCode.get(lot.section)!;
    const status = DEV_STATUS_CYCLE[i % DEV_STATUS_CYCLE.length];
    return {
      id: lot.displayId,
      displayId: lot.displayId,
      section: lot.section,
      tier: lot.tier,
      status,
      points: lot.points,
      clientName: status === "available" || status === "reserved" ? null : `Client ${i + 1}`,
      priceCents: suggestedLotPriceCents(
        { priceMinCents: section.priceMinCents, priceMaxCents: section.priceMaxCents },
        lot.tier
      ),
    };
  });
}

async function getMapLots(): Promise<MapLot[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return getDevFallbackLots();

  const supabase = await createClient();
  const { data: lots } = await supabase
    .from("lots_with_status")
    .select("id, display_id, section, tier, base_price_cents, geom_points, effective_status, active_client_id");

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
    section: lot.section,
    tier: lot.tier,
    status: lot.effective_status,
    points: (lot.geom_points as [number, number][]) ?? [],
    clientName: lot.active_client_id ? (clientNameById.get(lot.active_client_id) ?? null) : null,
    priceCents: lot.base_price_cents,
  }));
}

export default async function MapPage() {
  const lots = await getMapLots();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Park Map</h1>
        <p className="text-sm text-muted-foreground">
          The site plan, painted by status or by tier. Click a lot for details.
        </p>
      </div>

      {lots.length === 0 ? (
        <EmptyState
          icon={MapIcon}
          title="No inventory seeded yet"
          description="Run scripts/seed-inventory.ts against your Supabase project to generate the lot map."
        />
      ) : (
        <ParkMap lots={lots} />
      )}
    </div>
  );
}
