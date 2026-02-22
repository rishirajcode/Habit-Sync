-- Habit Sync Database Schema

-- 1. Create a table for User Profiles
create table public.profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  full_name text,
  age integer,
  sex text,
  height numeric, -- in cm
  weight numeric, -- in kg
  bmi numeric,
  points integer default 0,
  current_streak integer default 0,
  best_streak integer default 0,
  last_active_date date
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);
create policy "Users can insert their own profile." on profiles
  for insert with check ((select auth.uid()) = id);
create policy "Users can update own profile." on profiles
  for update using ((select auth.uid()) = id);

-- Trigger to automatically create profile on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Weight Logs Table
create table public.weight_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  weight numeric not null,
  logged_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.weight_logs enable row level security;
create policy "Users can view their own weight logs." on weight_logs for select using ((select auth.uid()) = user_id);
create policy "Users can insert their own weight logs." on weight_logs for insert with check ((select auth.uid()) = user_id);

-- 3. Water Logs Table
create table public.water_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  amount_ml integer not null,
  logged_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.water_logs enable row level security;
create policy "Users can view their own water logs." on water_logs for select using ((select auth.uid()) = user_id);
create policy "Users can insert their own water logs." on water_logs for insert with check ((select auth.uid()) = user_id);

-- 4. Medicine Reminders Table
create table public.medicine_reminders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  medicine_name text not null,
  reminder_time time not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.medicine_reminders enable row level security;
create policy "Users can view their own medicine reminders." on medicine_reminders for select using ((select auth.uid()) = user_id);
create policy "Users can manage their own medicine reminders." on medicine_reminders for all using ((select auth.uid()) = user_id);

-- 5. Health Tips Table (Optional: can be local JSON, but putting it here if needed)
-- Instead of DB table, keeping it as local JSON per user preference for negligible cost and speed.
