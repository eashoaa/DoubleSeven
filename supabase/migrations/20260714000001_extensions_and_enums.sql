-- gen_random_uuid() is built into Postgres core (13+) — no extension needed
-- on Supabase's managed Postgres.

-- Enums
create type public.app_role as enum ('admin', 'accountant', 'marketing', 'staff', 'agent');

-- Matches src/types/domain.ts LotStatus. "paid" mirrors the prototype's "Fully Paid".
create type public.lot_status as enum (
  'available', 'reserved', 'active', 'delinquent', 'defaulted', 'cancelled', 'paid'
);

create type public.lot_tier as enum ('regular', 'premium', 'prime');

create type public.plan_type as enum ('monthly', 'quarterly', 'annual');

-- Exhaustive by design: the prototype's revenue report silently bucketed any
-- unrecognized payment.type into "amortization" (bug #10d in the port notes).
-- A CHECK/enum here makes an unhandled type a hard failure instead of silent
-- misclassification.
create type public.transaction_type as enum (
  'reservation', 'downpayment', 'spotcash', 'discounted', 'interment',
  'amortization', 'sale', 'maintenance', 'opening_balance', 'refund'
);

create type public.ownership_end_reason as enum (
  'forfeited', 'transferred', 'fully_paid', 'cancelled'
);

create type public.verification_status as enum ('pending', 'approved', 'rejected');
