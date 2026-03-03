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

## Deploy checklist (initial)

- [ ] Postgres migrations applied
- [ ] API keys configured
- [ ] Secrets manager configured
- [ ] Logs + metrics sink configured
- [ ] Alerting thresholds configured
