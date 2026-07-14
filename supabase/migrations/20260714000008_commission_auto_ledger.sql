-- Auto-populates commission_ledger whenever a non-voided transaction with an
-- agent lands, snapshotting the agent's *current* commission_rate at that
-- instant. This is what makes rate_snapshot meaningful — the prototype
-- computed commission live from the agent's current rate on every render,
-- so editing an agent's rate retroactively changed historical earnings.
-- SECURITY DEFINER: whoever recorded the transaction (marketing/accountant)
-- doesn't necessarily have direct INSERT rights on commission_ledger.
create or replace function public.trg_insert_commission_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rate numeric(5, 2);
  v_net_cents bigint;
begin
  if new.agent_id is null or new.voided or new.type = 'refund' then
    return new;
  end if;

  select commission_rate into v_rate
  from public.agents
  where id = new.agent_id;

  if v_rate is null then
    return new;
  end if;

  v_net_cents := new.gross_cents - new.discount_cents;

  insert into public.commission_ledger (transaction_id, agent_id, rate_snapshot, amount_cents)
  values (new.id, new.agent_id, v_rate, round(v_net_cents * v_rate / 100))
  on conflict (transaction_id) do nothing;

  return new;
end;
$$;

create trigger transactions_insert_commission_ledger
  after insert on public.transactions
  for each row execute function public.trg_insert_commission_ledger();

-- Voiding a transaction after the fact should pull its commission back out
-- of any *unpaid* ledger entry (payout_id is null). Once a payout has
-- already settled it, leave the historical ledger row alone — reconciling a
-- clawback against a past payout is an accountant workflow (Phase 2), not
-- an automatic side effect.
create or replace function public.trg_void_commission_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.voided and not old.voided then
    delete from public.commission_ledger
    where transaction_id = new.id and payout_id is null;
  end if;
  return new;
end;
$$;

create trigger transactions_void_commission_ledger
  after update on public.transactions
  for each row execute function public.trg_void_commission_ledger();
