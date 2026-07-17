import { Wallet, Users, AlertTriangle, LandPlot, ClipboardList, Handshake, Banknote } from "lucide-react";
import Link from "next/link";
import { Greeting } from "@/components/layout/greeting";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SectionLink } from "@/components/dashboard/section-link";
import { StatCard } from "@/components/shared/stat-card";
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
import { formatDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { getDevMasterlist, MASTERLIST_SNAPSHOT_DATE } from "@/lib/domain/dev-masterlist";
import { listDefaultOverrides } from "@/lib/server/local-store";
import { getAgentCommissionSummaries } from "@/lib/domain/agent-commissions";
import type { LotStatus } from "@/types/domain";

interface AgentClientRow {
  id: string;
  clientName: string;
  lotDisplayId: string;
  priceCents: number;
  status: LotStatus;
}

interface AgentDashboardData {
  agentName: string;
  ratePercent: number;
  totalEarnedCents: number;
  totalPaidCents: number;
  balanceCents: number;
  myClients: AgentClientRow[];
}

/**
 * Agents get a much smaller, self-service view: their own commission
 * balance and their own book of clients — not the company-wide stats.
 * RLS already scopes commission_ledger/commission_payouts/contracts to
 * `agent_id = current_agent_id()` for this role; this just surfaces it.
 */
async function getAgentDashboardData(): Promise<AgentDashboardData | null> {
  const supabase = await createClient();
  const { data: agentId } = await supabase.rpc("current_agent_id");
  if (!agentId) return null;

  const { data: agent } = await supabase
    .from("agents")
    .select("name, commission_rate")
    .eq("id", agentId)
    .single();
  if (!agent) return null;

  const [summaries, { data: contracts }] = await Promise.all([
    getAgentCommissionSummaries(),
    supabase
      .from("contracts")
      .select("id, price_cents, status, clients(name), lots(display_id)")
      .eq("agent_id", agentId)
      .is("deleted_at", null)
      .order("start_date", { ascending: false }),
  ]);

  const mine = summaries.find((s) => s.agentId === agentId);
  const myClients: AgentClientRow[] = (contracts ?? []).map((c) => {
    const client = c.clients as unknown as { name: string } | null;
    const lot = c.lots as unknown as { display_id: string } | null;
    return {
      id: c.id,
      clientName: client?.name ?? "Unknown client",
      lotDisplayId: lot?.display_id ?? "-",
      priceCents: c.price_cents,
      status: c.status,
    };
  });

  return {
    agentName: agent.name,
    ratePercent: agent.commission_rate,
    totalEarnedCents: mine?.totalEarnedCents ?? 0,
    totalPaidCents: mine?.totalPaidCents ?? 0,
    balanceCents: mine?.balanceCents ?? 0,
    myClients,
  };
}

interface OverdueRow {
  contractId: string;
  clientName: string;
  lotDisplayId: string;
  status: LotStatus;
  priceCents: number;
}

interface ActivityRow {
  id: string;
  action: string;
  entityType: string;
  ts: string;
}

/**
 * Phase 0 fallback, sourced from the real 334-contract masterlist (see
 * lib/domain/dev-masterlist.ts) rather than zeros. "Collected this month"
 * is legitimately ₱0 unless the current month is the masterlist snapshot
 * month (2026-05); there's no per-payment history in the source data,
 * only a cumulative total as of the snapshot, so it isn't backfilled.
 */
async function getDevFallbackDashboardData() {
  const { contracts: rawContracts, clients } = getDevMasterlist();
  const overrides = await listDefaultOverrides();
  const contracts = rawContracts.map((c) =>
    overrides[c.id] ? { ...c, status: "defaulted" as LotStatus } : c
  );
  const now = new Date();
  const snapshot = new Date(`${MASTERLIST_SNAPSHOT_DATE}T00:00:00Z`);
  const collectedThisMonthCentavos =
    now.getUTCFullYear() === snapshot.getUTCFullYear() && now.getUTCMonth() === snapshot.getUTCMonth()
      ? contracts.reduce((sum, c) => sum + c.paidCents, 0)
      : 0;

  const overdue = contracts
    .filter((c) => c.status === "delinquent" || c.status === "defaulted")
    .sort((a, b) => (b.overdueDays ?? 0) - (a.overdueDays ?? 0))
    .slice(0, 5)
    .map((c) => ({
      contractId: c.id,
      clientName: c.clientName,
      lotDisplayId: c.lotDisplayId,
      status: c.status,
      priceCents: c.priceCents,
    }));

  return {
    collectedThisMonthCentavos,
    activeClients: clients.length,
    delinquentAccounts: contracts.filter((c) => c.status === "delinquent" || c.status === "defaulted").length,
    occupiedLots: contracts.length,
    topOverdue: overdue,
    recentActivity: [] as ActivityRow[],
    totalClients: clients.length,
    verifiedClients: 0,
  };
}

async function getDashboardData() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return getDevFallbackDashboardData();

  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartIso = monthStart.toISOString().slice(0, 10);

  const [collected, contracts, lots, overdue, activity, clientVerification] = await Promise.all([
    supabase
      .from("transactions")
      .select("gross_cents, discount_cents")
      .eq("voided", false)
      .gte("paid_at", monthStartIso),
    supabase.from("contracts").select("client_id, status").is("deleted_at", null),
    supabase.from("lots_with_status").select("effective_status"),
    supabase
      .from("contracts")
      .select("id, price_cents, status, client_id, lot_id, clients(name), lots(display_id)")
      .in("status", ["delinquent", "defaulted"])
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("audit_log")
      .select("id, action, entity_type, ts")
      .order("ts", { ascending: false })
      .limit(5),
    supabase.from("clients").select("verified_at").is("deleted_at", null),
  ]);

  const collectedThisMonthCentavos = (collected.data ?? []).reduce(
    (sum, t) => sum + t.gross_cents - t.discount_cents,
    0
  );

  const activeStatuses: LotStatus[] = ["reserved", "active", "delinquent", "defaulted"];
  const activeClientIds = new Set(
    (contracts.data ?? [])
      .filter((c) => activeStatuses.includes(c.status))
      .map((c) => c.client_id)
  );
  const delinquentAccounts = (contracts.data ?? []).filter((c) =>
    ["delinquent", "defaulted"].includes(c.status)
  ).length;
  const occupiedLots = (lots.data ?? []).filter((l) => l.effective_status !== "available").length;

  const topOverdue: OverdueRow[] = (overdue.data ?? []).map((row) => {
    const client = row.clients as unknown as { name: string } | null;
    const lot = row.lots as unknown as { display_id: string } | null;
    return {
      contractId: row.id,
      clientName: client?.name ?? "Unknown client",
      lotDisplayId: lot?.display_id ?? "-",
      status: row.status,
      priceCents: row.price_cents,
    };
  });

  const recentActivity: ActivityRow[] = (activity.data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    ts: row.ts,
  }));

  const totalClients = (clientVerification.data ?? []).length;
  const verifiedClients = (clientVerification.data ?? []).filter((c) => c.verified_at).length;

  return {
    collectedThisMonthCentavos,
    activeClients: activeClientIds.size,
    delinquentAccounts,
    occupiedLots,
    topOverdue,
    recentActivity,
    totalClients,
    verifiedClients,
  };
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const firstName = user.name.split(" ")[0];

  if (user.role === "agent") {
    const agentData = await getAgentDashboardData();
    return (
      <div className="flex flex-col gap-8">
        <Greeting firstName={firstName} />

        {!agentData ? (
          <EmptyState
            icon={Handshake}
            title="Your account isn't linked to an agent record yet"
            description="Ask an admin to link your login to your agent profile so your clients and commissions show up here."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                icon={Handshake}
                tone="indigo"
                label={`Commission rate — ${agentData.agentName}`}
                value={`${agentData.ratePercent}%`}
              />
              <StatCard
                icon={Wallet}
                tone="violet"
                label="Total commission earned"
                value={<Money centavos={agentData.totalEarnedCents} />}
              />
              <StatCard
                icon={Banknote}
                tone="amber"
                label="Balance owed to you"
                value={<Money centavos={agentData.balanceCents} />}
              />
            </div>

            <div className="shadow-card rounded-2xl border border-hairline bg-card p-6">
              <h2 className="text-base font-semibold text-foreground">My clients</h2>
              {agentData.myClients.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No clients tagged to you yet"
                  description="Once an admin tags a client to you, their lot and contract will show up here."
                />
              ) : (
                <div className="mt-4 rounded-xl border border-hairline">
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
                          Price
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agentData.myClients.map((c) => (
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
                          <TableCell className="text-right">
                            <Money centavos={c.priceCents} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  const stats = await getDashboardData();

  return (
    <div className="flex flex-col gap-8">
      <Greeting firstName={firstName} />

      <QuickActions />

      {(user.role === "admin" || user.role === "marketing") && stats.totalClients > 0 && (
        <Link
          href="/clients?filter=unverified"
          className="shadow-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-card p-5 transition-colors hover:bg-accent/40"
        >
          <div>
            <div className="text-sm font-semibold text-foreground">Client database: team progress</div>
            <div className="text-sm text-muted-foreground">
              {stats.verifiedClients} / {stats.totalClients} clients have current contact info confirmed
            </div>
          </div>
          <div className="h-2 w-full max-w-40 overflow-hidden rounded-full bg-accent">
            <div
              className="h-full rounded-full bg-status-active-map"
              style={{ width: `${Math.round((stats.verifiedClients / stats.totalClients) * 100)}%` }}
            />
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          tone="indigo"
          labelKey="stat.collectedThisMonth"
          value={<Money centavos={stats.collectedThisMonthCentavos} />}
          href="/collections"
        />
        <StatCard
          icon={Users}
          tone="violet"
          labelKey="stat.activeClients"
          value={stats.activeClients}
          href="/clients"
        />
        <StatCard
          icon={AlertTriangle}
          tone="amber"
          labelKey="stat.delinquentAccounts"
          value={stats.delinquentAccounts}
          href="/overdue"
        />
        <StatCard
          icon={LandPlot}
          tone="indigo"
          labelKey="stat.occupiedLots"
          value={stats.occupiedLots}
          href="/lots?status=occupied"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-hairline bg-card p-6">
          <SectionLink href="/overdue" labelKey="dashboard.topOverdue" />
          {stats.topOverdue.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No overdue accounts"
              description="Delinquent and defaulted contracts will surface here first, worst first."
            />
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-hairline">
              {stats.topOverdue.map((row) => (
                <li key={row.contractId} className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-accent/60">
                  <div>
                    <Link
                      href={`/clients?q=${encodeURIComponent(row.clientName)}`}
                      className="text-sm font-medium text-foreground hover:underline"
                    >
                      {row.clientName}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      <Link href={`/map?lot=${encodeURIComponent(row.lotDisplayId)}`} className="hover:underline">
                        {row.lotDisplayId}
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Money centavos={row.priceCents} className="text-sm text-muted-foreground" />
                    <StatusBadge status={row.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-hairline bg-card p-6">
          <SectionLink href="/audit" labelKey="dashboard.recentActivity" />
          {stats.recentActivity.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No activity yet"
              description="Payments, approvals, and lot status changes will show up here as staff record them."
            />
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-hairline">
              {stats.recentActivity.map((row) => (
                <li key={row.id} className="flex items-center justify-between py-3">
                  <div className="text-sm text-foreground">
                    {row.action} <span className="text-muted-foreground">{row.entityType}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDate(row.ts)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Status legend: kept visible while the map/report views are still Phase 2 stubs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-hairline bg-card p-4">
        <StatusBadge status="available" />
        <StatusBadge status="reserved" />
        <StatusBadge status="active" />
        <StatusBadge status="delinquent" />
        <StatusBadge status="defaulted" />
        <StatusBadge status="cancelled" />
        <StatusBadge status="paid" />
      </div>
    </div>
  );
}
