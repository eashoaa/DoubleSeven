-- Minimal Phase 2 lookup tables, created now only because transactions and
-- commission_ledger need somewhere to point their optional FKs. The full
-- Cash/Deposits and Agents/Payouts UIs land in Phase 2.
create table public.cash_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'bank' check (kind in ('cash', 'bank')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.commission_payouts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id),
  amount_cents bigint not null check (amount_cents >= 0),
  paid_at date not null default current_date,
  note text,
  recorded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- transactions: every money movement against a contract. Flattened from the
-- prototype's three-deep nesting (lots[id].payments / .maintenancePayments
-- / .history[].payments, physically copied between them on forfeit/
-- transfer) into one table with a stable FK to the contract.
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracts (id),
  lot_id uuid not null references public.lots (id),
  client_id uuid not null references public.clients (id),
  agent_id uuid references public.agents (id),
  or_number text,
  paid_at date not null,
  type public.transaction_type not null,
  method text,
  gross_cents bigint not null check (gross_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  discount_reason text,
  note text,
  deposited boolean not null default false,
  deposit_account_id uuid references public.cash_accounts (id),
  deposit_date date,
  receipt_url text,
  voided boolean not null default false,
  void_reason text,
  voided_by uuid references public.profiles (id),
  voided_at timestamptz,
  recorded_by uuid not null references public.profiles (id),
  recorded_at timestamptz not null default now(),
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint transactions_void_reason_required
    check (not voided or void_reason is not null)
);

create index transactions_contract_idx on public.transactions (contract_id);
create index transactions_lot_idx on public.transactions (lot_id);
create index transactions_client_idx on public.transactions (client_id);
create index transactions_agent_idx on public.transactions (agent_id);
create index transactions_paid_at_idx on public.transactions (paid_at);
create index transactions_or_number_idx on public.transactions (or_number) where or_number is not null;

-- ownership_episodes: replaces history[] — payments keep a stable FK to
-- their contract instead of being physically moved on forfeit/transfer.
-- This table just records the span of who held a lot and why it ended.
create table public.ownership_episodes (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots (id),
  client_id uuid not null references public.clients (id),
  contract_id uuid references public.contracts (id),
  started_at date not null,
  ended_at date,
  end_reason public.ownership_end_reason,
  created_at timestamptz not null default now(),
  constraint ownership_episodes_end_reason_requires_end
    check (ended_at is null or end_reason is not null)
);

create index ownership_episodes_lot_idx on public.ownership_episodes (lot_id);
create index ownership_episodes_client_idx on public.ownership_episodes (client_id);

-- commission_ledger: one row per commissionable transaction, with the
-- agent's rate SNAPSHOTTED at time of sale. The prototype computed
-- commission live from the agent's *current* rate on every render, so
-- editing an agent's rate retroactively restated all historical earnings —
-- rate_snapshot fixes that, and payout_id gives a real trail of which
-- payout settled which sale (the prototype only had a bare `commissionPaid`
-- boolean with no link to a specific payout).
create table public.commission_ledger (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id),
  agent_id uuid not null references public.agents (id),
  rate_snapshot numeric(5, 2) not null,
  amount_cents bigint not null check (amount_cents >= 0),
  payout_id uuid references public.commission_payouts (id),
  created_at timestamptz not null default now(),
  unique (transaction_id)
);

create index commission_ledger_agent_idx on public.commission_ledger (agent_id);
create index commission_ledger_payout_idx on public.commission_ledger (payout_id);
