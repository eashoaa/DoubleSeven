import { cache } from "react";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "./server";
import type { Database } from "@/types/database";
import type { Role } from "@/lib/permissions";

// Phase 0 fallback so the UI is reviewable before a Supabase project
// exists. Once NEXT_PUBLIC_SUPABASE_URL is set, proxy.ts already redirects
// unauthenticated requests to /login, so reaching a page that calls this
// means a real session exists.
const DEV_FALLBACK_USER = { id: "dev", name: "Johann Tan", role: "admin" as Role };

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Profile/role lookup, cached across requests for 60s (roles change rarely,
 * so most navigations can skip this round trip entirely — this was the
 * "still slow on repeat tab visits" culprit: every navigation re-ran it).
 *
 * This hits Supabase's REST endpoint directly with fetch() rather than
 * going through @supabase/supabase-js's createClient — that client always
 * spins up a realtime/WebSocket connection on construction, which throws
 * under Node <22 (no native WebSocket global), silently breaking this on
 * every request. A plain fetch has no such dependency, and it's also what
 * unstable_cache forbids anyway: the cookie-bound client (./server) can't
 * be used here since unstable_cache disallows dynamic APIs like cookies()
 * inside its callback. Safe with the service-role key only because userId
 * here always comes from a *live*, uncached auth.getUser() call below —
 * never from unauthenticated/user-supplied input.
 */
const getCachedProfile = unstable_cache(
  async (userId: string): Promise<ProfileRow | null> => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as ProfileRow[];
    return rows[0] ?? null;
  },
  ["current-user-profile"],
  { revalidate: 60 }
);

/**
 * React's cache() memoizes this per server request, so the layout and any
 * page that also calls getCurrentUser() (pending, requisitions, agents,
 * collections, settings…) share one call instead of each paying for its
 * own within the same navigation.
 */
export const getCurrentUser = cache(async (): Promise<{ id: string; name: string; role: Role }> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return DEV_FALLBACK_USER;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCachedProfile(user.id);

  if (!profile) redirect("/login");

  return { id: profile.id, name: profile.full_name, role: profile.role };
});
