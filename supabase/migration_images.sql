-- ==============================================================================
-- CaterCrew Storage Egress Optimization Migration
-- Adds photo_thumb_path to workers table and updates registration RPC
-- Safe to re-run multiple times (idempotent)
-- ==============================================================================

-- 1. Add photo_thumb_path column to workers
alter table public.workers add column if not exists photo_thumb_path text;

-- 2. Index for quick lookups
create index if not exists idx_workers_photo_thumb_path on public.workers(photo_thumb_path);

-- 3. Ensure public insert RLS policy allows both anon and authenticated roles
drop policy if exists "Public can submit silver worker registration" on public.workers;
create policy "Public can submit silver worker registration"
on public.workers
for insert
to anon, authenticated
with check (
  status = 'pending' and tier = 'silver' and consent = true
);

-- 4. Drop older 17-parameter overload before replacing register_worker with 16+ age rule & optional p_photo_thumb_path
drop function if exists public.register_worker(
  text, date, numeric, text, text, text, text, boolean, text, text, text, boolean, numeric, text, numeric, text[], boolean
);

create or replace function public.register_worker(
  p_full_name text,
  p_dob date,
  p_height_cm numeric,
  p_phone text,
  p_whatsapp text,
  p_district text,
  p_area text,
  p_travel_ok boolean,
  p_photo_path text,
  p_emergency_name text,
  p_emergency_phone text,
  p_consent boolean,
  p_weight_kg numeric default null,
  p_id_proof_path text default null,
  p_experience_years numeric default 0,
  p_roles text[] default '{}',
  p_has_uniform boolean default false,
  p_photo_thumb_path text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker record;
begin
  if p_consent is not true then
    raise exception 'Consent is required to submit registration.';
  end if;

  if p_dob > (current_date - interval '16 years') then
    raise exception 'Registrant must be at least 16 years of age.';
  end if;

  insert into public.workers (
    tier,
    status,
    full_name,
    dob,
    height_cm,
    weight_kg,
    phone,
    whatsapp,
    district,
    area,
    travel_ok,
    photo_path,
    photo_thumb_path,
    id_proof_path,
    experience_years,
    roles,
    has_uniform,
    emergency_name,
    emergency_phone,
    consent,
    verified_at
  ) values (
    'silver',
    'verified',
    trim(p_full_name),
    p_dob,
    p_height_cm,
    p_weight_kg,
    trim(p_phone),
    trim(p_whatsapp),
    trim(p_district),
    trim(p_area),
    coalesce(p_travel_ok, false),
    trim(p_photo_path),
    nullif(trim(p_photo_thumb_path), ''),
    nullif(trim(p_id_proof_path), ''),
    coalesce(p_experience_years, 0),
    coalesce(p_roles, '{}'),
    coalesce(p_has_uniform, false),
    trim(p_emergency_name),
    trim(p_emergency_phone),
    true,
    now()
  )
  returning * into v_worker;

  return json_build_object(
    'id', v_worker.id,
    'worker_code', v_worker.worker_code,
    'status', v_worker.status,
    'tier', v_worker.tier,
    'verified_at', v_worker.verified_at
  );
end;
$$;

grant execute on function public.register_worker to anon, authenticated;

-- 5. Security-definer helper RPC to auto-verify newly registered pending workers
create or replace function public.auto_verify_worker(p_worker_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker record;
begin
  update public.workers
  set status = 'verified',
      verified_at = coalesce(verified_at, now())
  where upper(trim(worker_code)) = upper(trim(p_worker_code))
    and status = 'pending'
  returning id, worker_code, status, verified_at into v_worker;

  if not found then
    return json_build_object('success', false);
  end if;

  return json_build_object(
    'success', true,
    'worker_code', v_worker.worker_code,
    'status', v_worker.status,
    'verified_at', v_worker.verified_at
  );
end;
$$;

grant execute on function public.auto_verify_worker(text) to anon, authenticated;
