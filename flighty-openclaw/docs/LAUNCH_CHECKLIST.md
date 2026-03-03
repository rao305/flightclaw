# Launch Checklist (v0)

## Runtime and config
- [ ] `LIVE_DATA_ONLY=true` in production env
- [ ] `DATABASE_URL` points to reachable Postgres
- [ ] Flight provider configured:
  - [ ] `AVIATIONSTACK_API_KEY` OR
  - [ ] `FLIGHT_TRACKER_BASE_URL` + `FLIGHT_TRACKER_API_KEY`
- [ ] Price provider configured:
  - [ ] `FLIGHTCLAW_BASE_URL` + `FLIGHTCLAW_API_KEY`
- [ ] Notifier configured (recommended):
  - [ ] `OPENCLAW_RELAY_URL` (and token if needed) OR
  - [ ] `NOTIFY_WEBHOOK_URL`

## Build/test gate
- [ ] `npm install`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run smoke`

## Data safety
- [ ] Postgres migration applied (`src/db/migrations/001_init.sql`)
- [ ] Secrets stored outside git (`.env` not committed)
- [ ] Confirm no mock-only envs in prod (`LIVE_DATA_ONLY=true`)

## Ops readiness
- [ ] Runbook reviewed (`docs/RUNBOOK.md`)
- [ ] Monitoring/log collection active
- [ ] Failure alert path verified (notifier fallback behavior understood)

## Release
- [ ] Update `CHANGELOG.md`
- [ ] Tag release (example): `git tag -a v0.1.0 -m "FlightClaw v0.1.0"`
- [ ] Push branch + tag
