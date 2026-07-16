import { Fragment } from "react";
import { Boxes, CheckCircle2, PackageCheck } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { getMergedLotStatusById } from "@/lib/domain/dev-masterlist";
import { generateAllLots, SECTION_DEFINITIONS } from "../../../../scripts/seed/lot-geometry";
import { SECTION_LABEL, TIER_LABEL, type LotStatus, type SectionCode, type Tier } from "@/types/domain";
import { PageHeader } from "@/components/layout/page-header";

interface InventoryLot {
  section: SectionCode;
  tier: Tier;
  status: LotStatus;
}

async function getDevFallbackInventoryLots(): Promise<InventoryLot[]> {
  const lotStatusById = await getMergedLotStatusById();
  return generateAllLots().map((lot) => {
    const live = lotStatusById.get(lot.displayId);
    return { section: lot.section, tier: lot.tier, status: live?.status ?? "available" };
  });
}

async function getInventoryLots(): Promise<InventoryLot[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return getDevFallbackInventoryLots();

  const supabase = await createClient();
  const { data } = await supabase.from("lots_with_status").select("section, tier, effective_status");
  if (!data) return [];

  return data.map((lot) => ({
    section: lot.section as SectionCode,
    tier: lot.tier,
    status: lot.effective_status,
  }));
}

interface Bucket {
  available: number;
  reserved: number;
  sold: number;
  cancelled: number;
  total: number;
}

function emptyBucket(): Bucket {
  return { available: 0, reserved: 0, sold: 0, cancelled: 0, total: 0 };
}

/** Anything else (active/delinquent/defaulted/paid) means "under a contract" for stock-tracking purposes. */
function bucketKeyFor(status: LotStatus): keyof Omit<Bucket, "total"> {
  if (status === "available") return "available";
  if (status === "reserved") return "reserved";
  if (status === "cancelled") return "cancelled";
  return "sold";
}

function addToBucket(bucket: Bucket, status: LotStatus) {
  bucket[bucketKeyFor(status)] += 1;
  bucket.total += 1;
}

const TIER_ORDER: Tier[] = ["prime", "premium", "regular"];

export default async function InventoryPage() {
  const lots = await getInventoryLots();

  const bySection = new Map<SectionCode, Map<Tier, Bucket>>();
  const grandTotal = emptyBucket();

  for (const lot of lots) {
    if (!bySection.has(lot.section)) bySection.set(lot.section, new Map());
    const tierMap = bySection.get(lot.section)!;
    if (!tierMap.has(lot.tier)) tierMap.set(lot.tier, emptyBucket());
    addToBucket(tierMap.get(lot.tier)!, lot.status);
    addToBucket(grandTotal, lot.status);
  }

  const percentSold = grandTotal.total > 0 ? Math.round((grandTotal.sold / grandTotal.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titleKey="page.inventory.title" descriptionKey="page.inventory.desc" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Boxes} tone="indigo" label="Total inventory" value={grandTotal.total.toLocaleString()} />
        <StatCard
          icon={PackageCheck}
          tone="amber"
          label="Available to sell"
          value={grandTotal.available.toLocaleString()}
        />
        <StatCard icon={CheckCircle2} tone="violet" label="Sold" value={grandTotal.sold.toLocaleString()} />
        <StatCard icon={CheckCircle2} tone="violet" label="% sold" value={`${percentSold}%`} />
      </div>

      <div className="shadow-card rounded-2xl border border-hairline">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Section
              </TableHead>
              <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Tier
              </TableHead>
              <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Available
              </TableHead>
              <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Reserved
              </TableHead>
              <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Sold
              </TableHead>
              <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Cancelled
              </TableHead>
              <TableHead className="text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SECTION_DEFINITIONS.map((section) => {
              const tierMap = bySection.get(section.code);
              if (!tierMap) return null;
              const sectionTotal = emptyBucket();
              for (const bucket of tierMap.values()) {
                sectionTotal.available += bucket.available;
                sectionTotal.reserved += bucket.reserved;
                sectionTotal.sold += bucket.sold;
                sectionTotal.cancelled += bucket.cancelled;
                sectionTotal.total += bucket.total;
              }

              return (
                <Fragment key={section.code}>
                  {TIER_ORDER.filter((tier) => tierMap.has(tier)).map((tier, i) => {
                    const bucket = tierMap.get(tier)!;
                    return (
                      <TableRow key={`${section.code}-${tier}`}>
                        <TableCell className="font-medium text-foreground">
                          {i === 0 ? SECTION_LABEL[section.code] : ""}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{TIER_LABEL[tier]}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{bucket.available}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{bucket.reserved}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{bucket.sold}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{bucket.cancelled}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{bucket.total}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow key={`${section.code}-total`} className="hover:bg-transparent">
                    <TableCell colSpan={2} className="font-semibold text-foreground">
                      {SECTION_LABEL[section.code]} total
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      {sectionTotal.available}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      {sectionTotal.reserved}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">{sectionTotal.sold}</TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      {sectionTotal.cancelled}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">{sectionTotal.total}</TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={2} className="font-bold text-foreground">
                Grand total
              </TableCell>
              <TableCell className="text-right font-bold text-foreground">{grandTotal.available}</TableCell>
              <TableCell className="text-right font-bold text-foreground">{grandTotal.reserved}</TableCell>
              <TableCell className="text-right font-bold text-foreground">{grandTotal.sold}</TableCell>
              <TableCell className="text-right font-bold text-foreground">{grandTotal.cancelled}</TableCell>
              <TableCell className="text-right font-bold text-foreground">{grandTotal.total}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        &ldquo;Sold&rdquo; includes active, delinquent, defaulted, and fully paid contracts. Cancelled lots have
        returned to inventory and are not counted as available until re-listed.
      </p>
    </div>
  );
}
