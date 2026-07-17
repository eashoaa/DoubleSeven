import { TrendingUp, Wallet, AlertTriangle, Trophy, Boxes } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/shared/stat-card";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/server";
import { monthlyTrend } from "@/lib/domain/revenue-trend";
import { getAgentCommissionSummaries } from "@/lib/domain/agent-commissions";
import { CollectionsTrendChart } from "@/components/collections/collections-trend-chart";
import { SECTION_LABEL, type SectionCode } from "@/types/domain";
import { PageHeader } from "@/components/layout/page-header";

interface SectionSummary {
  section: SectionCode;
  available: number;
  sold: number;
  total: number;
}

async function getReportsData() {
  const supabase = await createClient();

  const [{ data: txns }, { data: contracts }, { data: lots }, { data: ledger }, { data: payouts }, agents] =
    await Promise.all([
      supabase.from("transactions").select("paid_at, gross_cents, discount_cents, voided").limit(5000),
      supabase.from("contracts").select("price_cents, status").is("deleted_at", null),
      supabase.from("lots_with_status").select("section, effective_status"),
      supabase.from("commission_ledger").select("agent_id, amount_cents"),
      supabase.from("commission_payouts").select("agent_id, amount_cents"),
      getAgentCommissionSummaries(),
    ]);

  const trend = monthlyTrend(
    (txns ?? []).map((t) => ({ paidAt: t.paid_at, netCents: t.gross_cents - t.discount_cents, voided: t.voided }))
  );

  const totalContractValueCents = (contracts ?? []).reduce((sum, c) => sum + c.price_cents, 0);
  const totalCollectedCents = (txns ?? [])
    .filter((t) => !t.voided)
    .reduce((sum, t) => sum + t.gross_cents - t.discount_cents, 0);
  const outstandingCents = Math.max(0, totalContractValueCents - totalCollectedCents);
  const delinquentCount = (contracts ?? []).filter((c) =>
    ["delinquent", "defaulted"].includes(c.status)
  ).length;

  const bySection = new Map<SectionCode, SectionSummary>();
  for (const lot of lots ?? []) {
    const code = lot.section as SectionCode;
    if (!bySection.has(code)) bySection.set(code, { section: code, available: 0, sold: 0, total: 0 });
    const bucket = bySection.get(code)!;
    bucket.total += 1;
    if (lot.effective_status === "available") bucket.available += 1;
    else if (lot.effective_status !== "reserved" && lot.effective_status !== "cancelled") bucket.sold += 1;
  }
  const sectionSummaries = [...bySection.values()].sort((a, b) => b.total - a.total);

  const topAgents = [...agents].sort((a, b) => b.totalEarnedCents - a.totalEarnedCents).slice(0, 8);
  const totalCommissionOwedCents = (ledger ?? []).reduce((sum, l) => sum + l.amount_cents, 0)
    - (payouts ?? []).reduce((sum, p) => sum + p.amount_cents, 0);

  return {
    trend,
    totalCollectedCents,
    outstandingCents,
    delinquentCount,
    sectionSummaries,
    topAgents,
    totalCommissionOwedCents,
  };
}

export default async function ReportsPage() {
  const data = await getReportsData();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titleKey="page.reports.title" descriptionKey="page.reports.desc" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          tone="indigo"
          label="Total collected, all time"
          value={<Money centavos={data.totalCollectedCents} />}
        />
        <StatCard
          icon={TrendingUp}
          tone="violet"
          label="Outstanding balance"
          value={<Money centavos={data.outstandingCents} />}
        />
        <StatCard
          icon={AlertTriangle}
          tone="amber"
          label="Delinquent / defaulted accounts"
          value={data.delinquentCount.toLocaleString()}
          href="/overdue"
        />
        <StatCard
          icon={Trophy}
          tone="violet"
          label="Commission balance owed"
          value={<Money centavos={data.totalCommissionOwedCents} />}
          href="/agents"
        />
      </div>

      <CollectionsTrendChart data={data.trend} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="shadow-card flex flex-col gap-4 rounded-2xl border border-hairline bg-card p-6">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-chip-amber-fg" strokeWidth={2} />
            <h2 className="text-base font-semibold text-foreground">Top agents</h2>
          </div>
          {data.topAgents.length === 0 ? (
            <EmptyState icon={Trophy} title="No agents yet" description="Add agents to see a leaderboard here." />
          ) : (
            <ul className="flex flex-col divide-y divide-hairline">
              {data.topAgents.map((a, i) => (
                <li key={a.agentId} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-foreground">{a.agentName}</span>
                  </div>
                  <Money centavos={a.totalEarnedCents} className="text-sm text-muted-foreground" />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shadow-card flex flex-col gap-4 rounded-2xl border border-hairline bg-card p-6">
          <div className="flex items-center gap-2">
            <Boxes className="size-4 text-chip-indigo-fg" strokeWidth={2} />
            <h2 className="text-base font-semibold text-foreground">Sell-through by section</h2>
          </div>
          <ul className="flex flex-col divide-y divide-hairline">
            {data.sectionSummaries.map((s) => {
              const pct = s.total > 0 ? Math.round((s.sold / s.total) * 100) : 0;
              return (
                <li key={s.section} className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-foreground">{SECTION_LABEL[s.section] ?? s.section}</span>
                  <span className="text-sm text-muted-foreground">
                    {s.sold}/{s.total} sold ({pct}%)
                  </span>
                </li>
              );
            })}
          </ul>
          <Link href="/inventory" className="text-xs font-medium text-accent-foreground hover:underline">
            Full inventory breakdown →
          </Link>
        </div>
      </div>
    </div>
  );
}
