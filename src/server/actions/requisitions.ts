"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/server/audit";

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
  const paidFrom = String(formData.get("paidFrom") ?? "bank") as "petty_cash" | "bank" | "other";
  const supportingDoc = formData.get("supportingDoc") as File | null;

  if (!description || !amountPesos || amountPesos <= 0) {
    return { error: "Description and a positive amount are required.", success: false };
  }
  if (!supportingDoc || supportingDoc.size === 0) {
    return { error: "A supporting document is required to file a requisition.", success: false };
  }

  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("requisition_settings")
    .select("threshold_cents")
    .eq("id", true)
    .single();
  const thresholdCents = settings?.threshold_cents ?? 5_000_000;

  const id = randomUUID();
  const ext = supportingDoc.name.split(".").pop() || "jpg";
  const docPath = `requisitions/${id}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(docPath, supportingDoc, { contentType: supportingDoc.type || "application/octet-stream" });
  if (uploadError) {
    return { error: `Failed to upload supporting document: ${uploadError.message}`, success: false };
  }

  const amountCents = Math.round(amountPesos * 100);
  const autoApproved = amountCents < thresholdCents;

  const { error } = await supabase.from("requisitions").insert({
    id,
    requested_by: user.id,
    category: category || "Uncategorized",
    description,
    vendor: vendor || null,
    amount_cents: amountCents,
    paid_from: paidFrom,
    supporting_doc_path: docPath,
    status: autoApproved ? "auto_approved" : "pending",
  });
  if (error) {
    return { error: error.message, success: false };
  }
  // trg_requisition_to_expense (DB trigger) creates the matching expenses
  // row automatically when status is auto_approved — see the migration.

  await logAudit({
    action: "requisition.filed",
    entityType: "requisition",
    entityId: id,
    userId: user.id,
    summary: autoApproved
      ? `Filed and auto-approved ₱${(amountCents / 100).toLocaleString()} requisition: ${description}`
      : `Filed ₱${(amountCents / 100).toLocaleString()} requisition for approval: ${description}`,
  });

  if (autoApproved) revalidatePath("/expenses");
  revalidatePath("/requisitions");
  return { error: null, success: true };
}

export async function approveRequisitionAction(id: string) {
  const user = await getCurrentUser();
  if (!can(user.role, "verifyPending")) throw new Error("Not authorized to approve requisitions.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("requisitions")
    .update({ status: "approved", resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  // trg_requisition_to_expense (DB trigger) creates the matching expenses
  // row automatically on this pending -> approved transition.

  await logAudit({
    action: "requisition.approved",
    entityType: "requisition",
    entityId: id,
    userId: user.id,
    summary: "Approved a requisition",
  });

  revalidatePath("/requisitions");
  revalidatePath("/expenses");
}

export async function rejectRequisitionAction(id: string, reason: string) {
  const user = await getCurrentUser();
  if (!can(user.role, "verifyPending")) throw new Error("Not authorized to reject requisitions.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("requisitions")
    .update({
      status: "rejected",
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit({
    action: "requisition.rejected",
    entityType: "requisition",
    entityId: id,
    userId: user.id,
    summary: `Rejected requisition: ${reason}`,
  });

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

  const supabase = await createClient();
  const { error } = await supabase
    .from("requisition_settings")
    .update({ threshold_cents: Math.round(thresholdPesos * 100) })
    .eq("id", true);
  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/settings");
  return { error: null, success: true };
}
