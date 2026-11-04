-- Vega Fit database schema
-- Run this in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run

create type user_role as enum ('trainer', 'client');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'client',
  full_name text not null,
  trainer_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  goal_weight numeric
);

create table programs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  phase_name text,
  phase_week int not null default 1,
  phase_total_weeks int not null default 4,
  created_at timestamptz not null default now(),
  calorie_target int,
  cardio_target text,
  meal_plan jsonb
);

create table workout_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  day_order int not null,
  day_name text not null,
  is_rest boolean not null default false
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references workout_days(id) on delete cascade,
  exercise_order int not null,
  name text not null,
  target_sets int not null,
  rep_range text not null,
  rir_target text,
  notes text,
  image_url text,
  primary_muscle text
);

create table workout_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  workout_day_id uuid references workout_days(id) on delete set null,
  logged_date date not null default current_date,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references workout_logs(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  set_number int not null,
  weight numeric,
  reps int,
  rir numeric,
  machine_notes text,
  is_pr boolean not null default false,
  created_at timestamptz not null default now()
);

create table bodyweight_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  logged_date date not null default current_date,
  weight numeric not null,
  created_at timestamptz not null default now(),
  unique (client_id, logged_date)
);

create index on programs (client_id);
create index on workout_days (program_id);
create index on exercises (workout_day_id);
create index on workout_logs (client_id, logged_date);
create index on set_logs (workout_log_id);
create index on set_logs (exercise_id);
create index on bodyweight_logs (client_id, logged_date);

alter table profiles enable row level security;
alter table programs enable row level security;
alter table workout_days enable row level security;
alter table exercises enable row level security;
alter table workout_logs enable row level security;
alter table set_logs enable row level security;
alter table bodyweight_logs enable row level security;

create function is_trainer_of(target_client_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where id = target_client_id and trainer_id = auth.uid()
  );
$$;

create policy "view own profile or own clients" on profiles
  for select using (id = auth.uid() or trainer_id = auth.uid());

create policy "update own profile" on profiles
  for update using (id = auth.uid());

create policy "trainer updates client profile" on profiles
  for update using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

create policy "insert own profile" on profiles
  for insert with check (id = auth.uid());

create policy "view own programs or client's programs" on programs
  for select using (client_id = auth.uid() or is_trainer_of(client_id));

create policy "trainer manages programs" on programs
  for all using (is_trainer_of(client_id)) with check (is_trainer_of(client_id));

create policy "view workout days" on workout_days
  for select using (
    exists (select 1 from programs p where p.id = program_id and (p.client_id = auth.uid() or is_trainer_of(p.client_id)))
  );

create policy "trainer manages workout days" on workout_days
  for all using (
    exists (select 1 from programs p where p.id = program_id and is_trainer_of(p.client_id))
  ) with check (
    exists (select 1 from programs p where p.id = program_id and is_trainer_of(p.client_id))
  );

create policy "view exercises" on exercises
  for select using (
    exists (
      select 1 from workout_days wd join programs p on p.id = wd.program_id
      where wd.id = workout_day_id and (p.client_id = auth.uid() or is_trainer_of(p.client_id))
    )
  );

create policy "trainer manages exercises" on exercises
  for all using (
    exists (
      select 1 from workout_days wd join programs p on p.id = wd.program_id
      where wd.id = workout_day_id and is_trainer_of(p.client_id)
    )
  ) with check (
    exists (
      select 1 from workout_days wd join programs p on p.id = wd.program_id
      where wd.id = workout_day_id and is_trainer_of(p.client_id)
    )
  );

create policy "view own workout logs or client's" on workout_logs
  for select using (client_id = auth.uid() or is_trainer_of(client_id));

create policy "client manages own workout logs" on workout_logs
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

create policy "view set logs" on set_logs
  for select using (
    exists (
      select 1 from workout_logs wl where wl.id = workout_log_id
      and (wl.client_id = auth.uid() or is_trainer_of(wl.client_id))
    )
  );

create policy "client manages own set logs" on set_logs
  for all using (
    exists (select 1 from workout_logs wl where wl.id = workout_log_id and wl.client_id = auth.uid())
  ) with check (
    exists (select 1 from workout_logs wl where wl.id = workout_log_id and wl.client_id = auth.uid())
  );

create policy "view own bodyweight or client's" on bodyweight_logs
  for select using (client_id = auth.uid() or is_trainer_of(client_id));

create policy "client manages own bodyweight" on bodyweight_logs
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

-- Daily nutrition/cardio check-in (weight stays in bodyweight_logs)
create table daily_checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  logged_date date not null default current_date,
  cardio_minutes int,
  end_of_day_calories int,
  created_at timestamptz not null default now(),
  unique (client_id, logged_date)
);

create index on daily_checkins (client_id, logged_date);
alter table daily_checkins enable row level security;

create policy "view own checkins or client's" on daily_checkins
  for select using (client_id = auth.uid() or is_trainer_of(client_id));

create policy "client manages own checkins" on daily_checkins
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());
