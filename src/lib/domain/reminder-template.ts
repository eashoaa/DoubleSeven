/** Pure, client-safe, no Node built-ins, unlike lib/server/local-store.ts. */

export interface ReminderTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export const REMINDER_TEMPLATES: ReminderTemplate[] = [
  {
    id: "due-reminder",
    name: "Payment due reminder",
    subject: "Your Heaven's Gate payment is coming up",
    body: `Hi {{clientName}},

This is a friendly reminder that your monthly amortization for lot {{lotDisplayId}} (₱{{amountDue}}) is due soon.

Please settle this on or before the due date to keep your contract in good standing. If you've already paid, kindly disregard this message.

Thank you,
Double Seven Heaven's Gate`,
  },
  {
    id: "overdue-warning",
    name: "Overdue: 30-day default warning",
    subject: "URGENT: Your Heaven's Gate account is overdue",
    body: `Hi {{clientName}},

Our records show your monthly amortization for lot {{lotDisplayId}} is now {{overdueDays}} days past due (₱{{amountDue}}).

Please settle this immediately. If payment is not received within 30 days of this notice, your contract may be considered in default and subject to termination per its terms.

If you've already paid, or need to arrange a payment plan, please contact us right away so we can update our records.

Thank you,
Double Seven Heaven's Gate`,
  },
];

export const DEFAULT_TEMPLATE_ID = REMINDER_TEMPLATES[0].id;

export function getTemplateById(id: string): ReminderTemplate {
  return REMINDER_TEMPLATES.find((t) => t.id === id) ?? REMINDER_TEMPLATES[0];
}

export function renderReminderTemplate(
  template: string,
  vars: { clientName: string; lotDisplayId: string; overdueDays: number; amountDue: string }
): string {
  return template
    .replaceAll("{{clientName}}", vars.clientName)
    .replaceAll("{{lotDisplayId}}", vars.lotDisplayId)
    .replaceAll("{{overdueDays}}", String(vars.overdueDays))
    .replaceAll("{{amountDue}}", vars.amountDue);
}
