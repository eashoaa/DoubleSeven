import { calculateCommissionCents } from "./commissions";
import {
  listAgents,
  getClientAgentTags,
  listCollections,
  listCommissionPayouts,
  type LocalAgent,
} from "@/lib/server/local-store";

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
 * Commission is derived live from the client's tagged agent and their
 * lifetime non-voided payments, not stored per-transaction — this is a
 * running balance (earned minus paid out), not an oldest-first settlement
 * (see allocatePayout in commissions.ts for that, unused here by design;
 * a future payout-reconciliation UI can wire it in if needed).
 */
export async function getAgentCommissionSummaries(): Promise<AgentCommissionSummary[]> {
  const [agents, tags, collections, payouts] = await Promise.all([
    listAgents(),
    getClientAgentTags(),
    listCollections(),
    listCommissionPayouts(),
  ]);

  const clientIdsByAgent = new Map<string, Set<string>>();
  for (const tag of Object.values(tags)) {
    if (!clientIdsByAgent.has(tag.agentId)) clientIdsByAgent.set(tag.agentId, new Set());
    clientIdsByAgent.get(tag.agentId)!.add(tag.clientId);
  }

  const paidByAgent = new Map<string, number>();
  for (const payout of payouts) {
    paidByAgent.set(payout.agentId, (paidByAgent.get(payout.agentId) ?? 0) + payout.amountCents);
  }

  return agents.map((agent: LocalAgent) => {
    const clientIds = clientIdsByAgent.get(agent.id) ?? new Set<string>();
    const collectedCents = collections
      .filter((row) => !row.voided && clientIds.has(row.clientId))
      .reduce((sum, row) => sum + row.grossCents, 0);

    const totalEarnedCents = calculateCommissionCents(collectedCents, agent.commissionRatePercent);
    const totalPaidCents = paidByAgent.get(agent.id) ?? 0;

    return {
      agentId: agent.id,
      agentName: agent.name,
      ratePercent: agent.commissionRatePercent,
      active: agent.active,
      totalEarnedCents,
      totalPaidCents,
      balanceCents: totalEarnedCents - totalPaidCents,
    };
  });
}
