"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { LotStatus, Tier } from "@/types/domain";
import type { SectionLayout } from "@/lib/domain/lot-layouts";
import { LotDetailSheet } from "./lot-detail-sheet";
import { MapLegend } from "./map-legend";
import type { MapLot, PaintMode } from "./types";

const STATUS_CLASS: Record<LotStatus, string> = {
  available: "bg-status-available-bg text-status-available-fg",
  reserved: "bg-status-reserved-bg text-status-reserved-fg",
  active: "bg-status-active-bg text-status-active-fg",
  delinquent: "bg-status-delinquent-bg text-status-delinquent-fg",
  defaulted: "bg-status-defaulted-bg text-status-defaulted-fg",
  cancelled: "bg-status-cancelled-bg text-status-cancelled-fg",
  paid: "bg-status-paid-bg text-status-paid-fg",
};

const TIER_CLASS: Record<Tier, string> = {
  prime: "bg-tier-prime text-white",
  premium: "bg-tier-premium text-black",
  regular: "bg-tier-regular text-white",
};

export function DigitalGrid({
  layout,
  lots,
  paintMode,
  onLocateOnMap,
  autoOpenLotId,
}: {
  layout: SectionLayout;
  lots: MapLot[];
  paintMode: PaintMode;
  onLocateOnMap?: (lot: MapLot) => void;
  autoOpenLotId?: string;
}) {
  const byId = useMemo(() => new Map(lots.map((l) => [l.displayId, l])), [lots]);
  // Initializers only, not an effect: the parent (ParkMap, keyed by the
  // requested lot in map/page.tsx) fully remounts this component whenever
  // the deep-linked lot changes, so there's no separate case to sync here.
  const [selectedLot, setSelectedLot] = useState<MapLot | null>(() =>
    autoOpenLotId ? (byId.get(autoOpenLotId) ?? null) : null
  );
  const [sheetOpen, setSheetOpen] = useState(() => !!(autoOpenLotId && byId.get(autoOpenLotId)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-8 overflow-x-auto rounded-2xl border border-hairline bg-black/5 p-6">
        {layout.blocks.map((block) => (
          <div key={block.label} className="flex min-w-max flex-col gap-1.5">
            <div className="text-xs font-semibold text-muted-foreground">{block.label}</div>
            <div className="flex flex-col items-center gap-1">
              {block.rows.map((row, i) => (
                <div key={i} className="flex gap-1">
                  {row.map((cell) => {
                    const lot = byId.get(cell.id);
                    const colorClass = lot
                      ? paintMode === "status"
                        ? STATUS_CLASS[lot.status]
                        : TIER_CLASS[lot.tier]
                      : TIER_CLASS[cell.tier];
                    return (
                      <button
                        key={cell.id}
                        type="button"
                        title={cell.note ? `${cell.id}: ${cell.note}` : cell.id}
                        onClick={() => {
                          if (!lot) return;
                          setSelectedLot(lot);
                          setSheetOpen(true);
                        }}
                        className={cn(
                          "flex h-8 w-12 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold shadow-[0_1px_2px_rgba(16,24,40,0.12)] transition-transform hover:z-10 hover:scale-110",
                          colorClass,
                          !lot && "cursor-default opacity-60"
                        )}
                      >
                        {cell.id}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <MapLegend mode={paintMode} />
      <LotDetailSheet
        lot={selectedLot}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onLocateOnMap={
          onLocateOnMap
            ? (lot) => {
                setSheetOpen(false);
                onLocateOnMap(lot);
              }
            : undefined
        }
      />
    </div>
  );
}
