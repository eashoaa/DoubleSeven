import { NextRequest, NextResponse } from "next/server";

/**
 * Fires the daily late-payment penalty scan (public.apply_overdue_penalties
 * in 20260718000001_penalties.sql). Same "something external has to call
 * this" situation as send-overdue-reminders/route.ts — wired via the
 * `crons` entry in vercel.json, which requires a CRON_SECRET env var set on
 * the Vercel project (Vercel then sends `Authorization: Bearer <secret>`
 * automatically on its own cron requests).
 *
 * Calls the SQL function via a plain fetch with the service-role key rather
 * than the cookie-bound client — a cron has no user session for RLS to key
 * off, same reasoning as the service-role fetches in
 * src/lib/supabase/current-user.ts.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.nextUrl.searchParams.get("secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ created: 0, skipped: "no Supabase project configured" });
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/apply_overdue_penalties`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: "apply_overdue_penalties failed", detail }, { status: 500 });
  }

  const created = await res.json();
  return NextResponse.json({ created });
}
