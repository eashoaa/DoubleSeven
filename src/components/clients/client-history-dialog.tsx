"use client";

import { useState, useTransition } from "react";
import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Money } from "@/components/shared/money";
import { formatDate } from "@/lib/format";
import { getClientHistoryAction, type ClientHistoryRow } from "@/server/actions/client-history";

export function ClientHistoryDialog({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ClientHistoryRow[] | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpen() {
    setOpen(true);
    if (rows === null) {
      startTransition(async () => {
        setRows(await getClientHistoryAction(clientId, clientName));
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 rounded-full border border-hairline px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
      >
        <History className="size-3.5" strokeWidth={2} />
        History
      </button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{clientName}</DialogTitle>
          <DialogDescription>Payment history</DialogDescription>
        </DialogHeader>

        {pending || rows === null ? (
          <p className="px-1 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">No payments on record for this client.</p>
        ) : (
          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-hairline px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium text-foreground capitalize">
                    {r.type.replace(/_/g, " ")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(r.date)} · {r.lotDisplayId}
                    {r.method ? ` · ${r.method.replace(/_/g, " ")}` : ""}
                  </div>
                </div>
                <Money centavos={r.amountCents} className="text-sm font-medium text-foreground" />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
