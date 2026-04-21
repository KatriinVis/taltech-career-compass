-- Catalog table
create table public.courses (
  code text primary key,
  name text not null,
  ects numeric,
  semester text,
  required boolean default false,
  day integer,
  "start" text,
  "end" text,
  room text,
  format text,
  university text,
  source text not null check (source in ('taltech','euroteq')),
  description text,
  url text,
  last_synced_at timestamptz not null default now()
);

create index idx_courses_source on public.courses(source);

-- Skills join table
create table public.course_skills (
  course_code text not null references public.courses(code) on delete cascade,
  skill text not null,
  primary key (course_code, skill)
);

create index idx_course_skills_skill on public.course_skills(skill);

-- Sync run log
create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null,
  inserted integer default 0,
  updated integer default 0,
  failed integer default 0,
  error text,
  finished_at timestamptz not null default now()
);

create index idx_sync_runs_finished on public.sync_runs(finished_at desc);

-- RLS
alter table public.courses enable row level security;
alter table public.course_skills enable row level security;
alter table public.sync_runs enable row level security;

-- Public read
create policy courses_public_read on public.courses for select using (true);
create policy course_skills_public_read on public.course_skills for select using (true);
create policy sync_runs_public_read on public.sync_runs for select using (true);

-- No insert/update/delete policies → only service role can write