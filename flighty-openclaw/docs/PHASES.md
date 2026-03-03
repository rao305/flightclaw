# FlightClaw Build Phases

This file is the checkpoint contract with Rohit. After each phase, update this file and stop for review.

## Phase 0 — Baseline Snapshot (completed)

**Status:** ✅ Completed (2026-03-03)

### What exists
- TypeScript project scaffold with runtime entrypoint.
- Adapters for flight status, price tracking, notifier relay.
- In-memory and Postgres DB adapters.
- Scheduler loops for flight + price polling.
- Skill stubs and runbook.

### Validation run
- `npm run typecheck` ✅
- `npm run build` ✅

### Known gaps
- `node_modules` had been committed to git history in initial import.
- No gitignore present initially.
- No explicit phase tracking doc until now.

---

## Phase 1 — Repo Hygiene + Documentation Backbone

**Status:** ✅ Completed (2026-03-03)

### Goals
- Enforce clean git hygiene (ignore generated artifacts and secrets).
- Remove committed dependency artifacts from tracking.
- Add context-recovery docs so future sessions can pick up quickly.

### Deliverables
- [x] Root `.gitignore`
- [x] Remove `flighty-openclaw/node_modules` from git tracking
- [x] Add architecture snapshot doc
- [x] Add phase handoff template (`docs/PHASES.md`)

---

## Phase 2 — Runtime Hardening

**Status:** ✅ Completed (2026-03-03)

### Goals
- Add startup health checks and explicit config validation.
- Improve error handling around providers/notifier failures.
- Add deterministic test fixture mode for demo reproducibility.

### Deliverables
- [x] Runtime env schema validation (`src/config/env.ts`)
- [x] Scheduler error guards (`src/jobs/scheduler.ts`)
- [x] Deterministic mock support (`MOCK_SEED`, `MOCK_FIXED_NOW`)
- [x] Runbook + env docs updated

---

## Phase 3 — Product Features (MVP Complete)

**Status:** ⏳ Planned

### Goals
- Confirm command intents and responses.
- Tighten watch/alert user flows.
- Add integration smoke script.

---

## Phase 4 — Launch Readiness

**Status:** ⏳ Planned

### Goals
- Release checklist completion.
- Operational runbook expansion.
- v0 tag + changelog.
