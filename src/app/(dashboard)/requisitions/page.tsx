import { ClipboardList, FileText, Hourglass } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { FileRequisitionDialog } from "@/components/requisitions/file-requisition-dialog";
import { RequisitionActions } from "@/components/requisitions/requisition-actions";
import { PageHeader } from "@/components/layout/page-header";

type RequisitionStatus = "auto_approved" | "pending" | "approved" | "rejected";

interface RequisitionRow {
  id: string;
  createdAt: string;
  description: string;
  vendor: string | null;
  hasDoc: boolean;
  requestedBy: string;
  status: RequisitionStatus;
  rejectionReason: string | null;
  amountCents: number;
}

const STATUS_LABEL: Record<RequisitionStatus, string> = {
  auto_approved: "Auto-approved",
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_BADGE_VARIANT: Record<RequisitionStatus, "outline" | "secondary" | "destructive"> = {
  auto_approved: "outline",
  pending: "secondary",
  approved: "outline",
  rejected: "destructive",
};

async function getRequisitions(): Promise<RequisitionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("requisitions")
    .select(
      "id, created_at, description, vendor, supporting_doc_path, status, rejection_reason, amount_cents, profiles!requisitions_requested_by_fkey(full_name)"
    )
    .order("created_at", { ascending: false });

  if (!data) return [];

  return data.map((row) => {
    const profile = row.profiles as unknown as { full_name: string } | null;
    return {
      id: row.id,
      createdAt: row.created_at,
      description: row.description,
      vendor: row.vendor,
      hasDoc: !!row.supporting_doc_path,
      requestedBy: profile?.full_name ?? "Unknown",
      status: row.status,
      rejectionReason: row.rejection_reason,
      amountCents: row.amount_cents,
    };
  });
}

async function getThresholdCents(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.from("requisition_settings").select("threshold_cents").eq("id", true).single();
  return data?.threshold_cents ?? 5_000_000;
}

export default async function RequisitionsPage() {
  const [rows, thresholdCents, user] = await Promise.all([
    getRequisitions(),
    getThresholdCents(),
    getCurrentUser(),
  ]);
  const canResolve = can(user.role, "verifyPending");

  const pending = rows.filter((r) => r.status === "pending");
  const pendingTotal = pending.reduce((sum, r) => sum + r.amountCents, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader titleKey="page.requisitions.title" descriptionKey="page.requisitions.desc" />
        <FileRequisitionDialog thresholdCents={thresholdCents} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={Hourglass} tone="amber" label="Awaiting approval" value={pending.length.toLocaleString()} />
        <StatCard
          icon={ClipboardList}
          tone="indigo"
          label="Pending amount"
          value={<Money centavos={pendingTotal} />}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No requisitions filed yet"
          description="Spending requests filed by staff, with supporting documents, will show up here."
        />
      ) : (
        <div className="shadow-card rounded-2xl border border-hairline">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Date
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Description
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Vendor
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Doc
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Requested by
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Status
                </TableHead>
                <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Amount
                </TableHead>
                {canResolve ? <TableHead className="text-right" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
                  <TableCell className="font-medium text-foreground">{row.description}</TableCell>
                  <TableCell className="text-muted-foreground">{row.vendor ?? "-"}</TableCell>
                  <TableCell>
                    {row.hasDoc ? (
                      <Link
                        href={`/api/receipts/requisition/${row.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
                      >
                        <FileText className="size-3" strokeWidth={2} />
                        View
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.requestedBy}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                    {row.status === "rejected" && row.rejectionReason ? (
                      <p className="mt-1 text-xs text-muted-foreground">{row.rejectionReason}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <Money centavos={row.amountCents} />
                  </TableCell>
                  {canResolve ? (
                    <TableCell>
                      {row.status === "pending" ? <RequisitionActions id={row.id} /> : null}
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
