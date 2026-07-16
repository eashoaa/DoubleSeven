"use client";

import { useState, useTransition, type ReactNode } from "react";
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
import { createClientAction, type CreateClientState } from "@/server/actions/clients";
import { getAvailableLotsAction, type AvailableLot } from "@/server/actions/lots";
import { SplitLetters } from "@/components/layout/split-letters";
import { RequiredLegend } from "@/components/shared/required-legend";
import { useLanguage } from "@/lib/i18n/language-context";

const initialState: CreateClientState = { error: null, success: false };

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function NewClientDialog({ className, children }: { className?: string; children?: ReactNode }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [lots, setLots] = useState<AvailableLot[] | null>(null);
  const [selectedLot, setSelectedLot] = useState<AvailableLot | null>(null);

  function handleOpen() {
    setOpen(true);
    if (lots === null) {
      startTransition(async () => {
        const available = await getAvailableLotsAction();
        setLots(available);
      });
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createClientAction(initialState, formData);
      if (result.success) {
        toast.success("Client and contract created");
        setOpen(false);
        setSelectedLot(null);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={handleOpen} className={className}>
        {children ?? (
          <>
            <Plus className="size-4 shrink-0" strokeWidth={2.5} />
            <span className="sidebar-label overflow-hidden whitespace-nowrap">
              <SplitLetters text={t("newClient.button")} />
            </span>
          </>
        )}
      </button>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
        <form action={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-3">
          <DialogHeader>
            <DialogTitle>{t("newClient.title")}</DialogTitle>
            <DialogDescription>{t("newClient.desc")}</DialogDescription>
          </DialogHeader>

          <RequiredLegend />

          <div className="-mr-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" required>Full name</Label>
              <Input id="name" name="name" required placeholder="LAST, First" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact" required>Contact number</Label>
                <Input id="contact" name="contact" placeholder="09xx xxx xxxx" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" required>Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address" required>Address</Label>
              <Input id="address" name="address" required />
            </div>

            <div className="h-px bg-hairline" />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lotDisplayId" required>Lot</Label>
              <select
                id="lotDisplayId"
                name="lotDisplayId"
                required
                disabled={!lots}
                defaultValue=""
                onChange={(e) => setSelectedLot(lots?.find((l) => l.displayId === e.target.value) ?? null)}
                className={selectClass}
              >
                <option value="" disabled>
                  {lots ? "Select an available lot…" : "Loading available lots…"}
                </option>
                {lots?.map((l) => (
                  <option key={l.displayId} value={l.displayId}>
                    {l.displayId} · {l.sectionLabel} ({l.tier})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Picking a lot here marks it Reserved right away.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pricePesos" required>Contract price (₱)</Label>
                <Input
                  id="pricePesos"
                  name="pricePesos"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={selectedLot ? selectedLot.suggestedPriceCents / 100 : undefined}
                  key={selectedLot?.displayId ?? "no-lot"}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="downpaymentPesos" required>Downpayment (₱)</Label>
                <Input id="downpaymentPesos" name="downpaymentPesos" type="number" step="0.01" min="0" required defaultValue={0} />
                <p className="text-xs text-muted-foreground">Type 0 if nothing has been paid down yet.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="termMonths" required>Term (months)</Label>
                <Input id="termMonths" name="termMonths" type="number" min="1" step="1" required defaultValue={60} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="planType" required>Payment plan</Label>
                <select id="planType" name="planType" defaultValue="monthly" className={selectClass} required>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract" required>Signed contract (PDF)</Label>
              <input
                id="contract"
                name="contract"
                type="file"
                accept="application/pdf,image/*"
                required
                className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-secondary-foreground"
              />
              <p className="text-xs text-muted-foreground">A photo from your phone is fine, it doesn&apos;t need to be scanned.</p>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center justify-center rounded-full bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Creating…" : t("button.createClient")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
