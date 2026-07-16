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
import { createRequisitionAction, type RequisitionActionState } from "@/server/actions/requisitions";

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const initialState: RequisitionActionState = { error: null, success: false };

const CATEGORIES = [
  "Office supplies",
  "Utilities",
  "Maintenance/Grounds",
  "Transportation",
  "Marketing",
  "Staff/Payroll",
  "Repairs",
  "Capital expenditure",
  "Other",
];

export function FileRequisitionDialog({ thresholdCents }: { thresholdCents: number }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createRequisitionAction(initialState, formData);
      if (result.success) {
        toast.success("Requisition filed");
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
        File requisition
      </button>
      <DialogContent className="sm:max-w-md">
        <form action={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>File a requisition</DialogTitle>
            <DialogDescription>
              ₱{(thresholdCents / 100).toLocaleString()} and above needs admin approval before it&apos;s booked as
              an expense. Below that, it&apos;s recorded right away.
            </DialogDescription>
          </DialogHeader>

          <RequiredLegend />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description" required>Description</Label>
            <Input id="description" name="description" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category</Label>
              <select id="category" name="category" defaultValue="Other" className={selectClass}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vendor">Vendor</Label>
              <Input id="vendor" name="vendor" placeholder="Supplier / payee" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amountPesos" required>Amount (₱)</Label>
              <Input id="amountPesos" name="amountPesos" type="number" step="0.01" min="0.01" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paidFrom">Paid from</Label>
              <select id="paidFrom" name="paidFrom" defaultValue="bank" className={selectClass}>
                <option value="petty_cash">Petty cash</option>
                <option value="bank">Bank</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supportingDoc" required>Supporting document</Label>
            <input
              id="supportingDoc"
              name="supportingDoc"
              type="file"
              accept="image/*,application/pdf"
              required
              className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-secondary-foreground"
            />
            <p className="text-xs text-muted-foreground">Quotation, invoice, or receipt — a photo is fine.</p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center justify-center rounded-full bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Filing…" : "File requisition"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
