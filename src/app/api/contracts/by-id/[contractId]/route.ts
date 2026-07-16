import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Contracts created through the app (as opposed to the legacy name-matched
// batch served by /api/contracts/[filename]) are keyed by contract id, not
// filename. Access control here is just "the caller can read this contracts
// row" (RLS on public.contracts), same table permission already governing
// everywhere else this data shows up.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("contract_file_path")
    .eq("id", contractId)
    .single();

  if (!contract?.contract_file_path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase.storage.from("contracts").download(contract.contract_file_path);
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
