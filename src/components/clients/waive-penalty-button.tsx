"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { waivePenaltyAction, type PenaltyActionState } from "@/server/actions/penalties";

const initialState: PenaltyActionState = { error: null, success: false };

export function WaivePenaltyButton({ penaltyId }: { penaltyId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await waivePenaltyAction(initialState, formData);
      if (result.success) {
        toast.success("Penalty waived");
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="rounded-full border border-status-defaulted-fg/30 px-2.5 py-1 text-xs font-medium text-status-defaulted-fg hover:bg-status-defaulted-fg/10"
      >
        Waive
      </button>
      <DialogContent className="sm:max-w-sm">
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="penaltyId" value={penaltyId} />
          <DialogHeader>
            <DialogTitle>Waive this penalty</DialogTitle>
            <DialogDescription>
              This is logged with your name and the reason — it stays a company decision, not a silent removal.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">Reason</Label>
            <textarea
              id="reason"
              name="reason"
              required
              rows={3}
              className="rounded-xl border border-hairline bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
              placeholder="e.g. client had a payment arrangement approved by admin"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center justify-center rounded-full bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Waiving…" : "Waive penalty"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
