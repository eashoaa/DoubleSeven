-- Newer Supabase projects no longer auto-grant table access to
-- anon/authenticated/service_role on the public schema by default (the
-- older project template did, which is what every earlier migration here
-- implicitly assumed). Row Level Security only ever filters rows on
-- operations a role is already allowed to attempt; without a base table
-- grant, Postgres rejects the request before RLS is even consulted
-- ("permission denied for table X"). service_role bypasses RLS by design
-- (it's the trusted server-side key), so it needs full table access;
-- anon/authenticated go through the RLS policies from
-- 20260714000009_rls_policies.sql for actual row-level restriction.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant select on all tables in schema public to anon;

-- Same grants for anything created after this migration (new tables from
-- future migrations don't need a repeat of this file).
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;

alter default privileges in schema public grant select on tables to anon;
