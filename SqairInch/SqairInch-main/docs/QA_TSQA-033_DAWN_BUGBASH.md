# TSQA-033 — Dawn Theme QA + Bug Bash

Date: 2026-02-19
Engineer: Claw
Mode: Read-only familiarization + local QA + bug fixes (no commit)

## Scope checked
- Install flow assumptions (from docs + extension wiring)
- App embed + button render path
- Widget open/close behavior
- Variant change signal path (theme -> widget runtime)
- Avatar flow
- Config/SKU/event request setup
- Error-state handling
- Local build/test quality gates

## QA checklist (pass/fail)
- [x] QA checklist created
- [x] P0 bugs identified and fixed (listed below)
- [~] Mobile tested (code-level/responsive checks done; live Dawn-device run blocked without store session)
- [x] No new console errors introduced by fixes
- [~] Demo-ready on Dawn stable flow (code path fixed; live storefront verification still required)

## Detailed checklist
1) Install + app embed enabled
- Status: BLOCKED (needs live Shopify dev store session)
- Evidence: N/A

2) Button rendering on Dawn PDP
- Status: PASS (code inspection)
- Evidence: `extensions/theme-app-extension/blocks/app_embed.liquid`

3) Widget open/close
- Status: PASS (fixed + verified by code path)
- Includes: button open, overlay click close, close button, ESC close
- Evidence: `extensions/theme-app-extension/assets/sqairinch-loader.js`

4) Variant switching
- Status: PASS (fixed runtime callback path)
- Evidence:
  - loader emits `onVariantChange(...)`
  - widget runtime now exports `onVariantChange(...)` and remounts with updated variant

5) Avatar flow
- Status: PASS (local tests)
- Evidence: `apps/widget/src/__tests__/Widget.test.tsx` all passing

6) SKU fetch wiring
- Status: PARTIAL
- Note: API client + endpoint are wired; live proxy verification blocked without Dawn/app-proxy session.

7) Overlay + heatmap
- Status: PARTIAL
- Note: shell/phase flow stable; try-on + heatmap views are still placeholder UI in current codebase.

8) Error states
- Status: PASS (local tests + hardened loader guards)
- Evidence: retry/error boundary tests passing

## P0/P1 bugs fixed

### P0-1: Loader passed wrong runtime config shape to widget
- Symptom: widget mount options did not include required `baseUrl/queryString`, causing config fetch failures.
- Fix:
  - loader now sends:
    - `baseUrl: window.location.origin`
    - `queryString` built from `shop/product/variant`
    - `variantId`
- Files:
  - `extensions/theme-app-extension/assets/sqairinch-loader.js`

### P1-1: Variant-change callback path was dead
- Symptom: loader attempted `window.SqairinchWidget.onVariantChange` but widget runtime did not export it.
- Fix:
  - added `onVariantChange(variantId)` export in widget runtime
  - remounts widget with updated runtime config
- Files:
  - `apps/widget/src/index.tsx`

### P1-2: Modal opened even when widget URL missing/invalid
- Symptom: blank overlay could open and trap user in a broken state.
- Fix:
  - validate `widget_bundle_url` before opening modal
  - keep warning logs, avoid broken open state
- Files:
  - `extensions/theme-app-extension/assets/sqairinch-loader.js`

### P1-3: Missing keyboard close behavior
- Symptom: ESC key didn’t close modal.
- Fix:
  - added global keydown handler for Escape to close modal when open
- Files:
  - `extensions/theme-app-extension/assets/sqairinch-loader.js`

## Security/coding-standard notes
- Kept HTTPS enforcement for remote widget bundle URL.
- Avoided unsafe string concatenation for runtime request params by using `URLSearchParams`.
- Preserved strict app-proxy path usage and no secret exposure changes.

## Local validation run
- `pnpm install --frozen-lockfile` (via `npx pnpm@9`)
- `pnpm --filter @sqairinch/widget typecheck`
- `pnpm --filter @sqairinch/widget lint`
- `pnpm --filter @sqairinch/widget test`
- `pnpm smoke`
- Result: PASS

## Screenshot log
- Live Dawn screenshots: BLOCKED pending Shopify dev-store session access.
- Planned filenames once access is provided:
  - `docs/qa/screenshots/tsqa-033-01-embed-enabled.png`
  - `docs/qa/screenshots/tsqa-033-02-button-on-pdp.png`
  - `docs/qa/screenshots/tsqa-033-03-widget-open.png`
  - `docs/qa/screenshots/tsqa-033-04-avatar-flow.png`
  - `docs/qa/screenshots/tsqa-033-05-variant-switch.png`
  - `docs/qa/screenshots/tsqa-033-06-error-state.png`

## Next required step to close TSQA-033 fully
- Run live Dawn QA in a connected Shopify dev store and capture screenshots for each checklist item.
