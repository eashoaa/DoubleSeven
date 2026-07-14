import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-chip-indigo-bg text-chip-indigo-fg">
        <Icon className="size-5" strokeWidth={2} />
      </div>
      <div className="mt-4 text-sm font-semibold text-foreground">{title}</div>
      {description ? (
        <div className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </div>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
