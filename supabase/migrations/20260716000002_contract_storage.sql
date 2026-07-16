-- Signed contract PDFs were only ever written to local disk
-- (.local-data/contracts/), which doesn't exist on Vercel/any serverless
-- host: every "View contract" link 404s once deployed. This moves them to
-- a real Supabase Storage bucket instead.

insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

alter table public.contracts add column if not exists contract_file_path text;

-- Storage RLS: authenticated staff can upload and read; nothing is public.
create policy "authenticated can upload contract files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'contracts');

create policy "authenticated can read contract files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'contracts');

create policy "service role has full access to contract files"
  on storage.objects for all
  to service_role
  using (bucket_id = 'contracts')
  with check (bucket_id = 'contracts');
