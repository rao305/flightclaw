-- Flighty OpenClaw schema v0.1
-- Run in Postgres for production deployment.

create table if not exists users (
  id uuid primary key,
  external_user_key text unique not null,
  display_name text,
  time_zone text default 'America/New_York',
  home_airport text,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz default now()
);

create table if not exists trips (
  id uuid primary key,
  user_id uuid references users(id) on delete cascade,
  name text,
  starts_on date,
  ends_on date,
  created_at timestamptz default now()
);

create table if not exists tracked_flights (
  id uuid primary key,
  user_id uuid references users(id) on delete cascade,
  trip_id uuid references trips(id) on delete set null,
  airline_code text not null,
  flight_number text not null,
  flight_date date not null,
  departure_airport text,
  arrival_airport text,
  tracking_state text not null default 'active',
  created_at timestamptz default now(),
  unique(user_id, airline_code, flight_number, flight_date)
);

create table if not exists flight_snapshots (
  id bigserial primary key,
  tracked_flight_id uuid references tracked_flights(id) on delete cascade,
  provider text not null,
  status text,
  sched_dep timestamptz,
  est_dep timestamptz,
  act_dep timestamptz,
  sched_arr timestamptz,
  est_arr timestamptz,
  act_arr timestamptz,
  dep_terminal text,
  dep_gate text,
  arr_terminal text,
  arr_gate text,
  aircraft_type text,
  tail_number text,
  lat double precision,
  lon double precision,
  altitude_ft int,
  speed_kts int,
  raw_json jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_snapshots_flight_time
  on flight_snapshots(tracked_flight_id, created_at desc);

create table if not exists flight_events (
  id bigserial primary key,
  tracked_flight_id uuid references tracked_flights(id) on delete cascade,
  event_type text not null,
  event_payload jsonb not null,
  fingerprint text not null,
  created_at timestamptz default now(),
  unique(tracked_flight_id, fingerprint)
);

create table if not exists price_watches (
  id uuid primary key,
  user_id uuid references users(id) on delete cascade,
  origin text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  target_price_usd numeric(10,2) not null,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists price_watch_hits (
  id bigserial primary key,
  watch_id uuid references price_watches(id) on delete cascade,
  seen_price_usd numeric(10,2),
  deep_link text,
  raw_json jsonb,
  created_at timestamptz default now()
);
