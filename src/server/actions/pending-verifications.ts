"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function approveVerification(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("pending_verifications")
    .update({ status: "approved", resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/pending");
}

export async function rejectVerification(id: string, reason: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("pending_verifications")
    .update({
      status: "rejected",
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/pending");
}
