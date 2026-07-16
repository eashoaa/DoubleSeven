"use client";

import { useState, useTransition } from "react";
import { Banknote } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/shared/money";
import { recordCommissionPayoutAction, type AgentActionState } from "@/server/actions/agents";

const initialState: AgentActionState = { error: null, success: false };

export function RecordPayoutDialog({
  agentId,
  agentName,
  balanceCents,
}: {
  agentId: string;
  agentName: string;
  balanceCents: number;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await recordCommissionPayoutAction(initialState, formData);
      if (result.success) {
        toast.success("Payout recorded");
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" disabled={balanceCents <= 0} onClick={() => setOpen(true)}>
        <Banknote className="size-3.5" strokeWidth={2} />
        Record payout
      </Button>
      <DialogContent className="sm:max-w-sm">
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="agentId" value={agentId} />
          <input type="hidden" name="agentName" value={agentName} />
          <DialogHeader>
            <DialogTitle>Pay out commission — {agentName}</DialogTitle>
            <DialogDescription>
              Balance due: <Money centavos={balanceCents} />
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amountPesos">Amount (₱)</Label>
            <Input
              id="amountPesos"
              name="amountPesos"
              type="number"
              step="0.01"
              min="0.01"
              max={balanceCents / 100}
              defaultValue={balanceCents / 100}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" name="note" rows={2} />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center justify-center rounded-full bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Record payout"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
