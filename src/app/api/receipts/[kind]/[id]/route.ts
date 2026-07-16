import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Modeled directly on /api/contracts/by-id/[contractId]: access control is
// just "the caller can read this row" (RLS on the referencing table), same
// table permission already governing everywhere else this data shows up.
// One shared "receipts" Storage bucket, path-namespaced per kind.
const TABLE_BY_KIND = {
  transaction: { table: "transactions", column: "receipt_url" },
  expense: { table: "expenses", column: "receipt_path" },
  requisition: { table: "requisitions", column: "supporting_doc_path" },
} as const;

type Kind = keyof typeof TABLE_BY_KIND;

function isKind(value: string): value is Kind {
  return value in TABLE_BY_KIND;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const { kind, id } = await params;
  if (!isKind(kind)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { table, column } = TABLE_BY_KIND[kind];
  const supabase = await createClient();

  const { data: row } = await supabase.from(table).select(column).eq("id", id).single();
  const path = row?.[column as keyof typeof row] as string | null | undefined;
  if (!path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase.storage.from("receipts").download(path);
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(data, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
