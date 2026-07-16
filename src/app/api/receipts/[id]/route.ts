import { NextRequest, NextResponse } from "next/server";
import { getReceiptFile } from "@/lib/server/local-store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getReceiptFile(id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(result.data), {
    headers: {
      "Content-Type": result.meta.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(result.meta.filename)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
