import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Money({
  centavos,
  className,
}: {
  centavos: number;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums", className)}>
      {formatMoney(centavos)}
    </span>
  );
}
