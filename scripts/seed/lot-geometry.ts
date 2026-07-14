import type { SectionCode, Tier } from "@/types/domain";

/**
 * Ported from the prototype's generateLawnLots()/generateGardenLots()/etc.
 * (cemetery_dashboard.jsx ~lines 279-344) — the only concrete geometry data
 * available, hand-tuned pixel coordinates over the 2048x1346 `WHOLE MAP`
 * scan (public/park/whole-map.jpeg). These counts are KNOWN APPROXIMATE —
 * see the plan's open item #1: exact per-section lot counts must be
 * confirmed against the printed sales maps before this seed is
 * authoritative. Geometry is persisted into the DB (lots.geom_points), not
 * hardcoded in client code, so staff can correct it without a deploy.
 */

export interface GridBlock {
  tier: Tier;
  startX: number;
  startY: number;
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  count: number;
  gap?: number;
}

export interface GeneratedLot {
  section: SectionCode;
  tier: Tier;
  seq: number;
  displayId: string;
  row: number;
  col: number;
  points: [number, number][];
  centroid: [number, number];
}

function gridBlock(
  section: SectionCode,
  prefix: string,
  startSeq: number,
  block: GridBlock
): GeneratedLot[] {
  const lots: GeneratedLot[] = [];
  const gap = block.gap ?? 4;
  let seq = startSeq;
  let placed = 0;

  for (let r = 0; r < block.rows && placed < block.count; r++) {
    for (let c = 0; c < block.cols && placed < block.count; c++) {
      const x = block.startX + c * block.cellW;
      const y = block.startY + r * block.cellH;
      const w = block.cellW - gap;
      const h = block.cellH - gap;
      lots.push({
        section,
        tier: block.tier,
        seq,
        displayId: `${prefix}-${block.tier.toUpperCase()}-${String(seq).padStart(3, "0")}`,
        row: r,
        col: c,
        points: [
          [x, y],
          [x + w, y],
          [x + w, y + h],
          [x, y + h],
        ],
        centroid: [x + w / 2, y + h / 2],
      });
      seq++;
      placed++;
    }
  }
  return lots;
}

function fromBlocks(section: SectionCode, prefix: string, blocks: GridBlock[]): GeneratedLot[] {
  let out: GeneratedLot[] = [];
  for (const block of blocks) {
    // Each tier within a section restarts its own sequence, so display IDs
    // read as e.g. LL-PRIME-001 rather than a shared counter across tiers.
    const seg = gridBlock(section, prefix, 1, block);
    out = out.concat(seg);
  }
  return out;
}

export function generateLawnLots(): GeneratedLot[] {
  return fromBlocks("ll", "LL", [
    { tier: "regular", startX: 788, startY: 180, cols: 11, rows: 7, cellW: 46, cellH: 40, count: 67 },
    { tier: "premium", startX: 1088, startY: 468, cols: 5, rows: 10, cellW: 40, cellH: 25, count: 48 },
    { tier: "prime", startX: 1300, startY: 468, cols: 5, rows: 10, cellW: 42, cellH: 25, count: 48 },
  ]);
}

export function generateGardenLots(): GeneratedLot[] {
  return fromBlocks("gl", "GL", [
    { tier: "regular", startX: 1035, startY: 840, cols: 5, rows: 6, cellW: 42, cellH: 45, count: 26 },
    { tier: "premium", startX: 1262, startY: 840, cols: 5, rows: 6, cellW: 42, cellH: 45, count: 26 },
  ]);
}

export function generateFamilyEstates(): GeneratedLot[] {
  return fromBlocks("fe", "FE", [
    { tier: "premium", startX: 185, startY: 78, cols: 21, rows: 2, cellW: 42, cellH: 34, count: 42, gap: 5 },
  ]);
}

export function generateCourtEstates(): GeneratedLot[] {
  return fromBlocks("ce", "CE", [
    { tier: "premium", startX: 1600, startY: 1000, cols: 4, rows: 1, cellW: 95, cellH: 110, count: 4, gap: 12 },
  ]);
}

export function generateCommunityVaults(): GeneratedLot[] {
  return fromBlocks("cv", "CV", [
    { tier: "regular", startX: 1155, startY: 90, cols: 22, rows: 3, cellW: 16, cellH: 18, count: 65, gap: 2 },
  ]);
}

export function generateOssuary(): GeneratedLot[] {
  return fromBlocks("os", "OS", [
    { tier: "regular", startX: 1600, startY: 100, cols: 5, rows: 5, cellW: 36, cellH: 16, count: 25, gap: 2 },
  ]);
}

export function generateAllLots(): GeneratedLot[] {
  return [
    ...generateLawnLots(),
    ...generateGardenLots(),
    ...generateFamilyEstates(),
    ...generateCourtEstates(),
    ...generateCommunityVaults(),
    ...generateOssuary(),
  ];
}

export const SECTION_DEFINITIONS: Array<{
  code: SectionCode;
  label: string;
  description: string;
  color: string;
  priceMinCents: number;
  priceMaxCents: number;
}> = [
  { code: "ll", label: "Lawn Lots", description: "Ground burial lots (Regular/Premium/Prime)", color: "#5fa377", priceMinCents: 4_500_000, priceMaxCents: 9_600_000 },
  { code: "gl", label: "Garden Lots", description: "Elevated garden lots (Regular/Premium/Prime)", color: "#c48f1e", priceMinCents: 12_000_000, priceMaxCents: 25_100_000 },
  { code: "fe", label: "Family Estates", description: "Large family plots (Regular/Premium/Prime)", color: "#5a4a8b", priceMinCents: 42_000_000, priceMaxCents: 93_500_000 },
  { code: "ce", label: "Court Estates", description: "Premium estate compounds", color: "#8b4a4a", priceMinCents: 64_000_000, priceMaxCents: 67_200_000 },
  { code: "cv", label: "Community Vaults", description: "Wall niches (community vaults)", color: "#8b6f47", priceMinCents: 2_200_000, priceMaxCents: 3_412_500 },
  { code: "os", label: "Ossuary", description: "Bone vaults", color: "#666666", priceMinCents: 1_600_000, priceMaxCents: 2_205_000 },
];
