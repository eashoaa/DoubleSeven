-- The CTS contract policy has always had a 2% late penalty clause, but it's
-- never been enforced — nobody wants to be the one to personally tell a
-- client they're being charged extra. This makes the system do it
-- automatically instead: a daily job posts a penalty once an overdue
-- installment clears the grace period, and it can only ever be charged
-- once per installment. Admin/accountant can waive it after the fact with
-- a reason, so it stays a judgment call the company can still make, just
-- not one any individual agent has to personally impose.

-- ---------------------------------------------------------------------
-- penalty_settings — singleton config row, same pattern as
-- requisition_settings (20260717000001_expenses_requisitions_storage.sql).
-- ---------------------------------------------------------------------
create table public.penalty_settings (
  id boolean primary key default true,
  rate_percent numeric not null default 2 check (rate_percent >= 0),
  grace_period_days int not null default 5 check (grace_period_days >= 0),
  constraint penalty_settings_singleton check (id)
);

insert into public.penalty_settings (id, rate_percent, grace_period_days) values (true, 2, 5);

alter table public.penalty_settings enable row level security;

create policy penalty_settings_select on public.penalty_settings
  for select using (true);

create policy penalty_settings_write on public.penalty_settings
  for all using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- ---------------------------------------------------------------------
-- penalties — one row per (contract, installment) that has ever cleared
-- the grace period. The unique constraint is what makes "once per missed
-- installment" hold: even if waived, it never gets recreated.
-- ---------------------------------------------------------------------
create table public.penalties (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id),
  installment_seq int not null,
  amount_cents bigint not null check (amount_cents >= 0),
  charged_at timestamptz not null default now(),
  waived_at timestamptz,
  waived_by uuid references public.profiles (id),
  waived_reason text,
  created_at timestamptz not null default now(),
  constraint penalties_contract_installment_unique unique (contract_id, installment_seq),
  constraint penalties_waived_reason_required
    check (waived_at is null or waived_reason is not null)
);

create index penalties_contract_id_idx on public.penalties (contract_id);

alter table public.penalties enable row level security;

create policy penalties_select on public.penalties
  for select using (
    public.auth_role() in ('admin', 'accountant')
    or exists (
      select 1 from public.contracts c
      where c.id = penalties.contract_id and c.agent_id = public.current_agent_id()
    )
  );

-- Waiving is the only direct write any role gets — new rows only ever come
-- from apply_overdue_penalties() below.
create policy penalties_update on public.penalties
  for update using (public.auth_role() in ('admin', 'accountant'));

-- ---------------------------------------------------------------------
-- apply_overdue_penalties() — scans every non-fully-paid contract, finds
-- its next unpaid installment (same cumulative-due logic as
-- recompute_contract_status in 20260714000006_functions_and_status.sql),
-- and charges a one-time 2%-of-installment penalty once it's overdue past
-- the configured grace period. SECURITY DEFINER + execute revoked from
-- authenticated: this only ever runs from the cron route via the
-- service-role key, never from a user session.
-- ---------------------------------------------------------------------
create or replace function public.apply_overdue_penalties()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rate_percent numeric;
  v_grace_period_days int;
  v_created int := 0;
  v_contract record;
  v_paid_cents bigint;
  v_next record;
  v_overdue_days int;
begin
  select rate_percent, grace_period_days
  into v_rate_percent, v_grace_period_days
  from public.penalty_settings
  where id = true;

  for v_contract in
    select id, price_cents from public.contracts where deleted_at is null
  loop
    select coalesce(sum(
      case
        when type = 'refund' then -(gross_cents - discount_cents)
        when type in ('interment', 'maintenance') then 0
        else gross_cents - discount_cents
      end
    ), 0)
    into v_paid_cents
    from public.transactions
    where contract_id = v_contract.id and not voided;

    if v_contract.price_cents > 0 and v_paid_cents >= v_contract.price_cents then
      continue;
    end if;

    -- A pure reservation (nothing paid yet) mirrors deriveLotStatus's
    -- "reserved" branch (status.ts) — no installment plan has actually
    -- started, so there's nothing to be late on yet.
    if v_paid_cents <= 0 then
      continue;
    end if;

    select i.seq, i.due_date, i.due_cents
    into v_next
    from (
      select seq, due_date, due_cents, sum(due_cents) over (order by seq) as cumulative_due
      from public.installments
      where contract_id = v_contract.id
    ) i
    where i.cumulative_due > v_paid_cents
    order by i.due_date
    limit 1;

    if v_next.due_date is null then
      continue;
    end if;

    v_overdue_days := current_date - v_next.due_date;

    if v_overdue_days > v_grace_period_days then
      insert into public.penalties (contract_id, installment_seq, amount_cents)
      values (v_contract.id, v_next.seq, round(v_next.due_cents * v_rate_percent / 100))
      on conflict (contract_id, installment_seq) do nothing;

      if found then
        v_created := v_created + 1;
      end if;
    end if;
  end loop;

  return v_created;
end;
$$;

revoke all on function public.apply_overdue_penalties() from public;
grant execute on function public.apply_overdue_penalties() to service_role;
