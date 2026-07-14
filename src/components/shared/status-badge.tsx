import { cn } from "@/lib/utils";
import { LOT_STATUS_LABEL, type LotStatus } from "@/types/domain";

const DOT_MAP: Record<LotStatus, string> = {
  available: "bg-status-available-fg",
  reserved: "bg-status-reserved-fg",
  active: "bg-status-active-fg",
  delinquent: "bg-status-delinquent-fg",
  defaulted: "bg-status-defaulted-fg",
  cancelled: "bg-status-cancelled-fg",
  paid: "bg-status-paid-fg",
};

const BG_MAP: Record<LotStatus, string> = {
  available: "bg-status-available-bg text-status-available-fg",
  reserved: "bg-status-reserved-bg text-status-reserved-fg",
  active: "bg-status-active-bg text-status-active-fg",
  delinquent: "bg-status-delinquent-bg text-status-delinquent-fg",
  defaulted: "bg-status-defaulted-bg text-status-defaulted-fg",
  cancelled: "bg-status-cancelled-bg text-status-cancelled-fg",
  paid: "bg-status-paid-bg text-status-paid-fg",
};

export function StatusBadge({
  status,
  className,
}: {
  status: LotStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        BG_MAP[status],
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOT_MAP[status])} />
      {LOT_STATUS_LABEL[status]}
    </span>
  );
}
