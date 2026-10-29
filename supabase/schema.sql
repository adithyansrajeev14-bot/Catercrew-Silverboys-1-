-- ==============================================================================
-- CaterCrew Database Schema & Setup
-- Covers: Workers, Admins, Sequences, Triggers, RLS, RPCs, Storage Buckets & Policies
-- ==============================================================================

-- 1. Enable pgcrypto for UUID generation if needed
create extension if not exists "pgcrypto";

-- 2. WORKERS TABLE
create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  worker_code text unique,
  tier text not null default 'silver' check (tier in ('silver', 'golden', 'diamond')),
  status text not null default 'pending' check (status in ('pending', 'verified', 'suspended')),
  full_name text not null,
  dob date not null,
  height_cm numeric not null,
  weight_kg numeric,
  phone text not null,
  whatsapp text not null,
  district text not null,
  area text not null,
  travel_ok boolean not null default false,
  photo_path text not null,
  id_proof_path text,
  experience_years numeric not null default 0,
  roles text[] not null default '{}',
  has_uniform boolean not null default false,
  emergency_name text not null,
  emergency_phone text not null,
  consent boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes for fast querying
create index if not exists idx_workers_worker_code on public.workers(worker_code);
create index if not exists idx_workers_status on public.workers(status);
create index if not exists idx_workers_tier on public.workers(tier);
create index if not exists idx_workers_phone on public.workers(phone);

-- 3. SEQUENCE AND BEFORE INSERT TRIGGER FOR WORKER CODE
create sequence if not exists public.worker_code_seq start with 1 increment by 1;

create or replace function public.generate_worker_code()
returns trigger
language plpgsql
as $$
declare
  tier_prefix text;
  seq_num bigint;
begin
  if new.tier = 'golden' then
    tier_prefix := 'GLD';
  elsif new.tier = 'diamond' then
    tier_prefix := 'DMD';
  else
    tier_prefix := 'SLV';
  end if;

  if new.worker_code is null or new.worker_code = '' then
    seq_num := nextval('public.worker_code_seq');
    new.worker_code := 'CC-' || tier_prefix || '-' || lpad(seq_num::text, 6, '0');
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_generate_worker_code on public.workers;
create trigger trigger_generate_worker_code
before insert on public.workers
for each row
execute function public.generate_worker_code();

-- 4. ADMINS TABLE
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 5. ROW LEVEL SECURITY (RLS)
alter table public.workers enable row level security;
alter table public.admins enable row level security;

-- Admin check helper function
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- Policy: Admins have full access to workers
drop policy if exists "Admins have full access to workers" on public.workers;
create policy "Admins have full access to workers"
on public.workers
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Policy: Anonymous & authenticated users can INSERT silver pending registrations only
drop policy if exists "Public can submit silver worker registration" on public.workers;
create policy "Public can submit silver worker registration"
on public.workers
for insert
to anon, authenticated
with check (
  status = 'pending' and tier = 'silver' and consent = true
);

-- Policy: Admins can view admins table
drop policy if exists "Admins can view admins" on public.admins;
create policy "Admins can view admins"
on public.admins
for select
to authenticated
using (
  user_id = auth.uid() or public.is_admin()
);

-- 6. SECURITY DEFINER FUNCTION FOR PUBLIC VERIFICATION & STATUS
-- Exposes ONLY public-safe fields (NO phone, DOB, address, or ID proof)
create or replace function public.get_public_worker(code text)
returns table (
  worker_code text,
  full_name text,
  photo_path text,
  tier text,
  status text,
  verified_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    w.worker_code,
    w.full_name,
    w.photo_path,
    w.tier,
    w.status,
    w.verified_at
  from public.workers w
  where upper(trim(w.worker_code)) = upper(trim(code))
  limit 1;
$$;

grant execute on function public.get_public_worker(text) to anon, authenticated;

-- 7. SECURITY DEFINER FUNCTION FOR WORKER REGISTRATION
-- Allows anonymous submission while reliably returning the newly generated worker_code
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
    id_proof_path,
    experience_years,
    roles,
    has_uniform,
    emergency_name,
    emergency_phone,
    consent
  ) values (
    'silver',
    'pending',
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
    'tier', v_worker.tier
  );
end;
$$;

grant execute on function public.register_worker to anon, authenticated;

-- 8. STORAGE BUCKETS CONFIGURATION
-- Buckets: 'photos' (public read) & 'id-proofs' (private, signed url for admins)
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('id-proofs', 'id-proofs', false)
on conflict (id) do update set public = false;

-- Storage Policies:
-- Photos: anyone can insert, anyone can read
drop policy if exists "Allow public upload to photos bucket" on storage.objects;
create policy "Allow public upload to photos bucket"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'photos');

drop policy if exists "Allow public read of photos bucket" on storage.objects;
create policy "Allow public read of photos bucket"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'photos');

-- ID Proofs: anyone can insert during registration, only admins can read
drop policy if exists "Allow public upload to id-proofs bucket" on storage.objects;
create policy "Allow public upload to id-proofs bucket"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'id-proofs');

drop policy if exists "Admins can view id-proofs" on storage.objects;
create policy "Admins can view id-proofs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'id-proofs' and public.is_admin()
);

drop policy if exists "Admins can delete objects" on storage.objects;
create policy "Admins can delete objects"
on storage.objects
for delete
to authenticated
using (
  (bucket_id in ('photos', 'id-proofs')) and public.is_admin()
);

-- 9. EVENT REPORTS & ATTENDANCE TABLE
create table if not exists public.event_reports (
  id text primary key,
  token text unique not null,
  event_name text not null,
  event_company text not null,
  contact_person text,
  whatsapp_number text not null,
  event_date date not null default current_date,
  shift_time text not null default 'General Shift',
  venue text not null,
  district text not null default 'Ernakulam',
  required_count int not null default 5,
  supervisor_phone text not null default '+919400088221',
  status text not null default 'active',
  shortage_reported boolean not null default false,
  shortage_count int not null default 0,
  shortage_reason text,
  shortage_resolved boolean not null default false,
  company_notes text,
  assigned_workers jsonb not null default '[]'::jsonb,
  attendance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for fast querying by token
create index if not exists idx_event_reports_token on public.event_reports(token);

-- RLS: allow public access by token and admins full access
alter table public.event_reports enable row level security;

drop policy if exists "Allow public read event_reports" on public.event_reports;
create policy "Allow public read event_reports"
on public.event_reports
for select
to anon, authenticated
using (true);

drop policy if exists "Allow public insert update event_reports" on public.event_reports;
create policy "Allow public insert update event_reports"
on public.event_reports
for all
to anon, authenticated
using (true)
with check (true);

