import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Same select-then-download-then-stream shape as
// /api/receipts/[kind]/[id]/route.ts, against the company-resources bucket
// instead. Access control is "the caller can read the resources row" —
// resources_select allows any authenticated role.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase.from("resources").select("file_path, name").eq("id", id).single();
  if (!row?.file_path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase.storage.from("company-resources").download(row.file_path);
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(data, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Content-Disposition": `inline; filename="${row.name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
