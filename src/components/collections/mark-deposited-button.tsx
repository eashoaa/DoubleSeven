"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { markDepositedAction } from "@/server/actions/collections";

export function MarkDepositedButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markDepositedAction(id);
          toast.success("Marked as deposited");
        })
      }
      className="rounded-full border border-hairline px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-60"
    >
      {pending ? "Saving…" : "Mark deposited"}
    </button>
  );
}
