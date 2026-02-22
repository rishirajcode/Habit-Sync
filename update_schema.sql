-- Habit Sync Phase 5 Schema Updates
-- INSTRUCTIONS: Run this entire script in your Supabase SQL Editor to enable Phase 5 features.

-- 1. Add Blood Group to Profiles
alter table public.profiles add column if not exists blood_group text;

-- 2. User Medicines / Supplements tracking table
create table if not exists public.user_medicines (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) not null,
    name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for User Medicines
alter table public.user_medicines enable row level security;
drop policy if exists "Users can view their own medicines." on public.user_medicines;
create policy "Users can view their own medicines." on public.user_medicines for select using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own medicines." on public.user_medicines;
create policy "Users can insert their own medicines." on public.user_medicines for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own medicines." on public.user_medicines;
create policy "Users can delete their own medicines." on public.user_medicines for delete using ((select auth.uid()) = user_id);

-- 3. Blood Pressure Logs
create table if not exists public.blood_pressure_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) not null,
    systolic integer not null,
    diastolic integer not null,
    logged_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Blood Pressure Logs
alter table public.blood_pressure_logs enable row level security;
drop policy if exists "Users can view their own blood pressure logs." on public.blood_pressure_logs;
create policy "Users can view their own blood pressure logs." on public.blood_pressure_logs for select using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own blood pressure logs." on public.blood_pressure_logs;
create policy "Users can insert their own blood pressure logs." on public.blood_pressure_logs for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own blood pressure logs." on public.blood_pressure_logs;
create policy "Users can delete their own blood pressure logs." on public.blood_pressure_logs for delete using ((select auth.uid()) = user_id);
