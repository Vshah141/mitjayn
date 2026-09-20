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

-- Allow authenticated users to upload/delete only their own untrusted upload files.
-- This does NOT grant any write access to disease_reports; the server creates pending rows after parsing.
drop policy if exists "report upload owner insert" on storage.objects;
create policy "report upload owner insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'reports'
  and split_part(name, '/', 1) = auth.uid()::text
  and split_part(name, '/', 2) = 'uploads'
);

drop policy if exists "report upload owner delete" on storage.objects;
create policy "report upload owner delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'reports'
  and split_part(name, '/', 1) = auth.uid()::text
  and split_part(name, '/', 2) = 'uploads'
);

-- Notification rows are user-readable, but authenticated users may only change read_at.
grant select on public.notifications to authenticated;
revoke update on public.notifications from authenticated;
grant update(read_at) on public.notifications to authenticated;
grant all on public.notifications to service_role;
