
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  program text,
  year int,
  interests text[] default '{}',
  onboarded boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- cv uploads
create table public.cv_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text,
  extracted jsonb,
  created_at timestamptz not null default now()
);
alter table public.cv_uploads enable row level security;
create policy "cv_own_all" on public.cv_uploads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- career plans
create table public.career_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  selected_path text,
  ranked jsonb,
  reasoning text,
  created_at timestamptz not null default now()
);
alter table public.career_plans enable row level security;
create policy "career_own_all" on public.career_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- study plans
create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  selected_courses jsonb default '[]'::jsonb,
  workload_target int default 20,
  retention_risk int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.study_plans enable row level security;
create policy "study_own_all" on public.study_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- schedule events
create table public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  kind text not null default 'class', -- class | assignment | study | event
  day_of_week int, -- 0..6 (recurring)
  starts_at timestamptz, -- one-off
  ends_at timestamptz,
  start_time text, -- HH:mm for recurring
  end_time text,
  course_code text,
  source text default 'manual', -- manual | moodle | generated
  created_at timestamptz not null default now()
);
alter table public.schedule_events enable row level security;
create policy "events_own_all" on public.schedule_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- check-ins
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  difficulty int,
  completed_blocks int,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.check_ins enable row level security;
create policy "checkins_own_all" on public.check_ins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- timestamp trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_updated before update on public.profiles
  for each row execute procedure public.tg_set_updated_at();
create trigger study_plans_updated before update on public.study_plans
  for each row execute procedure public.tg_set_updated_at();

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
