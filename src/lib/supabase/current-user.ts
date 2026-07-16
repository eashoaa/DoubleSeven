import { redirect } from "next/navigation";
import { createClient } from "./server";
import type { Role } from "@/lib/permissions";

// Phase 0 fallback so the UI is reviewable before a Supabase project
// exists. Once NEXT_PUBLIC_SUPABASE_URL is set, proxy.ts already redirects
// unauthenticated requests to /login, so reaching a page that calls this
// means a real session exists.
const DEV_FALLBACK_USER = { id: "dev", name: "Johann Tan", role: "admin" as Role };

export async function getCurrentUser(): Promise<{ id: string; name: string; role: Role }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return DEV_FALLBACK_USER;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return { id: profile.id, name: profile.full_name, role: profile.role };
}
