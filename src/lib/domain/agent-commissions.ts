import { createClient } from "@/lib/supabase/server";

export interface AgentCommissionSummary {
  agentId: string;
  agentName: string;
  ratePercent: number;
  active: boolean;
  totalEarnedCents: number;
  totalPaidCents: number;
  balanceCents: number;
}

/**
 * commission_ledger is populated automatically by the trg_insert_commission_ledger
 * trigger (supabase/migrations/20260714000008_commission_auto_ledger.sql)
 * whenever a non-voided transaction with an agent lands — this just sums
 * what's already there per agent, minus recorded payouts, for a running
 * balance. Aggregated in JS (no view for this yet) same as contract counts
 * elsewhere in the app.
 */
export async function getAgentCommissionSummaries(): Promise<AgentCommissionSummary[]> {
  const supabase = await createClient();
  const [{ data: agents }, { data: ledgerRows }, { data: payoutRows }] = await Promise.all([
    supabase.from("agents").select("id, name, commission_rate, active").order("name"),
    supabase.from("commission_ledger").select("agent_id, amount_cents"),
    supabase.from("commission_payouts").select("agent_id, amount_cents"),
  ]);

  const earnedByAgent = new Map<string, number>();
  for (const row of ledgerRows ?? []) {
    earnedByAgent.set(row.agent_id, (earnedByAgent.get(row.agent_id) ?? 0) + row.amount_cents);
  }

  const paidByAgent = new Map<string, number>();
  for (const row of payoutRows ?? []) {
    paidByAgent.set(row.agent_id, (paidByAgent.get(row.agent_id) ?? 0) + row.amount_cents);
  }

  return (agents ?? []).map((agent) => {
    const totalEarnedCents = earnedByAgent.get(agent.id) ?? 0;
    const totalPaidCents = paidByAgent.get(agent.id) ?? 0;
    return {
      agentId: agent.id,
      agentName: agent.name,
      ratePercent: agent.commission_rate,
      active: agent.active,
      totalEarnedCents,
      totalPaidCents,
      balanceCents: totalEarnedCents - totalPaidCents,
    };
  });
}
