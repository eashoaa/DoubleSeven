"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LotStatus, Tier } from "@/types/domain";
import { MapLegend } from "./map-legend";
import { LotDetailSheet } from "./lot-detail-sheet";
import type { MapLot, PaintMode } from "./types";

const WORLD_WIDTH = 2048;
const WORLD_HEIGHT = 1346;
const MIN_SCALE = 0.4;
const MAX_SCALE = 6;

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const INITIAL_VIEW_BOX: ViewBox = { x: 0, y: 0, w: WORLD_WIDTH, h: WORLD_HEIGHT };

const STATUS_FILL: Record<LotStatus, string> = {
  available: "var(--status-available-map)",
  reserved: "var(--status-reserved-map)",
  active: "var(--status-active-map)",
  delinquent: "var(--status-delinquent-map)",
  defaulted: "var(--status-defaulted-map)",
  cancelled: "var(--status-cancelled-map)",
  paid: "var(--status-paid-map)",
};

const TIER_FILL: Record<Tier, string> = {
  regular: "var(--tier-regular)",
  premium: "var(--tier-premium)",
  prime: "var(--tier-prime)",
};

function polygonToSvgPoints(points: [number, number][]): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

export function ParkMap({ lots }: { lots: MapLot[] }) {
  const [paintMode, setPaintMode] = useState<PaintMode>("status");
  const [viewBox, setViewBox] = useState<ViewBox>(INITIAL_VIEW_BOX);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragState = useRef<{ startX: number; startY: number; origin: ViewBox } | null>(null);
  const draggedRef = useRef(false);

  const selectedLot = useMemo(
    () => lots.find((l) => l.id === selectedLotId) ?? null,
    [lots, selectedLotId]
  );

  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    setViewBox((prev) => {
      const svg = svgRef.current;
      if (!svg) return prev;
      const rect = svg.getBoundingClientRect();
      const fracX = (clientX - rect.left) / rect.width;
      const fracY = (clientY - rect.top) / rect.height;
      const anchorX = prev.x + fracX * prev.w;
      const anchorY = prev.y + fracY * prev.h;

      const currentScale = WORLD_WIDTH / prev.w;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, currentScale * factor));
      const nextW = WORLD_WIDTH / nextScale;
      const nextH = WORLD_HEIGHT / nextScale;

      return {
        x: anchorX - fracX * nextW,
        y: anchorY - fracY * nextH,
        w: nextW,
        h: nextH,
      };
    });
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      zoomAt(e.clientX, e.clientY, factor);
    },
    [zoomAt]
  );

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    draggedRef.current = false;
    dragState.current = { startX: e.clientX, startY: e.clientY, origin: viewBox };
  }, [viewBox]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragState.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) draggedRef.current = true;

    const { origin } = dragState.current;
    const scaleX = origin.w / rect.width;
    const scaleY = origin.h / rect.height;
    setViewBox({
      x: origin.x - dx * scaleX,
      y: origin.y - dy * scaleY,
      w: origin.w,
      h: origin.h,
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  const handleLotClick = useCallback((lot: MapLot) => {
    if (draggedRef.current) return; // suppress click-after-drag
    setSelectedLotId(lot.id);
    setSheetOpen(true);
  }, []);

  const zoomButton = (factor: number) => () => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  };

  const resetView = () => setViewBox(INITIAL_VIEW_BOX);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-full border border-hairline bg-white/70 p-1 text-sm">
          {(["status", "tier"] as PaintMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setPaintMode(mode)}
              className={cn(
                "rounded-full px-3.5 py-1.5 font-medium capitalize text-muted-foreground transition-colors",
                paintMode === mode && "bg-primary text-primary-foreground"
              )}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={zoomButton(1 / 1.3)}
            aria-label="Zoom out"
            className="flex size-8 items-center justify-center rounded-full border border-hairline bg-white/70 text-foreground/70 hover:bg-white"
          >
            <ZoomOut className="size-4" strokeWidth={2} />
          </button>
          <button
            onClick={zoomButton(1.3)}
            aria-label="Zoom in"
            className="flex size-8 items-center justify-center rounded-full border border-hairline bg-white/70 text-foreground/70 hover:bg-white"
          >
            <ZoomIn className="size-4" strokeWidth={2} />
          </button>
          <button
            onClick={resetView}
            aria-label="Reset view"
            className="flex size-8 items-center justify-center rounded-full border border-hairline bg-white/70 text-foreground/70 hover:bg-white"
          >
            <Maximize2 className="size-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-hairline bg-black/5">
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="aspect-[2048/1346] w-full touch-none select-none"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <image
            href="/park/whole-map.jpeg"
            x={0}
            y={0}
            width={WORLD_WIDTH}
            height={WORLD_HEIGHT}
            preserveAspectRatio="xMidYMid slice"
          />
          {lots.map((lot) => {
            const fill =
              paintMode === "status" ? STATUS_FILL[lot.status] : TIER_FILL[lot.tier];
            const isSelected = lot.id === selectedLotId;
            return (
              <polygon
                key={lot.id}
                points={polygonToSvgPoints(lot.points)}
                fill={fill}
                fillOpacity={isSelected ? 0.95 : 0.75}
                stroke={isSelected ? "#111827" : "rgba(17,24,39,0.35)"}
                strokeWidth={isSelected ? 2 : 0.75}
                className="cursor-pointer transition-opacity hover:opacity-100"
                onClick={() => handleLotClick(lot)}
              >
                <title>{`${lot.displayId} — ${lot.status}`}</title>
              </polygon>
            );
          })}
        </svg>
      </div>

      <MapLegend mode={paintMode} />

      <LotDetailSheet lot={selectedLot} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
