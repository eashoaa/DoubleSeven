import { createClient } from "@/lib/supabase/server";

/**
 * Real, Supabase-backed audit trail — writes to public.audit_log directly
 * (RLS already allows `insert with check (user_id = auth.uid())`, no
 * migration needed). This is the counterpart to local-store's appendAudit
 * for every action that now writes to real tables (collections, expenses,
 * requisitions, agents, payouts); local-store-only flows keep using
 * appendAudit as before.
 */
export async function logAudit(entry: {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  summary: string;
}): Promise<void> {
  const supabase = await createClient();
  await supabase.from("audit_log").insert({
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    user_id: entry.userId,
    details: { summary: entry.summary },
  });
}
