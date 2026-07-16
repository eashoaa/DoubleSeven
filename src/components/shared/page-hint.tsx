import { Info } from "lucide-react";
import type { ReactNode } from "react";

export function PageHint({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-hairline bg-accent/40 p-4 text-sm text-foreground">
      <Info className="mt-0.5 size-4.5 shrink-0 text-accent-foreground" strokeWidth={2} />
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}
