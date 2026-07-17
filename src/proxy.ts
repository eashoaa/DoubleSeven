import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // /api/cron/* is called by Vercel Cron with no user session at all —
    // it authenticates via CRON_SECRET instead, so this redirect-to-login
    // logic doesn't apply and was making every cron request 307 to /login
    // before it ever reached the route's own secret check.
    "/((?!_next/static|_next/image|favicon.ico|park/|api/cron/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
