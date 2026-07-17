"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/server/audit";

export interface RecordExpenseState {
  error: string | null;
  success: boolean;
}

export async function recordExpenseAction(
  _prev: RecordExpenseState,
  formData: FormData
): Promise<RecordExpenseState> {
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amountPesos = Number(formData.get("amountPesos") ?? 0);
  const paidFrom = String(formData.get("paidFrom") ?? "petty_cash") as "petty_cash" | "bank" | "other";
  const receiptFile = formData.get("receipt") as File | null;

  if (!description || !amountPesos || amountPesos <= 0) {
    return { error: "Description and a positive amount are required.", success: false };
  }

  const user = await getCurrentUser();
  const supabase = await createClient();

  const id = randomUUID();
  let receiptPath: string | null = null;
  if (receiptFile && receiptFile.size > 0) {
    const ext = receiptFile.name.split(".").pop() || "jpg";
    receiptPath = `expenses/${id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(receiptPath, receiptFile, { contentType: receiptFile.type || "application/octet-stream" });
    if (uploadError) {
      return { error: `Failed to upload receipt: ${uploadError.message}`, success: false };
    }
  }

  const amountCents = Math.round(amountPesos * 100);
  const { error } = await supabase.from("expenses").insert({
    id,
    category: category || "Uncategorized",
    description,
    amount_cents: amountCents,
    paid_from: paidFrom,
    receipt_path: receiptPath,
    recorded_by: user.id,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  await logAudit({
    action: "expense.recorded",
    entityType: "expense",
    entityId: id,
    userId: user.id,
    summary: `Logged ₱${(amountCents / 100).toLocaleString()} expense: ${description} (${paidFrom})`,
  });

  revalidatePath("/expenses");
  return { error: null, success: true };
}
