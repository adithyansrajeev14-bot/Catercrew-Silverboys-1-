-- ==============================================================================
-- CaterCrew: Automatic Verification & Duplicate Registration Prevention Migration
-- ==============================================================================

-- 1. Ensure verified_at column exists
alter table if exists public.workers 
add column if not exists verified_at timestamptz;

-- 2. Update register_worker RPC to check for duplicate phone/name and automatically verify new registrations
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
  p_has_uniform boolean default false
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker record;
  v_existing record;
begin
  if p_consent is not true then
    raise exception 'Consent is required to submit registration.';
  end if;

  if p_dob > (current_date - interval '16 years') then
    raise exception 'Registrant must be at least 16 years of age.';
  end if;

  -- DUPLICATE CHECK: Reject if phone or (name + phone) already exists
  select id, worker_code, full_name, phone, status into v_existing
  from public.workers
  where phone = trim(p_phone)
     or (lower(trim(full_name)) = lower(trim(p_full_name)) and phone = trim(p_phone))
  limit 1;

  if v_existing.id is not null then
    raise exception 'DUPLICATE_REGISTRATION: Staff member already registered with Worker ID % (Status: %)', 
      v_existing.worker_code, v_existing.status;
  end if;

  -- AUTOMATIC VERIFICATION: Insert with status 'verified' and verified_at = now()
  insert into public.workers (
    tier,
    status,
    verified_at,
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
    id_proof_path,
    experience_years,
    roles,
    has_uniform,
    emergency_name,
    emergency_phone,
    consent
  ) values (
    'silver',
    'verified',
    now(),
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
    nullif(trim(p_id_proof_path), ''),
    coalesce(p_experience_years, 0),
    coalesce(p_roles, '{}'),
    coalesce(p_has_uniform, false),
    trim(p_emergency_name),
    trim(p_emergency_phone),
    true
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
