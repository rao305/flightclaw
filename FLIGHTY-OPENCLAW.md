# Flighty-style Agent on OpenClaw

Status: Draft v0.1 (living design doc)  
Owner: Rohit  
Last Updated: 2026-03-03

---

## 1) Objective

Build a Flighty-like assistant on OpenClaw with:
- Live flight status + timeline updates
- Delay/cancellation intelligence
- Trip grouping + flight history (“passport”)
- Multi-channel alerts
- Price tracking (super-set via `flightclaw`)

Primary UX: chat-first (WhatsApp/Telegram/Discord/Slack).  
Secondary UX (later): optional web dashboard.

---

## 2) Scope

### MVP (Phase 1)
1. Manual flight tracking by natural language
2. Live status cards (scheduled/active/delayed/landed/cancelled)
3. Day-of-travel alerting (gate change, delay, cancellation, departure, arrival)
4. Basic trip grouping
5. Text passport stats
6. Price watches with threshold alerts (`flightclaw`)

### Phase 2
1. Calendar ingestion
2. Email confirmation ingestion
3. Better delay prediction model
4. Airport disruption intelligence feed
5. Web dashboard

### Non-goals (for now)
- Full iOS-native Flighty clone UI
- Global airline completeness guarantees
- Ticket booking engine

---

## 3) User Stories

1. As a traveler, I can say: “Track UA2402 tomorrow SFO to ORD” and get confirmation + alerts.
2. As a traveler, I get proactive updates when status changes.
3. As a traveler, I can ask “What’s my next flight?” and get one concise card.
4. As a traveler, I can set “Alert me when IND->SFO in May drops below $250.”
5. As a traveler, I can ask “Show my flight stats this year.”

---

## 4) OpenClaw Runtime Design

### 4.1 Components
- **OpenClaw main session agent**: orchestrates intent parsing + tool/skill calls.
- **Background jobs**: poll tracked flights and evaluate price watches.
- **Data store**: Postgres (state + history).
- **Cache/queue**: Redis (optional but recommended).
- **Notifier**: OpenClaw `message` tool wrappers for platform delivery.

### 4.2 Skills/Integrations
- `flight-tracker` (status/live position)
- `flightclaw` (price tracking/search)
- `calendar-sync` (phase 2)
- `email-parser` (phase 2)

### 4.3 Why OpenClaw
- Multi-channel routing in one runtime
- Cron/background orchestration via built-in scheduler
- Conversational control plane for non-technical users

---

## 5) Data Model (Postgres)

```sql
-- users
create table users (
  id uuid primary key,
  external_user_key text unique not null,   -- e.g., whatsapp:+1669...
  display_name text,
  time_zone text default 'America/New_York',
  home_airport text,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz default now()
);

-- flights tracked by user
create table tracked_flights (
  id uuid primary key,
  user_id uuid references users(id) on delete cascade,
  airline_code text not null,
  flight_number text not null,
  flight_date date not null,
  departure_airport text,
  arrival_airport text,
  trip_id uuid,
  tracking_state text not null default 'active', -- active|completed|cancelled
  created_at timestamptz default now(),
  unique(user_id, airline_code, flight_number, flight_date)
);

-- latest snapshot from provider
create table flight_snapshots (
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

create index idx_snapshots_flight_time
  on flight_snapshots(tracked_flight_id, created_at desc);

-- deduplicated state transitions for alerting
create table flight_events (
  id bigserial primary key,
  tracked_flight_id uuid references tracked_flights(id) on delete cascade,
  event_type text not null, -- delay_increase|gate_change|cancelled|departed|arrived
  event_payload jsonb not null,
  fingerprint text not null,
  created_at timestamptz default now(),
  unique(tracked_flight_id, fingerprint)
);

-- trips
create table trips (
  id uuid primary key,
  user_id uuid references users(id) on delete cascade,
  name text,
  starts_on date,
  ends_on date,
  created_at timestamptz default now()
);

-- price watches
create table price_watches (
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

create table price_watch_hits (
  id bigserial primary key,
  watch_id uuid references price_watches(id) on delete cascade,
  seen_price_usd numeric(10,2),
  deep_link text,
  raw_json jsonb,
  created_at timestamptz default now()
);
```

---

## 6) Canonical Internal JSON Contracts

### 6.1 FlightRef
```json
{
  "airlineCode": "UA",
  "flightNumber": "2402",
  "flightDate": "2026-04-10",
  "departureAirport": "SFO",
  "arrivalAirport": "ORD"
}
```

### 6.2 FlightCard (chat render model)
```json
{
  "title": "UA2402 • SFO -> ORD",
  "status": "DELAYED",
  "timeline": {
    "scheduledDeparture": "2026-04-10T16:20:00Z",
    "estimatedDeparture": "2026-04-10T17:05:00Z",
    "scheduledArrival": "2026-04-10T20:35:00Z",
    "estimatedArrival": "2026-04-10T21:18:00Z"
  },
  "gateInfo": {"depGate": "F12", "arrGate": "C9"},
  "aircraft": {"type": "B738", "tail": "N12345"},
  "live": {"lat": 40.21, "lon": -112.51, "altitudeFt": 31000, "speedKts": 445},
  "confidence": 0.92
}
```

### 6.3 PriceWatchCreate
```json
{
  "origin": "IND",
  "destination": "SFO",
  "startDate": "2026-05-01",
  "endDate": "2026-05-31",
  "targetPriceUsd": 250
}
```

---

## 7) Commands (NL Intents)

### 7.1 Flight Tracking Intents
- “Track AA100 on March 18 from JFK to SFO”
- “What’s my next flight?”
- “Status of DL245 tonight”
- “Stop tracking UA2402”

### 7.2 Price Intents
- “Track IND to SFO in May under 250”
- “List my price alerts”
- “Delete my SFO alert”

### 7.3 Passport/History Intents
- “How many flights this year?”
- “Top airports I used?”

---

## 8) Orchestration Flows

### 8.1 Add Flight Flow
1. Parse flight reference from message.
2. Validate with `flight-tracker.get_flight_status`.
3. Upsert `tracked_flights`.
4. Assign/create trip.
5. Send confirmation card + alert preference prompt.

### 8.2 Day-of-Travel Polling
- Cron every 10 min for active flights (T-24h to T+8h)
- Every 2 min when status is active/in-air
- Compare latest snapshot with previous
- If material change -> emit deduped event -> notify user

### 8.3 Price Watch Loop
- Cron every 4-6h per active watch
- Call `flightclaw.search_route`
- If best fare <= target and not recently alerted -> notify + store hit

---

## 9) Alert Rules (MVP)

Trigger notification when:
1. Status changes (scheduled->delayed, delayed->cancelled, active->landed)
2. Delay grows by >= 15 min
3. Departure or arrival gate changes
4. Departure in 2h and user has alerts enabled
5. Price watch threshold crossed

Dedup strategy:
- `fingerprint = sha256(event_type + normalized_payload_window)`
- prevent repeat spam within 30 min for same fingerprint class

Quiet hours:
- queue non-critical alerts until quiet-hours end
- critical events (cancellation/diversion) bypass quiet hours

---

## 10) Delay Prediction (MVP Heuristic)

Initial score combines:
- current delay minutes
- airport congestion proxy (if available)
- airline + route historical percentile (if available)
- inbound aircraft late arrival signal (if tail/inbound leg known)

Output:
- `riskLevel`: LOW/MEDIUM/HIGH
- `predictedDelayMin`: integer
- `explanation`: short plain-language reason

(Replace with trained model in phase 2+.)

---

## 11) Chat UX Format

### 11.1 Status Card Template
```
✈️ UA2402 • SFO -> ORD
Status: DELAYED (+45m)
Dep: 10:20 AM -> 11:05 AM (Gate F12)
Arr: 4:35 PM -> 5:18 PM (Gate C9)
Aircraft: B737-800 (N12345)
Live: 31,000 ft • 445 kts
```

### 11.2 Alert Template
```
🔔 Update: UA2402 gate changed
Departure gate moved: F12 -> F18
New boarding estimate: 10:35 AM
```

### 11.3 Price Alert Template
```
💸 Price Drop: IND -> SFO
Now: $219 (target: $250)
Dates: May 10-15
Book: <link>
```

---

## 12) OpenClaw Project Layout

```text
flighty-openclaw/
  docs/
    FLIGHTY-OPENCLAW.md
    RUNBOOK.md
  skills/
    flight-tracker/
      SKILL.md
      scripts/
    flightclaw/
      SKILL.md
      scripts/
    calendar-sync/
      SKILL.md
    email-parser/
      SKILL.md
  src/
    orchestrator/
      intents.ts
      flight-flow.ts
      price-flow.ts
      alerts.ts
    db/
      migrations/
      queries/
    jobs/
      poll-flights.ts
      poll-price-watches.ts
  config/
    openclaw.json
  scripts/
    bootstrap.sh
```

---

## 13) Security & Compliance

- Encrypt provider tokens at rest.
- Never log OAuth tokens or full email bodies in plaintext.
- Row-level ownership checks (`user_id`) for all reads/writes.
- Rate-limit external API calls and user-triggered expensive actions.
- Add abuse controls for public channels.

---

## 14) Observability

Track:
- skill call latency/success rate
- alert delivery success by channel
- duplicate suppression counts
- number of actively tracked flights
- price-watch hit conversion events (optional)

Error budget SLO (MVP):
- 99% of status checks complete < 5s
- 99% of generated alerts deliver < 60s from event detect time

---

## 15) Rollout Plan

### Sprint 1 (1 week)
- DB schema + manual add + status card + list tracked flights

### Sprint 2 (1 week)
- Polling job + event diffing + notifications + dedup

### Sprint 3 (1 week)
- Price watches + threshold alerts + basic passport stats

### Sprint 4 (1 week)
- Calendar import v1 + delay heuristic + hardening

---

## 16) Acceptance Criteria (MVP)

1. User can add a flight in natural language in one message.
2. User gets proactive delay/gate/cancellation alerts on preferred channel.
3. User can ask “next flight” and get a correct card.
4. User can create/list/delete a price watch and receive threshold alert.
5. User can view basic stats (flights, airports, routes) via chat.

---

## 17) Immediate Next Steps

1. Create repo scaffold from section 12.
2. Implement Postgres migrations from section 5.
3. Implement `flight-tracker` action wrappers and normalize payloads.
4. Add polling cron jobs with event dedup.
5. Wire OpenClaw channel notifications and quiet hours.

---

## 18) Risks & Mitigations

- **Provider coverage gaps** -> support adapter fallback + confidence labels.
- **Alert spam** -> strict dedup fingerprints + quiet hours + severity levels.
- **Date parsing ambiguity** -> require explicit confirmation when confidence low.
- **Cost blowups** -> caching + dynamic poll interval + per-user limits.

---

This file is a living spec. Update version/date whenever contracts or alert logic change.
