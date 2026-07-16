/**
 * One-time migration: uploads the contract PDFs already sitting in
 * .local-data/contracts/ (the batch matched to real clients via
 * scripts/data/contract-pdfs.json) into the Supabase "contracts" Storage
 * bucket, preserving filenames so /api/contracts/[filename] can serve them
 * unchanged, just backed by Storage instead of local disk.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/upload-contracts-to-storage.ts
 */
import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";
import contractPdfs from "./data/contract-pdfs.json";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const contractsDir = path.join(process.cwd(), ".local-data", "contracts");
  const filenames = [...new Set(Object.values(contractPdfs as Record<string, string[]>).flat())];

  console.log(`Uploading ${filenames.length} contract files...`);
  let uploaded = 0;
  let failed = 0;

  for (const filename of filenames) {
    try {
      const data = await fs.readFile(path.join(contractsDir, filename));
      const { error } = await supabase.storage
        .from("contracts")
        .upload(filename, data, { contentType: "application/pdf", upsert: true });
      if (error) throw error;
      uploaded++;
    } catch (err) {
      failed++;
      console.error(`  Failed: ${filename} (${err instanceof Error ? err.message : err})`);
    }
  }

  console.log(`Done. ${uploaded} uploaded, ${failed} failed.`);
}

main();
