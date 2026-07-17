"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import { verifyClientContactAction } from "@/server/actions/clients";

export function VerifyClientButton({
  clientId,
  verifiedAt,
}: {
  clientId: string;
  verifiedAt: string | null;
}) {
  const [pending, startTransition] = useTransition();

  if (verifiedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="size-3.5 text-status-active-fg" strokeWidth={2} />
        Verified {formatDate(verifiedAt)}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation();
        startTransition(async () => {
          await verifyClientContactAction(clientId);
          toast.success("Contact info marked as verified");
        });
      }}
      className="inline-flex items-center gap-1 rounded-full border border-dashed border-hairline px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-60"
    >
      {pending ? "Verifying…" : "Verify"}
    </button>
  );
}
