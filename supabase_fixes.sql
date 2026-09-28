-- =====================================================================
-- DermShield AI - security + realtime fixes. Run ONCE in Supabase -> SQL Editor.
-- (Assumes tables: profiles, notifications already exist. Uses only columns
--  role, is_verified, medical_license on profiles.)
-- =====================================================================

-- 1) New profiles can only ever be 'patient' or 'doctor', and doctors always start UNVERIFIED.
--    (Signup metadata comes from the browser, so anyone could otherwise register as admin.)
create or replace function public.sanitize_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is null or new.role::text not in ('patient', 'doctor') then
    new.role := 'patient';
  end if;
  if new.role::text = 'doctor' then
    new.is_verified := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sanitize_new_profile on public.profiles;
create trigger trg_sanitize_new_profile
  before insert on public.profiles
  for each row execute function public.sanitize_new_profile();

-- 2) Only an admin (or the SQL editor / service role) may change role or is_verified.
--    Changing a doctor's license number resets verification.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  if auth.uid() is null then
    return new;  -- SQL editor / service role
  end if;

  select exists (
    select 1 from public.profiles where id = auth.uid() and role::text = 'admin'
  ) into caller_is_admin;

  if caller_is_admin then
    return new;
  end if;

  new.role := old.role;
  new.is_verified := old.is_verified;

  if old.role::text = 'doctor' and new.medical_license is distinct from old.medical_license then
    new.is_verified := false;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_columns on public.profiles;
create trigger trg_protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- 3) Realtime for patient notifications (ignore the error if it is already added)
alter publication supabase_realtime add table public.notifications;

-- 4) Make YOURSELF admin (admins can't self-register anymore). Change the email:
-- update public.profiles set role = 'admin' where email = 'your-email@example.com';

-- NOTE: the app now inserts notification rows itself when a doctor submits a verdict /
-- confirms / completes a consultation. If you already have DB triggers that create these
-- notifications, drop those triggers (or remove the notifyUser() calls) to avoid duplicates.
-- Also make sure RLS is ON for scans / consultations / referrals / inference_logs / notifications.
