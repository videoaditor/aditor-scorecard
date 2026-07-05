# aditor-scorecard - agent notes

Project-intrinsic knowledge that should travel with the code: what is safety-critical, how the tests work, and the sharp edges.

`aditor-scorecard` is a client-only Vite + React 19 SPA (plain JSX, no TypeScript).
It is a read-mostly internal dashboard served at https://score.aditor.ai with two tabs: **Scorecard** (weekly/quarterly KPI grid read directly from Teable in the browser) and **Brands/Kingdom** (a gamified "castles" view fed by the `gen.aditor.ai` backend, which holds the only mutating interactions).

## Test surface map (T1)

T1 = touches money, auth, data mutation, or outbound sends.
In this repo the entire money/auth/mutation surface lives in the **Brands/Kingdom tab** and consists of exactly **two** browser->backend calls.
Everything else is read-only display and is build + smoke only.

### T1 items (gate-blocking - must have a passing test)

**T1-1 - POST `/action` (outbound trigger).** `dashboard/src/components/BrandActions.jsx:118-127`
- URL `` `${API_URL}/action` `` where `API_URL = 'https://gen.aditor.ai/api/brand-health'` (`BrandActions.jsx:3`).
- Method `POST`, body `{ action, brand: brand.name, brandBoard: brand.boardId, params }`.
- Triggered by the action buttons (`BrandActions.jsx:5-49`): `push_propaganda` (writes new ad scripts), `declare_war` (rallies/assigns editors), `breed_winners` (forge iterations). These fan out to real downstream work on the backend -> outbound send.
- Guarded by a `window.confirm(...)` (`BrandActions.jsx:110-113`); both the confirm and cancel branches are part of the T1 behavior and are tested.
- `coming_soon` is permanently locked (`isLocked: () => true`) and cannot fire.
- Test: `dashboard/tests/action-trigger.spec.js`.

**T1-2 - PATCH `/assign-editor` (data mutation).** `dashboard/src/components/CastleGrid.jsx:109-116`
- URL `` `${API_URL}/assign-editor` `` (`CastleGrid.jsx:9`).
- Method `PATCH`, body `{ brandRecordId: brandRecordIds[brand.boardId], editorRecordId: editor.id }`. Writes an editor->brand assignment (a Teable record patch on the backend).
- Reached user-shaped by dragging an editor card onto a castle: `EditorCard` drag source (`EditorCard.jsx:12-30`, sets `dataTransfer` `application/json`) -> `CastleCard` drop handler (`CastleCard.jsx:51-62`) -> `onEditorDrop` -> `CastleGrid.handleEditorDrop` (`CastleGrid.jsx:104-127`).
- Guarded by a `window.confirm(...)` (`CastleGrid.jsx:105-106`); confirm and cancel branches are tested.
- Test: `dashboard/tests/assign-editor.spec.js`.

### Explicitly NOT T1 (build + smoke only - no gate-blocking test)

- **Teable read** - `dashboard/src/hooks/useScorecard.js:86-111` (`GET /api/table/{id}/record`). Read-only fetch + pure mapping. The bundled read-token is a security note (below), not a test gate.
- **Backend reads** - `CastleGrid.jsx:28-56` (`fetchHealth`, GET) and `:58-69` (`fetchEditors`, GET). Read-only.
- **All of `App.jsx`** - pure display + aggregation of already-read data (`filterByMonth`, `filterByQuarter`, `aggregateToMonths`, `addTotalColumn`, `getStatus`, `fmt`, ISO-week slotting `App.jsx:361-408`). Date math is bug-prone but display-only, so it is smoke + "every bug becomes a regression test" (added to `smoke.spec.js` when found), not a mandatory gate.
- **`CastleCard.jsx:7-31`** - `localStorage` "extinguish brand until midnight". Local-only state, no network. Not T1.
- **Money display** - `mrr`, `cpl`, `closeRate`, `costPerCall` (`App.jsx:6-22`) are numbers rendered from Teable. No payment provider, no money movement, no write. NOT T1.
- No email / Slack / CRM / SMS / webhook-send exists anywhere in the repo (verified by grep; only the five fetch sites above exist).

## Tests

E2E-first and hermetic: the primary tests are Playwright (Chromium) browser sessions driving the **built** SPA served by `vite preview` at `http://localhost:4173` (the same bundle a real user loads).

Run the full gate suite (exactly what `.no-mistakes.yaml` `commands.test` runs):
```
cd dashboard && npm ci && npx playwright install chromium && npm run build -- --mode test && npm run test:e2e
```
Iterate locally after deps + browser are installed:
```
cd dashboard && npm run build -- --mode test && npm run test:e2e
```
`npm run build -- --mode test` is required before `npm run test:e2e`: `vite preview` serves whatever is in `dist/`, and `--mode test` bakes in `dashboard/.env.test`.

Layout:
- Specs: `dashboard/tests/{action-trigger,assign-editor,smoke}.spec.js`.
- Harness + fixtures: `dashboard/tests/fixtures/mockBackend.js` and seeded `*.json` (`teable-records.json`, `brand-health.json`, `editors.json`).
- Config: `dashboard/playwright.config.js`, non-secret env in `dashboard/.env.test`.

Binding rules for any new test:
- **HARD RAIL - tests NEVER touch production.** `installMockBackend(page)` fakes all five boundaries and registers a catch-all that aborts and records any request to a non-localhost host that is not one of those five. Every test asserts `transcript.railViolations` is empty. The suite physically cannot reach real Teable or real `gen.aditor.ai`. `.env.test` points Teable at a dead port (`127.0.0.1:9`) so a missed mock fails closed instead of hitting prod. Third-party static assets (Google Fonts) are faked with empty stubs to stay hermetic, not whitelisted to the real host.
- **Pin the clock.** Navigate via `gotoPinned(page)`, which runs `page.clock.install({ time: '2026-02-15T12:00:00+01:00' })` before `page.goto`; the config pins `timezoneId: 'Europe/Berlin'`. Fixtures are aligned to Feb 2026 (current ISO week 7). This is mandatory: `App.jsx` / `useScorecard.js` / `CastleCard.jsx` read wall-clock in many places (current-week highlight, month/quarter defaults, the 5-min refresh interval, midnight expiry).
- **Fixtures are reverse-engineered from consumer code, never from a live call.** Do not call the real Teable or `gen.aditor.ai` even once to "discover" a shape.
- **T1 scope only.** Gate-blocking tests exist for T1-1 and T1-2; everything else is the smoke floor.

Evidence artifacts (produced by every run): Playwright HTML report (`dashboard/playwright-report/`), traces + screenshots + failure videos (`dashboard/test-results/`), and the captured T1 request transcripts `dashboard/test-results/action-request.json` and `assign-request.json` (they prove the exact outbound payload the app would have sent, without sending it).

## Known facts / sharp edges

- **Default branch is `master`.** This repo ships straight to `master` through the no-mistakes gate with **no pull request**, so the test suite is the only reviewer.
- **The repo root is a committed build artifact.** `dashboard/` is the source of truth (the Vite project). The repo root (`index.html`, `assets/`, `avatars/`, `castles/`, `editors/`, `CNAME` = `score.aditor.ai`) is a committed built copy of the SPA, deployed to GitHub Pages via the `gh-pages` branch (`npm run deploy` from `dashboard/`). The committed root artifact and the gh-pages deploy are **out of test scope**; tests target `dashboard/`. Do not test or hand-edit the pre-built root bundle.
- **`npm run lint` is currently broken and deliberately excluded from the baseline.** There is no `eslint.config.js` and ESLint 9 requires one (`eslint-plugin-react-hooks` / `eslint-plugin-react-refresh` are already in devDeps; a flat config was intended but is missing). Lint is not in `commands.test`. There is no TypeScript, so "typecheck" is the Vite build. Adding the flat config is optional cleanup, not gate-blocking.
- **Security note (not a test gate).** `VITE_TEABLE_TOKEN` is inlined into the client bundle (`useScorecard.js:3-4`, sent as Bearer at `:93`) and shipped to the public `score.aditor.ai`, so anyone can read it from the JS. No frontend test can cover this. If that token has write scope it is a live data-mutation risk; the team should confirm it is read-scoped and/or move the Teable read behind the backend.
