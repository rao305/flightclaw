# Changelog

## v0.1.0 - 2026-03-03

### Added
- Flight tracking + next-flight flows
- Price watch create/list flows
- Polling scheduler for flight + price updates
- In-memory and Postgres database backends
- Notifier adapters (console, webhook, OpenClaw relay)
- Runtime env validation (`src/config/env.ts`)
- Deterministic mock mode (`MOCK_SEED`, `MOCK_FIXED_NOW`) for testing
- Smoke test script (`npm run smoke`)
- Launch checklist and architecture/phase docs

### Changed
- Enforced `LIVE_DATA_ONLY=true` default for production safety
- Disabled mock fallback when live-data-only mode is enabled
- Hardened scheduler loops with safe error guards
- Cleaned repository tracking (removed committed `node_modules`)

### Notes
- Production should run with real providers configured and `LIVE_DATA_ONLY=true`.
