"use client";

import { useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";
import type { SectionCode } from "@/types/domain";
import { DIGITAL_SECTION_LAYOUTS } from "@/lib/domain/lot-layouts";
import { BlueprintViewer } from "./blueprint-viewer";
import { DigitalGrid } from "./digital-grid";
import type { MapLot, PaintMode } from "./types";

gsap.registerPlugin(useGSAP);

type ViewMode = "digital" | "blueprint";

function PillGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex w-fit flex-wrap rounded-full border border-hairline bg-white/70 p-1 text-sm">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "relative rounded-full px-3.5 py-1.5 font-medium text-muted-foreground transition-colors duration-200",
            value === opt.value && "bg-primary text-primary-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const SECTION_TO_BLUEPRINT: Partial<Record<SectionCode, string>> = {
  gl: "garden",
  ll: "lawn",
};

export function ParkMap({ lots, requestedLotId }: { lots: MapLot[]; requestedLotId?: string }) {
  const requestedLot = useMemo(
    () => (requestedLotId ? (lots.find((l) => l.displayId === requestedLotId) ?? null) : null),
    [requestedLotId, lots]
  );

  const requestedLayout = requestedLot
    ? DIGITAL_SECTION_LAYOUTS.find((l) => l.code === requestedLot.section)
    : undefined;

  // A lot linked to from elsewhere in the app (e.g. a client's contract row)
  // jumps straight to the right section and opens its detail sheet, instead
  // of landing on a generic map the staff member then has to search. Some
  // sections (Family Estate, Court Estate, Ossuary) don't have a drawn
  // digital layout yet, those just fall through to the default view. These
  // are plain derived values, not state synced via an effect, so a second
  // ?lot= link clicked while already on this page (key'd below) resets
  // cleanly instead of needing manual re-sync.
  const [viewMode, setViewMode] = useState<ViewMode>("digital");
  const [paintMode, setPaintMode] = useState<PaintMode>("status");
  const [sectionCode, setSectionCode] = useState<SectionCode>(
    requestedLayout ? (requestedLot!.section as SectionCode) : DIGITAL_SECTION_LAYOUTS[0].code
  );
  const [locateBlueprintId, setLocateBlueprintId] = useState<string | undefined>(undefined);
  const autoOpenLotId = requestedLayout ? requestedLot!.displayId : undefined;
  const contentRef = useRef<HTMLDivElement>(null);

  function handleLocateOnMap(lot: MapLot) {
    setLocateBlueprintId(SECTION_TO_BLUEPRINT[lot.section as SectionCode] ?? "whole");
    setViewMode("blueprint");
  }

  const activeLayout =
    DIGITAL_SECTION_LAYOUTS.find((l) => l.code === sectionCode) ?? DIGITAL_SECTION_LAYOUTS[0];

  useGSAP(
    () => {
      const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: reduced ? 0 : 0.3, ease: "power2.out" }
      );
    },
    { dependencies: [viewMode, sectionCode, paintMode], scope: contentRef }
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PillGroup
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: "digital", label: "Digital" },
            { value: "blueprint", label: "Blueprint" },
          ]}
        />

        {viewMode === "digital" && (
          <PillGroup
            value={paintMode}
            onChange={setPaintMode}
            options={[
              { value: "status", label: "Status" },
              { value: "tier", label: "Tier" },
            ]}
          />
        )}
      </div>

      {viewMode === "digital" && (
        <PillGroup
          value={sectionCode}
          onChange={setSectionCode}
          options={DIGITAL_SECTION_LAYOUTS.map((l) => ({ value: l.code, label: l.label }))}
        />
      )}

      <div ref={contentRef}>
        {viewMode === "digital" ? (
          <DigitalGrid
            layout={activeLayout}
            lots={lots.filter((l) => l.section === sectionCode)}
            paintMode={paintMode}
            onLocateOnMap={handleLocateOnMap}
            autoOpenLotId={autoOpenLotId}
          />
        ) : (
          <BlueprintViewer key={locateBlueprintId} initialId={locateBlueprintId} lots={lots} paintMode={paintMode} />
        )}
      </div>
    </div>
  );
}
