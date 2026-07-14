# D7 — Heaven's Gate Memorial Park

Next.js + Supabase rebuild of the cemetery management prototype
(`cemetery_dashboard.jsx` at the repo root). See
`/Users/jj/.claude/plans/i-m-creating-this-app-joyful-rain.md` for the full
plan this was built against, and `scripts/notes/prototype-extraction.md` for
the business-logic extraction that drove the schema and domain-logic
decisions.

## Status

Phase 0 (foundation) and Phase 1 (core) are implemented: auth, dashboard,
map, clients, lots/ledger, collections, and the approval queue. Phase 2
(agents/commissions UI, expenses, cash/deposits, transfers, reports, audit,
trash, settings) is not yet built — the database schema already has stub
tables for some of it (`cash_accounts`, `commission_payouts`,
`commission_ledger`) so Phase 1 data isn't orphaned when Phase 2 lands.

**No live Supabase project exists yet.** Everything here — schema, RLS,
domain logic — has been validated offline (see Verification below), but has
never run against a real hosted Postgres instance. That's the next step.

## Setup

1. Create a Supabase project.
2. Apply the migrations in `supabase/migrations/` in filename order (via
   `supabase db push` with the Supabase CLI, or paste each file into the SQL
   editor in order — they're numbered for that reason).
3. Copy `.env.local.example` to `.env.local` and fill in your project's URL
   and anon key:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```
4. Seed inventory (sections + lots):
   ```bash
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-inventory.ts
   ```
   Run `npx tsx scripts/seed/reconcile.ts` first — it prints a table
   comparing generated lot inventory against masterlist demand per
   section/tier, with known shortfalls flagged. **The exact per-section lot
   counts need sign-off against the printed sales maps before this seed is
   authoritative** — see "Open items" below.
5. Create your own Supabase Auth user (via the dashboard or `supabase auth`
   CLI), then promote it to admin directly in SQL — the trigger that blocks
   non-admins from changing roles intentionally exempts unauthenticated
   (direct-SQL) contexts, since no admin exists yet to do this through the app:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
6. Migrate the masterlist (334 real contracts):
   ```bash
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... MIGRATION_RECORDED_BY=<your-profile-uuid> \
     npx tsx scripts/migrate-masterlist.ts
   ```
   Runs as a dry run (prints the reconciliation report only) unless you pass
   `--apply`. Read the report before applying — it lists unplaceable
   contracts (inventory that doesn't exist yet) and out-of-band interest
   rates that need manual review.
7. `npm run dev`.

## Verification

- `npm test` — 40 Vitest unit tests on `lib/domain/` (pricing, schedule
  generation, status derivation, aging, commissions), including the plan's
  golden case: a ₱50,000 / 60mo / ₱923.75 contract reconciles to ₱55,425.
- The full schema + RLS policies + triggers have been applied and
  functionally tested against a real (embedded, WASM) Postgres engine
  during development — status-derivation scenarios (reserved/active/
  delinquent/defaulted/paid) all passed. There's no local test harness
  checked in for this since it depends on `@electric-sql/pglite`, which
  isn't a project dependency. Re-run against a real Supabase project before
  trusting this in production.
- `npx tsc --noEmit` and `npx eslint src scripts` are both clean.
- Every screen (login, dashboard, map, clients, lots, collections,
  approvals) has been visually verified in a real browser during
  development, with the map's zoom/pan/paint-mode/lot-detail interactions
  exercised directly.

## Open items (need your sign-off)

1. **Exact lot counts per section**, against the printed sales maps — the
   seed geometry is ported directly from the prototype's own (approximate)
   pixel-grid definitions, and undercounts several section/tier
   combinations (see `scripts/seed/reconcile.ts` output). Notably, the
   prototype's own geometry never defined grids for `GL-PRIME`,
   `FE-REGULAR`, `FE-PRIME`, or a `CE` regular tier — real masterlist
   contracts of those types will be reported as unplaceable until real
   block geometry exists for them.
2. **Drop `requireDepositProof`?** It's a dead flag in the prototype (no
   corresponding field exists anywhere) and hasn't been carried over.
3. **Real staff accounts** — no demo users are seeded. You'll need the real
   staff roster (names + emails) to invite via Supabase Auth, then promote
   each to the correct role in `profiles`.

## Architecture notes

- **Money is integer centavos** everywhere, end to end. The prototype used
  JS floats and real client data has values like `tp: 27055.199999999997`.
- **RLS is the real security boundary** (`supabase/migrations/*rls*.sql`).
  `src/lib/permissions.ts` mirrors the same role matrix for UI purposes
  only — never trust it for access control.
- **Status is derived, not stored authoritatively.** `contracts.status` is a
  cache kept in sync by triggers (`recompute_contract_status`); the
  `lots_with_status` view is what the UI actually queries, and folds in the
  `lots.status_override` manual flag (used for forfeiture/cancellation).
- Next.js 16 renamed `middleware.ts` to `proxy.ts` — see `src/proxy.ts` and
  `AGENTS.md` at the repo root for why.
