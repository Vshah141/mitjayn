-- Mitjayn prototype schema
-- Run this in the Supabase SQL editor for a fresh project.

create extension if not exists pgcrypto;

DO $$ BEGIN
  create type public.disease_name_enum as enum ('Covid-19','Monkeypox','Dengue','Malaria','Swine Flu');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  create type public.report_status_enum as enum ('verified_negative','not_found','not_updated','detected_positive');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  create type public.booking_status_enum as enum ('booked','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  age integer check (age is null or age between 0 and 130),
  gender text,
  mobile_number text,
  date_of_birth date,
  photo_url text,
  is_verified boolean not null default false,
  hide_name boolean not null default false,
  public_share_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  created_at timestamptz not null default now()
);

create table if not exists public.labs (
  id uuid primary key default gen_random_uuid(),
  parent_lab_id uuid references public.labs(id) on delete cascade,
  name text not null,
  address text not null,
  postal_code text not null,
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

create table if not exists public.lab_staff_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lab_id uuid references public.labs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.disease_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  disease_name public.disease_name_enum not null,
  status public.report_status_enum not null,
  lab_id uuid references public.labs(id) on delete set null,
  report_date date not null,
  report_file_url text,
  report_verification_code text not null unique default encode(gen_random_bytes(18), 'hex'),
  report_file_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorite_labs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  lab_id uuid not null references public.labs(id) on delete cascade,
  unique(profile_id, lab_id)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  lab_id uuid not null references public.labs(id) on delete cascade,
  report_name text not null,
  report_description text not null default '',
  booking_date date not null,
  time_slot text not null,
  status public.booking_status_enum not null default 'booked',
  created_at timestamptz not null default now()
);

create index if not exists disease_reports_profile_idx on public.disease_reports(profile_id, report_date desc);
create index if not exists disease_reports_verification_idx on public.disease_reports(report_verification_code);
create index if not exists profiles_share_token_idx on public.profiles(public_share_token);
create index if not exists labs_parent_idx on public.labs(parent_lab_id);
create index if not exists bookings_lab_date_idx on public.bookings(lab_id, booking_date, time_slot);
create unique index if not exists bookings_unique_active_slot on public.bookings(lab_id, booking_date, time_slot) where status <> 'cancelled';

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists disease_reports_set_updated_at on public.disease_reports;
create trigger disease_reports_set_updated_at before update on public.disease_reports for each row execute function public.set_updated_at();

-- Prevent a normal authenticated profile owner from self-assigning the verified-user badge.
create or replace function public.protect_profile_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'authenticated' and new.is_verified is distinct from old.is_verified then
    new.is_verified := old.is_verified;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_verification on public.profiles;
create trigger profiles_protect_verification before update on public.profiles for each row execute function public.protect_profile_verification();

-- Create a profile for OAuth users automatically. Email/password signup can safely upsert the richer fields afterward.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.disease_reports enable row level security;
alter table public.labs enable row level security;
alter table public.lab_staff_users enable row level security;
alter table public.favorite_labs enable row level security;
alter table public.bookings enable row level security;

-- profiles: only the owner can read/update their private profile row.
drop policy if exists "profile owner select" on public.profiles;
create policy "profile owner select" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profile owner insert" on public.profiles;
create policy "profile owner insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profile owner update" on public.profiles;
create policy "profile owner update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Labs are discoverable to signed-in users. Writes are reserved for lab staff/service role.
drop policy if exists "authenticated lab read" on public.labs;
create policy "authenticated lab read" on public.labs for select to authenticated using (true);
drop policy if exists "lab staff lab select" on public.lab_staff_users;
create policy "lab staff lab select" on public.lab_staff_users for select to authenticated using (user_id = auth.uid());

-- Critical report rules: users can read their own reports but can NEVER insert/update/delete them.
drop policy if exists "report owner select only" on public.disease_reports;
create policy "report owner select only" on public.disease_reports for select to authenticated using (profile_id = auth.uid());
drop policy if exists "lab staff report select" on public.disease_reports;
create policy "lab staff report select" on public.disease_reports for select to authenticated using (exists (select 1 from public.lab_staff_users s where s.user_id = auth.uid()));
drop policy if exists "lab staff report insert" on public.disease_reports;
create policy "lab staff report insert" on public.disease_reports for insert to authenticated with check (exists (select 1 from public.lab_staff_users s where s.user_id = auth.uid() and (s.lab_id is null or s.lab_id = lab_id)));
drop policy if exists "lab staff report update" on public.disease_reports;
create policy "lab staff report update" on public.disease_reports for update to authenticated using (exists (select 1 from public.lab_staff_users s where s.user_id = auth.uid() and (s.lab_id is null or s.lab_id = lab_id))) with check (exists (select 1 from public.lab_staff_users s where s.user_id = auth.uid() and (s.lab_id is null or s.lab_id = lab_id)));
drop policy if exists "lab staff report delete" on public.disease_reports;
create policy "lab staff report delete" on public.disease_reports for delete to authenticated using (exists (select 1 from public.lab_staff_users s where s.user_id = auth.uid() and (s.lab_id is null or s.lab_id = lab_id)));

-- Favorite labs.
drop policy if exists "favorite owner select" on public.favorite_labs;
create policy "favorite owner select" on public.favorite_labs for select to authenticated using (profile_id = auth.uid());
drop policy if exists "favorite owner insert" on public.favorite_labs;
create policy "favorite owner insert" on public.favorite_labs for insert to authenticated with check (profile_id = auth.uid());
drop policy if exists "favorite owner delete" on public.favorite_labs;
create policy "favorite owner delete" on public.favorite_labs for delete to authenticated using (profile_id = auth.uid());

-- Booking owner access. The client inserts only its own profile_id.
drop policy if exists "booking owner select" on public.bookings;
create policy "booking owner select" on public.bookings for select to authenticated using (profile_id = auth.uid());
drop policy if exists "booking owner insert" on public.bookings;
create policy "booking owner insert" on public.bookings for insert to authenticated with check (profile_id = auth.uid());
drop policy if exists "booking owner update" on public.bookings;
create policy "booking owner update" on public.bookings for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Restricted public health-card RPC. Anonymous callers never receive direct table access.
create or replace function public.get_public_health_card(share_token_input text)
returns table(name text, is_verified boolean, disease_name text, status text)
language sql
security definer
stable
set search_path = public
as $$
  with target as (
    select p.id,
           case when p.hide_name then null else p.name end as safe_name,
           p.is_verified
    from public.profiles p
    where p.public_share_token = share_token_input
    limit 1
  ), latest as (
    select distinct on (dr.disease_name)
      dr.profile_id, dr.disease_name, dr.status, dr.report_date, dr.updated_at
    from public.disease_reports dr
    join target t on t.id = dr.profile_id
    order by dr.disease_name, dr.report_date desc, dr.updated_at desc
  )
  select t.safe_name, t.is_verified, l.disease_name::text, l.status::text
  from target t left join latest l on l.profile_id = t.id
  where l.disease_name is not null
  order by l.disease_name::text;
$$;

-- Restricted public authenticity RPC. No internal IDs, report path, hash, phone, DOB or report contents are returned.
create or replace function public.get_public_report_authenticity(verification_code_input text)
returns table(lab_name text, disease_name text, report_date date, status public.report_status_enum, patient_name text)
language sql
security definer
stable
set search_path = public
as $$
  select l.name,
         dr.disease_name::text,
         dr.report_date,
         dr.status,
         case when p.hide_name then null else p.name end
  from public.disease_reports dr
  join public.profiles p on p.id = dr.profile_id
  left join public.labs l on l.id = dr.lab_id
  where dr.report_verification_code = verification_code_input
  limit 1;
$$;

revoke all on function public.get_public_health_card(text) from public;
revoke all on function public.get_public_report_authenticity(text) from public;
grant execute on function public.get_public_health_card(text) to service_role;
grant execute on function public.get_public_report_authenticity(text) to service_role;

-- Private storage buckets.
insert into storage.buckets (id, name, public) values ('profile-photos','profile-photos',false) on conflict (id) do update set public=false;
insert into storage.buckets (id, name, public) values ('reports','reports',false) on conflict (id) do update set public=false;

-- Profile photo object access is scoped to the first path segment == auth.uid().
drop policy if exists "profile photo owner read" on storage.objects;
create policy "profile photo owner read" on storage.objects for select to authenticated using (bucket_id='profile-photos' and split_part(name,'/',1)=auth.uid()::text);
drop policy if exists "profile photo owner insert" on storage.objects;
create policy "profile photo owner insert" on storage.objects for insert to authenticated with check (bucket_id='profile-photos' and split_part(name,'/',1)=auth.uid()::text);
drop policy if exists "profile photo owner update" on storage.objects;
create policy "profile photo owner update" on storage.objects for update to authenticated using (bucket_id='profile-photos' and split_part(name,'/',1)=auth.uid()::text);

-- Report files are private. Owners can read their own path; only service role/lab issuance path writes them.
drop policy if exists "report file owner read" on storage.objects;
create policy "report file owner read" on storage.objects for select to authenticated using (bucket_id='reports' and split_part(name,'/',1)=auth.uid()::text);

-- Explicitly leave anon without table/storage SELECT grants. Public access is only through the security-definer RPCs above.
-- Mitjayn upgrade: user report uploads, verification state, notifications.
-- Safe to run once against the existing deployed Supabase project.

DO $$ BEGIN
  create type public.report_source_enum as enum ('lab_issued','user_upload');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  create type public.report_verification_state_enum as enum ('pending','verified','rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  create type public.notification_type_enum as enum ('booking','report','profile');
EXCEPTION WHEN duplicate_object THEN null; END $$;

alter table public.disease_reports
  add column if not exists source_type public.report_source_enum not null default 'lab_issued',
  add column if not exists verification_state public.report_verification_state_enum not null default 'verified',
  add column if not exists extracted_metadata jsonb;

create index if not exists disease_reports_verification_state_idx
  on public.disease_reports(profile_id, verification_state, report_date desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type_enum not null,
  title text not null,
  message text not null,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_profile_created_idx
  on public.notifications(profile_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notification owner select" on public.notifications;
create policy "notification owner select" on public.notifications
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "notification owner update" on public.notifications;
create policy "notification owner update" on public.notifications
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Profile changes (photo, privacy, name, DOB, age, gender, mobile, share-link rotation).
create or replace function public.notify_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_fields text[] := array[]::text[];
begin
  if new.name is distinct from old.name then changed_fields := array_append(changed_fields, 'name'); end if;
  if new.age is distinct from old.age then changed_fields := array_append(changed_fields, 'age'); end if;
  if new.gender is distinct from old.gender then changed_fields := array_append(changed_fields, 'gender'); end if;
  if new.mobile_number is distinct from old.mobile_number then changed_fields := array_append(changed_fields, 'mobile number'); end if;
  if new.date_of_birth is distinct from old.date_of_birth then changed_fields := array_append(changed_fields, 'date of birth'); end if;
  if new.photo_url is distinct from old.photo_url then changed_fields := array_append(changed_fields, 'profile photo'); end if;
  if new.hide_name is distinct from old.hide_name then changed_fields := array_append(changed_fields, 'privacy setting'); end if;
  if new.public_share_token is distinct from old.public_share_token then changed_fields := array_append(changed_fields, 'share link'); end if;

  if coalesce(array_length(changed_fields, 1), 0) > 0 then
    insert into public.notifications(profile_id, type, title, message, metadata)
    values (
      new.id,
      'profile',
      'Profile updated',
      'Changed: ' || array_to_string(changed_fields, ', ') || '.',
      jsonb_build_object('fields', changed_fields)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_notify_change on public.profiles;
create trigger profiles_notify_change
after update on public.profiles
for each row execute function public.notify_profile_change();

-- Booking notifications.
create or replace function public.notify_booking_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications(profile_id, type, title, message, metadata)
    values (
      new.profile_id,
      'booking',
      'Booking confirmed',
      new.report_name || ' is booked for ' || new.booking_date::text || ' at ' || new.time_slot || '.',
      jsonb_build_object('booking_id', new.id, 'status', new.status)
    );
  elsif new.status is distinct from old.status then
    insert into public.notifications(profile_id, type, title, message, metadata)
    values (
      new.profile_id,
      'booking',
      'Booking status changed',
      new.report_name || ' is now ' || new.status::text || '.',
      jsonb_build_object('booking_id', new.id, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_notify_change on public.bookings;
create trigger bookings_notify_change
after insert or update on public.bookings
for each row execute function public.notify_booking_change();

-- Report notifications. User uploads stay pending; lab-issued reports are trusted.
create or replace function public.notify_report_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications(profile_id, type, title, message, metadata)
    values (
      new.profile_id,
      'report',
      case when new.verification_state = 'verified' then 'Verified report added' else 'Report uploaded' end,
      new.disease_name::text || case when new.verification_state = 'verified' then ' report is verified.' else ' report is pending verification.' end,
      jsonb_build_object('report_id', new.id, 'verification_state', new.verification_state, 'source_type', new.source_type)
    );
  elsif new.verification_state is distinct from old.verification_state then
    insert into public.notifications(profile_id, type, title, message, metadata)
    values (
      new.profile_id,
      'report',
      'Report verification updated',
      new.disease_name::text || ' report is now ' || new.verification_state::text || '.',
      jsonb_build_object('report_id', new.id, 'verification_state', new.verification_state)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists disease_reports_notify_change on public.disease_reports;
create trigger disease_reports_notify_change
after insert or update on public.disease_reports
for each row execute function public.notify_report_change();

-- Public health card uses only trusted/verified report rows.
create or replace function public.get_public_health_card(share_token_input text)
returns table(name text, is_verified boolean, disease_name text, status text)
language sql
security definer
stable
set search_path = public
as $$
  with target as (
    select p.id,
           case when p.hide_name then null else p.name end as safe_name,
           p.is_verified
    from public.profiles p
    where p.public_share_token = share_token_input
    limit 1
  ), latest as (
    select distinct on (dr.disease_name)
      dr.profile_id, dr.disease_name, dr.status, dr.report_date, dr.updated_at
    from public.disease_reports dr
    join target t on t.id = dr.profile_id
    where dr.verification_state = 'verified'
    order by dr.disease_name, dr.report_date desc, dr.updated_at desc
  )
  select t.safe_name, t.is_verified, l.disease_name::text, l.status::text
  from target t left join latest l on l.profile_id = t.id
  where l.disease_name is not null
  order by l.disease_name::text;
$$;

-- Report-authenticity URLs resolve only for trusted/verified reports.
create or replace function public.get_public_report_authenticity(verification_code_input text)
returns table(lab_name text, disease_name text, report_date date, status public.report_status_enum, patient_name text)
language sql
security definer
stable
set search_path = public
as $$
  select l.name,
         dr.disease_name::text,
         dr.report_date,
         dr.status,
         case when p.hide_name then null else p.name end
  from public.disease_reports dr
  join public.profiles p on p.id = dr.profile_id
  left join public.labs l on l.id = dr.lab_id
  where dr.report_verification_code = verification_code_input
    and dr.verification_state = 'verified'
  limit 1;
$$;

revoke all on function public.get_public_health_card(text) from public;
revoke all on function public.get_public_report_authenticity(text) from public;
grant execute on function public.get_public_health_card(text) to service_role;
grant execute on function public.get_public_report_authenticity(text) to service_role;

-- User upload storage policies added by Mitjayn upgrade.
drop policy if exists "report upload owner insert" on storage.objects;
create policy "report upload owner insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'reports' and split_part(name, '/', 1) = auth.uid()::text and split_part(name, '/', 2) = 'uploads');
drop policy if exists "report upload owner delete" on storage.objects;
create policy "report upload owner delete" on storage.objects
for delete to authenticated
using (bucket_id = 'reports' and split_part(name, '/', 1) = auth.uid()::text and split_part(name, '/', 2) = 'uploads');

-- Notification column privileges.
grant select on public.notifications to authenticated;
revoke update on public.notifications from authenticated;
grant update(read_at) on public.notifications to authenticated;
grant all on public.notifications to service_role;
