import type { SectionCode, Tier, LotStatus } from "@/types/domain";
import masterlistData from "../../../scripts/data/masterlist.json";
import { generateAllLots } from "../../../scripts/seed/lot-geometry";
import { backDeriveInterestRatePercent, generateInstallmentSchedule } from "./schedule";
import { deriveLotStatus } from "./status";
import { listLocalContracts, listCollections, listDefaultOverrides } from "@/lib/server/local-store";

/**
 * Phase 0 fallback for the 334 real D7 Bohol contracts (masterlist dated
 * 05/03/2026, see scripts/migrate-masterlist.ts, the real import path once
 * a Supabase project exists). Until then, this derives the same shape of
 * data client-side, in memory, from scripts/data/masterlist.json, reusing
 * the exact same pure domain functions (generateInstallmentSchedule,
 * deriveLotStatus) the real migration uses, so the numbers this shows
 * match what the database would compute once seeded for real.
 */

const MASTERLIST_SNAPSHOT_DATE = "2026-05-03";

interface MasterlistRecord {
  n: string;
  t: string;
  p: number;
  tm: number;
  tp: number;
  ma: number;
  d: string;
}

/** Ported from migrate-masterlist.ts's mapType; keep the two in sync. */
function mapType(t: string): { section: SectionCode; tier: Tier } {
  const upper = t.toUpperCase();
  if (upper === "OTHER") return { section: "ll", tier: "regular" };
  if (upper === "CE") return { section: "ce", tier: "regular" };
  if (upper === "CV") return { section: "cv", tier: "regular" };
  if (upper === "OSSUARY") return { section: "os", tier: "regular" };
  const [sectionCode, tierCode] = upper.split("-");
  return {
    section: sectionCode.toLowerCase() as SectionCode,
    tier: (tierCode ?? "REGULAR").toLowerCase() as Tier,
  };
}

export interface DevContract {
  id: string;
  lotDisplayId: string;
  section: SectionCode;
  tier: Tier;
  priceCents: number;
  paidCents: number;
  status: LotStatus;
  startDate: string;
  overdueDays: number | null;
  clientId: string;
  clientName: string;
}

export interface DevClient {
  id: string;
  name: string;
  since: string;
  contact: string | null;
  email: string | null;
  contractCount: number;
}

export interface DevLotStatus {
  status: LotStatus;
  clientId: string;
  clientName: string;
  priceCents: number;
}

interface DevMasterlist {
  contracts: DevContract[];
  clients: DevClient[];
  unplaced: MasterlistRecord[];
  lotStatusById: Map<string, DevLotStatus>;
}

function build(): DevMasterlist {
  const records = masterlistData as MasterlistRecord[];
  const pools = new Map<string, string[]>();
  for (const lot of generateAllLots()) {
    const key = `${lot.section}-${lot.tier}`;
    if (!pools.has(key)) pools.set(key, []);
    pools.get(key)!.push(lot.displayId);
  }

  const clientIdByName = new Map<string, DevClient>();
  const contracts: DevContract[] = [];
  const unplaced: MasterlistRecord[] = [];
  const lotStatusById = new Map<string, DevLotStatus>();

  let contractSeq = 1;
  const today = new Date();

  for (const record of records) {
    const { section, tier } = mapType(record.t);
    const pool = pools.get(`${section}-${tier}`);
    const lotDisplayId = pool?.shift();
    if (!lotDisplayId) {
      unplaced.push(record);
      continue;
    }

    const name = record.n.trim();
    let client = clientIdByName.get(name);
    if (!client) {
      client = {
        id: `dev-client-${clientIdByName.size + 1}`,
        name,
        since: MASTERLIST_SNAPSHOT_DATE,
        contact: null,
        email: null,
        contractCount: 0,
      };
      clientIdByName.set(name, client);
    }
    client.contractCount++;

    const priceCents = Math.round(record.p * 100);
    const paidCents = Math.round(record.tp * 100);
    const totalPayableCents = Math.round(record.ma * 100 * record.tm);
    const interestRatePercent = backDeriveInterestRatePercent(priceCents, totalPayableCents);
    const schedule = generateInstallmentSchedule({
      priceCents,
      downpaymentCents: 0,
      interestRatePercent,
      termMonths: record.tm,
      planType: "monthly",
      startDate: record.d,
    });
    const installments = schedule.filter((s) => s.seq > 0);
    const status = deriveLotStatus({
      priceCents,
      transactions: [{ type: "opening_balance", grossCents: paidCents, discountCents: 0, voided: false }],
      installments,
      today,
    });
    const nextUnpaid = installments.find((i) => {
      const cumulative = installments
        .filter((x) => x.seq <= i.seq)
        .reduce((s, x) => s + x.dueCents, 0);
      return cumulative > paidCents;
    });
    const overdueDays = nextUnpaid
      ? Math.floor((today.getTime() - new Date(`${nextUnpaid.dueDate}T00:00:00Z`).getTime()) / 86_400_000)
      : null;

    const contract: DevContract = {
      id: `dev-contract-${contractSeq++}`,
      lotDisplayId,
      section,
      tier,
      priceCents,
      paidCents,
      status,
      startDate: record.d,
      overdueDays,
      clientId: client.id,
      clientName: name,
    };
    contracts.push(contract);
    lotStatusById.set(lotDisplayId, {
      status,
      clientId: client.id,
      clientName: name,
      priceCents,
    });
  }

  return {
    contracts,
    clients: [...clientIdByName.values()],
    unplaced,
    lotStatusById,
  };
}

let cached: DevMasterlist | null = null;

export function getDevMasterlist(): DevMasterlist {
  if (!cached) cached = build();
  return cached;
}

export function getOverdueContracts(): DevContract[] {
  return getDevMasterlist()
    .contracts.filter((c) => c.status === "delinquent" || c.status === "defaulted")
    .sort((a, b) => (b.overdueDays ?? 0) - (a.overdueDays ?? 0));
}

/**
 * getOverdueContracts() overlaid with manual "mark as defaulted" overrides
 * (lib/server/local-store.ts), so a staff override shows up everywhere
 * overdue contracts are read from, not just the page it was set on.
 */
export async function getOverdueContractsMerged(): Promise<DevContract[]> {
  const overrides = await listDefaultOverrides();
  return getDevMasterlist()
    .contracts.map((c) => (overrides[c.id] ? { ...c, status: "defaulted" as LotStatus } : c))
    .filter((c) => c.status === "delinquent" || c.status === "defaulted")
    .sort((a, b) => (b.overdueDays ?? 0) - (a.overdueDays ?? 0));
}

/**
 * lotStatusById overlaid with contracts created through the "New Client"
 * flow (lib/server/local-store.ts), so a lot assigned to a client today
 * shows as occupied everywhere (map, Lots & Ledger, dashboard counts), not
 * just in the masterlist snapshot.
 */
export async function getMergedLotStatusById(): Promise<Map<string, DevLotStatus>> {
  const { contracts: masterlistContracts, lotStatusById } = getDevMasterlist();
  const merged = new Map(lotStatusById);

  const overrides = await listDefaultOverrides();
  for (const c of masterlistContracts) {
    const existing = overrides[c.id] && merged.get(c.lotDisplayId);
    if (existing) merged.set(c.lotDisplayId, { ...existing, status: "defaulted" });
  }

  const [contracts, collections] = await Promise.all([listLocalContracts(), listCollections()]);
  const today = new Date();

  for (const c of contracts) {
    const paidCents = collections
      .filter((row) => !row.voided && row.lotDisplayId === c.lotDisplayId)
      .reduce((sum, row) => sum + row.grossCents, 0);

    const schedule = generateInstallmentSchedule({
      priceCents: c.priceCents,
      downpaymentCents: c.downpaymentCents,
      interestRatePercent: 0,
      termMonths: c.termMonths,
      planType: c.planType,
      startDate: c.startDate,
    });
    const status = deriveLotStatus({
      priceCents: c.priceCents,
      transactions: [{ type: "payment", grossCents: paidCents, discountCents: 0, voided: false }],
      installments: schedule.filter((s) => s.seq > 0),
      today,
    });

    merged.set(c.lotDisplayId, {
      status,
      clientId: c.clientId,
      clientName: c.clientName,
      priceCents: c.priceCents,
    });
  }

  return merged;
}

export { MASTERLIST_SNAPSHOT_DATE };
