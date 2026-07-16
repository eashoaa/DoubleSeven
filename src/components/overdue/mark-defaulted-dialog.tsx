"use client";

import { useState, useTransition } from "react";
import { ShieldAlert } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { markDefaultedAction } from "@/server/actions/contracts";
import { RequiredLegend } from "@/components/shared/required-legend";
import { useLanguage } from "@/lib/i18n/language-context";

export function MarkDefaultedDialog({
  contractId,
  clientName,
  lotDisplayId,
}: {
  contractId: string;
  clientName: string;
  lotDisplayId: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await markDefaultedAction({ ok: false, error: null }, formData);
      if (result.ok) {
        toast.success(`Marked ${clientName} as defaulted`);
        setOpen(false);
        setReason("");
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
        className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
      >
        <ShieldAlert className="size-3.5" strokeWidth={2} />
        {t("button.markDefaulted")}
      </button>
      <DialogContent className="sm:max-w-lg">
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="contractId" value={contractId} />
          <input type="hidden" name="clientName" value={clientName} />
          <input type="hidden" name="lotDisplayId" value={lotDisplayId} />

          <DialogHeader>
            <DialogTitle>Mark account as defaulted</DialogTitle>
            <DialogDescription>
              {clientName} &middot; {lotDisplayId}. This flags the account as defaulted right away, ahead of the
              automatic schedule.
            </DialogDescription>
          </DialogHeader>

          <RequiredLegend />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason" required>
              Reason
            </Label>
            <Textarea
              id="reason"
              name="reason"
              rows={4}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this account being marked defaulted?"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <button
              type="submit"
              disabled={pending || !reason.trim()}
              className="flex items-center justify-center rounded-full bg-destructive px-5 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Saving…" : t("button.markDefaulted")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
