# flighty-openclaw

Flighty-style agent skeleton on OpenClaw runtime.

## What is implemented right now

- Natural-language command parsing for:
  - flight tracking (`Track AA100 on YYYY-MM-DD from JFK to LAX`)
  - next flight lookup
  - price watch creation + listing
- Polling loops for tracked flights and price watches
- Event diffing + deduplicated alerts
- Database abstraction with:
  - in-memory DB for local demo
  - Postgres adapter for persistent runtime
- HTTP adapter layer with fallback-to-mock for:
  - flight status provider
  - flightclaw price provider
- Notifier abstraction:
  - console notifier
  - webhook notifier transport
  - OpenClaw relay notifier (`OPENCLAW_RELAY_URL`)
- Optional local notifier bridge server (`START_BRIDGE=true`)
- Production Postgres schema migration (`src/db/migrations/001_init.sql`)
- Skill scaffolds for:
  - `flight-tracker`
  - `flightclaw`
  - `calendar-sync`
  - `email-parser`
  - `notification-hub`

## Run local MVP

```bash
npm install
npm run dev
```

Try messages:

- `Track AA100 on 2026-04-10 from JFK to LAX`
- `What is my next flight?`
- `Alert me when IND->SFO 2026-05-01 to 2026-05-10 below $250`
- `list my price alerts`

Type `exit` to stop.

## Production wiring TODO

1. Wire concrete provider endpoints/field mappings for your chosen flight API + flightclaw API.
2. Apply migrations to Postgres and verify `DATABASE_URL` runtime access.
3. Wire notifier webhook to OpenClaw channel delivery service.
4. Add auth + per-user token vault for calendar/email ingestion.
5. Add integration tests + deployment pipeline.
