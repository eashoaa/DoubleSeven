"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createLocalClient, createLocalContract, saveReceipt, setContactOverride } from "@/lib/server/local-store";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { logAudit } from "@/lib/server/audit";
import { can } from "@/lib/permissions";

export interface CreateClientState {
  error: string | null;
  success: boolean;
}

const REQUIRED_FIELD_LABELS: Record<string, string> = {
  name: "Full name",
  contact: "Contact number",
  email: "Email",
  address: "Address",
  lotDisplayId: "Lot",
  priceCents: "Contract price",
  termMonths: "Term (months)",
  planType: "Payment plan",
  contract: "Signed contract file",
};

export async function createClientAction(
  _prevState: CreateClientState,
  formData: FormData
): Promise<CreateClientState> {
  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const lotDisplayId = String(formData.get("lotDisplayId") ?? "").trim();
  const priceCents = Math.round(Number(formData.get("pricePesos") ?? 0) * 100);
  const downpaymentCents = Math.round(Number(formData.get("downpaymentPesos") ?? 0) * 100);
  const termMonths = Number(formData.get("termMonths") ?? 0);
  const planType = String(formData.get("planType") ?? "monthly") as "monthly" | "quarterly" | "annual";
  const contractFile = formData.get("contract") as File | null;
  const agentId = String(formData.get("agentId") ?? "").trim();

  const missing = Object.entries({
    name,
    contact,
    email,
    address,
    lotDisplayId,
    priceCents: priceCents > 0 ? "ok" : "",
    termMonths: termMonths > 0 ? "ok" : "",
    planType,
    contract: contractFile && contractFile.size > 0 ? "ok" : "",
  })
    .filter(([, v]) => !v)
    .map(([k]) => REQUIRED_FIELD_LABELS[k] ?? k);

  if (missing.length > 0) {
    return { error: `Required: ${missing.join(", ")}.`, success: false };
  }

  const user = await getCurrentUser();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const client = await createLocalClient({ name, contact, email, address, createdBy: user.name });

    const buffer = Buffer.from(await contractFile!.arrayBuffer());
    const receipt = await saveReceipt({
      filename: contractFile!.name,
      mimeType: contractFile!.type || "application/pdf",
      data: buffer,
      uploadedBy: user.name,
    });

    await createLocalContract({
      clientId: client.id,
      clientName: client.name,
      lotDisplayId,
      priceCents,
      downpaymentCents,
      termMonths,
      planType,
      contractFileId: receipt.id,
      createdBy: user.name,
    });

    revalidatePath("/clients");
    revalidatePath("/lots");
    revalidatePath("/map");
    revalidatePath("/");
    return { error: null, success: true };
  }

  const supabase = await createClient();
  const { data: newClient, error } = await supabase
    .from("clients")
    .insert({
      name,
      contact: contact || null,
      email: email || null,
      address: address || null,
      since: new Date().toISOString().slice(0, 10),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !newClient) return { error: error?.message ?? "Failed to create client.", success: false };

  const { data: lot } = await supabase.from("lots").select("id").eq("display_id", lotDisplayId).single();
  if (!lot) return { error: `Lot ${lotDisplayId} not found.`, success: false };

  const { data: newContract, error: contractError } = await supabase
    .from("contracts")
    .insert({
      lot_id: lot.id,
      client_id: newClient.id,
      agent_id: agentId || null,
      price_cents: priceCents,
      downpayment_cents: downpaymentCents,
      term_months: termMonths,
      plan_type: planType,
      start_date: new Date().toISOString().slice(0, 10),
      status: "reserved",
    })
    .select("id")
    .single();
  if (contractError || !newContract) return { error: contractError?.message ?? "Failed to create contract.", success: false };

  const ext = contractFile!.name.split(".").pop() || "pdf";
  const storagePath = `${newContract.id}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("contracts")
    .upload(storagePath, contractFile!, {
      contentType: contractFile!.type || "application/pdf",
      upsert: true,
    });
  if (!uploadError) {
    await supabase.from("contracts").update({ contract_file_path: storagePath }).eq("id", newContract.id);
  }

  revalidatePath("/clients");
  revalidatePath("/lots");
  revalidatePath("/map");
  revalidatePath("/");
  return { error: null, success: true };
}

export interface UpdateContactState {
  error: string | null;
  success: boolean;
}

/**
 * The real masterlist (257 clients) has no phone/email column at all,
 * this is how staff add real contact info as they collect it, rather than
 * it being invented. Works for masterlist-derived clients too (stored as
 * an override keyed by client id, not a mutation of masterlist.json).
 */
export async function updateClientContactAction(
  _prev: UpdateContactState,
  formData: FormData
): Promise<UpdateContactState> {
  const clientId = String(formData.get("clientId") ?? "");
  const clientName = String(formData.get("clientName") ?? "");
  const contact = String(formData.get("contact") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!contact && !email) {
    return { error: "Enter at least a contact number or an email.", success: false };
  }

  const user = await getCurrentUser();
  await setContactOverride(
    clientId,
    clientName,
    { contact: contact || null, email: email || null, address: address || null },
    user.name
  );
  revalidatePath("/clients");
  return { error: null, success: true };
}

/**
 * The "contact info current" check from the client re-assessment project —
 * previously tracked nowhere but a chat thread. One-click, same shape as
 * undoMarkDepositedAction (collections.ts): a status toggle, not a form.
 */
export async function verifyClientContactAction(clientId: string) {
  const user = await getCurrentUser();
  if (!can(user.role, "editClient")) {
    throw new Error("Not authorized to verify clients.");
  }

  const supabase = await createClient();
  await supabase
    .from("clients")
    .update({ verified_at: new Date().toISOString(), verified_by: user.id })
    .eq("id", clientId);

  await logAudit({
    action: "client.verified",
    entityType: "client",
    entityId: clientId,
    userId: user.id,
    summary: "Confirmed contact info is current",
  });

  revalidatePath("/clients");
  revalidatePath("/");
}
