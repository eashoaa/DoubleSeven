import { Wallet, Users, AlertTriangle, LandPlot, ClipboardList } from "lucide-react";
import Link from "next/link";
import { Greeting } from "@/components/layout/greeting";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SectionLink } from "@/components/dashboard/section-link";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Money } from "@/components/shared/money";
import { formatDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { getDevMasterlist, MASTERLIST_SNAPSHOT_DATE } from "@/lib/domain/dev-masterlist";
import { listDefaultOverrides } from "@/lib/server/local-store";
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
  };
}

async function getDashboardData() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return getDevFallbackDashboardData();

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

      <QuickActions />

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
