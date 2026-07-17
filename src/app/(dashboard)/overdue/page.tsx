import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Money } from "@/components/shared/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOverdueRows } from "@/lib/server/overdue";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getReminderSettingsForPage, getEffectiveTemplatesForPage } from "@/server/actions/reminders";
import { isBrevoConfigured } from "@/lib/integrations/brevo";
import { AutomationPanel } from "@/components/overdue/automation-panel";
import { SendReminderDialog } from "@/components/overdue/send-reminder-dialog";
import { MarkDefaultedDialog } from "@/components/overdue/mark-defaulted-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { OverdueHint } from "@/components/overdue/overdue-hint";

export default async function OverduePage() {
  const [overdue, settings, templates, user] = await Promise.all([
    getOverdueRows(),
    getReminderSettingsForPage(),
    getEffectiveTemplatesForPage(),
    getCurrentUser(),
  ]);
  const brevoConfigured = isBrevoConfigured();
  const canMarkDefaulted = user.role === "admin";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titleKey="page.overdue.title" descriptionKey="page.overdue.desc" />

      <OverdueHint />

      <AutomationPanel settings={settings} brevoConfigured={brevoConfigured} />

      {overdue.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No overdue accounts"
          description="Delinquent and defaulted contracts will surface here first, worst first."
        />
      ) : (
        <div className="shadow-card rounded-2xl border border-hairline">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Client
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Lot
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Status
                </TableHead>
                <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Overdue
                </TableHead>
                <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Balance
                </TableHead>
                <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Follow up
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdue.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-foreground">{c.clientName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <Link href={`/map?lot=${encodeURIComponent(c.lotDisplayId)}`} className="hover:underline">
                      {c.lotDisplayId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{c.overdueDays ?? 0}d</TableCell>
                  <TableCell className="text-right">
                    <Money centavos={c.balanceCents} />
                    {c.penaltyCents > 0 && (
                      <div className="text-xs text-muted-foreground">
                        incl. <Money centavos={c.penaltyCents} /> penalty
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {c.status !== "defaulted" && canMarkDefaulted && (
                        <MarkDefaultedDialog
                          contractId={c.id}
                          lotId={c.lotId}
                          clientName={c.clientName}
                          lotDisplayId={c.lotDisplayId}
                        />
                      )}
                      <SendReminderDialog
                        contractId={c.id}
                        clientName={c.clientName}
                        lotDisplayId={c.lotDisplayId}
                        overdueDays={c.overdueDays ?? 0}
                        amountDue={`${c.balanceCents / 100}`}
                        templates={templates}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
