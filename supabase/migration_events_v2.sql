-- ==============================================================================
-- CaterCrew Database Migration v2: Events, Companies, Bookings & Role Management
-- Safe to re-run: uses IF NOT EXISTS and DROP POLICY IF EXISTS
-- ==============================================================================

-- 1. EXTEND WORKERS TABLE
-- Add user_id reference to link a verified worker with Supabase Auth
alter table public.workers
add column if not exists user_id uuid unique references auth.users(id) on delete set null;

create index if not exists idx_workers_user_id on public.workers(user_id);

-- 2. COMPANIES TABLE
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  company_name text not null,
  company_type text not null check (company_type in ('catering company', 'event management', 'wedding planner', 'hall or venue', 'other')),
  years_in_business numeric not null default 0,
  contact_name text not null,
  phone text not null,
  whatsapp text not null,
  email text not null,
  district text not null,
  area text not null,
  address text not null,
  gst_number text,
  doc_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure verified_at column exists if needed
alter table public.companies add column if not exists verified_at timestamptz;

create index if not exists idx_companies_user_id on public.companies(user_id);
create index if not exists idx_companies_status on public.companies(status);
create index if not exists idx_companies_district on public.companies(district);

-- 3. EVENTS TABLE
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  event_type text not null default 'wedding' check (event_type in ('wedding', 'party', 'corporate', 'festival', 'other')),
  description text,
  event_date date not null,
  reporting_time text not null,
  start_time text not null,
  end_time text not null,
  place_name text not null,
  district text not null,
  address text not null,
  map_link text,
  latitude numeric,
  longitude numeric,
  slots_total int not null default 1 check (slots_total >= 1),
  wage_per_boy numeric not null check (wage_per_boy > 0),
  payment_timing text not null default 'same day' check (payment_timing in ('same day', 'next day', 'within 3 days', 'within a week')),
  payment_mode text not null default 'cash' check (payment_mode in ('cash', 'UPI', 'bank transfer')),
  uniform text[] not null default '{}',
  uniform_notes text,
  food_provided boolean not null default false,
  transport_provided boolean not null default false,
  roles text[] not null default '{}',
  min_experience_years numeric not null default 0,
  allowed_tiers text[] not null default '{silver}',
  notes text,
  status text not null default 'open' check (status in ('open', 'full', 'closed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_events_company_id on public.events(company_id);
create index if not exists idx_events_status on public.events(status);
create index if not exists idx_events_date on public.events(event_date);
create index if not exists idx_events_district on public.events(district);

-- 4. BOOKINGS TABLE
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  status text not null default 'booked' check (status in ('booked', 'cancelled')),
  booked_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create index if not exists idx_bookings_event_id on public.bookings(event_id);
create index if not exists idx_bookings_worker_id on public.bookings(worker_id);
create index if not exists idx_bookings_status on public.bookings(status);

-- Unique constraint: a worker can only have ONE active booking per event
create unique index if not exists idx_unique_active_booking
on public.bookings (event_id, worker_id)
where (status = 'booked');

-- 5. PUBLIC EVENTS VIEW
-- Adds slots_filled count and public company info (never private phone or documents)
create or replace view public.events_public as
select
  e.id,
  e.company_id,
  e.title,
  e.event_type,
  e.description,
  e.event_date,
  e.reporting_time,
  e.start_time,
  e.end_time,
  e.place_name,
  e.district,
  e.address,
  e.map_link,
  e.latitude,
  e.longitude,
  e.slots_total,
  e.wage_per_boy,
  e.payment_timing,
  e.payment_mode,
  e.uniform,
  e.uniform_notes,
  e.food_provided,
  e.transport_provided,
  e.roles,
  e.min_experience_years,
  e.allowed_tiers,
  e.notes,
  e.status,
  e.created_at,
  e.updated_at,
  c.company_name,
  c.company_type,
  c.district as company_district,
  coalesce(b.active_count, 0)::int as slots_filled
from public.events e
join public.companies c on e.company_id = c.id
left join (
  select event_id, count(*)::int as active_count
  from public.bookings
  where status = 'booked'
  group by event_id
) b on b.event_id = e.id;

grant select on public.events_public to anon, authenticated;

-- 6. SECURITY DEFINER FUNCTIONS & RPCS

-- Helper: clean digits from phone number
create or replace function public.clean_phone_digits(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(p, ''), '\D', '', 'g');
$$;

-- A) check_worker_eligibility(code, phone)
-- Returns only status: 'not_found', 'pending', 'verified', 'suspended', 'already_linked'
create or replace function public.check_worker_eligibility(code text, phone text)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_worker record;
  v_clean_input_phone text;
  v_clean_db_phone text;
begin
  if code is null or trim(code) = '' or phone is null or trim(phone) = '' then
    return 'not_found';
  end if;

  v_clean_input_phone := public.clean_phone_digits(phone);
  if length(v_clean_input_phone) < 10 then
    return 'not_found';
  end if;
  v_clean_input_phone := right(v_clean_input_phone, 10);

  select id, worker_code, phone, status, user_id
  into v_worker
  from public.workers
  where upper(trim(worker_code)) = upper(trim(code))
  limit 1;

  if not found then
    return 'not_found';
  end if;

  v_clean_db_phone := right(public.clean_phone_digits(v_worker.phone), 10);
  if v_clean_db_phone <> v_clean_input_phone then
    return 'not_found';
  end if;

  if v_worker.user_id is not null then
    return 'already_linked';
  end if;

  if v_worker.status = 'verified' then
    return 'verified';
  elsif v_worker.status = 'pending' then
    return 'pending';
  elsif v_worker.status = 'suspended' then
    return 'suspended';
  else
    return 'not_found';
  end if;
end;
$$;

grant execute on function public.check_worker_eligibility(text, text) to anon, authenticated;

-- B) activate_worker(code, phone)
-- Links authenticated user to verified worker record
create or replace function public.activate_worker(code text, phone text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_worker record;
  v_clean_input_phone text;
  v_clean_db_phone text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'You must be logged in to activate your account.';
  end if;

  v_clean_input_phone := right(public.clean_phone_digits(phone), 10);
  if length(v_clean_input_phone) < 10 then
    raise exception 'Invalid phone number format.';
  end if;

  select *
  into v_worker
  from public.workers
  where upper(trim(worker_code)) = upper(trim(code))
  limit 1;

  if not found then
    raise exception 'Worker registration not found.';
  end if;

  v_clean_db_phone := right(public.clean_phone_digits(v_worker.phone), 10);
  if v_clean_db_phone <> v_clean_input_phone then
    raise exception 'Worker ID and phone number do not match.';
  end if;

  if v_worker.status <> 'verified' then
    raise exception 'Worker registration is not verified yet (status: %).', v_worker.status;
  end if;

  if v_worker.user_id is not null and v_worker.user_id <> v_user_id then
    raise exception 'This CaterCrew ID is already linked to another user account.';
  end if;

  -- Ensure caller user is not already linked to another worker
  if exists (select 1 from public.workers where user_id = v_user_id and id <> v_worker.id) then
    raise exception 'Your login is already linked to another CaterCrew worker profile.';
  end if;

  -- Link user
  update public.workers
  set user_id = v_user_id
  where id = v_worker.id;

  return json_build_object(
    'success', true,
    'worker_id', v_worker.id,
    'worker_code', v_worker.worker_code,
    'full_name', v_worker.full_name,
    'tier', v_worker.tier
  );
end;
$$;

grant execute on function public.activate_worker(text, text) to authenticated;

-- C) get_user_role()
-- Checks role: admin, worker, company, or null
create or replace function public.get_user_role()
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid;
  v_admin boolean;
  v_worker record;
  v_company record;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return json_build_object('role', null);
  end if;

  -- 1. Check admin
  select exists (select 1 from public.admins where user_id = v_uid) into v_admin;
  if v_admin then
    return json_build_object(
      'role', 'admin',
      'user_id', v_uid
    );
  end if;

  -- 2. Check worker
  select id, worker_code, full_name, tier, status
  into v_worker
  from public.workers
  where user_id = v_uid
  limit 1;

  if found then
    return json_build_object(
      'role', 'worker',
      'user_id', v_uid,
      'worker_id', v_worker.id,
      'worker_code', v_worker.worker_code,
      'name', v_worker.full_name,
      'tier', v_worker.tier,
      'status', v_worker.status
    );
  end if;

  -- 3. Check company
  select id, company_name, company_type, status, district
  into v_company
  from public.companies
  where user_id = v_uid
  limit 1;

  if found then
    return json_build_object(
      'role', 'company',
      'user_id', v_uid,
      'company_id', v_company.id,
      'name', v_company.company_name,
      'company_name', v_company.company_name,
      'company_type', v_company.company_type,
      'status', v_company.status,
      'district', v_company.district
    );
  end if;

  return json_build_object(
    'role', null,
    'user_id', v_uid
  );
end;
$$;

grant execute on function public.get_user_role() to authenticated;

-- D) book_slot(p_event_id)
-- Locks event row, checks verified status, no overlap, slots left, inserts booking
create or replace function public.book_slot(p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_worker record;
  v_event record;
  v_active_bookings int;
  v_new_booking_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Please log in to book a slot.';
  end if;

  -- Get authenticated worker
  select *
  into v_worker
  from public.workers
  where user_id = v_uid
  limit 1;

  if not found then
    raise exception 'No CaterCrew worker profile linked to your account. Please sign up as a Catering Boy.';
  end if;

  if v_worker.status <> 'verified' then
    raise exception 'Only verified CaterCrew staff can book slots. Your status is %.', v_worker.status;
  end if;

  -- Lock event row
  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'Event not found.';
  end if;

  if v_event.status <> 'open' then
    raise exception 'This event is currently % and not accepting bookings.', v_event.status;
  end if;

  if v_event.event_date < current_date then
    raise exception 'Cannot book past events.';
  end if;

  -- Check tier eligibility
  if v_event.allowed_tiers is not null and array_length(v_event.allowed_tiers, 1) > 0 then
    if not (v_worker.tier = any(v_event.allowed_tiers)) then
      raise exception 'This event requires % tier. You are currently % tier.',
        array_to_string(v_event.allowed_tiers, ' / '), v_worker.tier;
    end if;
  end if;

  -- Check existing active booking for this event
  if exists (
    select 1 from public.bookings
    where event_id = p_event_id and worker_id = v_worker.id and status = 'booked'
  ) then
    raise exception 'You have already booked a slot for this event.';
  end if;

  -- Check overlapping active booking on the same event_date
  if exists (
    select 1
    from public.bookings b
    join public.events e on b.event_id = e.id
    where b.worker_id = v_worker.id
      and b.status = 'booked'
      and e.event_date = v_event.event_date
      and e.id <> v_event.id
  ) then
    raise exception 'You already have another event booked on %. Overlapping bookings on the same date are not allowed.', v_event.event_date;
  end if;

  -- Count current active bookings
  select count(*)::int
  into v_active_bookings
  from public.bookings
  where event_id = p_event_id and status = 'booked';

  if v_active_bookings >= v_event.slots_total then
    update public.events set status = 'full' where id = p_event_id;
    raise exception 'All slots for this event are already filled.';
  end if;

  -- Insert booking
  insert into public.bookings (event_id, worker_id, status)
  values (p_event_id, v_worker.id, 'booked')
  returning id into v_new_booking_id;

  -- Update event to full if slots reached
  if (v_active_bookings + 1) >= v_event.slots_total then
    update public.events set status = 'full' where id = p_event_id;
  end if;

  return json_build_object(
    'success', true,
    'booking_id', v_new_booking_id,
    'event_id', p_event_id,
    'slots_filled', v_active_bookings + 1,
    'slots_total', v_event.slots_total
  );
end;
$$;

grant execute on function public.book_slot(uuid) to authenticated;

-- E) cancel_booking(p_booking_id)
-- Cancels booking; blocks cancellation within 24 hours of event start
create or replace function public.cancel_booking(p_booking_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_booking record;
  v_event record;
  v_worker record;
  v_active_count int;
  v_event_start_ts timestamptz;
  v_time_str text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Please log in to manage bookings.';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if v_booking.status = 'cancelled' then
    return json_build_object('success', true, 'already_cancelled', true);
  end if;

  select * into v_event
  from public.events
  where id = v_booking.event_id
  for update;

  select * into v_worker
  from public.workers
  where id = v_booking.worker_id;

  -- Verify ownership or admin
  if v_worker.user_id <> v_uid and not public.is_admin() then
    raise exception 'You do not have permission to cancel this booking.';
  end if;

  -- Calculate 24-hour window
  -- If reporting_time has 12h format (e.g. 4:00 PM), approximate timestamp with event_date
  v_event_start_ts := v_event.event_date::timestamptz + interval '8 hours';
  if now() >= (v_event_start_ts - interval '24 hours') and not public.is_admin() then
    -- Check if today is the event date or within 24h
    if v_event.event_date <= current_date then
      raise exception 'Cancellation is not allowed within 24 hours of the event date. Please contact CaterCrew support directly.';
    end if;
  end if;

  -- Cancel booking
  update public.bookings
  set status = 'cancelled',
      cancelled_at = now()
  where id = p_booking_id;

  -- Recalculate filled slots
  select count(*)::int
  into v_active_count
  from public.bookings
  where event_id = v_event.id and status = 'booked';

  if v_event.status = 'full' and v_active_count < v_event.slots_total then
    update public.events set status = 'open' where id = v_event.id;
  end if;

  return json_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'event_id', v_event.id,
    'slots_filled', v_active_count
  );
end;
$$;

grant execute on function public.cancel_booking(uuid) to authenticated;

-- F) get_event_company_contact(p_event_id)
-- Only exposed to a worker with an active booking on that event (or admin, or event owner)
create or replace function public.get_event_company_contact(p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid;
  v_event record;
  v_company record;
  v_is_booked boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return null;
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then
    return null;
  end if;

  select * into v_company from public.companies where id = v_event.company_id;

  -- If company owner or admin
  if v_company.user_id = v_uid or public.is_admin() then
    return json_build_object(
      'contact_name', v_company.contact_name,
      'phone', v_company.phone,
      'whatsapp', v_company.whatsapp,
      'email', v_company.email,
      'company_name', v_company.company_name
    );
  end if;

  -- Check if caller is a worker with an active booking
  select exists (
    select 1
    from public.bookings b
    join public.workers w on b.worker_id = w.id
    where b.event_id = p_event_id
      and b.status = 'booked'
      and w.user_id = v_uid
  ) into v_is_booked;

  if v_is_booked then
    return json_build_object(
      'contact_name', v_company.contact_name,
      'phone', v_company.phone,
      'whatsapp', v_company.whatsapp,
      'company_name', v_company.company_name
    );
  end if;

  return null;
end;
$$;

grant execute on function public.get_event_company_contact(uuid) to authenticated;

-- G) get_event_booked_workers(p_event_id)
-- Returns booked boys details for event company and admin ONLY
-- Never exposes date of birth or id proofs
create or replace function public.get_event_booked_workers(p_event_id uuid)
returns table (
  booking_id uuid,
  worker_id uuid,
  worker_code text,
  full_name text,
  photo_path text,
  age int,
  height_cm numeric,
  district text,
  area text,
  experience_years numeric,
  tier text,
  phone text,
  whatsapp text,
  booked_at timestamptz,
  booking_status text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid;
  v_event record;
  v_company record;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return;
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then
    return;
  end if;

  select * into v_company from public.companies where id = v_event.company_id;

  -- Check permission: must be company owner or admin
  if v_company.user_id <> v_uid and not public.is_admin() then
    raise exception 'Unauthorized to view booked workers for this event.';
  end if;

  return query
  select
    b.id as booking_id,
    w.id as worker_id,
    w.worker_code,
    w.full_name,
    w.photo_path,
    extract(year from age(current_date, w.dob))::int as age,
    w.height_cm,
    w.district,
    w.area,
    w.experience_years,
    w.tier,
    w.phone,
    w.whatsapp,
    b.booked_at,
    b.status as booking_status
  from public.bookings b
  join public.workers w on b.worker_id = w.id
  where b.event_id = p_event_id
    and b.status = 'booked'
  order by b.booked_at asc;
end;
$$;

grant execute on function public.get_event_booked_workers(uuid) to authenticated;

-- H) company_remove_worker(booking_id)
-- Company can remove a boy from their own event
create or replace function public.company_remove_worker(p_booking_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_booking record;
  v_event record;
  v_company record;
  v_active_count int;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Unauthorized.';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'Booking not found.';
  end if;

  select * into v_event from public.events where id = v_booking.event_id for update;
  select * into v_company from public.companies where id = v_event.company_id;

  if v_company.user_id <> v_uid and not public.is_admin() then
    raise exception 'You do not own this event.';
  end if;

  update public.bookings
  set status = 'cancelled', cancelled_at = now()
  where id = p_booking_id;

  -- If event was full, open it back up
  select count(*)::int into v_active_count
  from public.bookings
  where event_id = v_event.id and status = 'booked';

  if v_event.status = 'full' and v_active_count < v_event.slots_total then
    update public.events set status = 'open' where id = v_event.id;
  end if;

  return json_build_object('success', true, 'slots_filled', v_active_count);
end;
$$;

grant execute on function public.company_remove_worker(uuid) to authenticated;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES

-- WORKERS POLICIES
alter table public.workers enable row level security;

drop policy if exists "Worker can view own record" on public.workers;
create policy "Worker can view own record"
on public.workers
for select
to authenticated
using (
  user_id = auth.uid() or public.is_admin()
);

drop policy if exists "Worker can update own contact details" on public.workers;
create policy "Worker can update own contact details"
on public.workers
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- COMPANIES POLICIES
alter table public.companies enable row level security;

drop policy if exists "Companies full access for admin" on public.companies;
create policy "Companies full access for admin"
on public.companies
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Company can read own record" on public.companies;
create policy "Company can read own record"
on public.companies
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Company can create own record" on public.companies;
create policy "Company can create own record"
on public.companies
for insert
to authenticated
with check (
  user_id = auth.uid() and status = 'pending'
);

drop policy if exists "Company can update own profile" on public.companies;
create policy "Company can update own profile"
on public.companies
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid() and
  status = (select status from public.companies where user_id = auth.uid())
);

-- EVENTS POLICIES
alter table public.events enable row level security;

drop policy if exists "Events full access for admin" on public.events;
create policy "Events full access for admin"
on public.events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Approved company can manage its own events
drop policy if exists "Company can insert events" on public.events;
create policy "Company can insert events"
on public.events
for insert
to authenticated
with check (
  exists (
    select 1 from public.companies
    where id = company_id
      and user_id = auth.uid()
      and status = 'approved'
  )
);

drop policy if exists "Company can view own events" on public.events;
create policy "Company can view own events"
on public.events
for select
to authenticated
using (
  exists (
    select 1 from public.companies
    where id = company_id and user_id = auth.uid()
  )
);

drop policy if exists "Company can update own events" on public.events;
create policy "Company can update own events"
on public.events
for update
to authenticated
using (
  exists (
    select 1 from public.companies
    where id = company_id and user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.companies
    where id = company_id and user_id = auth.uid()
  )
);

drop policy if exists "Company can delete own events" on public.events;
create policy "Company can delete own events"
on public.events
for delete
to authenticated
using (
  exists (
    select 1 from public.companies
    where id = company_id and user_id = auth.uid()
  )
);

-- Logged in verified workers and approved companies can view active open events
drop policy if exists "Authenticated users can view open events" on public.events;
create policy "Authenticated users can view open events"
on public.events
for select
to authenticated
using (
  status in ('open', 'full') or public.is_admin()
);

-- BOOKINGS POLICIES
alter table public.bookings enable row level security;

drop policy if exists "Bookings full access for admin" on public.bookings;
create policy "Bookings full access for admin"
on public.bookings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Worker can view own bookings
drop policy if exists "Worker can view own bookings" on public.bookings;
create policy "Worker can view own bookings"
on public.bookings
for select
to authenticated
using (
  exists (
    select 1 from public.workers
    where id = worker_id and user_id = auth.uid()
  )
);

-- Company can view bookings for its events
drop policy if exists "Company can view bookings on its events" on public.bookings;
create policy "Company can view bookings on its events"
on public.bookings
for select
to authenticated
using (
  exists (
    select 1 from public.events e
    join public.companies c on e.company_id = c.id
    where e.id = event_id and c.user_id = auth.uid()
  )
);

-- 8. STORAGE BUCKET: company-docs
-- Private bucket for business registration documents & verification
insert into storage.buckets (id, name, public)
values ('company-docs', 'company-docs', false)
on conflict (id) do nothing;

drop policy if exists "Company can upload own documents" on storage.objects;
create policy "Company can upload own documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-docs'
);

drop policy if exists "Company can read own documents or admin" on storage.objects;
create policy "Company can read own documents or admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'company-docs' and (
    public.is_admin() or
    exists (
      select 1 from public.companies
      where user_id = auth.uid() and doc_path = name
    )
  )
);
