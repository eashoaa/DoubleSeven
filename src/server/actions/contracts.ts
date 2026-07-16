"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { markContractDefaulted } from "@/lib/server/local-store";

export interface MarkDefaultedState {
  ok: boolean;
  error: string | null;
}

export async function markDefaultedAction(
  _prev: MarkDefaultedState,
  formData: FormData
): Promise<MarkDefaultedState> {
  const contractId = String(formData.get("contractId") ?? "");
  const lotDisplayId = String(formData.get("lotDisplayId") ?? "");
  const clientName = String(formData.get("clientName") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) {
    return { ok: false, error: "A reason is required to mark an account as defaulted." };
  }

  const user = await getCurrentUser();
  await markContractDefaulted({ contractId, lotDisplayId, clientName, reason, markedBy: user.name });

  revalidatePath("/overdue");
  revalidatePath("/");
  revalidatePath("/lots");
  revalidatePath("/map");
  revalidatePath("/audit");

  return { ok: true, error: null };
}
