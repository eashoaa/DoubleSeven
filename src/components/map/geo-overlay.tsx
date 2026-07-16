"use client";

import { useMemo, useState } from "react";
import type { LotStatus, Tier } from "@/types/domain";
import type { LotBlock } from "@/lib/domain/lot-layouts";
import { LotDetailSheet } from "./lot-detail-sheet";
import type { MapLot, PaintMode } from "./types";

export interface GeoBounds {
  /** All fractions 0–1 of the underlying image's width/height. */
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const STATUS_COLOR: Record<LotStatus, string> = {
  available: "rgba(203,213,225,0.55)",
  reserved: "rgba(251,191,36,0.55)",
  active: "rgba(52,211,153,0.55)",
  delinquent: "rgba(251,146,60,0.55)",
  defaulted: "rgba(248,113,113,0.6)",
  cancelled: "rgba(168,162,158,0.55)",
  paid: "rgba(129,140,248,0.55)",
};

const TIER_COLOR: Record<Tier, string> = {
  prime: "rgba(239,68,68,0.5)",
  premium: "rgba(234,179,8,0.5)",
  regular: "rgba(59,130,246,0.5)",
};

/**
 * Clickable regions positioned by percentage over a real blueprint image,
 * a sibling of the <img>, sharing its pan/zoom transform, so it tracks
 * pixel-for-pixel. Row placement is calibrated once per block (a bounding
 * box eyeballed off the source scan); within a row, cells distribute
 * evenly and center within that row's own width, same as the Digital
 * grid's shape: good enough to click the right lot, not claimed to be
 * survey-accurate.
 */
export function GeoOverlay({
  blocks,
  lots,
  paintMode,
}: {
  blocks: { block: LotBlock; bounds: GeoBounds }[];
  lots: MapLot[];
  paintMode: PaintMode;
}) {
  const byId = useMemo(() => new Map(lots.map((l) => [l.displayId, l])), [lots]);
  const [selectedLot, setSelectedLot] = useState<MapLot | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <>
      <div className="pointer-events-none absolute inset-0">
        {blocks.map(({ block, bounds: b }) => {
          const rowCount = block.rows.length;
          const boxHeight = b.bottom - b.top;
          const boxWidth = b.right - b.left;
          const maxCols = Math.max(...block.rows.map((r) => r.length));
          const cellWidth = boxWidth / maxCols;

          return block.rows.map((row, rowIndex) => {
            const rowTop = b.top + (rowIndex / rowCount) * boxHeight;
            const rowHeight = boxHeight / rowCount;
            const rowWidth = row.length * cellWidth;
            const rowLeft = b.left + (boxWidth - rowWidth) / 2;

            return row.map((cell, colIndex) => {
              const lot = byId.get(cell.id);
              const color = lot
                ? paintMode === "status"
                  ? STATUS_COLOR[lot.status]
                  : TIER_COLOR[lot.tier]
                : TIER_COLOR[cell.tier];
              const isHovered = hoveredId === cell.id;

              return (
                <button
                  key={cell.id}
                  type="button"
                  className="pointer-events-auto absolute flex items-center justify-center rounded-[2px] transition-all"
                  style={{
                    left: `${(rowLeft + colIndex * cellWidth) * 100}%`,
                    top: `${rowTop * 100}%`,
                    width: `${cellWidth * 100}%`,
                    height: `${rowHeight * 100}%`,
                    backgroundColor: isHovered ? "rgba(79,70,229,0.55)" : color,
                    outline: isHovered ? "2px solid #4f46e5" : "1px solid rgba(0,0,0,0.15)",
                    outlineOffset: -1,
                    zIndex: isHovered ? 10 : 1,
                  }}
                  onMouseEnter={() => setHoveredId(cell.id)}
                  onMouseLeave={() => setHoveredId((h) => (h === cell.id ? null : h))}
                  onClick={() => {
                    if (!lot) return;
                    setSelectedLot(lot);
                    setSheetOpen(true);
                  }}
                  title={cell.id}
                />
              );
            });
          });
        })}
      </div>

      <LotDetailSheet lot={selectedLot} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
