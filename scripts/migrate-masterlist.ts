/**
 * Migrates the 334 real D7 Bohol contracts (masterlist dated 05/03/2026)
 * into clients + contracts + installments + one opening_balance transaction
 * per contract — decision #5: "no invented payment history."
 *
 * Each source record is `{n, t, p, tm, tp, ma, d}` (name, type code, price,
 * term months, total paid, monthly amort, start date) — see
 * scripts/notes/prototype-extraction.md item 6 for field provenance.
 *
 * Per decision #9, interest is modeled explicitly: `ma * tm` is treated as
 * the true total payable (it's what the client actually agreed to pay
 * month-to-month), and the contract's interest_rate is back-derived from
 * that vs. the base price `p`. The full due-date installment schedule is
 * generated from day one; the single opening_balance transaction (dated at
 * the masterlist snapshot, not the contract start) supplies `tp` as the
 * cumulative amount already paid, so recompute_contract_status can
 * correctly figure out which installment is next-unpaid.
 *
 * Unlike the prototype's seed() (which silently drops clients once a
 * section's lot pool runs out, ~line 498), this fails loudly: unplaceable
 * records are collected and reported, never dropped silently.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... MIGRATION_RECORDED_BY=<profile-uuid> \
 *     npx tsx scripts/migrate-masterlist.ts [--apply]
 *
 * Without --apply this only prints the reconciliation report (dry run) —
 * the safe default, since this is a one-shot, hard-to-undo data load.
 */
import { createClient } from "@supabase/supabase-js";
import masterlistData from "./data/masterlist.json";
import {
  backDeriveInterestRatePercent,
  generateInstallmentSchedule,
} from "@/lib/domain/schedule";
import type { SectionCode, Tier } from "@/types/domain";

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

const masterlist = masterlistData as MasterlistRecord[];

/** Ported from typeToSection/typeToTier, cemetery_dashboard.jsx ~447-462. */
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

interface PlanRow {
  record: MasterlistRecord;
  section: SectionCode;
  tier: Tier;
  lotId: string;
  priceCents: number;
  totalPaidCents: number;
  totalPayableCents: number;
  interestRatePercent: number;
  interestFlag: boolean;
}

interface Unplaceable {
  record: MasterlistRecord;
  reason: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const recordedBy = requireEnv("MIGRATION_RECORDED_BY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Loaded ${masterlist.length} masterlist records.`);

  const { data: lotRows, error: lotsError } = await supabase
    .from("lots")
    .select("id, section, tier, display_id")
    .is("deleted_at", null)
    .order("display_id");
  if (lotsError) {
    console.error("Failed to load lots:", lotsError.message);
    process.exit(1);
  }

  const { data: existingContracts, error: contractsError } = await supabase
    .from("contracts")
    .select("lot_id")
    .is("deleted_at", null);
  if (contractsError) {
    console.error("Failed to load existing contracts:", contractsError.message);
    process.exit(1);
  }
  const occupiedLotIds = new Set((existingContracts ?? []).map((c) => c.lot_id));

  const pools = new Map<string, string[]>(); // "section-tier" -> [lotId, ...]
  for (const lot of lotRows ?? []) {
    if (occupiedLotIds.has(lot.id)) continue;
    const key = `${lot.section}-${lot.tier}`;
    if (!pools.has(key)) pools.set(key, []);
    pools.get(key)!.push(lot.id);
  }

  const placed: PlanRow[] = [];
  const unplaceable: Unplaceable[] = [];

  for (const record of masterlist) {
    const { section, tier } = mapType(record.t);
    const key = `${section}-${tier}`;
    const pool = pools.get(key);
    const lotId = pool?.shift();

    if (!lotId) {
      unplaceable.push({
        record,
        reason: `No available lot for section="${section}" tier="${tier}" (masterlist type "${record.t}")`,
      });
      continue;
    }

    const priceCents = Math.round(record.p * 100);
    const totalPaidCents = Math.round(record.tp * 100);
    const totalPayableCents = Math.round(record.ma * 100 * record.tm);
    const interestRatePercent = backDeriveInterestRatePercent(priceCents, totalPayableCents);
    // Flag anything outside a sane band for manual review rather than
    // guessing — negative rates usually mean an untracked discount or
    // downpayment baked into `ma`; huge rates usually mean a data-entry
    // error in `tm` or `ma`.
    const interestFlag = interestRatePercent < -1 || interestRatePercent > 60;

    placed.push({
      record,
      section,
      tier,
      lotId,
      priceCents,
      totalPaidCents,
      totalPayableCents,
      interestRatePercent,
      interestFlag,
    });
  }

  console.log(`\nPlaceable: ${placed.length}/${masterlist.length}`);
  console.log(`Unplaceable: ${unplaceable.length}/${masterlist.length}`);
  if (unplaceable.length > 0) {
    console.log("\nUnplaceable records (need real inventory geometry before they can be placed):");
    for (const u of unplaceable) {
      console.log(`  ${u.record.n} — ${u.record.t} — ${u.reason}`);
    }
  }

  const flagged = placed.filter((p) => p.interestFlag);
  if (flagged.length > 0) {
    console.log(`\n${flagged.length} contracts have an out-of-band back-derived interest rate — review before/after import:`);
    for (const f of flagged) {
      console.log(
        `  ${f.record.n} — price ₱${f.record.p} / ${f.record.tm}mo @ ₱${f.record.ma} => ` +
          `rate ${f.interestRatePercent.toFixed(2)}%`
      );
    }
  }

  const sumTpCents = masterlist.reduce((s, r) => s + Math.round(r.tp * 100), 0);
  const sumPlacedOpeningBalanceCents = placed.reduce((s, p) => s + p.totalPaidCents, 0);
  console.log(`\nSum of tp across all ${masterlist.length} source records: ${sumTpCents} centavos`);
  console.log(`Sum of opening_balance for the ${placed.length} placed contracts: ${sumPlacedOpeningBalanceCents} centavos`);

  if (!apply) {
    console.log("\nDry run only — pass --apply to write to the database.");
    return;
  }

  // Dedupe clients by exact trimmed name — several masterlist entries share
  // a name (e.g. the same person owning more than one lot). Judgment call:
  // one clients row per unique name, multiple contracts per client. An
  // admin can split/merge afterward if this guess is wrong for a given name.
  const clientIdByName = new Map<string, string>();
  const uniqueNames = [...new Set(placed.map((p) => p.record.n.trim()))];

  console.log(`\nCreating ${uniqueNames.length} unique clients...`);
  for (let i = 0; i < uniqueNames.length; i += 200) {
    const chunk = uniqueNames.slice(i, i + 200);
    const { data, error } = await supabase
      .from("clients")
      .insert(chunk.map((name) => ({ name, since: MASTERLIST_SNAPSHOT_DATE })))
      .select("id, name");
    if (error) {
      console.error("Failed to insert clients:", error.message);
      process.exit(1);
    }
    for (const row of data ?? []) clientIdByName.set(row.name, row.id);
  }

  console.log(`Creating ${placed.length} contracts + installment schedules + opening balances...`);
  let contractCount = 0;
  for (const p of placed) {
    const clientId = clientIdByName.get(p.record.n.trim());
    if (!clientId) {
      console.error(`No client id resolved for "${p.record.n}" — aborting.`);
      process.exit(1);
    }

    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .insert({
        lot_id: p.lotId,
        client_id: clientId,
        price_cents: p.priceCents,
        downpayment_cents: 0,
        term_months: p.record.tm,
        interest_rate: p.interestRatePercent,
        installment_cents: Math.round(p.record.ma * 100),
        plan_type: "monthly",
        start_date: p.record.d,
        status: "reserved",
      })
      .select("id")
      .single();
    if (contractError || !contract) {
      console.error(`Failed to insert contract for "${p.record.n}":`, contractError?.message);
      process.exit(1);
    }

    const schedule = generateInstallmentSchedule({
      priceCents: p.priceCents,
      downpaymentCents: 0,
      interestRatePercent: p.interestRatePercent,
      termMonths: p.record.tm,
      planType: "monthly",
      startDate: p.record.d,
    });
    const { error: installmentsError } = await supabase.from("installments").insert(
      schedule.map((item) => ({
        contract_id: contract.id,
        seq: item.seq,
        due_date: item.dueDate,
        due_cents: item.dueCents,
      }))
    );
    if (installmentsError) {
      console.error(`Failed to insert installments for "${p.record.n}":`, installmentsError.message);
      process.exit(1);
    }

    const { error: txError } = await supabase.from("transactions").insert({
      contract_id: contract.id,
      lot_id: p.lotId,
      client_id: clientId,
      or_number: null,
      paid_at: MASTERLIST_SNAPSHOT_DATE,
      type: "opening_balance",
      gross_cents: p.totalPaidCents,
      recorded_by: recordedBy,
      note: `Migrated opening balance from masterlist (source date ${p.record.d}, type ${p.record.t}).`,
    });
    if (txError) {
      console.error(`Failed to insert opening balance for "${p.record.n}":`, txError.message);
      process.exit(1);
    }

    contractCount++;
    if (contractCount % 25 === 0) console.log(`  ${contractCount}/${placed.length}`);
  }

  console.log(`\nDone. ${contractCount} contracts migrated, ${unplaceable.length} unplaceable.`);
}

main();
