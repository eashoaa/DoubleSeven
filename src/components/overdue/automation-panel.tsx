"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { saveReminderSettingsAction } from "@/server/actions/reminders";
import { REMINDER_TEMPLATES } from "@/lib/domain/reminder-template";
import type { ReminderSettings } from "@/lib/server/local-store";

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AutomationPanel({
  settings,
  brevoConfigured,
}: {
  settings: ReminderSettings;
  brevoConfigured: boolean;
}) {
  const [enabled, setEnabled] = useState(settings.automationEnabled);
  const [activeTemplateId, setActiveTemplateId] = useState(REMINDER_TEMPLATES[0].id);
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(
      REMINDER_TEMPLATES.map((t) => [
        t.id,
        {
          subject: settings.templateOverrides[t.id]?.subject ?? t.subject,
          body: settings.templateOverrides[t.id]?.body ?? t.body,
        },
      ])
    )
  );
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await saveReminderSettingsAction({ ok: false, error: null }, formData);
      if (result.ok) toast.success("Reminder settings saved");
      else toast.error(result.error ?? "Failed to save");
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-hairline bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Automated monthly reminders</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            When enabled, every overdue client is emailed automatically on the schedule you wire up
            (see <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/cron/send-overdue-reminders</code>).
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {!brevoConfigured && (
        <div className="rounded-xl border border-dashed border-hairline bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Brevo isn&apos;t connected yet: set <code className="rounded bg-muted px-1 py-0.5">BREVO_API_KEY</code> (and
          optionally <code className="rounded bg-muted px-1 py-0.5">BREVO_SENDER_EMAIL</code>,{" "}
          <code className="rounded bg-muted px-1 py-0.5">BREVO_SMS_SENDER</code>) in <code>.env.local</code>. Templates
          and this toggle save now, but nothing will send until that key exists.
        </div>
      )}

      <form action={handleSubmit} className="flex flex-col gap-3">
        <input type="hidden" name="automationEnabled" value={enabled ? "on" : "off"} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="automationTemplateId">Template used for automated sends</Label>
          <select id="automationTemplateId" name="automationTemplateId" defaultValue={settings.automationTemplateId} className={selectClass}>
            {REMINDER_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="inline-flex w-fit rounded-full border border-hairline bg-muted/50 p-1 text-sm">
          {REMINDER_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTemplateId(t.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 font-medium text-muted-foreground transition-colors",
                activeTemplateId === t.id && "bg-primary text-primary-foreground"
              )}
            >
              {t.name}
            </button>
          ))}
        </div>

        {REMINDER_TEMPLATES.map((t) => (
          <div key={t.id} className={cn("flex flex-col gap-3", activeTemplateId !== t.id && "hidden")}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`subject-${t.id}`} required>Subject</Label>
              <Input
                id={`subject-${t.id}`}
                name={`subject:${t.id}`}
                value={drafts[t.id].subject}
                onChange={(e) => setDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], subject: e.target.value } }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`body-${t.id}`} required>
                Body: <code className="text-xs">{"{{clientName}}"}</code>, <code className="text-xs">{"{{lotDisplayId}}"}</code>,{" "}
                <code className="text-xs">{"{{overdueDays}}"}</code>, <code className="text-xs">{"{{amountDue}}"}</code>
              </Label>
              <Textarea
                id={`body-${t.id}`}
                name={`body:${t.id}`}
                rows={6}
                value={drafts[t.id].body}
                onChange={(e) => setDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], body: e.target.value } }))}
              />
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-full bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
