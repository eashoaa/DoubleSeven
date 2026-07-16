"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { markDepositedAction, undoMarkDepositedAction } from "@/server/actions/collections";

export function MarkDepositedButton({ id, deposited }: { id: string; deposited: boolean }) {
  const [pending, startTransition] = useTransition();

  if (deposited) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Deposited</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await undoMarkDepositedAction(id);
              toast.success("Undone — no longer marked as deposited");
            })
          }
          className="text-xs font-medium text-muted-foreground underline decoration-dotted hover:text-foreground disabled:opacity-60"
        >
          {pending ? "…" : "Undo"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markDepositedAction(id);
          toast.success("Marked as deposited");
        })
      }
      className="rounded-full border border-hairline px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-60"
    >
      {pending ? "Saving…" : "Mark deposited"}
    </button>
  );
}
