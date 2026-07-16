import Image from "next/image";
import { SECTION_LABEL, TIER_LABEL, type SectionCode, type Tier } from "@/types/domain";
import { SECTION_DEFINITIONS } from "../../../scripts/seed/lot-geometry";
import { suggestedLotPriceCents } from "@/lib/domain/pricing";
import { Money } from "@/components/shared/money";

interface LotTypeEntry {
  section: SectionCode;
  description: string;
  tiers: Tier[];
  images: { src: string; alt: string }[];
}

const LOT_TYPES: LotTypeEntry[] = [
  {
    section: "ll",
    description: "Ground burial lots, laid out in numbered rows across the lawn.",
    tiers: ["prime", "premium", "regular"],
    images: [{ src: "/park/lawn-lot-map.jpg", alt: "Lawn Lots sales map, color-coded by tier" }],
  },
  {
    section: "gl",
    description: "Elevated garden lots with landscaped walkways between blocks.",
    tiers: ["prime", "premium", "regular"],
    images: [{ src: "/park/garden-lot-sales-map.jpg", alt: "Garden Lots sales map" }],
  },
  {
    section: "fe",
    description: "Private family plots, available in a few footprint sizes.",
    tiers: ["prime", "premium", "regular"],
    images: [
      { src: "/park/lot-4x4-type1.jpg", alt: "Family Estate, 4m x 4m, single" },
      { src: "/park/lot-4x4-type2.jpg", alt: "Family Estate, 4m x 4m, double" },
      { src: "/park/lot-4x5-type1.jpg", alt: "Family Estate, 4m x 5m" },
      { src: "/park/lot-6x5-type1.jpg", alt: "Family Estate, 6m x 5m" },
    ],
  },
  {
    section: "ce",
    description: "Walled garden compounds with benches and space for the whole family to visit.",
    tiers: ["regular"],
    images: [
      { src: "/park/court-estate-1.jpg", alt: "Court Estate garden plot" },
      { src: "/park/court-estate-2.jpg", alt: "Court Estate compound, wide view" },
    ],
  },
  {
    section: "cv",
    description: "Wall niches for cremated remains, sold individually.",
    tiers: ["regular"],
    images: [{ src: "/park/render-2.jpeg", alt: "Community Vault niche wall" }],
  },
  {
    section: "os",
    description: "Shared bone vaults, the most affordable option.",
    tiers: ["regular"],
    images: [{ src: "/park/render-1.jpeg", alt: "Ossuary niche numbering chart" }],
  },
];

export function LotTypesReference() {
  const sectionByCode = new Map(SECTION_DEFINITIONS.map((s) => [s.code, s]));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Lot types &amp; pricing</h2>
        <p className="text-sm text-muted-foreground">
          A quick visual reference for explaining options to clients. Prices are suggested starting points, staff
          can still adjust the final price per contract.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {LOT_TYPES.map((entry) => {
          const section = sectionByCode.get(entry.section);
          if (!section) return null;
          return (
            <div key={entry.section} className="shadow-card flex flex-col gap-3 rounded-2xl border border-hairline bg-card p-5">
              <div>
                <h3 className="text-base font-semibold text-foreground">{SECTION_LABEL[entry.section]}</h3>
                <p className="text-sm text-muted-foreground">{entry.description}</p>
              </div>

              <div className={`grid gap-2 ${entry.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {entry.images.map((img) => (
                  <div key={img.src} className="relative aspect-video overflow-hidden rounded-xl border border-hairline bg-muted">
                    <Image src={img.src} alt={img.alt} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {entry.tiers.length === 1 ? (
                  <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm">
                    <span className="font-medium text-foreground">
                      <Money centavos={suggestedLotPriceCents(section, "regular")} />
                    </span>
                  </div>
                ) : (
                  entry.tiers.map((tier) => (
                    <div key={tier} className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm">
                      <span className="text-muted-foreground">{TIER_LABEL[tier]}</span>
                      <span className="font-medium text-foreground">
                        <Money centavos={suggestedLotPriceCents(section, tier)} />
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
