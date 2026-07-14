-- Generic updated_at maintenance, reused by every table below.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles: 1:1 with auth.users. Role lives here, not in a separate `users`
-- table disjoint from auth — the prototype had users/agents as unrelated
-- arrays with no FK, which is why "agent" accounts had no real login.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  role public.app_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- agents: sales agents, optionally linked to a login (profile_id nullable —
-- not every agent needs system access).
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  name text not null,
  commission_rate numeric(5, 2) not null default 0 check (commission_rate >= 0 and commission_rate <= 100),
  contact text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index agents_profile_id_key on public.agents (profile_id) where profile_id is not null;

create trigger agents_set_updated_at
  before update on public.agents
  for each row execute function public.set_updated_at();

-- sections: the six inventory groups (Lawn Lots, Garden Lots, Family
-- Estates, Court Estates, Community Vaults, Ossuary). Prices are soft
-- bounds for the seed/pricing UI, not hard defaults (prototype bug: new-lot
-- assignment used the section midpoint as an actual default with no tier
-- multiplier — see lib/domain/pricing.ts).
create table public.sections (
  code text primary key,
  label text not null,
  description text,
  color text,
  price_min_cents bigint not null check (price_min_cents >= 0),
  price_max_cents bigint not null check (price_max_cents >= price_min_cents),
  created_at timestamptz not null default now()
);

-- lots: one row per physical inventory unit. Geometry lives in the DB (not
-- hardcoded pixel coords in client code) so staff can adjust it without a
-- deploy, per the plan's inventory-seeding decision.
create table public.lots (
  id uuid primary key default gen_random_uuid(),
  section text not null references public.sections (code),
  phase text,
  block text,
  sub_block text,
  lot_number text not null,
  display_id text not null unique,
  tier public.lot_tier not null,
  -- Manual override that takes precedence over the derived status (e.g. a
  -- lot pulled from inventory, or the "cancelled" forfeiture flag). Null
  -- means "derive from the active contract".
  status_override public.lot_status,
  base_price_cents bigint not null check (base_price_cents >= 0),
  geom_points jsonb not null default '[]'::jsonb,
  centroid jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lots_section_idx on public.lots (section);
create index lots_deleted_at_idx on public.lots (deleted_at) where deleted_at is not null;

create trigger lots_set_updated_at
  before update on public.lots
  for each row execute function public.set_updated_at();
