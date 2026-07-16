"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
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
import { updateClientContactAction, type UpdateContactState } from "@/server/actions/clients";

const initialState: UpdateContactState = { error: null, success: false };

export function EditContactDialog({
  clientId,
  clientName,
  contact,
  email,
}: {
  clientId: string;
  clientName: string;
  contact: string | null;
  email: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateClientContactAction(initialState, formData);
      if (result.success) {
        toast.success("Contact info saved");
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
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-hairline px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Pencil className="size-3" strokeWidth={2} />
        {contact || email ? "Edit" : "Add contact"}
      </button>
      <DialogContent className="sm:max-w-sm">
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="clientName" value={clientName} />
          <DialogHeader>
            <DialogTitle>{clientName}</DialogTitle>
            <DialogDescription>
              Add contact info as you collect it, the source data doesn&apos;t include any.
            </DialogDescription>
          </DialogHeader>

          <p className="-mt-1 text-xs text-muted-foreground">
            <span className="text-destructive">*</span> Fill in at least one of contact number or email
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact">Contact number</Label>
            <Input id="contact" name="contact" defaultValue={contact ?? ""} placeholder="09xx xxx xxxx" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={email ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center justify-center rounded-full bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
