# aditor-scorecard - agent notes

Project-intrinsic knowledge that should travel with the code: what is safety-critical, how the tests work, and the sharp edges.

`aditor-scorecard` is a client-only Vite + React 19 SPA (plain JSX, no TypeScript).
It is a read-only internal dashboard served at https://score.aditor.ai with a **single view**: the **Scorecard** - a weekly/quarterly KPI grid read directly from Teable in the browser and grouped into five department cards (Marketing, Sales, Customer Success, People, Automation).

> The **Brands/Kingdom** ("castles") tab was **removed in 2026-07** (decided 2026-07-02). It was the only mutating/outbound surface (two `gen.aditor.ai` calls) and is gone: its components (`Castle*`, `Editor*`, `BrandActions`), `editorSprite` util, `castle-grid.css`, and `public/{castles,editors}/` assets were deleted, along with its two specs. The **dashboard** now has **no** money/auth/mutation/outbound surface.

> **IG metrics collector removed (2026-07-07).** A weekly Cloudflare Worker at `collector/` used to write two Instagram marketing metrics (`reach`, `hotDms`) into the Teable weekly row. It was **decommissioned on 2026-07-07**: its `collector/` code and its CI deploy (`.github/workflows/deploy.yml`) were deleted from this repo (recoverable from git history), and the deployed Worker was torn down separately. IG metric collection is being **rebuilt as n8n workflows** outside this repo. The dashboard is **unchanged** - it still renders `reach`/`hotDms` (and every other row) read-only from the Teable feed; only the writer of those two fields moved out. With the collector gone the repo again has **no** money/auth/mutation/outbound surface.

## Product vocabulary (hard rule)

Internal orchestration / agent-supervision vocabulary must **never** appear anywhere in this repo's product surface - UI text, tooltips, code, comments, strings, test fixtures, docs, or commit messages. Those are internal-tooling role/process terms with no place in the Aditor product, and they leak when used. Use plain product-domain wording instead (e.g. "owner", "requester", "the team", "thresholds set"). This covers the dashboard and every committed artifact. When in doubt, describe the *function*, not the internal process that produced it.

## Test surface

The **dashboard** is entirely a read-only render of the Teable feed, so the SPA itself has **no T1 items** (nothing in the browser touches money movement, auth, data mutation, or outbound sends); its tests are build + smoke only. With the `collector/` Worker removed (2026-07-07), the repo no longer has any mutating/outbound surface or T1 items at all. The dashboard's one external boundary is the Teable read.

- **Teable read** - `dashboard/src/hooks/useScorecard.js` (`GET /api/table/{id}/record`, url built at `:96`). Read-only fetch + pure mapping. Defensive by design: a field absent in Teable maps to `null` (`toNum`) and renders as a neutral placeholder ("—"), never a crash. The bundled read-token is a security note (below), not a test gate.
- **All of `App.jsx`** - pure display + aggregation of already-read data (`filterByMonth`, `aggregateToMonths`, `addTotalColumn`, `getStatus`, `fmt`, ISO-week slotting). Date math is bug-prone but display-only, so it is smoke + "every bug becomes a regression test" (added to `smoke.spec.js` when found), not a mandatory gate.
- **Money display** - `mrr`, `cpl`, `closeRate`, `costPerCall` are numbers rendered from Teable. No payment provider, no money movement, no write. Not sensitive.
- No email / Slack / CRM / SMS / webhook-send exists at runtime anywhere in the repo. (Slack is called **only at build time** to bake owner avatars - see below.)

### Department + metric structure (`App.jsx`)

- `METRICS` (key → `{name, icon, unit, dir, green, yellow, agg, desc, neutral?}`), `DRI` (dept id → owner `{name, initials, color, img}`), `DEPARTMENTS` (ordered list; the 5th, Automation, carries `centered: true`).
- Owners: Marketing = **Tobias**, Sales = **Alan**, Customer Success = **Saskia**, People = **Tim**, Automation = **Shawn**.
- **Automation** is the 5th card, rendered centered on its own row under Customer Success via `.dept-card.dept-centered` (spans the 2-col grid, `justify-self: center`, one-column-wide; full-width at ≤1000px). Its rows (renamed/reordered 2026-07) are **Requests Done** (`automationRequests` - a done/incoming completion ratio, `frac`, colored by percent: 100% green / 50-99% yellow / <50% red), then 3 `dir:'lower'` threshold rows: **Turnaround Time** ≤3 / ≤6 days, **Critical Errors** ≤1 / ≤3 per week, **Resolve Time** ≤12 / ≤24 h.
- **Marketing metric banding (thresholds set 2026-07).** Tobias's 3 Marketing metrics are color-banded like IG Posts (they were `neutral` until thresholds were set): `reach` green ≥100k / yellow 50-100k / red <50k; `hotDms` green ≥10 / yellow 5-9 / red <5; `followers` (weekly net gain) green ≥100 / yellow 50-99 / red <50 - all `dir:'higher'`. **These are set intentionally; do not auto-adjust.** `reach` + `hotDms` are populated in Teable by the IG metrics feed (the `collector/` Worker until it was removed 2026-07-07; being rebuilt as n8n workflows) - the dashboard just renders whatever is in Teable. `reach` is the Marketing slot that used to read the paid-ads `impressions` field (rewired 2026-07). Values display in **k-notation** (`kfmt`: ≥1000 → `31.5k`, using the true value). Sum-metric TOTAL thresholds scale by the weeks that actually have data for that metric (so a just-started metric's single real week doesn't mis-band the total).

### Teable schema fields status (2026-07)

Field state on the Scorecard table `tbl7295480347s6oVaI` (base `bsedpj9rQtsQFsPC3xm` "Aditor Scorecard", Teable Cloud). Fields absent on the table render defensively as empty/neutral (`toNum` → `null` → "—"), never a crash.

| dashboard key | Teable field | status | fed by |
| --- | --- | --- | --- |
| `reach` | `reach` (number) | **added 2026-07** via create-field API | organic IG reach - IG metrics feed (was `collector/` Worker until 2026-07-07; being rebuilt in n8n) |
| `hotDms` | `hotDms` (number) | already existed (was empty) | classified hot-DM count - IG metrics feed (was `collector/` Worker until 2026-07-07; being rebuilt in n8n) |
| (none) | `impressions` (number) | **exists, owned by the disabled paid-ads "Scorecard - Marketing" n8n workflow** (paid-ad impressions - a different metric) | left untouched; the dashboard no longer reads it |
| `autoTurnaround` / `autoIncident` / `autoErrorRate` | `turnaround` / `incidentResolution` / `automationErrors` | **wired 2026-07** via `RENAMED_FIELDS` (`useScorecard.js`): the dashboard maps the real Teable fields → the `auto*` display keys, so Automation renders whatever is in Teable (dash for empty/null). Write KW27 automation values to `turnaround` / `incidentResolution` / `automationErrors`. | automation pipeline (CF worker) |
| `automationRequests` + `automationRequestsDone` | `automationRequests` (incoming) + `automationRequestsDone` (done) | **added 2026-07** - the "Requests Done" row renders a done/incoming ratio (derived in `postProcess`, `frac` metric), colored by completion % | automation pipeline (meetings + Slack) |

**`reach` ≠ `impressions` is a hard rule.** Never write organic reach into `impressions`, and never let the IG metrics feed touch `impressions` / `followers` / `followersCount` - the n8n workflows own those. The schema write used **`TEABLE_CLOUD_GENERAL_ACCESS`** (in `~/work/clients/aditor/.env`, full `field|create` + `record|update` scope); the older note about a missing `ADITOR_TEABLE_CLOUD_TOKEN` is obsolete.

### Automation metrics - corrected definitions (2026-07-06)

The Automation rows (2026-07) are **Requests Done, Turnaround Time, Critical Errors, Resolve Time** - all data-driven from Teable (dash for null). Weekly values change; render whatever is in Teable, **never fabricate**. Definitions:

- **Requests Done** (Teable `automationRequests` incoming + `automationRequestsDone` done → a `frac` done/incoming ratio, colored by completion %): automation/feature requests completed vs incoming for the week (requests come from meetings + Slack).
- **Incidents / week** (→ the count cell: Teable `automationErrors` → `autoErrorRate` "Error Rate"): count of **deduped incidents** entering the incident pipeline that week across THREE sources - n8n **cloud** (deduped), n8n **server** (self-hosted `n8n.aditor.ai`, deduped), and **Slack**-reported incidents, warnings excluded. NOT raw n8n workflow error executions. (The earlier `34` was n8n-cloud-only and wrong; recomputed to `5` for KW27.)
- **Automation requests + Turnaround** (→ Teable `turnaround` → `autoTurnaround` "Turnaround"): the automation-request pipeline pushes tasks to the kanban board; requests come from **meetings + Slack**. Backfill source: the automation Slack bot **DMs the requester** their tasks after each meeting - pull last week's from those DMs (or from the worker / kanban). Turnaround = request timing (received → delivered); if delivery timing is unavailable, populate the request COUNT and flag Turnaround.
- **Incident Resolve** (Teable `incidentResolution` → `autoIncident`): resolution TIME - **not** one of the two corrected metrics; no backfill source defined yet, so it stays dashed.
- **Access blockers to clear first:** self-hosted `n8n.aditor.ai` history API (unauthorized/blocked), and Slack read access for incident messages + the bot DMs.
- The dashboard `desc`/thresholds for these rows still encode the OLD definitions (e.g. "Error Rate" = "unblocked n8n errors, green ≤1"); revisit them when the corrected metrics are wired and real ranges are known.

## Owner avatars (build-time Slack fetch)

Department owner avatars live at `dashboard/public/avatars/*.jpg` and are **Slack profile images fetched once at build time and committed** - the dashboard is a static build, not a runtime Slack caller. Shawn (handle `shawo580`) and Tobias (`tobias.goss98`) were resolved via Slack `users.list` using `SLACK_ADITOR_BOT_TOKEN` (`~/work/clients/aditor/.env`) and their `image_512` PNGs converted to JPG with macOS `sips`. `DRI` in `App.jsx` points each dept at its owner's `./avatars/<name>.jpg`. To refresh an avatar or add an owner: re-fetch from Slack, `sips` to `.jpg`, overwrite the file, update `DRI`.

## IG metrics collector - removed 2026-07-07

The weekly Cloudflare Worker at `collector/` that wrote `reach`/`hotDms` into the Scorecard Teable weekly row was **decommissioned on 2026-07-07** and deleted from this repo, together with its CI deploy (`.github/workflows/deploy.yml`). IG metric collection is being **rebuilt as n8n workflows** outside this repo; the deployed Worker was torn down separately.

- The full collector implementation (IG reach + hot-DM classification, its two-step DM read and retry logic, the weekly cadence/row-keying, and its hermetic vitest T1 suite) and the deploy workflow are **recoverable from git history** - they were last present at the commit immediately before this removal.
- The dashboard is **unchanged**: it still renders `reach`/`hotDms` read-only from Teable (see the schema table above). Only the writer of those two fields moved out; the `reach` ≠ `impressions` hard rule still stands for whatever repopulates them next.
- With the collector gone, `.github/` no longer exists in this repo and **no CI workflow can redeploy the Worker**. The dashboard's gh-pages publish (`npm run deploy` from `dashboard/`) is a separate, out-of-band path and is unaffected.

## Tests

E2E-first and hermetic. `.no-mistakes.yaml` `commands.test` runs the **dashboard** Playwright suite (Chromium sessions driving the **built** SPA served by `vite preview` at `http://localhost:4173`, the same bundle a real user loads). Before 2026-07-07 it also ran the `collector/` vitest suite first; that suite was removed with the collector, so the dashboard Playwright run is now the whole gate.

Run the full gate suite (exactly what `.no-mistakes.yaml` `commands.test` runs):
```
(cd dashboard && npm ci && npx playwright install chromium && npm run build -- --mode test && npm run test:e2e)
```
Iterate locally after deps + browser are installed:
```
cd dashboard && npm run build -- --mode test && npm run test:e2e
```
`npm run build -- --mode test` is required before `npm run test:e2e`: `vite preview` serves whatever is in `dist/`, and `--mode test` bakes in `dashboard/.env.test`.

Layout:
- Spec: `dashboard/tests/smoke.spec.js` - the whole gate (build + display floor): five department cards render, Brands tab is gone, CPL/Calls sit under Sales, Marketing shows Tobias's metrics + owner (now color-banded, with large values like `reach` in k-notation), and the centered Automation card renders its neutral Requests row plus colors its threshold metrics.
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
- **Dashboard deploy (the only deploy).** The dashboard (static SPA) publishes to the `gh-pages` branch via `npm run deploy` from `dashboard/` - push-button/out-of-band, not a GitHub Actions workflow. The `collector/` Worker's CI deploy (`.github/workflows/deploy.yml`) was **removed 2026-07-07** with the collector, so `.github/` no longer exists and no workflow can redeploy the Worker; the dashboard's gh-pages path is untouched by that removal.
- **`npm run lint` is currently broken and deliberately excluded from the baseline.** There is no `eslint.config.js` and ESLint 9 requires one (`eslint-plugin-react-hooks` / `eslint-plugin-react-refresh` are already in devDeps; a flat config was intended but is missing). Lint is not in `commands.test`. There is no TypeScript, so "typecheck" is the Vite build. Adding the flat config is optional cleanup, not gate-blocking.
- **Security note (not a test gate).** `VITE_TEABLE_TOKEN` is inlined into the client bundle (`useScorecard.js:3-4`, sent as Bearer at `:93`) and shipped to the public `score.aditor.ai`, so anyone can read it from the JS. No frontend test can cover this. If that token has write scope it is a live data-mutation risk; the team should confirm it is read-scoped and/or move the Teable read behind the backend.
