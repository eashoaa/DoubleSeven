"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { recordCollection, markCollectionDeposited, saveReceipt } from "@/lib/server/local-store";

export interface RecordCollectionState {
  error: string | null;
  success: boolean;
}

export async function recordCollectionAction(
  _prev: RecordCollectionState,
  formData: FormData
): Promise<RecordCollectionState> {
  const clientId = String(formData.get("clientId") ?? "");
  const clientName = String(formData.get("clientName") ?? "").trim();
  const lotDisplayId = String(formData.get("lotDisplayId") ?? "").trim();
  const type = String(formData.get("type") ?? "payment") as
    | "payment"
    | "reservation"
    | "downpayment"
    | "other";
  const amountPesos = Number(formData.get("amountPesos") ?? 0);
  const method = String(formData.get("method") ?? "cash") as
    | "cash"
    | "bank_transfer"
    | "check"
    | "gcash"
    | "other";
  const orNumber = String(formData.get("orNumber") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const receiptFile = formData.get("receipt") as File | null;

  if (!clientName || !amountPesos || amountPesos <= 0) {
    return { error: "Client and a positive amount are required.", success: false };
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

  await recordCollection({
    clientId: clientId || `manual-${clientName}`,
    clientName,
    lotDisplayId: lotDisplayId || null,
    type,
    grossCents: Math.round(amountPesos * 100),
    method,
    orNumber: orNumber || null,
    note: note || null,
    receiptId,
    recordedBy: user.name,
  });

  revalidatePath("/collections");
  revalidatePath("/");
  return { error: null, success: true };
}

export async function markDepositedAction(id: string) {
  const user = await getCurrentUser();
  await markCollectionDeposited(id, user.name);
  revalidatePath("/collections");
}
