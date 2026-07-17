"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/server/audit";
import type { Database } from "@/types/database";

export type Resource = Database["public"]["Tables"]["resources"]["Row"];

export interface ResourceActionState {
  error: string | null;
  success: boolean;
}

export async function getResourcesAction(): Promise<Resource[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("resources").select("*").order("uploaded_at", { ascending: false });
  return data ?? [];
}

export async function uploadResourceAction(
  _prev: ResourceActionState,
  formData: FormData
): Promise<ResourceActionState> {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    return { error: "Only admins can upload company resources.", success: false };
  }

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "other") as "brand" | "policy" | "other";
  const file = formData.get("file") as File | null;

  if (!name) {
    return { error: "A name is required.", success: false };
  }
  if (!file || file.size === 0) {
    return { error: "Choose a file to upload.", success: false };
  }

  const supabase = await createClient();
  const id = randomUUID();
  const ext = file.name.split(".").pop() || "bin";
  const filePath = `${id}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("company-resources")
    .upload(filePath, file, { contentType: file.type || "application/octet-stream" });
  if (uploadError) {
    return { error: `Failed to upload file: ${uploadError.message}`, success: false };
  }

  const { error } = await supabase.from("resources").insert({
    id,
    name,
    category,
    file_path: filePath,
    uploaded_by: user.id,
  });
  if (error) {
    return { error: error.message, success: false };
  }

  await logAudit({
    action: "resource.uploaded",
    entityType: "resource",
    entityId: id,
    userId: user.id,
    summary: `Uploaded "${name}" to company resources`,
  });

  revalidatePath("/settings");
  return { error: null, success: true };
}
