"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePenaltySettingsAction, type PenaltyActionState } from "@/server/actions/penalties";

const initialState: PenaltyActionState = { error: null, success: false };

export function PenaltySettingsForm({
  ratePercent,
  gracePeriodDays,
}: {
  ratePercent: number;
  gracePeriodDays: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updatePenaltySettingsAction(initialState, formData);
      if (result.success) {
        toast.success("Penalty settings updated");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="shadow-card flex flex-col gap-4 rounded-2xl border border-hairline bg-card p-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Late payment penalty</h2>
        <p className="text-sm text-muted-foreground">
          Charged automatically once an overdue installment clears the grace period — no one has to impose it
          manually. Applies once per missed installment, on the missed amount only. Waivable per-penalty from a
          client&apos;s page.
        </p>
      </div>
      <form action={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ratePercent">Rate (%)</Label>
          <Input
            id="ratePercent"
            name="ratePercent"
            type="number"
            step="0.1"
            min="0"
            required
            defaultValue={ratePercent}
            className="w-28"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gracePeriodDays">Grace period (days)</Label>
          <Input
            id="gracePeriodDays"
            name="gracePeriodDays"
            type="number"
            step="1"
            min="0"
            required
            defaultValue={gracePeriodDays}
            className="w-28"
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
