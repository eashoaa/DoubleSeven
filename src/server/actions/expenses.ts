"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.from("expenses").insert({
    id,
    category: category || "Uncategorized",
    description,
    amount_cents: Math.round(amountPesos * 100),
    paid_from: paidFrom,
    receipt_path: receiptPath,
    recorded_by: user.id,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/expenses");
  return { error: null, success: true };
}
