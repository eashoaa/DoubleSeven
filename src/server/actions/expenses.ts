"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { recordExpense, saveReceipt } from "@/lib/server/local-store";

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

  let receiptId: string | null = null;
  if (receiptFile && receiptFile.size > 0) {
    const buffer = Buffer.from(await receiptFile.arrayBuffer());
    const meta = await saveReceipt({
      filename: receiptFile.name,
      mimeType: receiptFile.type || "application/octet-stream",
      data: buffer,
      uploadedBy: user.name,
    });
    receiptId = meta.id;
  }

  await recordExpense({
    category: category || "Uncategorized",
    description,
    amountCents: Math.round(amountPesos * 100),
    paidFrom,
    receiptId,
    recordedBy: user.name,
  });

  revalidatePath("/expenses");
  return { error: null, success: true };
}
