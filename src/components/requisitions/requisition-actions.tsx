"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { approveRequisitionAction, rejectRequisitionAction } from "@/server/actions/requisitions";

export function RequisitionActions({ id }: { id: string }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejecting(true)}>
          <X className="size-3.5" strokeWidth={2} />
          Reject
        </Button>
        <Button size="sm" disabled={pending} onClick={() => startTransition(() => approveRequisitionAction(id))}>
          <Check className="size-3.5" strokeWidth={2} />
          Approve
        </Button>
      </div>

      <Dialog open={rejecting} onOpenChange={setRejecting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject requisition</DialogTitle>
          </DialogHeader>
          <div className="px-4">
            <Textarea
              placeholder="Reason for rejecting this requisition…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            <Button
              disabled={!reason.trim() || pending}
              onClick={() =>
                startTransition(async () => {
                  await rejectRequisitionAction(id, reason.trim());
                  setRejecting(false);
                  setReason("");
                })
              }
            >
              Reject requisition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
