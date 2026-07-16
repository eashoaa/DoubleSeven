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

// Matches the public.transaction_type enum — deliberately exhaustive (no
// catch-all "other"), see 20260714000001_extensions_and_enums.sql.
const ALL_TYPES = [
  { value: "downpayment", label: "Downpayment" },
  { value: "reservation", label: "Reservation" },
  { value: "amortization", label: "Payment (installment)" },
  { value: "spotcash", label: "Spot cash" },
  { value: "discounted", label: "Discounted" },
] as const;

// RLS (transactions_insert) only allows marketing to record reservations —
// mirror that here so it's a clear UI constraint, not a server rejection.
const MARKETING_TYPES = ALL_TYPES.filter((t) => t.value === "reservation");

export function LogPaymentDialog({
  clients,
  requireReceipt = false,
  restrictToReservation = false,
}: {
  clients: { id: string; name: string }[];
  requireReceipt?: boolean;
  restrictToReservation?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const typeOptions = restrictToReservation ? MARKETING_TYPES : ALL_TYPES;

  function handleSubmit(formData: FormData) {
    setError(null);
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
              <Label htmlFor="lotDisplayId" required>Lot</Label>
              <Input id="lotDisplayId" name="lotDisplayId" placeholder="A50" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" defaultValue={typeOptions[0].value} className={selectClass}>
                {typeOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discountPesos">Discount (₱)</Label>
              <Input id="discountPesos" name="discountPesos" type="number" step="0.01" min="0" defaultValue={0} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discountReason">Discount reason</Label>
              <Input id="discountReason" name="discountReason" />
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
            <Label htmlFor="receipt" required={requireReceipt}>
              {requireReceipt ? "Receipt / OR photo" : "Receipt photo (optional)"}
            </Label>
            <input
              id="receipt"
              name="receipt"
              type="file"
              accept="image/*,application/pdf"
              required={requireReceipt}
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
