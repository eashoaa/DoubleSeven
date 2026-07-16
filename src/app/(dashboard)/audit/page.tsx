import { History } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listAuditEntries } from "@/lib/server/local-store";
import { PageHeader } from "@/components/layout/page-header";

const ACTION_LABEL: Record<string, string> = {
  "client.created": "Client created",
  "collection.recorded": "Payment logged",
  "collection.deposited": "Marked deposited",
  "expense.recorded": "Expense logged",
  "receipt.uploaded": "Receipt uploaded",
  "reminder.sent": "Reminder sent",
  "reminder.failed": "Reminder failed",
  "reminder_settings.updated": "Reminder settings changed",
};

export default async function AuditPage() {
  const entries = await listAuditEntries();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titleKey="page.audit.title" descriptionKey="page.audit.desc" />

      {entries.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nothing logged yet"
          description="Creating a client, logging a payment or expense, uploading a receipt, or sending a reminder will show up here automatically."
        />
      ) : (
        <div className="shadow-card rounded-2xl border border-hairline">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  When
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Actor
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Action
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Detail
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground">
                    {new Date(entry.ts).toLocaleString("en-PH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{entry.actor}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {ACTION_LABEL[entry.action] ?? entry.action}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entry.summary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
