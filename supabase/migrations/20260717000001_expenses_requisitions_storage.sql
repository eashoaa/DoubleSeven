-- Collections/expenses/agents/requisitions were writing to local JSON files
-- (src/lib/server/local-store.ts) instead of Postgres — that works in local
-- dev (writable disk) but 500s on Vercel (serverless functions can't write
-- to the deployed filesystem, only an ephemeral /tmp). This migration adds
-- the tables that were missing (expenses, requisitions, a settings
-- singleton) and a Storage bucket for receipts, so all of it moves to
-- Supabase like clients/lots/contracts already are. Mirrors the pattern
-- already used once for signed contracts in
-- 20260716000002_contract_storage.sql.

-- ---------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  description text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  paid_from text not null check (paid_from in ('petty_cash', 'bank', 'other')),
  receipt_path text,
  recorded_by uuid not null references public.profiles (id),
  incurred_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index expenses_incurred_at_idx on public.expenses (incurred_at desc);

alter table public.expenses enable row level security;

create policy expenses_select on public.expenses
  for select using (public.auth_role() in ('admin', 'accountant'));

create policy expenses_insert on public.expenses
  for insert with check (
    recorded_by = auth.uid() and public.auth_role() in ('admin', 'accountant')
  );

-- ---------------------------------------------------------------------
-- requisitions — staff-filed spending requests with a required supporting
-- doc; amounts at/above requisition_settings.threshold_cents wait for
-- admin approval, below it they're auto-approved (see createRequisition
-- in the app). Approval/auto-approval both result in an expenses row.
-- ---------------------------------------------------------------------
create table public.requisitions (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles (id),
  category text not null,
  description text not null,
  vendor text,
  amount_cents bigint not null check (amount_cents >= 0),
  paid_from text not null check (paid_from in ('petty_cash', 'bank', 'other')),
  supporting_doc_path text not null,
  status text not null default 'pending'
    check (status in ('auto_approved', 'pending', 'approved', 'rejected')),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  constraint requisitions_rejection_reason_required
    check (status != 'rejected' or rejection_reason is not null)
);

create index requisitions_status_idx on public.requisitions (status);
create index requisitions_requested_by_idx on public.requisitions (requested_by);

alter table public.requisitions enable row level security;

-- Same shape as pending_verifications_select: admin (verifyPending) sees
-- everything, everyone else sees only what they filed.
create policy requisitions_select on public.requisitions
  for select using (
    public.auth_role() = 'admin' or requested_by = auth.uid()
  );

create policy requisitions_insert on public.requisitions
  for insert with check (requested_by = auth.uid());

create policy requisitions_update on public.requisitions
  for update using (public.auth_role() = 'admin');

-- Auto-approved (below threshold) or admin-approved requisitions become an
-- expense automatically. SECURITY DEFINER because the filer is often
-- neither admin nor accountant (expenses_insert requires one of those) —
-- same reasoning as trg_insert_commission_ledger in
-- 20260714000008_commission_auto_ledger.sql: the app never inserts into
-- expenses directly for requisitions, this trigger is the only path.
create or replace function public.trg_requisition_to_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_description text;
begin
  v_description := case
    when new.vendor is not null then new.description || ' (' || new.vendor || ')'
    else new.description
  end;

  if TG_OP = 'INSERT' and new.status = 'auto_approved' then
    insert into public.expenses (category, description, amount_cents, paid_from, receipt_path, recorded_by)
    values (new.category, v_description, new.amount_cents, new.paid_from, new.supporting_doc_path, new.requested_by);
  elsif TG_OP = 'UPDATE' and new.status = 'approved' and old.status = 'pending' then
    insert into public.expenses (category, description, amount_cents, paid_from, receipt_path, recorded_by)
    values (
      new.category, v_description, new.amount_cents, new.paid_from, new.supporting_doc_path,
      coalesce(new.resolved_by, new.requested_by)
    );
  end if;
  return new;
end;
$$;

create trigger requisitions_to_expense
  after insert or update on public.requisitions
  for each row execute function public.trg_requisition_to_expense();

-- ---------------------------------------------------------------------
-- requisition_settings — singleton config row (the approval threshold).
-- `id boolean` + a check pinning it to `true` is a standard Postgres
-- pattern for guaranteeing exactly one row.
-- ---------------------------------------------------------------------
create table public.requisition_settings (
  id boolean primary key default true,
  threshold_cents bigint not null default 5000000,
  constraint requisition_settings_singleton check (id)
);

insert into public.requisition_settings (id, threshold_cents) values (true, 5000000);

alter table public.requisition_settings enable row level security;

create policy requisition_settings_select on public.requisition_settings
  for select using (true);

create policy requisition_settings_write on public.requisition_settings
  for all using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- ---------------------------------------------------------------------
-- transactions_update (20260714000009_rls_policies.sql) was admin-only,
-- which silently no-ops (UPDATE ... USING is a row filter, not an error)
-- rather than failing loudly. Collections now actually runs through this
-- table, and "Mark deposited" is exactly the bulkDeposit capability
-- (src/lib/permissions.ts) accountant already has — broaden to match.
-- ---------------------------------------------------------------------
alter policy transactions_update on public.transactions
  using (public.auth_role() in ('admin', 'accountant'));

-- ---------------------------------------------------------------------
-- receipts storage bucket — shared by payment receipts, expense receipts,
-- and requisition supporting docs, path-namespaced by kind
-- (transactions/<id>, expenses/<id>, requisitions/<id>). Fine-grained
-- access is the referencing table's own RLS (see the /api/receipts/[kind]/[id]
-- route); this bucket policy is just "logged in at all", same reasoning as
-- the existing contracts bucket.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "authenticated can upload receipt files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'receipts');

create policy "authenticated can read receipt files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'receipts');

create policy "service role has full access to receipt files"
  on storage.objects for all
  to service_role
  using (bucket_id = 'receipts')
  with check (bucket_id = 'receipts');
