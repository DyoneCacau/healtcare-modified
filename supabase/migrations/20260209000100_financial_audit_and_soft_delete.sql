alter table if exists public.financial_transactions
  add column if not exists deleted_at timestamp with time zone,
  add column if not exists deleted_by uuid;

create table if not exists public.financial_audit (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  transaction_id uuid not null,
  action text not null check (action in ('update','delete')),
  before jsonb,
  after jsonb,
  reason text,
  user_id uuid not null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_financial_audit_clinic_created
  on public.financial_audit (clinic_id, created_at desc);
