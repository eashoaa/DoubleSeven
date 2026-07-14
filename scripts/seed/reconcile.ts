import { generateAllLots, SECTION_DEFINITIONS } from "./lot-geometry";

/**
 * Prints a reconciliation table: generated lot inventory (by section+tier)
 * vs. what the real masterlist demands (from the extraction report at
 * scripts/notes/prototype-extraction.md, item 6). Run before seeding a real
 * environment — this is the "surface a reconciliation table for sign-off
 * rather than guessing" step from the plan's open item #1.
 */

// Masterlist type-code counts, copied verbatim from the extraction report.
const MASTERLIST_DEMAND: Record<string, number> = {
  "ll-regular": 82,
  "ll-premium": 55,
  "ll-prime": 26,
  "gl-regular": 32,
  "gl-premium": 10,
  "gl-prime": 10,
  "fe-regular": 4,
  "fe-premium": 24,
  "fe-prime": 14,
  cv: 53,
  ossuary: 18,
  ce: 2,
  "ce-premium": 1,
  other: 3, // falls back to ll-regular per the prototype's typeToSection/typeToTier map
};

function main() {
  const lots = generateAllLots();
  const supply = new Map<string, number>();
  for (const lot of lots) {
    const key = `${lot.section}-${lot.tier}`;
    supply.set(key, (supply.get(key) ?? 0) + 1);
  }

  console.log("Generated inventory (this seed):");
  for (const section of SECTION_DEFINITIONS) {
    const tiers = ["regular", "premium", "prime"] as const;
    for (const tier of tiers) {
      const count = supply.get(`${section.code}-${tier}`) ?? 0;
      if (count > 0) console.log(`  ${section.code}-${tier}: ${count}`);
    }
  }
  console.log(`  TOTAL: ${lots.length}`);

  console.log("\nMasterlist demand vs generated supply (approximate — needs sign-off against printed maps):");
  const demandBySectionTier: Record<string, number> = {
    "ll-regular": MASTERLIST_DEMAND["ll-regular"],
    "ll-premium": MASTERLIST_DEMAND["ll-premium"],
    "ll-prime": MASTERLIST_DEMAND["ll-prime"],
    "gl-regular": MASTERLIST_DEMAND["gl-regular"],
    "gl-premium": MASTERLIST_DEMAND["gl-premium"],
    "gl-prime": MASTERLIST_DEMAND["gl-prime"],
    "fe-regular": MASTERLIST_DEMAND["fe-regular"],
    "fe-premium": MASTERLIST_DEMAND["fe-premium"],
    "fe-prime": MASTERLIST_DEMAND["fe-prime"],
    "cv-regular": MASTERLIST_DEMAND.cv,
    "os-regular": MASTERLIST_DEMAND.ossuary,
    "ce-regular": MASTERLIST_DEMAND.ce,
    "ce-premium": MASTERLIST_DEMAND["ce-premium"],
  };

  let anyShortfall = false;
  for (const [key, demand] of Object.entries(demandBySectionTier)) {
    const have = supply.get(key) ?? 0;
    const short = demand - have;
    if (short > 0) {
      anyShortfall = true;
      console.log(`  SHORTFALL ${key}: need ${demand}, have ${have} (short ${short})`);
    } else {
      console.log(`  ok       ${key}: need ${demand}, have ${have}`);
    }
  }
  console.log(
    `  + ${MASTERLIST_DEMAND.other} "OTHER" masterlist records fall back to ll-regular per the prototype's mapping`
  );

  if (anyShortfall) {
    console.log(
      "\nShortfalls exist because the prototype's own geometry never defined grids for " +
        "gl-prime, fe-regular, fe-prime, or ce-regular — masterlist records of those types " +
        "will be reported as unplaceable by scripts/migrate-masterlist.ts rather than silently " +
        "dropped (the prototype's actual bug, seed() line ~498). This needs real block " +
        "geometry from the printed sales maps before those contracts can be placed on the map."
    );
  }
}

main();
