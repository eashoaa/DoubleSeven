import { ClipboardCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApprovalActions } from "@/components/approvals/approval-actions";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { PageHeader } from "@/components/layout/page-header";

interface VerificationRow {
  id: string;
  kind: string;
  status: "pending" | "approved" | "rejected";
  submittedByName: string;
  createdAt: string;
}

async function getPendingVerifications(): Promise<VerificationRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("pending_verifications")
    .select("id, kind, status, created_at, submitted_by, profiles(full_name)")
    .order("created_at", { ascending: false });

  if (!data) return [];

  return data.map((row) => {
    const profile = row.profiles as unknown as { full_name: string } | null;
    return {
      id: row.id,
      kind: row.kind,
      status: row.status,
      submittedByName: profile?.full_name ?? "Unknown",
      createdAt: row.created_at,
    };
  });
}

const STATUS_BADGE_VARIANT: Record<VerificationRow["status"], "outline" | "secondary" | "destructive"> = {
  pending: "secondary",
  approved: "outline",
  rejected: "destructive",
};

export default async function PendingApprovalsPage() {
  const [user, rows] = await Promise.all([getCurrentUser(), getPendingVerifications()]);
  const canResolve = user.role === "admin";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titleKey="page.pending.title"
        descriptionKey={canResolve ? "page.pending.desc.admin" : "page.pending.desc.staff"}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Nothing waiting for review"
          description="Payments recorded by marketing/accountant staff will land here for admin approval."
        />
      ) : (
        <div className="shadow-card rounded-2xl border border-hairline">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Kind
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Submitted by
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Submitted
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Status
                </TableHead>
                {canResolve ? <TableHead className="text-right" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-foreground capitalize">
                    {row.kind.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.submittedByName}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[row.status]} className="capitalize">
                      {row.status}
                    </Badge>
                  </TableCell>
                  {canResolve ? (
                    <TableCell>
                      {row.status === "pending" ? <ApprovalActions id={row.id} /> : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
