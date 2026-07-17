"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/server/audit";
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
  const lotId = String(formData.get("lotId") ?? "");
  const lotDisplayId = String(formData.get("lotDisplayId") ?? "");
  const clientName = String(formData.get("clientName") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) {
    return { ok: false, error: "A reason is required to mark an account as defaulted." };
  }

  const user = await getCurrentUser();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    await markContractDefaulted({ contractId, lotDisplayId, clientName, reason, markedBy: user.name });
  } else {
    // lots_write RLS is admin-only — matches the intent of status_override
    // (a manual, forceful flag) already documented in the lots table.
    if (user.role !== "admin") {
      return { ok: false, error: "Only admins can mark an account as defaulted." };
    }
    const supabase = await createClient();
    const { error } = await supabase.from("lots").update({ status_override: "defaulted" }).eq("id", lotId);
    if (error) {
      return { ok: false, error: error.message };
    }
    await logAudit({
      action: "contract.marked_defaulted",
      entityType: "contract",
      entityId: contractId,
      userId: user.id,
      summary: `Marked ${clientName} (${lotDisplayId}) as defaulted: ${reason}`,
    });
  }

  revalidatePath("/overdue");
  revalidatePath("/");
  revalidatePath("/lots");
  revalidatePath("/map");
  revalidatePath("/audit");

  return { ok: true, error: null };
}
