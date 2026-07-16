import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import contractPdfs from "../../../../../scripts/data/contract-pdfs.json";

// Whitelist against the known matched-filename index: never build a
// filesystem path from unvalidated request input.
const KNOWN_FILENAMES = new Set(Object.values(contractPdfs).flat() as string[]);
const CONTRACTS_DIR = path.join(process.cwd(), ".local-data", "contracts");

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const decoded = decodeURIComponent(filename);
  if (!KNOWN_FILENAMES.has(decoded)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const data = await fs.readFile(path.join(CONTRACTS_DIR, decoded));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(decoded)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
