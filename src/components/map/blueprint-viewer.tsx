"use client";

import { useCallback, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GARDEN_LOT_LAYOUT, type LotBlock } from "@/lib/domain/lot-layouts";
import { GeoOverlay, type GeoBounds } from "./geo-overlay";
import type { MapLot, PaintMode } from "./types";

// Bounding boxes calibrated against the source scans (fractions of image
// width/height), see the two Garden Lot blocks in
// public/park/garden-lot-sales-map.jpg. Good enough to click the right
// lot; not survey-accurate. Lawn Lots aren't calibrated yet: that map's
// extra column-groups and edge lots (73/74, 79-86) aren't in the layout
// data yet, so there's nothing to position there.
const GARDEN_BOUNDS: Record<string, GeoBounds> = {
  "Block 01: Section A": { left: 0.213, right: 0.5, top: 0.113, bottom: 0.648 },
  "Block 02: Section B": { left: 0.528, right: 0.8, top: 0.113, bottom: 0.665 },
};

interface BlueprintOption {
  id: string;
  label: string;
  src: string;
  width: number;
  height: number;
}

const BLUEPRINTS: BlueprintOption[] = [
  { id: "whole", label: "Whole Map", src: "/park/whole-map.jpeg", width: 2048, height: 1346 },
  { id: "garden", label: "Garden Lot Sales Map", src: "/park/garden-lot-sales-map.jpg", width: 4620, height: 3508 },
  { id: "lawn", label: "Lawn Lot Map", src: "/park/lawn-lot-map.jpg", width: 2240, height: 1696 },
];

const MIN_SCALE = 1;
const MAX_SCALE = 6;

export function BlueprintViewer({
  initialId,
  lots = [],
  paintMode = "status",
}: {
  initialId?: string;
  lots?: MapLot[];
  paintMode?: PaintMode;
}) {
  const [activeId, setActiveId] = useState(initialId ?? BLUEPRINTS[0].id);
  const active = BLUEPRINTS.find((b) => b.id === activeId) ?? BLUEPRINTS[0];
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ startX: number; startY: number; origin: { x: number; y: number } } | null>(null);

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const zoomBy = useCallback((factor: number) => {
    setScale((prev) => clampScale(prev * factor));
  }, []);

  const switchBlueprint = (id: string) => {
    setActiveId(id);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scale <= 1) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origin: offset };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset({ x: dragState.current.origin.x + dx, y: dragState.current.origin.y + dy });
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
  };

  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const overlay =
    activeId === "garden" ? (
      <GeoOverlay
        blocks={GARDEN_LOT_LAYOUT.blocks.map((block: LotBlock) => ({
          block,
          bounds: GARDEN_BOUNDS[block.label],
        }))}
        lots={lots}
        paintMode={paintMode}
      />
    ) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex flex-wrap rounded-full border border-hairline bg-white/70 p-1 text-sm">
          {BLUEPRINTS.map((bp) => (
            <button
              key={bp.id}
              onClick={() => switchBlueprint(bp.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 font-medium text-muted-foreground transition-colors",
                activeId === bp.id && "bg-primary text-primary-foreground"
              )}
            >
              {bp.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => zoomBy(1 / 1.3)}
            aria-label="Zoom out"
            className="flex size-8 items-center justify-center rounded-full border border-hairline bg-white/70 text-foreground/70 hover:bg-white"
          >
            <ZoomOut className="size-4" strokeWidth={2} />
          </button>
          <button
            onClick={() => zoomBy(1.3)}
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

      <div
        ref={containerRef}
        className={cn(
          "relative w-full touch-none select-none overflow-hidden rounded-2xl border border-hairline bg-black/5",
          scale > 1 && "cursor-grab active:cursor-grabbing"
        )}
        style={{ aspectRatio: `${active.width} / ${active.height}` }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* This div carries the pan/zoom transform; the image and the
            geo-overlay (if any) are both siblings inside it, sized to
            exactly fill it, so the overlay's percentage coordinates line
            up with the image at any zoom/pan state. */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={active.id}
            src={active.src}
            alt={active.label}
            className="absolute inset-0 h-full w-full"
            draggable={false}
          />
          {overlay}
        </div>
      </div>
    </div>
  );
}
