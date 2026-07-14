-- clients: PII lives only in Postgres now, behind RLS — the prototype
-- shipped a 34KB REAL_CLIENTS literal straight to the browser bundle.
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  email text,
  address text,
  since date not null default current_date,
  notes text,
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_deleted_at_idx on public.clients (deleted_at) where deleted_at is not null;
create index clients_name_idx on public.clients using gin (to_tsvector('simple', name));

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- contracts: one lot can have multiple contracts over time (forfeiture then
-- resale), but only one active (non-ended) contract at a time — enforced
-- below via a partial unique index rather than a CHECK, since "active"
-- depends on ownership_episodes.
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots (id),
  client_id uuid not null references public.clients (id),
  agent_id uuid references public.agents (id),
  price_cents bigint not null check (price_cents >= 0),
  downpayment_cents bigint not null default 0 check (downpayment_cents >= 0),
  term_months int not null check (term_months > 0),
  -- Percent, e.g. 5.5 = 5.5%. Back-derived from (ma * tm) vs p for migrated
  -- masterlist contracts where it doesn't reconcile exactly; flagged for
  -- review in that case (see scripts/migrate-masterlist.ts).
  interest_rate numeric(6, 3) not null default 0,
  installment_cents bigint not null check (installment_cents >= 0),
  plan_type public.plan_type not null default 'monthly',
  start_date date not null,
  -- Cached, not authoritative — recomputed by
  -- public.recompute_contract_status() whenever installments/transactions
  -- change (see 20260714000006_functions_and_status.sql). Due-date based,
  -- not "days since last payment" (prototype bug; decision #8).
  status public.lot_status not null default 'reserved',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contracts_lot_idx on public.contracts (lot_id);
create index contracts_client_idx on public.contracts (client_id);
create index contracts_agent_idx on public.contracts (agent_id);
create index contracts_status_idx on public.contracts (status);

-- Only one live (non-deleted, non-terminal) contract per lot at a time.
create unique index contracts_one_live_per_lot
  on public.contracts (lot_id)
  where deleted_at is null and status not in ('cancelled', 'paid');

create trigger contracts_set_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

-- installments: the real due-date schedule that drives delinquency. Replaces
-- the prototype's "days since last payment" heuristic, and fixes the
-- quarterly/annual under-collection bug (due_cents is the actual amount due
-- for that installment, not a flat monthly rate reused regardless of cadence).
create table public.installments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  seq int not null check (seq >= 0), -- 0 = down payment, 1..n = installments
  due_date date not null,
  due_cents bigint not null check (due_cents >= 0),
  created_at timestamptz not null default now(),
  unique (contract_id, seq)
);

create index installments_contract_idx on public.installments (contract_id);
create index installments_due_date_idx on public.installments (due_date);
