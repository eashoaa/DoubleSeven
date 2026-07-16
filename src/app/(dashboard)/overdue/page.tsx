import { AlertTriangle } from "lucide-react";
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
import { getOverdueContractsMerged } from "@/lib/domain/dev-masterlist";
import { getReminderSettings, getEffectiveTemplates } from "@/lib/server/local-store";
import { isBrevoConfigured } from "@/lib/integrations/brevo";
import { AutomationPanel } from "@/components/overdue/automation-panel";
import { SendReminderDialog } from "@/components/overdue/send-reminder-dialog";
import { MarkDefaultedDialog } from "@/components/overdue/mark-defaulted-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { OverdueHint } from "@/components/overdue/overdue-hint";

export default async function OverduePage() {
  const [overdue, settings, templates] = await Promise.all([
    getOverdueContractsMerged(),
    getReminderSettings(),
    getEffectiveTemplates(),
  ]);
  const brevoConfigured = isBrevoConfigured();

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
                  <TableCell className="text-muted-foreground">{c.lotDisplayId}</TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{c.overdueDays ?? 0}d</TableCell>
                  <TableCell className="text-right">
                    <Money centavos={c.priceCents - c.paidCents} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {c.status !== "defaulted" && (
                        <MarkDefaultedDialog
                          contractId={c.id}
                          clientName={c.clientName}
                          lotDisplayId={c.lotDisplayId}
                        />
                      )}
                      <SendReminderDialog
                        contractId={c.id}
                        clientName={c.clientName}
                        lotDisplayId={c.lotDisplayId}
                        overdueDays={c.overdueDays ?? 0}
                        amountDue={`${(c.priceCents - c.paidCents) / 100}`}
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
