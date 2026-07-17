-- Overdue reminders (settings + send log) still wrote to the local JSON
-- store — same "doesn't survive Vercel" bug as collections/expenses had,
-- just never exercised yet since sending a reminder is lower-traffic.
-- Same patterns as 20260717000001: a settings singleton, an insert-only
-- log table.

create table public.reminder_settings (
  id boolean primary key default true,
  automation_enabled boolean not null default false,
  automation_template_id text not null default 'due-reminder',
  template_overrides jsonb not null default '{}'::jsonb,
  constraint reminder_settings_singleton check (id)
);

insert into public.reminder_settings (id) values (true);

alter table public.reminder_settings enable row level security;

create policy reminder_settings_select on public.reminder_settings
  for select using (true);

create policy reminder_settings_write on public.reminder_settings
  for all using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

create table public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracts (id),
  client_name text not null,
  channel text not null check (channel in ('email', 'sms')),
  ok boolean not null,
  error text,
  sent_at timestamptz not null default now(),
  sent_by uuid references public.profiles (id)
);

create index reminder_log_sent_at_idx on public.reminder_log (sent_at desc);

alter table public.reminder_log enable row level security;

-- Same three roles that have "overdue" in their nav today (src/lib/permissions.ts).
create policy reminder_log_select on public.reminder_log
  for select using (public.auth_role() in ('admin', 'accountant', 'marketing'));

create policy reminder_log_insert on public.reminder_log
  for insert with check (
    sent_by = auth.uid() and public.auth_role() in ('admin', 'accountant', 'marketing')
  );
