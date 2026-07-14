/**
 * Seeds sections + lots into Supabase from the geometry in
 * scripts/seed/lot-geometry.ts. Run once against a fresh project, after
 * migrations and before scripts/migrate-masterlist.ts.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-inventory.ts
 *
 * The service-role key is required — this bypasses RLS intentionally (a
 * seed script isn't a logged-in user). Never ship that key to the client.
 */
import { createClient } from "@supabase/supabase-js";
import { generateAllLots, SECTION_DEFINITIONS } from "./seed/lot-geometry";
import { suggestedLotPriceCents } from "@/lib/domain/pricing";

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

  console.log(`Seeding ${SECTION_DEFINITIONS.length} sections...`);
  const { error: sectionsError } = await supabase.from("sections").upsert(
    SECTION_DEFINITIONS.map((s) => ({
      code: s.code,
      label: s.label,
      description: s.description,
      color: s.color,
      price_min_cents: s.priceMinCents,
      price_max_cents: s.priceMaxCents,
    })),
    { onConflict: "code" }
  );
  if (sectionsError) {
    console.error("Failed to seed sections:", sectionsError.message);
    process.exit(1);
  }

  const sectionByCode = new Map(SECTION_DEFINITIONS.map((s) => [s.code, s]));
  const lots = generateAllLots();

  console.log(`Seeding ${lots.length} lots (known-approximate — see scripts/seed/reconcile.ts)...`);
  const rows = lots.map((lot) => {
    const section = sectionByCode.get(lot.section)!;
    return {
      section: lot.section,
      lot_number: lot.displayId,
      display_id: lot.displayId,
      tier: lot.tier,
      base_price_cents: suggestedLotPriceCents(
        { priceMinCents: section.priceMinCents, priceMaxCents: section.priceMaxCents },
        lot.tier
      ),
      geom_points: lot.points,
      centroid: lot.centroid,
    };
  });

  // Chunk the insert — Supabase's PostgREST has a practical payload limit.
  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("lots").upsert(chunk, { onConflict: "display_id" });
    if (error) {
      console.error(`Failed to seed lots [${i}, ${i + chunk.length}):`, error.message);
      process.exit(1);
    }
    console.log(`  inserted ${i + chunk.length}/${rows.length}`);
  }

  console.log("Done.");
}

main();
