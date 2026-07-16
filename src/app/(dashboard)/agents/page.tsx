import { Handshake, Wallet } from "lucide-react";
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
import { can } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getAgentCommissionSummaries } from "@/lib/domain/agent-commissions";
import { NewAgentDialog } from "@/components/agents/new-agent-dialog";
import { RecordPayoutDialog } from "@/components/agents/record-payout-dialog";
import { PageHeader } from "@/components/layout/page-header";

export default async function AgentsPage() {
  const [summaries, user] = await Promise.all([getAgentCommissionSummaries(), getCurrentUser()]);
  const canManage = can(user.role, "manageAgents");
  const canPayOut = can(user.role, "payOutCommission");

  const totalBalance = summaries.reduce((sum, s) => sum + s.balanceCents, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader titleKey="page.agents.title" descriptionKey="page.agents.desc" />
        {canManage ? <NewAgentDialog /> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={Handshake} tone="indigo" label="Agents" value={summaries.length.toLocaleString()} />
        <StatCard
          icon={Wallet}
          tone="amber"
          label="Total commission balance owed"
          value={<Money centavos={totalBalance} />}
        />
      </div>

      {summaries.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="No agents yet"
          description="Add your sales agents here, then tag clients to them from the Clients page to track commissions."
        />
      ) : (
        <div className="shadow-card rounded-2xl border border-hairline">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Agent
                </TableHead>
                <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Rate
                </TableHead>
                <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Total earned
                </TableHead>
                <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Paid out
                </TableHead>
                <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Balance due
                </TableHead>
                {canPayOut ? <TableHead className="text-right" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((s) => (
                <TableRow key={s.agentId}>
                  <TableCell className="font-medium text-foreground">{s.agentName}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{s.ratePercent}%</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    <Money centavos={s.totalEarnedCents} />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    <Money centavos={s.totalPaidCents} />
                  </TableCell>
                  <TableCell className="text-right font-medium text-foreground">
                    <Money centavos={s.balanceCents} />
                  </TableCell>
                  {canPayOut ? (
                    <TableCell className="text-right">
                      <RecordPayoutDialog
                        agentId={s.agentId}
                        agentName={s.agentName}
                        balanceCents={s.balanceCents}
                      />
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
