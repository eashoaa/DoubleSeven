import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE_MAP = {
  indigo: "bg-chip-indigo-bg text-chip-indigo-fg",
  amber: "bg-chip-amber-bg text-chip-amber-fg",
  violet: "bg-chip-violet-bg text-chip-violet-fg",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "indigo",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: keyof typeof TONE_MAP;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-hairline bg-card p-5",
        className
      )}
    >
      <div
        className={cn(
          "flex size-9 items-center justify-center rounded-lg",
          TONE_MAP[tone]
        )}
      >
        <Icon className="size-4.5" strokeWidth={2} />
      </div>
      <div className="mt-4 text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}
