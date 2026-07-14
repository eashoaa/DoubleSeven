import { cn } from "@/lib/utils";
import { TIER_LABEL, type Tier } from "@/types/domain";

const DOT_MAP: Record<Tier, string> = {
  prime: "bg-tier-prime",
  premium: "bg-tier-premium",
  regular: "bg-tier-regular",
};

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-2.5 py-1 text-xs font-medium text-foreground",
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOT_MAP[tier])} />
      {TIER_LABEL[tier]}
    </span>
  );
}
