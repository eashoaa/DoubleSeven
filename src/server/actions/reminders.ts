"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/server/audit";
import { isBrevoConfigured, sendReminderEmail, sendReminderSms } from "@/lib/integrations/brevo";
import { renderReminderTemplate, REMINDER_TEMPLATES, DEFAULT_TEMPLATE_ID } from "@/lib/domain/reminder-template";

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
  const supabase = await createClient();

  async function log(ok: boolean, error: string | null) {
    await supabase.from("reminder_log").insert({
      contract_id: contractId || null,
      client_name: clientName,
      channel,
      ok,
      error,
      sent_by: user.id,
    });
    await logAudit({
      action: ok ? "reminder.sent" : "reminder.failed",
      entityType: "reminder",
      entityId: contractId || "unknown",
      userId: user.id,
      summary: ok
        ? `Sent ${channel} reminder to ${clientName}`
        : `Failed to send ${channel} reminder to ${clientName}: ${error}`,
    });
  }

  if (!isBrevoConfigured()) {
    await log(false, "Brevo API key not configured.");
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

  await log(result.ok, result.error);
  revalidatePath("/overdue");

  return { ok: result.ok, error: result.error };
}

export interface SaveSettingsState {
  ok: boolean;
  error: string | null;
}

interface ReminderSettings {
  templateOverrides: Record<string, { subject: string; body: string }>;
  automationEnabled: boolean;
  automationTemplateId: string;
}

export async function saveReminderSettingsAction(
  _prev: SaveSettingsState,
  formData: FormData
): Promise<SaveSettingsState> {
  const automationEnabled = formData.get("automationEnabled") === "on";
  const automationTemplateId = String(formData.get("automationTemplateId") ?? DEFAULT_TEMPLATE_ID);

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
  if (user.role !== "admin") {
    return { ok: false, error: "Only admins can change reminder settings." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("reminder_settings")
    .update({
      automation_enabled: automationEnabled,
      automation_template_id: automationTemplateId,
      template_overrides: templateOverrides,
    })
    .eq("id", true);
  if (error) {
    return { ok: false, error: error.message };
  }

  await logAudit({
    action: "reminder_settings.updated",
    entityType: "settings",
    entityId: "reminder-settings",
    userId: user.id,
    summary: automationEnabled
      ? "Enabled automated monthly payment reminders"
      : "Updated reminder template / disabled automation",
  });

  revalidatePath("/overdue");
  return { ok: true, error: null };
}

export async function getReminderSettingsForPage(): Promise<ReminderSettings> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { getReminderSettings } = await import("@/lib/server/local-store");
    return getReminderSettings();
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("reminder_settings")
    .select("automation_enabled, automation_template_id, template_overrides")
    .eq("id", true)
    .single();

  return {
    automationEnabled: data?.automation_enabled ?? false,
    automationTemplateId: data?.automation_template_id ?? DEFAULT_TEMPLATE_ID,
    templateOverrides: data?.template_overrides ?? {},
  };
}

/** Merges saved overrides onto the built-in templates for display/editing. */
export async function getEffectiveTemplatesForPage() {
  const settings = await getReminderSettingsForPage();
  return REMINDER_TEMPLATES.map((t) => ({
    ...t,
    subject: settings.templateOverrides[t.id]?.subject ?? t.subject,
    body: settings.templateOverrides[t.id]?.body ?? t.body,
  }));
}
