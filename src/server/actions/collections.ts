"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { TransactionTypeEnum } from "@/types/database";

export interface RecordCollectionState {
  error: string | null;
  success: boolean;
}

export async function recordCollectionAction(
  _prev: RecordCollectionState,
  formData: FormData
): Promise<RecordCollectionState> {
  const clientId = String(formData.get("clientId") ?? "").trim();
  const lotDisplayId = String(formData.get("lotDisplayId") ?? "").trim();
  const type = String(formData.get("type") ?? "amortization") as TransactionTypeEnum;
  const amountPesos = Number(formData.get("amountPesos") ?? 0);
  const discountPesos = Number(formData.get("discountPesos") ?? 0);
  const discountReason = String(formData.get("discountReason") ?? "").trim();
  const method = String(formData.get("method") ?? "cash").trim();
  const orNumber = String(formData.get("orNumber") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const receiptFile = formData.get("receipt") as File | null;

  if (!clientId || !lotDisplayId || !amountPesos || amountPesos <= 0) {
    return { error: "Client, lot, and a positive amount are required.", success: false };
  }

  const user = await getCurrentUser();

  if (can(user.role, "requireReceiptPhoto") && (!receiptFile || receiptFile.size === 0)) {
    return { error: "A receipt or OR photo is required for this payment.", success: false };
  }

  const supabase = await createClient();

  const { data: lot } = await supabase
    .from("lots_with_status")
    .select("id, active_contract_id, active_agent_id")
    .eq("display_id", lotDisplayId)
    .single();
  if (!lot) {
    return { error: `Lot ${lotDisplayId} not found.`, success: false };
  }

  const id = randomUUID();
  let receiptPath: string | null = null;
  if (receiptFile && receiptFile.size > 0) {
    const ext = receiptFile.name.split(".").pop() || "jpg";
    receiptPath = `transactions/${id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(receiptPath, receiptFile, { contentType: receiptFile.type || "application/octet-stream" });
    if (uploadError) {
      return { error: `Failed to upload receipt: ${uploadError.message}`, success: false };
    }
  }

  const grossCents = Math.round(amountPesos * 100);
  const discountCents = Math.round(discountPesos * 100);

  const { error } = await supabase.from("transactions").insert({
    id,
    contract_id: lot.active_contract_id,
    lot_id: lot.id,
    client_id: clientId,
    agent_id: lot.active_agent_id,
    or_number: orNumber || null,
    paid_at: new Date().toISOString().slice(0, 10),
    type,
    method,
    gross_cents: grossCents,
    discount_cents: discountCents,
    discount_reason: discountCents > 0 ? discountReason || null : null,
    note: note || null,
    deposited: method !== "cash",
    deposit_date: method !== "cash" ? new Date().toISOString().slice(0, 10) : null,
    receipt_url: receiptPath,
    recorded_by: user.id,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/collections");
  revalidatePath("/lots");
  revalidatePath("/map");
  revalidatePath("/agents");
  revalidatePath("/");
  return { error: null, success: true };
}

export async function markDepositedAction(id: string) {
  const supabase = await createClient();
  await supabase
    .from("transactions")
    .update({ deposited: true, deposit_date: new Date().toISOString().slice(0, 10) })
    .eq("id", id);
  revalidatePath("/collections");
}
