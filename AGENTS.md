# aditor-scorecard - agent notes

Project-intrinsic knowledge that should travel with the code: what is safety-critical, how the tests work, and the sharp edges.

`aditor-scorecard` is a client-only Vite + React 19 SPA (plain JSX, no TypeScript).
It is a read-only internal dashboard served at https://score.aditor.ai with a **single view**: the **Scorecard** - a weekly/quarterly KPI grid read directly from Teable in the browser and grouped into five department cards (Marketing, Sales, Customer Success, People, Automation).

> The **Brands/Kingdom** ("castles") tab was **removed in 2026-07** (decided 2026-07-02). It was the only mutating/outbound surface (two `gen.aditor.ai` calls) and is gone: its components (`Castle*`, `Editor*`, `BrandActions`), `editorSprite` util, `castle-grid.css`, and `public/{castles,editors}/` assets were deleted, along with its two specs. The app now has **no** money/auth/mutation/outbound surface.

## Test surface

Since the Brands/Kingdom removal the app is **entirely a read-only render of the Teable feed**, so there are **no T1 items** (nothing touches money movement, auth, data mutation, or outbound sends). Tests are build + smoke only. The one external boundary is the Teable read.

- **Teable read** - `dashboard/src/hooks/useScorecard.js` (`GET /api/table/{id}/record`, url built at `:96`). Read-only fetch + pure mapping. Defensive by design: a field absent in Teable maps to `null` (`toNum`) and renders as a neutral placeholder ("—"), never a crash. The bundled read-token is a security note (below), not a test gate.
- **All of `App.jsx`** - pure display + aggregation of already-read data (`filterByMonth`, `aggregateToMonths`, `addTotalColumn`, `getStatus`, `fmt`, ISO-week slotting). Date math is bug-prone but display-only, so it is smoke + "every bug becomes a regression test" (added to `smoke.spec.js` when found), not a mandatory gate.
- **Money display** - `mrr`, `cpl`, `closeRate`, `costPerCall` are numbers rendered from Teable. No payment provider, no money movement, no write. Not sensitive.
- No email / Slack / CRM / SMS / webhook-send exists at runtime anywhere in the repo. (Slack is called **only at build time** to bake owner avatars - see below.)

### Department + metric structure (`App.jsx`)

- `METRICS` (key → `{name, icon, unit, dir, green, yellow, agg, desc, neutral?}`), `DRI` (dept id → owner `{name, initials, color, img}`), `DEPARTMENTS` (ordered list; the 5th, Automation, carries `centered: true`).
- Owners: Marketing = **Tobias**, Sales = **Alan**, Customer Success = **Saskia**, People = **Tim**, Automation = **Shawn**.
- **Automation** is the 5th card, rendered centered on its own row under Customer Success via `.dept-card.dept-centered` (spans the 2-col grid, `justify-self: center`, one-column-wide; full-width at ≤1000px). Its 3 metrics have finalized green/yellow/red thresholds (all `dir:'lower'`): turnaround ≤3 / ≤6 days, incident-resolve ≤12 / ≤24 h, error-rate ≤1 / ≤3 per week.
- **Neutral metrics.** Tobias's 3 Marketing metrics (`followers`, `impressions`, `hotDmInquiries`) are flagged `neutral: true` and get **no** color banding (thresholds still TBD from the captain). `getStatus` short-circuits `m.neutral` → `'neutral'`, so they render dim/grey and are excluded from the health-summary counts. `posts` (IG Posts) keeps its own thresholds.

### Deferred Teable schema fields (follow-up - must NOT block ship)

Five number fields the new metrics read do **not yet exist** on the Scorecard table `tbl7295480347s6oVaI` (base `bsedpj9rQtsQFsPC3xm` "Aditor Scorecard", Teable Cloud). They render defensively as empty/neutral until added. Adding them via API needs the Teable Cloud write token **`ADITOR_TEABLE_CLOUD_TOKEN`**, which is currently **MISSING** from `~/work/clients/aditor/.env` (so schema-via-API fails auth - do not attempt until it lands). Fields to add (internal key === Teable field name; see `useScorecard.js` `DIRECT_FIELDS`):

| field | type | dept | value source (separate pipeline) |
| --- | --- | --- | --- |
| `impressions` | number | Marketing (Tobias) | Instagram (also pending the Instagram token) |
| `hotDmInquiries` | number | Marketing (Tobias) | Instagram / inbound DMs |
| `autoTurnaround` | number (days) | Automation | CF-worker automation pipeline |
| `autoIncident` | number (hours) | Automation | CF-worker automation pipeline |
| `autoErrorRate` | number (count/week) | Automation | CF-worker automation pipeline |

Until the token lands and the pipelines feed values, these show empty/neutral on the dashboard - **expected and correct** for the meeting's structure-only deliverable.

## Owner avatars (build-time Slack fetch)

Department owner avatars live at `dashboard/public/avatars/*.jpg` and are **Slack profile images fetched once at build time and committed** - the dashboard is a static build, not a runtime Slack caller. Shawn (handle `shawo580`) and Tobias (`tobias.goss98`) were resolved via Slack `users.list` using `SLACK_ADITOR_BOT_TOKEN` (`~/work/clients/aditor/.env`) and their `image_512` PNGs converted to JPG with macOS `sips`. `DRI` in `App.jsx` points each dept at its owner's `./avatars/<name>.jpg`. To refresh an avatar or add an owner: re-fetch from Slack, `sips` to `.jpg`, overwrite the file, update `DRI`.

## Tests

E2E-first and hermetic: the tests are Playwright (Chromium) browser sessions driving the **built** SPA served by `vite preview` at `http://localhost:4173` (the same bundle a real user loads).

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
- Spec: `dashboard/tests/smoke.spec.js` - the whole gate (build + display floor): five department cards render, Brands tab is gone, CPL/Calls sit under Sales, Marketing shows Tobias's metrics + owner, and the centered Automation card colors its metrics by threshold.
- Harness + fixtures: `dashboard/tests/fixtures/mockBackend.js` and seeded `teable-records.json`.
- Config: `dashboard/playwright.config.js`, non-secret env in `dashboard/.env.test`.

Binding rules for any new test:
- **HARD RAIL - tests NEVER touch production.** `installMockBackend(page)` fakes the single Teable boundary and registers a catch-all that aborts and records any request to a non-localhost host. Every test asserts `transcript.railViolations` is empty. `.env.test` points Teable at a dead port (`127.0.0.1:9`) so a missed mock fails closed instead of hitting prod. Third-party static assets (Google Fonts) are faked with empty stubs to stay hermetic, not whitelisted to the real host.
- **Pin the clock.** Navigate via `gotoPinned(page)`, which runs `page.clock.install({ time: '2026-02-15T12:00:00+01:00' })` before `page.goto`; the config pins `timezoneId: 'Europe/Berlin'`. Fixtures are aligned to Feb 2026 (current ISO week 7). This is mandatory: `App.jsx` / `useScorecard.js` read wall-clock in many places (current-week highlight, month/quarter defaults, the 5-min refresh interval).
- **Fixtures are reverse-engineered from consumer code, never from a live call.** Do not call the real Teable even once to "discover" a shape.
- **Exercise new metrics via the fixture.** When adding a metric, seed sample values in `teable-records.json` so the new layout renders under test; for threshold-colored metrics, pick values that span the green/yellow/red bands (the Automation rows do this).

Evidence artifacts (produced by every run): Playwright HTML report (`dashboard/playwright-report/`), traces + screenshots + failure videos (`dashboard/test-results/`).

## Known facts / sharp edges

- **Default branch is `master`.** This repo ships straight to `master` through the no-mistakes gate with **no pull request**, so the test suite is the only reviewer.
- **The repo root is a committed build artifact.** `dashboard/` is the source of truth (the Vite project). The repo root (`index.html`, `assets/`, `avatars/`, `CNAME` = `score.aditor.ai`) is a committed built copy of the SPA, deployed to GitHub Pages via the `gh-pages` branch (`npm run deploy` from `dashboard/`). The committed root artifact and the gh-pages deploy are **out of test scope**; tests target `dashboard/`. Do not test or hand-edit the pre-built root bundle. (The root still contains the now-dead `castles/` + `editors/` dirs from before the Brands removal; they are regenerated/cleared by the next `npm run deploy`, not hand-edited here.)
- **`npm run lint` is currently broken and deliberately excluded from the baseline.** There is no `eslint.config.js` and ESLint 9 requires one (`eslint-plugin-react-hooks` / `eslint-plugin-react-refresh` are already in devDeps; a flat config was intended but is missing). Lint is not in `commands.test`. There is no TypeScript, so "typecheck" is the Vite build. Adding the flat config is optional cleanup, not gate-blocking.
- **Security note (not a test gate).** `VITE_TEABLE_TOKEN` is inlined into the client bundle (`useScorecard.js:3-4`, sent as Bearer at `:93`) and shipped to the public `score.aditor.ai`, so anyone can read it from the JS. No frontend test can cover this. If that token has write scope it is a live data-mutation risk; the team should confirm it is read-scoped and/or move the Teable read behind the backend.
