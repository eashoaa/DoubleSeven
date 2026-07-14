-- Bootstraps a profiles row for every new Supabase Auth user. New accounts
-- default to the least-privileged role; an admin promotes them afterward
-- (via the Settings > Users screen, Phase 2, or directly in SQL for the
-- initial roster — see plan open item #3).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    'staff'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may update their own profile row (e.g. full_name), but only an
-- admin may change role/active — RLS's UPDATE ... WITH CHECK can't express
-- "this column may only change if X", so it's enforced here instead.
--
-- auth.uid() is null outside of an authenticated request (direct SQL via
-- the Supabase dashboard, migrations, service-role scripts) — that's the
-- only path available to promote the very first admin, since no admin
-- exists yet to do it through the app, so it's intentionally exempted.
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if (new.role is distinct from old.role or new.active is distinct from old.active)
    and auth.uid() is not null
    and public.auth_role() is distinct from 'admin' then
    raise exception 'Only admins can change role or active status';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_self_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_self_role_escalation();
