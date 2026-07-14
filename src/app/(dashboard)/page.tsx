import { Wallet, Users, AlertTriangle, LandPlot, ClipboardList } from "lucide-react";
import { Greeting } from "@/components/layout/greeting";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Money } from "@/components/shared/money";
import { formatDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import type { LotStatus } from "@/types/domain";

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

async function getDashboardData() {
  const empty = {
    collectedThisMonthCentavos: 0,
    activeClients: 0,
    delinquentAccounts: 0,
    occupiedLots: 0,
    topOverdue: [] as OverdueRow[],
    recentActivity: [] as ActivityRow[],
  };

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return empty;

  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartIso = monthStart.toISOString().slice(0, 10);

  const [collected, contracts, lots, overdue, activity] = await Promise.all([
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
      lotDisplayId: lot?.display_id ?? "—",
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

  return {
    collectedThisMonthCentavos,
    activeClients: activeClientIds.size,
    delinquentAccounts,
    occupiedLots,
    topOverdue,
    recentActivity,
  };
}

export default async function DashboardPage() {
  const [user, stats] = await Promise.all([getCurrentUser(), getDashboardData()]);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <Greeting firstName={firstName} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          tone="indigo"
          label="Collected this month"
          value={<Money centavos={stats.collectedThisMonthCentavos} />}
        />
        <StatCard
          icon={Users}
          tone="violet"
          label="Active clients"
          value={stats.activeClients}
        />
        <StatCard
          icon={AlertTriangle}
          tone="amber"
          label="Delinquent accounts"
          value={stats.delinquentAccounts}
        />
        <StatCard
          icon={LandPlot}
          tone="indigo"
          label="Occupied lots"
          value={stats.occupiedLots}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-hairline bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground">Top overdue accounts</h2>
          {stats.topOverdue.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No overdue accounts"
              description="Delinquent and defaulted contracts will surface here first, worst first."
            />
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-hairline">
              {stats.topOverdue.map((row) => (
                <li key={row.contractId} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{row.clientName}</div>
                    <div className="text-xs text-muted-foreground">{row.lotDisplayId}</div>
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
          <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
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

      {/* Status legend — kept visible while the map/report views are still Phase 2 stubs */}
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
