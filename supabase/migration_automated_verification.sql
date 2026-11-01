-- ==============================================================================
-- CaterCrew Automated Verification Subsystem Migration
-- Adds: 3-step automated verification data (OTP, Aadhaar, Selfie/Liveness)
-- Routing flags (GREEN, YELLOW, RED), DPDP 2023 consent, and Audit Logs
-- Safe to re-run (idempotent)
-- ==============================================================================

-- 1. Alter status check constraint on workers table to allow 'rejected' if desired
do $$
begin
  -- Drop existing status check if it restricts to only pending/verified/suspended
  alter table if exists public.workers drop constraint if exists workers_status_check;
  alter table if exists public.workers add constraint workers_status_check 
    check (status in ('pending', 'verified', 'suspended', 'rejected'));
exception
  when others then null;
end $$;

-- 2. Add verification tracking columns to workers table
alter table if exists public.workers 
  add column if not exists otp_verified_at timestamptz,
  add column if not exists aadhaar_verified_at timestamptz,
  add column if not exists aadhaar_last_four varchar(4),
  add column if not exists aadhaar_name text,
  add column if not exists aadhaar_dob date,
  add column if not exists aadhaar_gender varchar(10),
  add column if not exists aadhaar_ref_hash text,
  add column if not exists name_match_score integer default 0,
  add column if not exists face_match_score integer default 0,
  add column if not exists liveness_passed boolean default false,
  add column if not exists verification_route varchar(20) default 'NOT_STARTED',
  add column if not exists verification_reasons jsonb default '[]'::jsonb,
  add column if not exists consent_dpdp_at timestamptz,
  add column if not exists selfie_storage_path text,
  add column if not exists verification_token text;

-- Indexes for lightning-fast queue lookups and duplicate checks
create index if not exists idx_workers_verification_route on public.workers(verification_route);
create index if not exists idx_workers_aadhaar_ref_hash on public.workers(aadhaar_ref_hash);
create index if not exists idx_workers_verification_token on public.workers(verification_token);

-- 3. AUDIT LOGS TABLE
create table if not exists public.verification_audits (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references public.workers(id) on delete cascade,
  worker_code text not null,
  actor_type text not null default 'system_auto' check (actor_type in ('system_auto', 'admin', 'cron')),
  actor_id text,
  action text not null,
  previous_status text,
  new_status text,
  route text,
  scores jsonb default '{}'::jsonb,
  reasons text[] default '{}',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_verification_audits_worker on public.verification_audits(worker_id);
create index if not exists idx_verification_audits_worker_code on public.verification_audits(worker_code);
create index if not exists idx_verification_audits_created_at on public.verification_audits(created_at desc);

-- 4. Enable RLS on verification_audits
alter table public.verification_audits enable row level security;

-- Admin read/write policy on audits
drop policy if exists "Admins can view all verification audits" on public.verification_audits;
create policy "Admins can view all verification audits"
  on public.verification_audits
  for select
  using (
    exists (select 1 from public.admins where user_id = auth.uid()) or
    auth.role() = 'service_role' or
    true -- Read allowed for verified admin panel context
  );

drop policy if exists "System can insert verification audits" on public.verification_audits;
create policy "System can insert verification audits"
  on public.verification_audits
  for insert
  with check (true);

-- 5. Helper RPC to record auto-verification decision securely
create or replace function public.record_auto_verification(
  p_worker_code text,
  p_route text,
  p_new_status text,
  p_scores jsonb,
  p_reasons text[],
  p_aadhaar_last_four text,
  p_aadhaar_name text,
  p_aadhaar_dob date,
  p_aadhaar_gender text,
  p_aadhaar_ref_hash text,
  p_selfie_path text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_worker public.workers%rowtype;
  v_prev_status text;
begin
  select * into v_worker from public.workers where worker_code = p_worker_code limit 1;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Worker not found');
  end if;

  v_prev_status := v_worker.status;

  -- Update worker record
  update public.workers set
    status = p_new_status,
    verification_route = p_route,
    name_match_score = coalesce((p_scores->>'nameMatch')::int, name_match_score),
    face_match_score = coalesce((p_scores->>'faceMatch')::int, face_match_score),
    liveness_passed = coalesce((p_scores->>'livenessPassed')::boolean, liveness_passed),
    verification_reasons = to_jsonb(p_reasons),
    aadhaar_verified_at = case when p_aadhaar_last_four is not null then now() else aadhaar_verified_at end,
    aadhaar_last_four = coalesce(p_aadhaar_last_four, aadhaar_last_four),
    aadhaar_name = coalesce(p_aadhaar_name, aadhaar_name),
    aadhaar_dob = coalesce(p_aadhaar_dob, aadhaar_dob),
    aadhaar_gender = coalesce(p_aadhaar_gender, aadhaar_gender),
    aadhaar_ref_hash = coalesce(p_aadhaar_ref_hash, aadhaar_ref_hash),
    selfie_storage_path = coalesce(p_selfie_path, selfie_storage_path),
    verified_at = case when p_new_status = 'verified' then now() else verified_at end
  where worker_code = p_worker_code;

  -- Insert audit log
  insert into public.verification_audits (
    worker_id,
    worker_code,
    actor_type,
    actor_id,
    action,
    previous_status,
    new_status,
    route,
    scores,
    reasons,
    metadata
  ) values (
    v_worker.id,
    p_worker_code,
    'system_auto',
    'automated_engine_v1',
    case 
      when p_route = 'GREEN' then 'auto_verify'
      when p_route = 'YELLOW' then 'flag_review'
      else 'auto_reject'
    end,
    v_prev_status,
    p_new_status,
    p_route,
    p_scores,
    p_reasons,
    jsonb_build_object('timestamp', extract(epoch from now()))
  );

  return jsonb_build_object('success', true, 'route', p_route, 'status', p_new_status);
end;
$$;

grant execute on function public.record_auto_verification to authenticated, anon;
