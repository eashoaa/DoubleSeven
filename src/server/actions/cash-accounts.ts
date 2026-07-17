"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/server/audit";
import type { Database } from "@/types/database";

export type CashAccount = Database["public"]["Tables"]["cash_accounts"]["Row"];

export interface CashAccountActionState {
  error: string | null;
  success: boolean;
}

export async function getCashAccountsAction(): Promise<CashAccount[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("cash_accounts").select("*").eq("active", true).order("name");
  return data ?? [];
}

export async function createCashAccountAction(
  _prev: CashAccountActionState,
  formData: FormData
): Promise<CashAccountActionState> {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    return { error: "Only admins can add cash accounts.", success: false };
  }

  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "bank") as "cash" | "bank";

  if (!name) {
    return { error: "A name is required.", success: false };
  }

  const supabase = await createClient();
  const { data: account, error } = await supabase
    .from("cash_accounts")
    .insert({ name, kind })
    .select("id")
    .single();
  if (error || !account) {
    return { error: error?.message ?? "Failed to add account.", success: false };
  }

  await logAudit({
    action: "cash_account.created",
    entityType: "cash_account",
    entityId: account.id,
    userId: user.id,
    summary: `Added ${kind} account "${name}"`,
  });

  revalidatePath("/settings");
  return { error: null, success: true };
}
