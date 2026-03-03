# Architecture Snapshot (v0 scaffold)

## Runtime flow
1. `src/index.ts` boots environment + adapters.
2. `FlightyEngine` handles user intents and orchestrates reads/writes.
3. `startSchedulers` runs periodic polls for tracked flights and price watches.
4. Adapter responses are diffed and formatted into alerts.
5. Alerts are dispatched via notifier transport.

## Main modules
- `src/orchestrator/*` — intent parsing, business logic, alert formatting.
- `src/adapters/*` — external provider + notifier integrations.
- `src/db/*` — persistence abstraction (in-memory or Postgres).
- `src/jobs/scheduler.ts` — periodic polling loops.
- `src/bridge/notifier-bridge.ts` — optional local HTTP relay endpoint.

## Data backends
- Local/demo: `InMemoryDatabase`
- Runtime/prod: Postgres via `DATABASE_URL`

## Notifier backends
Priority order at runtime:
1. `OPENCLAW_RELAY_URL` => OpenClaw relay notifier
2. `NOTIFY_WEBHOOK_URL` => generic webhook notifier
3. fallback => console logger notifier

## Provider backends
### Flight tracker
Priority order:
1. `AVIATIONSTACK_API_KEY` => aviationstack adapter
2. `FLIGHT_TRACKER_BASE_URL` + `FLIGHT_TRACKER_API_KEY` => HTTP adapter
3. fallback => mock adapter

### Price tracker
Priority order:
1. `FLIGHTCLAW_BASE_URL` + `FLIGHTCLAW_API_KEY` => real API adapter
2. fallback => mock adapter

## Current technical debt
- Baseline history includes generated artifacts that should be de-tracked in follow-up commit.
- No automated tests yet (only typecheck/build verification).
