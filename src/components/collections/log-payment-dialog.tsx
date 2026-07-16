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
import { Textarea } from "@/components/ui/textarea";
import { ClientCombobox } from "@/components/shared/client-combobox";
import { RequiredLegend } from "@/components/shared/required-legend";
import { recordCollectionAction, type RecordCollectionState } from "@/server/actions/collections";

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const initialState: RecordCollectionState = { error: null, success: false };

export function LogPaymentDialog({
  clients,
}: {
  clients: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const clientId = String(formData.get("clientId") ?? "");
    const client = clients.find((c) => c.id === clientId);
    if (client) formData.set("clientName", client.name);

    startTransition(async () => {
      const result = await recordCollectionAction(initialState, formData);
      if (result.success) {
        toast.success("Payment logged");
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
        Log payment
      </button>
      <DialogContent className="sm:max-w-md">
        <form action={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Log a payment</DialogTitle>
            <DialogDescription>Record cash, bank, check, or GCash collections.</DialogDescription>
          </DialogHeader>

          <RequiredLegend />

          <div className="flex flex-col gap-1.5">
            <Label required>Client</Label>
            <ClientCombobox clients={clients} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lotDisplayId">Lot (optional)</Label>
              <Input id="lotDisplayId" name="lotDisplayId" placeholder="A50" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" defaultValue="payment" className={selectClass}>
                <option value="payment">Payment</option>
                <option value="downpayment">Downpayment</option>
                <option value="reservation">Reservation</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amountPesos" required>Amount (₱)</Label>
              <Input id="amountPesos" name="amountPesos" type="number" step="0.01" min="0.01" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="method">Method</Label>
              <select id="method" name="method" defaultValue="cash" className={selectClass}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="check">Check</option>
                <option value="gcash">GCash</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="orNumber">OR number</Label>
            <Input id="orNumber" name="orNumber" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" name="note" rows={2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="receipt">Receipt photo (optional)</Label>
            <input
              id="receipt"
              name="receipt"
              type="file"
              accept="image/*,application/pdf"
              className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-secondary-foreground"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center justify-center rounded-full bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Log payment"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
