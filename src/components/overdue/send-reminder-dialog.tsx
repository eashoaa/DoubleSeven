"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sendReminderAction } from "@/server/actions/reminders";
import { renderReminderTemplate } from "@/lib/domain/reminder-template";
import type { ReminderTemplate } from "@/lib/domain/reminder-template";
import { RequiredLegend } from "@/components/shared/required-legend";
import { useLanguage } from "@/lib/i18n/language-context";

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function SendReminderDialog({
  contractId,
  clientName,
  lotDisplayId,
  overdueDays,
  amountDue,
  templates,
}: {
  contractId: string;
  clientName: string;
  lotDisplayId: string;
  overdueDays: number;
  amountDue: string;
  templates: ReminderTemplate[];
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState(templates[0].id);
  const activeTemplate = templates.find((tpl) => tpl.id === templateId) ?? templates[0];
  const [subject, setSubject] = useState(activeTemplate.subject);
  const [body, setBody] = useState(
    renderReminderTemplate(activeTemplate.body, { clientName, lotDisplayId, overdueDays, amountDue })
  );
  const [toEmail, setToEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function selectTemplate(id: string) {
    setTemplateId(id);
    const tpl = templates.find((x) => x.id === id) ?? templates[0];
    setSubject(tpl.subject);
    setBody(renderReminderTemplate(tpl.body, { clientName, lotDisplayId, overdueDays, amountDue }));
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await sendReminderAction({ ok: false, error: null }, formData);
      if (result.ok) {
        toast.success(`Reminder sent to ${clientName}`);
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
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-sm font-medium text-foreground hover:bg-accent"
        )}
      >
        <Mail className="size-3.5" strokeWidth={2} />
        {t("button.sendReminder")}
      </button>
      <DialogContent className="sm:max-w-lg">
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="contractId" value={contractId} />
          <input type="hidden" name="clientName" value={clientName} />
          <input type="hidden" name="lotDisplayId" value={lotDisplayId} />
          <input type="hidden" name="overdueDays" value={overdueDays} />
          <input type="hidden" name="amountDue" value={amountDue} />
          <input type="hidden" name="channel" value="email" />
          <input type="hidden" name="toPhone" value="" />

          <DialogHeader>
            <DialogTitle>Send payment reminder</DialogTitle>
            <DialogDescription>
              To {clientName} · {lotDisplayId} · {overdueDays}d overdue
            </DialogDescription>
          </DialogHeader>

          <RequiredLegend />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="templateId">Template</Label>
            <select
              id="templateId"
              value={templateId}
              onChange={(e) => selectTemplate(e.target.value)}
              className={selectClass}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="toEmail" required>Client email</Label>
            <Input
              id="toEmail"
              name="toEmail"
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="No email on file, enter one to send"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject" required>Subject</Label>
            <Input id="subject" name="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="body" required>Message</Label>
            <Textarea
              id="body"
              name="body"
              rows={8}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center justify-center rounded-full bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send email"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
