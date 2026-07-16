"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { can } from "@/lib/permissions";
import {
  createAgent,
  listAgents,
  setClientAgentTag,
  recordCommissionPayout,
  type LocalAgent,
} from "@/lib/server/local-store";

export interface AgentActionState {
  error: string | null;
  success: boolean;
}

export async function getAgentsAction(): Promise<LocalAgent[]> {
  return (await listAgents()).filter((a) => a.active).sort((a, b) => a.name.localeCompare(b.name));
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

  await createAgent({ name, commissionRatePercent, contact: contact || null, createdBy: user.name });
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
  if (!can(user.role, "editClient")) throw new Error("Not authorized to tag clients.");

  await setClientAgentTag({ ...input, taggedBy: user.name });
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
  const agentName = String(formData.get("agentName") ?? "");
  const amountPesos = Number(formData.get("amountPesos") ?? 0);
  const note = String(formData.get("note") ?? "").trim();

  if (!agentId || !amountPesos || amountPesos <= 0) {
    return { error: "A positive amount is required.", success: false };
  }

  await recordCommissionPayout({
    agentId,
    agentName,
    amountCents: Math.round(amountPesos * 100),
    note: note || null,
    recordedBy: user.name,
  });
  revalidatePath("/agents");
  return { error: null, success: true };
}
