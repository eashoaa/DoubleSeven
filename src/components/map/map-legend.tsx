import { LOT_STATUS_LABEL, TIER_LABEL, type LotStatus, type Tier } from "@/types/domain";
import type { PaintMode } from "./types";
import { cn } from "@/lib/utils";

const STATUS_MAP_COLOR: Record<LotStatus, string> = {
  available: "bg-status-available-map",
  reserved: "bg-status-reserved-map",
  active: "bg-status-active-map",
  delinquent: "bg-status-delinquent-map",
  defaulted: "bg-status-defaulted-map",
  cancelled: "bg-status-cancelled-map",
  paid: "bg-status-paid-map",
};

const TIER_COLOR: Record<Tier, string> = {
  regular: "bg-tier-regular",
  premium: "bg-tier-premium",
  prime: "bg-tier-prime",
};

export function MapLegend({ mode }: { mode: PaintMode }) {
  const entries =
    mode === "status"
      ? (Object.keys(LOT_STATUS_LABEL) as LotStatus[]).map((key) => ({
          key,
          label: LOT_STATUS_LABEL[key],
          swatch: STATUS_MAP_COLOR[key],
        }))
      : (Object.keys(TIER_LABEL) as Tier[]).map((key) => ({
          key,
          label: TIER_LABEL[key],
          swatch: TIER_COLOR[key],
        }));

  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-hairline bg-card px-4 py-3">
      {entries.map((entry) => (
        <div key={entry.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("size-2.5 rounded-sm", entry.swatch)} />
          {entry.label}
        </div>
      ))}
    </div>
  );
}
