-- "who has this" has come up more than once for the company logo
-- ("niagi sad mi ngani nah LOGO... this is the original LOGO from the 1st
-- management under MR. LLENOS") — a place for company assets/policy docs
-- to live once, findable by anyone, instead of re-answered in chat each
-- time. Mirrors the receipts bucket pattern exactly
-- (20260717000001_expenses_requisitions_storage.sql).

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'other' check (category in ('brand', 'policy', 'other')),
  file_path text not null,
  uploaded_by uuid not null references public.profiles (id),
  uploaded_at timestamptz not null default now()
);

alter table public.resources enable row level security;

create policy resources_select on public.resources
  for select to authenticated using (true);

create policy resources_insert on public.resources
  for insert with check (public.auth_role() = 'admin');

create policy resources_delete on public.resources
  for delete using (public.auth_role() = 'admin');

insert into storage.buckets (id, name, public)
values ('company-resources', 'company-resources', false)
on conflict (id) do nothing;

create policy "authenticated can read company resource files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'company-resources');

create policy "admin can upload company resource files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'company-resources' and public.auth_role() = 'admin');

create policy "admin can delete company resource files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'company-resources' and public.auth_role() = 'admin');

create policy "service role has full access to company resource files"
  on storage.objects for all
  to service_role
  using (bucket_id = 'company-resources')
  with check (bucket_id = 'company-resources');
