import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDevMasterlist } from "@/lib/domain/dev-masterlist";
import { listLocalClients } from "@/lib/server/local-store";
import { generateAllLots } from "../../../../scripts/seed/lot-geometry";

export interface SearchResult {
  type: "client" | "lot";
  id: string;
  label: string;
  sublabel: string;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const results: SearchResult[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { clients, lotStatusById } = getDevMasterlist();
    const local = await listLocalClients();

    for (const c of [...clients, ...local]) {
      if (c.name.toLowerCase().includes(q) && results.length < 20) {
        results.push({ type: "client", id: c.id, label: c.name, sublabel: "Client" });
      }
    }

    for (const lot of generateAllLots()) {
      if (lot.displayId.toLowerCase().includes(q) && results.filter((r) => r.type === "lot").length < 8) {
        const live = lotStatusById.get(lot.displayId);
        results.push({
          type: "lot",
          id: lot.displayId,
          label: lot.displayId,
          sublabel: live?.clientName ?? "Available",
        });
      }
    }
  } else {
    const supabase = await createClient();
    const [{ data: clients }, { data: lots }] = await Promise.all([
      supabase.from("clients").select("id, name").ilike("name", `%${q}%`).is("deleted_at", null).limit(20),
      supabase.from("lots").select("id, display_id").ilike("display_id", `%${q}%`).is("deleted_at", null).limit(8),
    ]);
    for (const c of clients ?? []) results.push({ type: "client", id: c.id, label: c.name, sublabel: "Client" });
    for (const l of lots ?? []) results.push({ type: "lot", id: l.id, label: l.display_id, sublabel: "Lot" });
  }

  return NextResponse.json({ results: results.slice(0, 20) });
}
