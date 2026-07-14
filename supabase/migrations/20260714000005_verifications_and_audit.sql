-- pending_verifications: the approval queue. `kind` + `payload` keep this
-- generic (payment, void, forfeiture, transfer, deposit...) rather than one
-- table per workflow, matching the prototype's one real row-level rule
-- (submitters only ever see their own submissions unless they can approve).
create table public.pending_verifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  submitted_by uuid not null references public.profiles (id),
  payload jsonb not null,
  status public.verification_status not null default 'pending',
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  constraint pending_verifications_rejection_reason_required
    check (status != 'rejected' or rejection_reason is not null)
);

create index pending_verifications_status_idx on public.pending_verifications (status);
create index pending_verifications_submitted_by_idx on public.pending_verifications (submitted_by);

-- audit_log: append-only (no update/delete policy is granted in
-- 20260714000007_rls_policies.sql — omission is the enforcement).
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  action text not null,
  entity_type text not null,
  entity_id text,
  user_id uuid references public.profiles (id),
  details jsonb
);

create index audit_log_ts_idx on public.audit_log (ts desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
