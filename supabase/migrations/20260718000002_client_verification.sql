-- Client re-assessment tracking. Previously run entirely as a chat-driven
-- effort ("Re-Assessment of our clients para sa atoang DATABASE") with no
-- shared record of who's verified what — this gives the team a real,
-- visible progress count instead of a recurring nag campaign. Scope is
-- deliberately the lightest useful check: is the contact info current.
-- Writes go through the existing clients_update RLS policy
-- (20260714000009_rls_policies.sql), admin/marketing — no new policy needed.

alter table public.clients
  add column verified_at timestamptz,
  add column verified_by uuid references public.profiles (id);
