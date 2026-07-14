-- auth_role() / current_agent_id(): SECURITY DEFINER so RLS policies that
-- call them don't recurse into profiles'/agents' own RLS. search_path is
-- pinned to prevent search-path hijacking of a SECURITY DEFINER function.
create or replace function public.auth_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function public.auth_role() from public;
grant execute on function public.auth_role() to authenticated;

create or replace function public.current_agent_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.agents where profile_id = auth.uid();
$$;

revoke all on function public.current_agent_id() from public;
grant execute on function public.current_agent_id() to authenticated;

-- recompute_contract_status: due-date based delinquency (decision #8),
-- replacing the prototype's "days since last payment" heuristic
-- (recomputeStatus, cemetery_dashboard.jsx ~line 379). Thresholds (60/180
-- days overdue on the earliest unpaid installment) intentionally match the
-- prototype's status cutoffs — only the *reference date* changes, from
-- "last payment" to "next unpaid due date".
create or replace function public.recompute_contract_status(p_contract_id uuid)
returns public.lot_status
language plpgsql
stable
as $$
declare
  v_price_cents bigint;
  v_paid_cents bigint;
  v_next_due_date date;
  v_overdue_days int;
begin
  select price_cents into v_price_cents
  from public.contracts
  where id = p_contract_id;

  if v_price_cents is null then
    return 'available';
  end if;

  -- Net amount applied to the lot's price. interment/maintenance fees are
  -- separate line items, not part of the lot payoff; refunds subtract.
  select coalesce(sum(
    case
      when type = 'refund' then -(gross_cents - discount_cents)
      when type in ('interment', 'maintenance') then 0
      else gross_cents - discount_cents
    end
  ), 0)
  into v_paid_cents
  from public.transactions
  where contract_id = p_contract_id and not voided;

  if v_price_cents > 0 and v_paid_cents >= v_price_cents then
    return 'paid';
  end if;

  if v_paid_cents <= 0 then
    return 'reserved';
  end if;

  -- Earliest installment whose cumulative due exceeds what's been paid —
  -- the first installment not yet fully covered.
  select i.due_date
  into v_next_due_date
  from (
    select due_date, sum(due_cents) over (order by seq) as cumulative_due
    from public.installments
    where contract_id = p_contract_id
  ) i
  where i.cumulative_due > v_paid_cents
  order by i.due_date
  limit 1;

  if v_next_due_date is null or v_next_due_date >= current_date then
    return 'active';
  end if;

  v_overdue_days := current_date - v_next_due_date;

  if v_overdue_days > 180 then
    return 'defaulted';
  elsif v_overdue_days > 60 then
    return 'delinquent';
  else
    return 'active';
  end if;
end;
$$;

-- SECURITY DEFINER: a marketing user recording a reservation transaction
-- (allowed) must still be able to trigger this status-sync UPDATE on
-- contracts even though direct contract UPDATEs are admin-only (see RLS
-- policies) — status recomputation is a system-maintained side effect, not
-- a user-initiated contract edit.
create or replace function public.trg_recompute_contract_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract_id uuid;
begin
  v_contract_id := coalesce(new.contract_id, old.contract_id);
  if v_contract_id is not null then
    update public.contracts
      set status = public.recompute_contract_status(v_contract_id)
      where id = v_contract_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger transactions_recompute_status
  after insert or update or delete on public.transactions
  for each row execute function public.trg_recompute_contract_status();

create trigger installments_recompute_status
  after insert or update or delete on public.installments
  for each row execute function public.trg_recompute_contract_status();

-- Explicit re-sync point for admin edits that change a contract's price/
-- term (which the transaction/installment triggers above don't observe).
-- Server actions call this after such an edit.
create or replace function public.resync_contract_status(p_contract_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.contracts
    set status = public.recompute_contract_status(p_contract_id)
    where id = p_contract_id;
$$;

revoke all on function public.resync_contract_status(uuid) from public;
grant execute on function public.resync_contract_status(uuid) to authenticated;

-- lots_with_status: what the map and lot list actually query. Folds in the
-- manual status_override and the latest contract's derived status.
-- security_invoker is required (PG15 default is *off* for views) so RLS on
-- lots/contracts is evaluated as the querying user, not the view owner.
create view public.lots_with_status
with (security_invoker = true)
as
select
  l.*,
  coalesce(l.status_override, c.status, 'available'::public.lot_status) as effective_status,
  c.id as active_contract_id,
  c.client_id as active_client_id,
  c.agent_id as active_agent_id
from public.lots l
left join lateral (
  select *
  from public.contracts c
  where c.lot_id = l.id and c.deleted_at is null
  order by c.start_date desc, c.created_at desc
  limit 1
) c on true
where l.deleted_at is null;
