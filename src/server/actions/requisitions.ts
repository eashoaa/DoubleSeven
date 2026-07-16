"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { can } from "@/lib/permissions";
import {
  createRequisition,
  resolveRequisition,
  recordExpense,
  saveReceipt,
  saveRequisitionThreshold,
  type LocalRequisition,
} from "@/lib/server/local-store";

export interface RequisitionActionState {
  error: string | null;
  success: boolean;
}

export async function createRequisitionAction(
  _prev: RequisitionActionState,
  formData: FormData
): Promise<RequisitionActionState> {
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const vendor = String(formData.get("vendor") ?? "").trim();
  const amountPesos = Number(formData.get("amountPesos") ?? 0);
  const paidFrom = String(formData.get("paidFrom") ?? "bank") as LocalRequisition["paidFrom"];
  const supportingDoc = formData.get("supportingDoc") as File | null;

  if (!description || !amountPesos || amountPesos <= 0) {
    return { error: "Description and a positive amount are required.", success: false };
  }
  if (!supportingDoc || supportingDoc.size === 0) {
    return { error: "A supporting document is required to file a requisition.", success: false };
  }

  const user = await getCurrentUser();

  const buffer = Buffer.from(await supportingDoc.arrayBuffer());
  const receipt = await saveReceipt({
    filename: supportingDoc.name,
    mimeType: supportingDoc.type || "application/octet-stream",
    data: buffer,
    uploadedBy: user.name,
  });

  const amountCents = Math.round(amountPesos * 100);
  const requisition = await createRequisition({
    requestedBy: user.name,
    category: category || "Uncategorized",
    description,
    vendor: vendor || null,
    amountCents,
    paidFrom,
    supportingDocId: receipt.id,
  });

  if (requisition.status === "auto_approved") {
    await recordExpense({
      category: requisition.category,
      description: `${requisition.description}${requisition.vendor ? ` (${requisition.vendor})` : ""}`,
      amountCents: requisition.amountCents,
      paidFrom: requisition.paidFrom,
      receiptId: requisition.supportingDocId,
      recordedBy: user.name,
    });
    revalidatePath("/expenses");
  }

  revalidatePath("/requisitions");
  return { error: null, success: true };
}

export async function approveRequisitionAction(id: string) {
  const user = await getCurrentUser();
  if (!can(user.role, "verifyPending")) throw new Error("Not authorized to approve requisitions.");

  const requisition = await resolveRequisition({ id, status: "approved", resolvedBy: user.name });
  if (!requisition) throw new Error("Requisition not found.");

  await recordExpense({
    category: requisition.category,
    description: `${requisition.description}${requisition.vendor ? ` (${requisition.vendor})` : ""}`,
    amountCents: requisition.amountCents,
    paidFrom: requisition.paidFrom,
    receiptId: requisition.supportingDocId,
    recordedBy: user.name,
  });

  revalidatePath("/requisitions");
  revalidatePath("/expenses");
}

export async function rejectRequisitionAction(id: string, reason: string) {
  const user = await getCurrentUser();
  if (!can(user.role, "verifyPending")) throw new Error("Not authorized to reject requisitions.");

  await resolveRequisition({ id, status: "rejected", resolvedBy: user.name, rejectionReason: reason });
  revalidatePath("/requisitions");
}

export interface UpdateThresholdState {
  error: string | null;
  success: boolean;
}

export async function updateRequisitionThresholdAction(
  _prev: UpdateThresholdState,
  formData: FormData
): Promise<UpdateThresholdState> {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    return { error: "Only admins can change the requisition threshold.", success: false };
  }

  const thresholdPesos = Number(formData.get("thresholdPesos") ?? 0);
  if (!thresholdPesos || thresholdPesos <= 0) {
    return { error: "Enter a positive threshold amount.", success: false };
  }

  await saveRequisitionThreshold(Math.round(thresholdPesos * 100), user.name);
  revalidatePath("/settings");
  return { error: null, success: true };
}
