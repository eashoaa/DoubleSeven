"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Agent = Database["public"]["Tables"]["agents"]["Row"];

export interface AgentActionState {
  error: string | null;
  success: boolean;
}

export async function getAgentsAction(): Promise<Agent[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("agents").select("*").eq("active", true).order("name");
  return data ?? [];
}

export async function createAgentAction(
  _prev: AgentActionState,
  formData: FormData
): Promise<AgentActionState> {
  const user = await getCurrentUser();
  if (!can(user.role, "manageAgents")) {
    return { error: "Not authorized to add agents.", success: false };
  }

  const name = String(formData.get("name") ?? "").trim();
  const commissionRatePercent = Number(formData.get("commissionRatePercent") ?? 0);
  const contact = String(formData.get("contact") ?? "").trim();

  if (!name || commissionRatePercent <= 0) {
    return { error: "Name and a positive commission rate are required.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("agents").insert({
    name,
    commission_rate: commissionRatePercent,
    contact: contact || null,
  });
  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/agents");
  revalidatePath("/clients");
  return { error: null, success: true };
}

export async function assignClientAgentAction(input: {
  clientId: string;
  clientName: string;
  agentId: string;
  agentName: string;
}) {
  const user = await getCurrentUser();
  // contracts_update RLS is admin-only (see supabase/migrations), so this
  // stays admin-only at the app level too rather than reusing editClient
  // (which also covers marketing) — that mismatch would otherwise silently
  // no-op for marketing instead of erroring.
  if (!can(user.role, "manageAgents")) throw new Error("Not authorized to tag clients.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("contracts")
    .update({ agent_id: input.agentId })
    .eq("client_id", input.clientId)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);

  revalidatePath("/clients");
  revalidatePath("/agents");
}

export async function recordCommissionPayoutAction(
  _prev: AgentActionState,
  formData: FormData
): Promise<AgentActionState> {
  const user = await getCurrentUser();
  if (!can(user.role, "payOutCommission")) {
    return { error: "Not authorized to record commission payouts.", success: false };
  }

  const agentId = String(formData.get("agentId") ?? "");
  const amountPesos = Number(formData.get("amountPesos") ?? 0);
  const note = String(formData.get("note") ?? "").trim();

  if (!agentId || !amountPesos || amountPesos <= 0) {
    return { error: "A positive amount is required.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("commission_payouts").insert({
    agent_id: agentId,
    amount_cents: Math.round(amountPesos * 100),
    note: note || null,
    recorded_by: user.id,
  });
  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/agents");
  return { error: null, success: true };
}
