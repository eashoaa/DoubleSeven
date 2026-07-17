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
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";

const ACTION_LABEL: Record<string, string> = {
  "client.created": "Client created",
  "client.agent_tagged": "Client tagged to agent",
  "collection.recorded": "Payment logged",
  "collection.deposited": "Marked deposited",
  "collection.deposit_undone": "Undid mark deposited",
  "expense.recorded": "Expense logged",
  "receipt.uploaded": "Receipt uploaded",
  "reminder.sent": "Reminder sent",
  "reminder.failed": "Reminder failed",
  "reminder_settings.updated": "Reminder settings changed",
  "requisition.filed": "Requisition filed",
  "requisition.approved": "Requisition approved",
  "requisition.rejected": "Requisition rejected",
  "agent.created": "Agent added",
  "commission.paid_out": "Commission paid out",
};

interface AuditRow {
  id: string;
  ts: string;
  actor: string;
  action: string;
  summary: string;
}

async function getAuditEntries(): Promise<AuditRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return listAuditEntries();

  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, ts, action, details, profiles(full_name)")
    .order("ts", { ascending: false })
    .limit(200);

  if (!data) return [];

  return data.map((row) => {
    const profile = row.profiles as unknown as { full_name: string } | null;
    const details = row.details as { summary?: string } | null;
    return {
      id: row.id,
      ts: row.ts,
      actor: profile?.full_name ?? "System",
      action: row.action,
      summary: details?.summary ?? "",
    };
  });
}

export default async function AuditPage() {
  const entries = await getAuditEntries();

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
