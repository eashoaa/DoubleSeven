"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCashAccountAction, type CashAccountActionState, type CashAccount } from "@/server/actions/cash-accounts";

const initialState: CashAccountActionState = { error: null, success: false };

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function CashAccountsForm({ accounts }: { accounts: CashAccount[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCashAccountAction(initialState, formData);
      if (result.success) {
        toast.success("Cash account added");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="shadow-card flex flex-col gap-4 rounded-2xl border border-hairline bg-card p-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Cash accounts</h2>
        <p className="text-sm text-muted-foreground">
          Where collections actually land — pick one when marking a payment as deposited.
        </p>
      </div>

      {accounts.length > 0 ? (
        <ul className="flex flex-col divide-y divide-hairline">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 text-sm">
              <span className="font-medium text-foreground">{a.name}</span>
              <span className="text-muted-foreground capitalize">{a.kind}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No accounts yet — &ldquo;Mark deposited&rdquo; will stay a plain one-click action until you add one.
        </p>
      )}

      <form action={handleSubmit} className="flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="BDO Savings" className="w-48" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kind">Kind</Label>
          <select id="kind" name="kind" defaultValue="bank" className={selectClass}>
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add"}
        </button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
