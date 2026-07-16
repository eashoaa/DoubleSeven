"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { isBrevoConfigured, sendReminderEmail, sendReminderSms } from "@/lib/integrations/brevo";
import { renderReminderTemplate, REMINDER_TEMPLATES } from "@/lib/domain/reminder-template";
import {
  getReminderSettings,
  saveReminderSettings,
  logReminder,
  type ReminderSettings,
} from "@/lib/server/local-store";

export interface SendReminderState {
  ok: boolean;
  error: string | null;
}

export async function sendReminderAction(
  _prev: SendReminderState,
  formData: FormData
): Promise<SendReminderState> {
  const contractId = String(formData.get("contractId") ?? "");
  const clientName = String(formData.get("clientName") ?? "");
  const lotDisplayId = String(formData.get("lotDisplayId") ?? "");
  const overdueDays = Number(formData.get("overdueDays") ?? 0);
  const amountDue = String(formData.get("amountDue") ?? "");
  const channel = String(formData.get("channel") ?? "email") as "email" | "sms";
  const toEmail = String(formData.get("toEmail") ?? "");
  const toPhone = String(formData.get("toPhone") ?? "");
  const subject = String(formData.get("subject") ?? "");
  const body = String(formData.get("body") ?? "");

  const user = await getCurrentUser();

  if (!isBrevoConfigured()) {
    await logReminder({
      contractId,
      clientName,
      channel,
      ok: false,
      error: "Brevo API key not configured.",
      sentBy: user.name,
    });
    revalidatePath("/overdue");
    return {
      ok: false,
      error:
        "Brevo isn't connected yet (BREVO_API_KEY is unset). Add it to .env.local and this will start sending for real.",
    };
  }

  const rendered = renderReminderTemplate(body, { clientName, lotDisplayId, overdueDays, amountDue });

  const result =
    channel === "email"
      ? await sendReminderEmail({ toEmail, toName: clientName, subject, htmlBody: rendered.replace(/\n/g, "<br/>") })
      : await sendReminderSms({ toPhone, message: rendered });

  await logReminder({
    contractId,
    clientName,
    channel,
    ok: result.ok,
    error: result.error,
    sentBy: user.name,
  });
  revalidatePath("/overdue");

  return { ok: result.ok, error: result.error };
}

export interface SaveSettingsState {
  ok: boolean;
  error: string | null;
}

export async function saveReminderSettingsAction(
  _prev: SaveSettingsState,
  formData: FormData
): Promise<SaveSettingsState> {
  const automationEnabled = formData.get("automationEnabled") === "on";
  const automationTemplateId = String(formData.get("automationTemplateId") ?? REMINDER_TEMPLATES[0].id);

  const templateOverrides: ReminderSettings["templateOverrides"] = {};
  for (const t of REMINDER_TEMPLATES) {
    const subject = String(formData.get(`subject:${t.id}`) ?? "").trim();
    const body = String(formData.get(`body:${t.id}`) ?? "").trim();
    if (!subject || !body) {
      return { ok: false, error: `"${t.name}" needs both a subject and a body.` };
    }
    templateOverrides[t.id] = { subject, body };
  }

  const user = await getCurrentUser();
  const settings: ReminderSettings = { templateOverrides, automationEnabled, automationTemplateId };
  await saveReminderSettings(settings, user.name);
  revalidatePath("/overdue");
  return { ok: true, error: null };
}

export async function getReminderSettingsForPage() {
  return getReminderSettings();
}
