import type { SectionCode, Tier } from "@/types/domain";

/**
 * Real, human-readable lot layouts, transcribed directly from the printed
 * sales maps (Double Seven Properties/heavensgate_assets: "GARDEN LOT SALES
 * MAP", "LAWN LOT", and the community vault niche chart). This is the
 * shape the "Digital" map view renders; it is independent of live status:
 * the renderer looks up each cell's live status/price/client by displayId.
 *
 * Garden Lots (Section A: A1-A126, Section B: B1-B119) are transcribed
 * cell-for-cell, row by row, off the blueprint; both section counts were
 * verified against the printed A1-A126 / B1-B119 ranges (126 and 119 cells
 * respectively) before being committed here. "2LL-G-BLOCK" / "LLP-G-BLOCK"
 * notes mark the narrow infill lots the blueprint calls out in orange/cyan;
 * they don't carry a prime/premium/regular color on the source map, so
 * they're stored here as regular-tier with a note the UI surfaces.
 *
 * Lawn Lots follow a regular, repeatable pattern (columns of 8 cells,
 * numbered bottom→top, tier by row position) so they're generated rather
 * than hand-transcribed, see generateLawnLotLayout(). The isolated edge
 * lots visible on the blueprint (73/74, 79-86 on Block 02) aren't part of
 * the repeating pattern and are intentionally left out of this first pass.
 *
 * Family Estates, Court Estates, and Ossuary don't have an equivalent
 * numbered sales map in the asset folder (only 3D marketing renders), so
 * they still use the placeholder geometry in scripts/seed/lot-geometry.ts.
 */

export interface LotCell {
  id: string;
  tier: Tier;
  note?: string;
}

export type LotRow = LotCell[];

export interface LotBlock {
  label: string;
  rows: LotRow[];
}

export interface SectionLayout {
  code: SectionCode;
  label: string;
  blocks: LotBlock[];
}

const LLP = "LLP-G-BLOCK";
const TWO_LL = "2LL-G-BLOCK";

const GARDEN_SECTION_A: LotRow[] = [
  [{ id: "A126", tier: "regular", note: LLP }, { id: "A21", tier: "prime" }, { id: "A22", tier: "prime" }, { id: "A23", tier: "prime" }, { id: "A24", tier: "prime" }, { id: "A25", tier: "prime" }, { id: "A26", tier: "prime" }],
  [{ id: "A20", tier: "prime" }, { id: "A57", tier: "premium" }, { id: "A58", tier: "premium" }, { id: "A59", tier: "premium" }, { id: "A60", tier: "premium" }, { id: "A61", tier: "premium" }, { id: "A27", tier: "premium" }],
  [{ id: "A125", tier: "regular", note: LLP }, { id: "A19", tier: "prime" }, { id: "A56", tier: "premium" }, { id: "A108", tier: "regular" }, { id: "A86", tier: "regular" }, { id: "A85", tier: "regular" }, { id: "A62", tier: "premium" }, { id: "A28", tier: "premium" }],
  [{ id: "A18", tier: "prime" }, { id: "A55", tier: "premium" }, { id: "A107", tier: "regular" }, { id: "A87", tier: "regular" }, { id: "A84", tier: "regular" }, { id: "A63", tier: "premium" }, { id: "A29", tier: "premium" }],
  [{ id: "A124", tier: "regular", note: LLP }, { id: "A17", tier: "prime" }, { id: "A54", tier: "premium" }, { id: "A109", tier: "regular", note: LLP }, { id: "A106", tier: "regular" }, { id: "A88", tier: "regular" }, { id: "A83", tier: "regular" }, { id: "A64", tier: "premium" }, { id: "A30", tier: "premium" }],
  [{ id: "A16", tier: "prime" }, { id: "A53", tier: "premium" }, { id: "A110", tier: "regular", note: LLP }, { id: "A105", tier: "regular" }, { id: "A89", tier: "regular" }, { id: "A82", tier: "regular" }, { id: "A65", tier: "premium" }, { id: "A31", tier: "premium" }],
  [{ id: "A122", tier: "regular", note: LLP }, { id: "A123", tier: "regular", note: LLP }, { id: "A15", tier: "prime" }, { id: "A52", tier: "premium" }, { id: "A111", tier: "regular", note: TWO_LL }, { id: "A104", tier: "regular" }, { id: "A90", tier: "regular" }, { id: "A81", tier: "regular" }, { id: "A66", tier: "premium" }, { id: "A32", tier: "premium" }],
  [{ id: "A14", tier: "prime" }, { id: "A51", tier: "premium" }, { id: "A112", tier: "regular", note: TWO_LL }, { id: "A103", tier: "regular" }, { id: "A91", tier: "regular" }, { id: "A80", tier: "regular" }, { id: "A67", tier: "premium" }, { id: "A33", tier: "premium" }],
  [{ id: "A13", tier: "prime" }, { id: "A50", tier: "premium" }, { id: "A113", tier: "regular" }, { id: "A102", tier: "regular" }, { id: "A92", tier: "regular" }, { id: "A79", tier: "regular" }, { id: "A68", tier: "premium" }, { id: "A34", tier: "premium" }],
  [{ id: "A12", tier: "prime" }, { id: "A49", tier: "premium" }, { id: "A114", tier: "regular" }, { id: "A101", tier: "regular" }, { id: "A93", tier: "regular" }, { id: "A78", tier: "regular" }, { id: "A69", tier: "premium" }, { id: "A35", tier: "premium" }],
  [{ id: "A11", tier: "prime" }, { id: "A48", tier: "premium" }, { id: "A115", tier: "regular" }, { id: "A100", tier: "regular" }, { id: "A94", tier: "regular" }, { id: "A77", tier: "regular" }, { id: "A70", tier: "premium" }, { id: "A36", tier: "premium" }],
  [{ id: "A121", tier: "regular", note: LLP }, { id: "A10", tier: "prime" }, { id: "A47", tier: "premium" }, { id: "A116", tier: "regular", note: TWO_LL }, { id: "A99", tier: "regular" }, { id: "A95", tier: "regular" }, { id: "A76", tier: "regular" }, { id: "A71", tier: "premium" }, { id: "A37", tier: "premium" }],
  [{ id: "A9", tier: "prime" }, { id: "A46", tier: "premium" }, { id: "A117", tier: "regular", note: TWO_LL }, { id: "A98", tier: "regular" }, { id: "A96", tier: "regular" }, { id: "A75", tier: "regular" }, { id: "A72", tier: "premium" }, { id: "A38", tier: "premium" }],
  [{ id: "A8", tier: "prime" }, { id: "A45", tier: "premium" }, { id: "A44", tier: "premium" }, { id: "A97", tier: "regular" }, { id: "A74", tier: "regular" }, { id: "A73", tier: "regular" }, { id: "A39", tier: "premium" }],
  [{ id: "A120", tier: "regular", note: LLP }, { id: "A7", tier: "prime" }, { id: "A6", tier: "prime" }, { id: "A43", tier: "premium" }, { id: "A42", tier: "premium" }, { id: "A41", tier: "premium" }, { id: "A40", tier: "premium" }],
  [{ id: "A119", tier: "regular", note: LLP }, { id: "A118", tier: "regular", note: TWO_LL }, { id: "A5", tier: "premium" }, { id: "A4", tier: "prime" }, { id: "A3", tier: "prime" }, { id: "A2", tier: "prime" }, { id: "A1", tier: "prime" }],
];

function gardenSectionBRow(border: string, interior: string[]): LotRow {
  return [{ id: border, tier: "premium" }, ...interior.map((id) => ({ id, tier: "regular" as Tier }))];
}

const GARDEN_SECTION_B: LotRow[] = [
  [{ id: "B8", tier: "prime" }, { id: "B9", tier: "prime" }, { id: "B10", tier: "prime" }, { id: "B11", tier: "prime" }, { id: "B12", tier: "prime" }, { id: "B13", tier: "prime" }, { id: "B14", tier: "prime" }],
  [{ id: "B21", tier: "premium" }, { id: "B20", tier: "premium" }, { id: "B19", tier: "premium" }, { id: "B18", tier: "premium" }, { id: "B17", tier: "premium" }, { id: "B16", tier: "premium" }, { id: "B15", tier: "premium" }],
  gardenSectionBRow("B22", ["B107", "B106", "B81", "B80", "B55", "B54"]),
  gardenSectionBRow("B23", ["B108", "B105", "B82", "B79", "B56", "B53"]),
  gardenSectionBRow("B24", ["B109", "B104", "B83", "B78", "B57", "B52"]),
  gardenSectionBRow("B25", ["B110", "B103", "B84", "B77", "B58", "B51"]),
  gardenSectionBRow("B26", ["B111", "B102", "B85", "B76", "B59", "B50"]),
  gardenSectionBRow("B27", ["B112", "B101", "B86", "B75", "B60", "B49"]),
  gardenSectionBRow("B28", ["B113", "B100", "B87", "B74", "B61", "B48"]),
  gardenSectionBRow("B29", ["B114", "B99", "B88", "B73", "B62", "B47"]),
  gardenSectionBRow("B30", ["B115", "B98", "B89", "B72", "B63", "B46"]),
  gardenSectionBRow("B31", ["B116", "B97", "B90", "B71", "B64", "B45"]),
  gardenSectionBRow("B32", ["B117", "B96", "B91", "B70", "B65", "B44"]),
  gardenSectionBRow("B33", ["B118", "B95", "B92", "B69", "B66", "B43"]),
  gardenSectionBRow("B34", ["B119", "B94", "B93", "B68", "B67", "B42"]),
  [{ id: "B35", tier: "premium" }, { id: "B36", tier: "premium" }, { id: "B37", tier: "premium" }, { id: "B38", tier: "premium" }, { id: "B39", tier: "premium" }, { id: "B40", tier: "premium" }, { id: "B41", tier: "premium" }],
  [{ id: "B7", tier: "prime" }, { id: "B6", tier: "prime" }, { id: "B5", tier: "prime" }, { id: "B4", tier: "prime" }, { id: "B3", tier: "prime" }, { id: "B2", tier: "prime" }, { id: "B1", tier: "prime" }],
];

export const GARDEN_LOT_LAYOUT: SectionLayout = {
  code: "gl",
  label: "Garden Lots",
  blocks: [
    { label: "Block 01: Section A", rows: GARDEN_SECTION_A },
    { label: "Block 02: Section B", rows: GARDEN_SECTION_B },
  ],
};

/**
 * The blueprint's repeating unit: an 8-cell column, bottom→top, colored
 * prime/premium/regular/regular/regular/regular/regular/premium. Numbers
 * increase by 8 per column and keep counting across columns within a band.
 */
function lawnColumnTier(rowFromBottom: number): Tier {
  if (rowFromBottom === 0) return "prime";
  if (rowFromBottom === 1 || rowFromBottom === 7) return "premium";
  return "regular";
}

function generateLawnBand(bandLabel: string, columns: number): LotBlock {
  const rows: LotRow[] = Array.from({ length: 8 }, () => []);
  let n = 1;
  for (let c = 0; c < columns; c++) {
    for (let r = 0; r < 8; r++) {
      rows[7 - r].push({ id: `LL-${bandLabel}-${n}`, tier: lawnColumnTier(r) });
      n++;
    }
  }
  return { label: `Band ${bandLabel}`, rows };
}

export const LAWN_LOT_LAYOUT: SectionLayout = {
  code: "ll",
  label: "Lawn Lots",
  blocks: [
    generateLawnBand("B1U", 9),
    generateLawnBand("B1L", 9),
    generateLawnBand("B2U", 9),
    generateLawnBand("B2L", 9),
  ],
};

const VAULT_COLUMNS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

function generateCommunityVaultLayout(): SectionLayout {
  const rows: LotRow[] = [];
  for (let level = 4; level >= 1; level--) {
    const row: LotRow = [];
    for (const col of VAULT_COLUMNS) {
      const base = (level - 1) * 3;
      for (let n = 1; n <= 3; n++) {
        // "CV-" prefix keeps these distinct from Garden Lot Section A's A1-A126:
        // the source chart labels niches "A1".."J12" the same way, but
        // display_id must be globally unique across sections.
        row.push({ id: `CV-${col}${base + n}`, tier: "regular" });
      }
    }
    rows.push(row);
  }
  return { code: "cv", label: "Community Vault", blocks: [{ label: "Community Vault 01: Level 4 (top) to Level 1", rows }] };
}

export const COMMUNITY_VAULT_LAYOUT: SectionLayout = generateCommunityVaultLayout();

export const DIGITAL_SECTION_LAYOUTS: SectionLayout[] = [
  GARDEN_LOT_LAYOUT,
  LAWN_LOT_LAYOUT,
  COMMUNITY_VAULT_LAYOUT,
];
