# RUNBOOK

## Local dev

1. `npm install`
2. `npm run dev`
3. send test commands in CLI prompt

## Polling intervals

- Tracked flights: 2 minutes
- Price watches: 5 minutes

Tune these in `src/jobs/scheduler.ts`.

## Notifier bridge

If you want a local relay endpoint for outbound notifications:

1. Set `START_BRIDGE=true` in `.env`
2. Run `npm run dev`
3. Bridge endpoint: `POST http://localhost:${BRIDGE_PORT:-8788}/notify`

Payload:

```json
{
  "userKey": "whatsapp:+1669...",
  "message": "text",
  "channel": "whatsapp"
}
```

Wire this endpoint to your OpenClaw delivery worker/service.

## Incident handling

- If provider down: adapter falls back to mock source (degraded mode for dev continuity).
- If notifier fails: fallback notifier logs to console.
- Scheduler loops are wrapped with error guards and log failures instead of crashing the runtime.

## Startup validation

Runtime config is validated at boot. The process exits early if critical pairs are incomplete, e.g.:
- `FLIGHT_TRACKER_BASE_URL` without `FLIGHT_TRACKER_API_KEY`
- `FLIGHTCLAW_BASE_URL` without `FLIGHTCLAW_API_KEY`

## Live-data-only mode (recommended for prod)

Set:
- `LIVE_DATA_ONLY=true`

Behavior:
- Startup fails if live providers are not fully configured.
- Adapter/network failures do **not** fall back to mocks.
- Ensures no hardcoded/mock flight data is used in production.

## Deterministic demo mode

For reproducible local testing:
- Set `LIVE_DATA_ONLY=false`
- Set `MOCK_SEED` to any fixed string
- Optionally set `MOCK_FIXED_NOW` (ISO datetime with offset)

## Deploy checklist (initial)

- [ ] Postgres migrations applied
- [ ] API keys configured
- [ ] Secrets manager configured
- [ ] Logs + metrics sink configured
- [ ] Alerting thresholds configured
