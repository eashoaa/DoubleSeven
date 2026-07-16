import { Receipt, Wallet, FileText } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { StatCard } from "@/components/shared/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { listExpenses } from "@/lib/server/local-store";
import { LogExpenseDialog } from "@/components/expenses/log-expense-dialog";
import { PageHeader } from "@/components/layout/page-header";

export default async function ExpensesPage() {
  const expenses = (await listExpenses()).sort((a, b) => (a.incurredAt < b.incurredAt ? 1 : -1));

  const total = expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const pettyCashTotal = expenses
    .filter((e) => e.paidFrom === "petty_cash")
    .reduce((sum, e) => sum + e.amountCents, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader titleKey="page.expenses.title" descriptionKey="page.expenses.desc" />
        <LogExpenseDialog />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={Receipt} tone="violet" label="Total expenses logged" value={<Money centavos={total} />} />
        <StatCard
          icon={Wallet}
          tone="amber"
          label="Paid from petty cash"
          value={<Money centavos={pettyCashTotal} />}
        />
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses logged yet"
          description="Petty cash and bank-paid company expenses recorded here will show up in this list."
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
                  Category
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Paid from
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Receipt
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Recorded by
                </TableHead>
                <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">{formatDate(e.incurredAt)}</TableCell>
                  <TableCell className="font-medium text-foreground">{e.description}</TableCell>
                  <TableCell className="text-muted-foreground">{e.category}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">
                    {e.paidFrom.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    {e.receiptId ? (
                      <Link
                        href={`/api/receipts/${e.receiptId}`}
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
                  <TableCell className="text-muted-foreground">{e.recordedBy}</TableCell>
                  <TableCell className="text-right">
                    <Money centavos={e.amountCents} />
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
