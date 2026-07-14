-- Enable RLS everywhere. This is the real security boundary — the
-- prototype's ROLES matrix (lib/permissions.ts) only hides UI; a non-admin
-- calling the API directly must still be refused by Postgres itself.
alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.sections enable row level security;
alter table public.lots enable row level security;
alter table public.clients enable row level security;
alter table public.contracts enable row level security;
alter table public.installments enable row level security;
alter table public.cash_accounts enable row level security;
alter table public.commission_payouts enable row level security;
alter table public.transactions enable row level security;
alter table public.ownership_episodes enable row level security;
alter table public.commission_ledger enable row level security;
alter table public.pending_verifications enable row level security;
alter table public.audit_log enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.auth_role() = 'admin');

create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.auth_role() = 'admin');

-- ---------------------------------------------------------------------
-- agents — name/contact aren't financial data; commission_rate is a minor
-- exception we accept (Postgres RLS is row-, not column-, granular).
-- ---------------------------------------------------------------------
create policy agents_select on public.agents
  for select using (true);

create policy agents_write on public.agents
  for all using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- ---------------------------------------------------------------------
-- sections — public reference data; edited only via migration/service role.
-- ---------------------------------------------------------------------
create policy sections_select on public.sections
  for select using (true);

create policy sections_write on public.sections
  for all using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- ---------------------------------------------------------------------
-- lots — visible to everyone (the map is used by every role); edited
-- (price, geometry, status_override/forfeiture) by admin only.
-- ---------------------------------------------------------------------
create policy lots_select on public.lots
  for select using (true);

create policy lots_write on public.lots
  for all using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- ---------------------------------------------------------------------
-- clients — the prototype's `seeOwnClientsOnly` flag on the agent role was
-- declared but never enforced anywhere; this is the real version of it.
-- ---------------------------------------------------------------------
create policy clients_select on public.clients
  for select using (
    public.auth_role() in ('admin', 'accountant', 'marketing', 'staff')
    or exists (
      select 1 from public.contracts c
      where c.client_id = clients.id and c.agent_id = public.current_agent_id()
    )
  );

create policy clients_insert on public.clients
  for insert with check (public.auth_role() in ('admin', 'marketing'));

create policy clients_update on public.clients
  for update using (public.auth_role() in ('admin', 'marketing'));

-- ---------------------------------------------------------------------
-- contracts
-- ---------------------------------------------------------------------
create policy contracts_select on public.contracts
  for select using (
    public.auth_role() in ('admin', 'accountant', 'marketing', 'staff')
    or agent_id = public.current_agent_id()
  );

create policy contracts_insert on public.contracts
  for insert with check (public.auth_role() in ('admin', 'marketing'));

create policy contracts_update on public.contracts
  for update using (public.auth_role() = 'admin');

-- ---------------------------------------------------------------------
-- installments — same visibility as the parent contract; schedule
-- generation/edits are an admin/accountant ledger operation.
-- ---------------------------------------------------------------------
create policy installments_select on public.installments
  for select using (
    exists (
      select 1 from public.contracts c
      where c.id = installments.contract_id
        and (
          public.auth_role() in ('admin', 'accountant', 'marketing', 'staff')
          or c.agent_id = public.current_agent_id()
        )
    )
  );

create policy installments_write on public.installments
  for all using (public.auth_role() in ('admin', 'accountant'))
  with check (public.auth_role() in ('admin', 'accountant'));

-- ---------------------------------------------------------------------
-- cash_accounts — Phase 2 surface, but locked down now.
-- ---------------------------------------------------------------------
create policy cash_accounts_select on public.cash_accounts
  for select using (public.auth_role() in ('admin', 'accountant'));

create policy cash_accounts_write on public.cash_accounts
  for all using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- ---------------------------------------------------------------------
-- commission_payouts
-- ---------------------------------------------------------------------
create policy commission_payouts_select on public.commission_payouts
  for select using (
    public.auth_role() in ('admin', 'accountant')
    or agent_id = public.current_agent_id()
  );

create policy commission_payouts_write on public.commission_payouts
  for all using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- ---------------------------------------------------------------------
-- transactions — the financials gate. viewAllFinancials is admin/accountant
-- only; everyone else sees only what they personally recorded, or (for
-- agents) sales credited to them. Void/delete is admin-only per the plan.
-- ---------------------------------------------------------------------
create policy transactions_select on public.transactions
  for select using (
    public.auth_role() in ('admin', 'accountant')
    or recorded_by = auth.uid()
    or agent_id = public.current_agent_id()
  );

create policy transactions_insert on public.transactions
  for insert with check (
    recorded_by = auth.uid()
    and (
      public.auth_role() in ('admin', 'accountant')
      or (public.auth_role() = 'marketing' and type = 'reservation')
    )
  );

create policy transactions_update on public.transactions
  for update using (public.auth_role() = 'admin');

create policy transactions_delete on public.transactions
  for delete using (public.auth_role() = 'admin');

-- ---------------------------------------------------------------------
-- ownership_episodes — forfeiture/transfer are admin-only capabilities.
-- ---------------------------------------------------------------------
create policy ownership_episodes_select on public.ownership_episodes
  for select using (
    public.auth_role() in ('admin', 'accountant', 'marketing', 'staff')
    or exists (
      select 1 from public.contracts c
      where c.client_id = ownership_episodes.client_id
        and c.agent_id = public.current_agent_id()
    )
  );

create policy ownership_episodes_write on public.ownership_episodes
  for all using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- ---------------------------------------------------------------------
-- commission_ledger — populated by trigger (SECURITY DEFINER), not direct
-- client writes; a direct admin write path stays available for corrections.
-- ---------------------------------------------------------------------
create policy commission_ledger_select on public.commission_ledger
  for select using (
    public.auth_role() in ('admin', 'accountant')
    or agent_id = public.current_agent_id()
  );

create policy commission_ledger_write on public.commission_ledger
  for all using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- ---------------------------------------------------------------------
-- pending_verifications — the prototype's one real row-level rule:
-- approvers (admin — verifyPending is admin-only) see everything, everyone
-- else sees only what they personally submitted.
-- ---------------------------------------------------------------------
create policy pending_verifications_select on public.pending_verifications
  for select using (
    public.auth_role() = 'admin' or submitted_by = auth.uid()
  );

create policy pending_verifications_insert on public.pending_verifications
  for insert with check (submitted_by = auth.uid());

create policy pending_verifications_update on public.pending_verifications
  for update using (public.auth_role() = 'admin');

-- ---------------------------------------------------------------------
-- audit_log — append-only: insert your own actions, admin reads all, no
-- update/delete policy exists for anyone (the omission is the enforcement).
-- ---------------------------------------------------------------------
create policy audit_log_select on public.audit_log
  for select using (public.auth_role() = 'admin');

create policy audit_log_insert on public.audit_log
  for insert with check (user_id = auth.uid());
