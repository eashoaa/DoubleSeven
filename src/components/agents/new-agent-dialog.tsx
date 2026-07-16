"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredLegend } from "@/components/shared/required-legend";
import { createAgentAction, type AgentActionState } from "@/server/actions/agents";

const initialState: AgentActionState = { error: null, success: false };

export function NewAgentDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createAgentAction(initialState, formData);
      if (result.success) {
        toast.success("Agent added");
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
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Plus className="size-4" strokeWidth={2.5} />
        Add agent
      </button>
      <DialogContent className="sm:max-w-md">
        <form action={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add a sales agent</DialogTitle>
            <DialogDescription>Their commission rate applies to every client tagged to them.</DialogDescription>
          </DialogHeader>

          <RequiredLegend />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" required>Full name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="commissionRatePercent" required>Commission rate (%)</Label>
              <Input
                id="commissionRatePercent"
                name="commissionRatePercent"
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact">Contact number</Label>
              <Input id="contact" name="contact" placeholder="09xx xxx xxxx" />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center justify-center rounded-full bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Add agent"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
