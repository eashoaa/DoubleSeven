"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateRequisitionThresholdAction,
  type UpdateThresholdState,
} from "@/server/actions/requisitions";

const initialState: UpdateThresholdState = { error: null, success: false };

export function RequisitionThresholdForm({ thresholdCents }: { thresholdCents: number }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateRequisitionThresholdAction(initialState, formData);
      if (result.success) {
        toast.success("Requisition threshold updated");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="shadow-card flex flex-col gap-4 rounded-2xl border border-hairline bg-card p-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Requisition approval threshold</h2>
        <p className="text-sm text-muted-foreground">
          Requisitions at or above this amount need admin approval before they&apos;re booked as an expense.
        </p>
      </div>
      <form action={handleSubmit} className="flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="thresholdPesos">Threshold (₱)</Label>
          <Input
            id="thresholdPesos"
            name="thresholdPesos"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={thresholdCents / 100}
            className="w-40"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
