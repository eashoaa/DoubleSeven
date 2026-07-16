/**
 * Brevo (formerly Sendinblue) email + SMS client. Thin fetch wrapper, no SDK
 * dependency. Reads BREVO_API_KEY from the environment; until it's set,
 * every send function returns a clear "not configured" error instead of
 * throwing or silently no-op'ing, so callers can show the user why nothing
 * sent. Set it in .env.local (see .env.local.example) and everything here
 * starts working with no other code changes.
 *
 * Docs: https://developers.brevo.com/reference/sendtransacemail
 *       https://developers.brevo.com/reference/sendtransacsms
 */

const BREVO_API_BASE = "https://api.brevo.com/v3";

export interface SendResult {
  ok: boolean;
  error: string | null;
  messageId?: string;
}

export function isBrevoConfigured(): boolean {
  return !!process.env.BREVO_API_KEY;
}

export async function sendReminderEmail(input: {
  toEmail: string;
  toName: string;
  subject: string;
  htmlBody: string;
}): Promise<SendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "BREVO_API_KEY is not set. Email sending isn't configured yet." };
  }
  const fromEmail = process.env.BREVO_SENDER_EMAIL || "noreply@doubleseven.example";
  const fromName = process.env.BREVO_SENDER_NAME || "Double Seven Heaven's Gate";

  try {
    const res = await fetch(`${BREVO_API_BASE}/smtp/email`, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email: input.toEmail, name: input.toName }],
        subject: input.subject,
        htmlContent: input.htmlBody,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Brevo email failed (${res.status}): ${body}` };
    }
    const data = (await res.json()) as { messageId?: string };
    return { ok: true, error: null, messageId: data.messageId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error sending email." };
  }
}

export async function sendReminderSms(input: {
  toPhone: string;
  message: string;
}): Promise<SendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "BREVO_API_KEY is not set. SMS sending isn't configured yet." };
  }
  const sender = process.env.BREVO_SMS_SENDER || "D7HeavensGate";

  try {
    const res = await fetch(`${BREVO_API_BASE}/transactionalSMS/sms`, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender,
        recipient: input.toPhone,
        content: input.message,
        type: "transactional",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Brevo SMS failed (${res.status}): ${body}` };
    }
    const data = (await res.json()) as { messageId?: string };
    return { ok: true, error: null, messageId: data.messageId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error sending SMS." };
  }
}
