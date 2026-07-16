import { MapPin } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/shared/status-badge";
import { TierBadge } from "@/components/shared/tier-badge";
import { Money } from "@/components/shared/money";
import { SECTION_LABEL, type SectionCode } from "@/types/domain";
import type { MapLot } from "./types";

export function LotDetailSheet({
  lot,
  open,
  onOpenChange,
  onLocateOnMap,
}: {
  lot: MapLot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocateOnMap?: (lot: MapLot) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {lot ? (
          <>
            <SheetHeader>
              <SheetTitle>{lot.displayId}</SheetTitle>
              <SheetDescription>
                {SECTION_LABEL[lot.section as SectionCode] ?? lot.section}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 px-4">
              <div className="flex items-center gap-2">
                <StatusBadge status={lot.status} />
                <TierBadge tier={lot.tier} />
              </div>

              <div className="rounded-2xl border border-hairline bg-muted p-4">
                <div className="text-xs text-muted-foreground">Base price</div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  <Money centavos={lot.priceCents} />
                </div>
              </div>

              {lot.clientName ? (
                <div className="rounded-2xl border border-hairline p-4">
                  <div className="text-xs text-muted-foreground">Client</div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {lot.clientName}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-hairline p-4 text-sm text-muted-foreground">
                  This lot is not currently assigned to a client.
                </div>
              )}

              {onLocateOnMap && (
                <button
                  onClick={() => onLocateOnMap(lot)}
                  className="flex items-center justify-center gap-2 rounded-full border border-hairline px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
                >
                  <MapPin className="size-4" strokeWidth={2} />
                  Locate on real map
                </button>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
