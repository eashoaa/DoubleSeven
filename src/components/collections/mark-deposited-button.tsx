"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { markDepositedAction, undoMarkDepositedAction } from "@/server/actions/collections";
import type { CashAccount } from "@/server/actions/cash-accounts";

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function MarkDepositedButton({
  id,
  deposited,
  accounts = [],
}: {
  id: string;
  deposited: boolean;
  accounts?: CashAccount[];
}) {
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
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

  function markDeposited(withAccountId?: string) {
    startTransition(async () => {
      await markDepositedAction(id, withAccountId);
      toast.success("Marked as deposited");
      setOpen(false);
    });
  }

  if (accounts.length === 0) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => markDeposited()}
        className="rounded-full border border-hairline px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-60"
      >
        {pending ? "Saving…" : "Mark deposited"}
      </button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-hairline px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
      >
        Mark deposited
      </button>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Which account?</DialogTitle>
        </DialogHeader>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className={selectClass}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.kind})
            </option>
          ))}
        </select>
        <DialogFooter>
          <button
            type="button"
            disabled={pending}
            onClick={() => markDeposited(accountId)}
            className="flex items-center justify-center rounded-full bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Mark deposited"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
