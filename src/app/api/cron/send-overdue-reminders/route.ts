import { NextRequest, NextResponse } from "next/server";
import { getOverdueContractsMerged } from "@/lib/domain/dev-masterlist";
import { isBrevoConfigured, sendReminderEmail } from "@/lib/integrations/brevo";
import { getReminderSettings, getEffectiveTemplates, listLocalClients, logReminder } from "@/lib/server/local-store";
import { renderReminderTemplate } from "@/lib/domain/reminder-template";
import { formatMoney } from "@/lib/format";

/**
 * Fires the "automate email/SMS for all clients" setting. Next.js has no
 * built-in recurring scheduler: this route just does the sending; something
 * external has to call it monthly:
 *   - Vercel: add a Cron Job in vercel.json hitting this path.
 *   - Supabase: a pg_cron job that calls this URL via pg_net.
 *   - Anything else: cron-job.org, GitHub Actions on a schedule, etc.
 * Protect it with CRON_SECRET (sent as `?secret=` or `Authorization: Bearer`)
 * once this is wired to a real scheduler, so it can't be triggered by
 * anyone who finds the URL.
 *
 * No-ops (200, nothing sent) unless both the automation toggle is on
 * (Overdue page) and BREVO_API_KEY is set: safe to wire up before either
 * is true.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.nextUrl.searchParams.get("secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const settings = await getReminderSettings();
  if (!settings.automationEnabled) {
    return NextResponse.json({ sent: 0, skipped: "automation disabled" });
  }
  if (!isBrevoConfigured()) {
    return NextResponse.json({ sent: 0, skipped: "BREVO_API_KEY not set" });
  }

  const templates = await getEffectiveTemplates();
  const template = templates.find((t) => t.id === settings.automationTemplateId) ?? templates[0];

  // Masterlist clients have no email on file (the source spreadsheet has
  // none): only clients created/edited through the app with a real email
  // on file are reachable here.
  const localClients = await listLocalClients();
  const emailByName = new Map(localClients.filter((c) => c.email).map((c) => [c.name, c.email as string]));

  const overdue = await getOverdueContractsMerged();
  let sent = 0;
  let failed = 0;

  for (const contract of overdue) {
    const email = emailByName.get(contract.clientName);
    if (!email) continue;

    const rendered = renderReminderTemplate(template.body, {
      clientName: contract.clientName,
      lotDisplayId: contract.lotDisplayId,
      overdueDays: contract.overdueDays ?? 0,
      amountDue: formatMoney(contract.priceCents - contract.paidCents),
    });
    const result = await sendReminderEmail({
      toEmail: email,
      toName: contract.clientName,
      subject: template.subject,
      htmlBody: rendered.replace(/\n/g, "<br/>"),
    });
    await logReminder({
      contractId: contract.id,
      clientName: contract.clientName,
      channel: "email",
      ok: result.ok,
      error: result.error,
      sentBy: "cron",
    });
    if (result.ok) sent++;
    else failed++;
  }

  return NextResponse.json({ sent, failed, totalOverdue: overdue.length });
}
