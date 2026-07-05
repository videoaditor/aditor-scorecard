# Test-harness bootstrap - validation evidence

Change under test: `9897a81` *test: bootstrap E2E-first Playwright harness + T1 gate tests*
(base `33c451e`). This commit adds only test infra + docs (`.no-mistakes.yaml`, `AGENTS.md`,
Playwright config, mock backend, fixtures, 3 specs). No app source changed.

## Gate command (exactly `.no-mistakes.yaml > commands.test`)

```
cd dashboard && npm ci && npx playwright install chromium && npm run build -- --mode test && npm run test:e2e
```

Result: build succeeded (39 modules, `dist/` produced), all 6 Playwright tests passed.

```
Running 6 tests using 1 worker
  ✓  T1-1 POST /action  › accept: Push Propaganda sends the exact payload once + success toast
  ✓  T1-1 POST /action  › cancel: dismissing the confirm sends zero requests to /action
  ✓  T1-2 PATCH /assign-editor › accept: drop editor on castle sends the exact PATCH once + toast + editors re-fetch
  ✓  T1-2 PATCH /assign-editor › cancel: dismissing the confirm sends zero PATCH requests
  ✓  smoke › Scorecard tab renders the KPI grid from mocked Teable
  ✓  smoke › Brands tab renders castles + health summary from mocked backend
  6 passed (3.5s)
```

## What the evidence shows

The harness drives the **built** SPA (`vite preview` at :4173) - the same bundle a real user
loads - with every network boundary faked and a hard rail that fails on any non-localhost leak.
`transcript.railViolations` is asserted empty in every test, so the suite never touched real
Teable or `gen.aditor.ai`.

### T1-1 - POST /action (the outbound trigger)
- `t1-1-action-push-propaganda-toast.png` - Ember Forge expanded, "Push Propaganda ×5" clicked,
  green success toast rendered after the mocked POST resolved.
- `t1-1-captured-action-request.json` - the **exact** outbound payload the app would have sent
  (captured, never sent): `action=push_propaganda`, `brand=Ember Forge`, `brandBoard=brdBurning001`,
  `params.count=5` (= `max(2, weeklyTarget 8 − delivered 3)`, matching `BrandActions.jsx`).

### T1-2 - PATCH /assign-editor (the data mutation)
- `t1-2-assign-editor-toast.png` - after dragging editor Alfredo onto the Ember Forge castle,
  "Alfredo Rossi assigned to Ember Forge!" success toast.
- `t1-2-captured-assign-request.json` - the exact PATCH payload:
  `brandRecordId=recBrandEmber`, `editorRecordId=recEditorAlfredo`.

### Smoke floor (non-T1 display)
- `smoke-scorecard-grid.png` - Scorecard KPI grid rendered from mocked Teable; subtitle "Feb 2026"
  confirms the pinned clock (Feb 15 2026, ISO week 7).
- `smoke-brands-castles.png` - Brands/Kingdoms tab: 4 castles + editors from the mocked backend.

Both T1 accept tests also exercise the `window.confirm` guard, and the matching cancel tests prove
zero requests fire when the user dismisses the dialog.
