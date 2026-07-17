"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/server/audit";
import type { Database } from "@/types/database";

export type PenaltySettings = Database["public"]["Tables"]["penalty_settings"]["Row"];

export interface PenaltyActionState {
  error: string | null;
  success: boolean;
}

export async function getPenaltySettingsAction(): Promise<PenaltySettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("penalty_settings").select("*").eq("id", true).single();
  return data ?? { id: true, rate_percent: 2, grace_period_days: 5 };
}

export async function updatePenaltySettingsAction(
  _prev: PenaltyActionState,
  formData: FormData
): Promise<PenaltyActionState> {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    return { error: "Only admins can change the penalty settings.", success: false };
  }

  const ratePercent = Number(formData.get("ratePercent") ?? NaN);
  const gracePeriodDays = Number(formData.get("gracePeriodDays") ?? NaN);

  if (!Number.isFinite(ratePercent) || ratePercent < 0) {
    return { error: "Enter a valid penalty rate.", success: false };
  }
  if (!Number.isInteger(gracePeriodDays) || gracePeriodDays < 0) {
    return { error: "Enter a valid grace period (whole days).", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("penalty_settings")
    .update({ rate_percent: ratePercent, grace_period_days: gracePeriodDays })
    .eq("id", true);
  if (error) {
    return { error: error.message, success: false };
  }

  await logAudit({
    action: "penalty_settings.updated",
    entityType: "penalty_settings",
    entityId: "singleton",
    userId: user.id,
    summary: `Set late penalty to ${ratePercent}% with a ${gracePeriodDays}-day grace period`,
  });

  revalidatePath("/settings");
  return { error: null, success: true };
}

export async function waivePenaltyAction(
  _prev: PenaltyActionState,
  formData: FormData
): Promise<PenaltyActionState> {
  const user = await getCurrentUser();
  if (user.role !== "admin" && user.role !== "accountant") {
    return { error: "Only admins and accountants can waive a penalty.", success: false };
  }

  const penaltyId = String(formData.get("penaltyId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!penaltyId) {
    return { error: "Missing penalty.", success: false };
  }
  if (!reason) {
    return { error: "A reason is required to waive a penalty.", success: false };
  }

  const supabase = await createClient();
  const { data: penalty, error } = await supabase
    .from("penalties")
    .update({ waived_at: new Date().toISOString(), waived_by: user.id, waived_reason: reason })
    .eq("id", penaltyId)
    .is("waived_at", null)
    .select("id, contract_id")
    .single();
  if (error || !penalty) {
    return { error: error?.message ?? "Penalty not found or already waived.", success: false };
  }

  await logAudit({
    action: "penalty.waived",
    entityType: "penalty",
    entityId: penalty.id,
    userId: user.id,
    summary: `Waived a late penalty on contract ${penalty.contract_id}: ${reason}`,
  });

  revalidatePath("/clients");
  revalidatePath("/overdue");
  revalidatePath("/reports");
  return { error: null, success: true };
}
