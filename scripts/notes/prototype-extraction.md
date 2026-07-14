# Prototype domain-logic extraction (source: cemetery_dashboard.jsx)

Reference notes pulled from the prototype to drive schema/domain-logic decisions during the port. Not shipped code — delete once the port is complete and reconciled.

## 1. ROLES matrix (lines 99-248)
- admin: all capabilities true except requireReceiptPhoto/requireDepositProof/seeOwnClientsOnly
- accountant: viewAllFinancials, recordPayment, bulkDeposit, requireReceiptPhoto, requireDepositProof; no void/delete/lot edits/agent mgmt
- marketing: recordPayment (reservation-only), createClient, editClient, requireReceiptPhoto; no financial visibility
- staff: read-only (all false) — has map/clients tabs but zero write capability
- agent: same as staff + seeOwnClientsOnly:true (flag is NEVER enforced anywhere in the codebase — dead permission)

## 2. Pricing — three divergent paths
- Seed tier multiplier (line ~477): `(priceRange[0]+priceRange[1])/2 * TIERS[tier].multiplier`, stored as unused `defaultPrice`
- Masterlist override (line ~578): `lotPrice = rc.p` verbatim, bypasses tiers/sections entirely (authoritative real data)
- assignNewClient (line ~1701): `(priceRange[0]+priceRange[1])/2`, NO tier multiplier applied — bug, Prime and Regular get same price
- Decision for port: single canonical pricing function in lib/domain/pricing.ts; tier multiplier always applied; section priceRange is a soft bound, not hard default.

## 3. Amortization schedule bug (lines 4446-4485)
`monthlyAmount = principal / termMonths` used as the `due` for EVERY installment regardless of type (monthly/quarterly/annual) — never multiplied by monthsPerInstallment (1/3/12). Quarterly plans schedule ~33% of principal; annual ~8.3%. Fix: `due = principal / installmentsCount`, where `installmentsCount = ceil(termMonths / monthsPerInstallment)`.
(Bug harmless in seed data because seed() hardcodes type:"monthly" for all three ternary branches — only manually-created quarterly/annual plans trigger it.)

## 4. Status derivation (lines 379-399) — days-since-last-payment based (to replace with due-date based per decision #8)
- cancelled: manual `status==="cancelled"` flag, checked first, overrides everything
- available: no currentClientId
- reserved: has client, paid===0
- active: last payment ≤60 days ago
- delinquent: 60 < days ≤180
- defaulted: days >180
- paid: paid >= lotPrice > 0

Aging buckets (lines 3042-3076) use a DIFFERENT scheme: 30/60/90/180 cutoffs, misaligned with the 60/180 status thresholds. New `installments` table drives real due-date based delinquency instead of both of these.

## 5. Lot geometry (lines 279-363) — pixel-coordinate rectangles on the 2048x1346 WHOLE MAP scan
Generated counts (approximate, confirm against printed maps per plan's open item #1):
- Lawn Lots (ll): Regular 67 + Premium 48 + Prime 48 = 163
- Garden Lots (gl): Regular 26 + Premium 26 = 52 (NO gl-PRIME grid exists despite 10 GL-PRIME masterlist records — those fall back)
- Family Estates (fe): 42, all hardcoded tier PREMIUM (masterlist has FE-REGULAR x4, FE-PRIME x14 — also fall back, no matching grid)
- Court Estates (ce): 4, all hardcoded tier PREMIUM
- Community Vaults (cv): 65, tier REGULAR only
- Ossuary (os): 25, tier REGULAR only
Total generated = 351 vs 334 real contracts. Tier is a literal hardcoded string per grid block, not spatially derived.

## 6. REAL_CLIENTS masterlist (line ~409) — 334 records
Shape: `{n, t, p, tm, tp, ma, d}` = name ("LAST, First"), type code, price, term months, total paid, monthly amort, start date.
Sample:
```
{"n":"ASPILLA-KNIGHT, RUTH","t":"FE-PREMIUM","p":640000,"tm":60,"tp":11351.04,"ma":11351.0,"d":"2022-01-21"}
{"n":"MENDOZA, CELESTE","t":"LL-REGULAR","p":50000,"tm":60,"tp":24043.2,"ma":923.75,"d":"2022-02-22"}
```
Type distribution: LL-REGULAR 82, LL-PREMIUM 55, CV 53, GL-REGULAR 32, LL-PRIME 26, FE-PREMIUM 24, OSSUARY 18, FE-PRIME 14, GL-PRIME 10, GL-PREMIUM 10, FE-REGULAR 4, OTHER 3, CE 2, CE-PREMIUM 1.
"OTHER" -> section ll/tier REGULAR fallback; "CE" (no suffix) -> section ce/tier REGULAR fallback.
`clients`/`lots` dicts in the runtime blob are DERIVED from REAL_CLIENTS at seed time, not the same object — no lingering raw import in persisted state.

## 7. Commission logic
- `commissionPaid` bool per payment, always false at creation, flipped only by recordPayout.
- Commission = `netPaymentAmount(p) * (agent.commissionRate/100)`, computed live on every render from CURRENT agent.commissionRate — not snapshotted at sale time, so editing an agent's rate retroactively restates all historical commission figures. New `commission_ledger.rate_snapshot` column fixes this.
- recordPayout: no FK from payout to the specific payments it settled (only implicit via commissionPaid flags scattered across lots); iterates `Object.entries(lots)` (lot-id order), not chronological — doesn't necessarily settle oldest commissions first; leftover remainder after a payout is just dropped, unrecorded.

## 8. Root data shape (`cemetery_v6` blob)
Top level: lots (dict), clients (dict), expenses[], users[], currentUser, auditLog[], bankAccounts[], agents[], commissionPayouts[], callQueue[], transfers[], trash[], lockedMonths[], pendingVerifications[], settings.
lots[id]: status, currentClientId, lotPrice, payments[], history[], interments[], documents[], maintenanceFee, maintenancePayments[], defaultPrice (dead), paymentPlan.
clients[id]: id, name, contact, email, address, contractUrl, since, notes, createdBy.
payment shape: id, orNumber, date, amount, currency/currencyRate/originalAmount (drop per decision #7 PHP-only), discount, discountReason, note, type, method, clientId, salesAgentId, commissionPaid, recordedBy, recordedAt, deposited, depositDate, depositAccount, receiptPhotoUrl, voided, voidReason/voidedBy/voidedAt.

## 9. Sections/Tiers (lines 23-39)
```
ll  Lawn Lots        priceRange [45000, 96000]
gl  Garden Lots       priceRange [120000, 251000]
fe  Family Estates    priceRange [420000, 935000]
ce  Court Estates     priceRange [640000, 672000]
cv  Community Vaults  priceRange [22000, 34125]
os  Ossuary           priceRange [16000, 22050]
TIERS: REGULAR x1.0, PREMIUM x1.15, PRIME x1.35
```
Sections and tiers are orthogonal; no compound "LL-REGULAR" object — combined only via typeToSection/typeToTier lookup maps when importing masterlist codes.

## 10. Other bugs (exact locations, for the "fix not replicate" table)
- targetContractValue 4-way inconsistency: seed() 54,465,316 / load-backfill 270,000,000 / ReportsView fallback 270,000,000 / Settings tab fallback 270,000,000 — pick one canonical value, ask user which (masterlist-derived 54,465,316 is more defensible).
- Timestamp-derived IDs (`OR-${Date.now().slice(-6)}`, `C${Date.now().slice(-6)}`) collide; the file's own uid() helper (`prefix + Date.now().toString(36) + random`) is safer but Postgres identity/UUID PKs make this moot.
- Expiring-reservations widget (`days>60 && days<90`) keys off last PAYMENT date, but reserved status by definition means paid===0 — only fires in the edge case of a voided payment existing. Should key off client.since or a dedicated reservedAt timestamp, and reservations >90 days should surface as "expired", not silently vanish.
- Revenue report `default:` case buckets any unrecognized payment.type into "amortization" — masks typos/new types. Use an enum/CHECK constraint on transactions.type at the DB level.
