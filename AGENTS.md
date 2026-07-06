# aditor-scorecard - agent notes

Project-intrinsic knowledge that should travel with the code: what is safety-critical, how the tests work, and the sharp edges.

`aditor-scorecard` is a client-only Vite + React 19 SPA (plain JSX, no TypeScript).
It is a read-only internal dashboard served at https://score.aditor.ai with a **single view**: the **Scorecard** - a weekly/quarterly KPI grid read directly from Teable in the browser and grouped into five department cards (Marketing, Sales, Customer Success, People, Automation).

> The **Brands/Kingdom** ("castles") tab was **removed in 2026-07** (decided 2026-07-02). It was the only mutating/outbound surface (two `gen.aditor.ai` calls) and is gone: its components (`Castle*`, `Editor*`, `BrandActions`), `editorSprite` util, `castle-grid.css`, and `public/{castles,editors}/` assets were deleted, along with its two specs. The **dashboard** now has **no** money/auth/mutation/outbound surface.

> **Companion collector (2026-07).** A weekly Cloudflare Worker at `collector/` now writes two Instagram marketing metrics (`reach`, `hotDms`) into the Teable weekly row. It is a **separate** wrangler deploy (does not touch the dashboard build) and is the repo's only mutating/outbound surface again, with its own T1 tests. The dashboard itself stays a read-only render of the Teable feed. See **IG metrics collector (`collector/`)** below.

## Test surface

The **dashboard** is entirely a read-only render of the Teable feed, so the SPA itself has **no T1 items** (nothing in the browser touches money movement, auth, data mutation, or outbound sends); its tests are build + smoke only. The **collector** (`collector/`) *does* carry T1 items - it mutates Teable (`reach`/`hotDms` write) and runs the DM-classification path - and has its own hermetic vitest suite (see **IG metrics collector (`collector/`)** below). The dashboard's one external boundary is the Teable read.

- **Teable read** - `dashboard/src/hooks/useScorecard.js` (`GET /api/table/{id}/record`, url built at `:96`). Read-only fetch + pure mapping. Defensive by design: a field absent in Teable maps to `null` (`toNum`) and renders as a neutral placeholder ("—"), never a crash. The bundled read-token is a security note (below), not a test gate.
- **All of `App.jsx`** - pure display + aggregation of already-read data (`filterByMonth`, `aggregateToMonths`, `addTotalColumn`, `getStatus`, `fmt`, ISO-week slotting). Date math is bug-prone but display-only, so it is smoke + "every bug becomes a regression test" (added to `smoke.spec.js` when found), not a mandatory gate.
- **Money display** - `mrr`, `cpl`, `closeRate`, `costPerCall` are numbers rendered from Teable. No payment provider, no money movement, no write. Not sensitive.
- No email / Slack / CRM / SMS / webhook-send exists at runtime anywhere in the repo. (Slack is called **only at build time** to bake owner avatars - see below.)

### Department + metric structure (`App.jsx`)

- `METRICS` (key → `{name, icon, unit, dir, green, yellow, agg, desc, neutral?}`), `DRI` (dept id → owner `{name, initials, color, img}`), `DEPARTMENTS` (ordered list; the 5th, Automation, carries `centered: true`).
- Owners: Marketing = **Tobias**, Sales = **Alan**, Customer Success = **Saskia**, People = **Tim**, Automation = **Shawn**.
- **Automation** is the 5th card, rendered centered on its own row under Customer Success via `.dept-card.dept-centered` (spans the 2-col grid, `justify-self: center`, one-column-wide; full-width at ≤1000px). Its 3 metrics have finalized green/yellow/red thresholds (all `dir:'lower'`): turnaround ≤3 / ≤6 days, incident-resolve ≤12 / ≤24 h, error-rate ≤1 / ≤3 per week.
- **Neutral metrics.** Tobias's 3 Marketing metrics (`followers`, `reach`, `hotDms`) are flagged `neutral: true` and get **no** color banding (thresholds still TBD from the captain). `getStatus` short-circuits `m.neutral` → `'neutral'`, so they render dim/grey and are excluded from the health-summary counts. `posts` (IG Posts) keeps its own thresholds. `reach` + `hotDms` are fed by the `collector/` Worker; `reach` is the Marketing slot that used to read the paid-ads `impressions` field (rewired 2026-07 - see below).

### Teable schema fields status (2026-07)

Field state on the Scorecard table `tbl7295480347s6oVaI` (base `bsedpj9rQtsQFsPC3xm` "Aditor Scorecard", Teable Cloud). Fields absent on the table render defensively as empty/neutral (`toNum` → `null` → "—"), never a crash.

| dashboard key | Teable field | status | fed by |
| --- | --- | --- | --- |
| `reach` | `reach` (number) | **added 2026-07** via create-field API | `collector/` Worker - organic IG reach |
| `hotDms` | `hotDms` (number) | already existed (was empty) | `collector/` Worker - classified hot-DM count |
| (none) | `impressions` (number) | **exists, owned by the disabled paid-ads "Scorecard - Marketing" n8n workflow** (paid-ad impressions - a different metric) | left untouched; the dashboard no longer reads it |
| `autoTurnaround` / `autoIncident` / `autoErrorRate` | `turnaround` / `incidentResolution` / `automationErrors` | **name mismatch / unwired**: the dashboard reads `auto*` keys that don't exist on the table, so Automation renders empty/neutral. Pre-existing; out of scope for wire-ig-metrics (follow-up) | CF-worker automation pipeline (not yet feeding) |

**`reach` ≠ `impressions` is a hard rule.** Never write organic reach into `impressions`, and never let the collector touch `impressions` / `followers` / `followersCount` - the n8n workflows own those. The schema write used **`TEABLE_CLOUD_GENERAL_ACCESS`** (in `~/work/clients/aditor/.env`, full `field|create` + `record|update` scope); the older note about a missing `ADITOR_TEABLE_CLOUD_TOKEN` is obsolete.

## Owner avatars (build-time Slack fetch)

Department owner avatars live at `dashboard/public/avatars/*.jpg` and are **Slack profile images fetched once at build time and committed** - the dashboard is a static build, not a runtime Slack caller. Shawn (handle `shawo580`) and Tobias (`tobias.goss98`) were resolved via Slack `users.list` using `SLACK_ADITOR_BOT_TOKEN` (`~/work/clients/aditor/.env`) and their `image_512` PNGs converted to JPG with macOS `sips`. `DRI` in `App.jsx` points each dept at its owner's `./avatars/<name>.jpg`. To refresh an avatar or add an owner: re-fetch from Slack, `sips` to `.jpg`, overwrite the file, update `DRI`.

## IG metrics collector (`collector/`)

A weekly Cloudflare Worker that collects two Instagram marketing metrics and upserts them into the Scorecard Teable weekly row.
It is co-located with the dashboard but is a **separate wrangler deploy** with its own tests; the dashboard's static-site build is unaffected.

**What it writes (and only this):**
- `reach` - organic IG reach for the target week (insights `reach` metric via `graph.instagram.com`, token `INSTAGRAM_ADITOR_TOKEN`). Meta **deprecated `impressions`** - the collector requests `reach` only. Weekly value = sum of daily `reach` across the Mon-Sun window.
- `hotDms` - count of inbound DMs classified **HOT** (about ads / booking a call / pricing) by Claude Haiku (`claude-haiku-4-5-20251001`, key `ANTHROPIC_API_KEY_ADITOR`). Only the integer count is stored.
- It does **not** write `followers` (the n8n "Fetch Meta Metrics" workflow owns it), nor `impressions`/`followersCount` (n8n-owned). `reach` ≠ `impressions` - see the schema table above.

**PRIVACY (hard rule):** DM message text is passed **only** to the classifier. It is never logged, never written to Teable, and never returned past the collector - only the resulting hot count leaves the DM path. Tests use synthetic DM text tagged `SYNTH_DM_TEXT` and assert it never appears in a Teable body or a log line.

**Real-IG-API sharp edges (learned live 2026-07, verified against the aditor.ai account):**
- **Reach** works as `GET /{ig-user-id}/insights?metric=reach&period=day&since=&until=` on `graph.instagram.com/v21.0`; the 7 daily values are summed. `/me?fields=user_id,username` resolves the id.
- **DMs use a TWO-STEP read.** A single inline `messages{message,from,created_time}` expansion on `/me/conversations` returns **HTTP 500 "please reduce the amount of data you're asking for" (code 1)**. Instead: (1) page `/me/conversations?fields=id,updated_time`, skip conversations whose `updated_time` is Berlin-before `weekStart`, then (2) page each remaining conversation's `/{conversation-id}/messages?fields=message,from,created_time`. The messages edge returns **newest-first**, so paging stops once a page reaches before the window. `from.id === self.id` = our own reply (excluded).
- **Resilience matters:** one run makes 150+ sequential calls over a couple of minutes; a single transient `fetch failed` / 429 / 5xx must not null a whole metric. `collector/src/http.js` `fetchRetry` retries those with backoff (tuned by `RETRY_ATTEMPTS`/`RETRY_BASE_MS`; tests set `RETRY_BASE_MS=1`). This was a real backfill bug - one blip nulled `hotDms` - now a regression test (`test/http.test.js`).

**Cadence + row keying (replicates n8n exactly - read live 2026-07):**
- The n8n metric workflows fire **Monday, Europe/Berlin**: "Fetch Meta Metrics" (`aomXWOJ207RHqC0R`) at 03:50 creates the row with `start`/`end`; "Compute Derived Metrics" (`dfpARlX7YO5kX9gf`) at 04:10 stamps `week` = `"KW"+zero-padded ISO week` and the derived ratios.
- Both target the **previous completed week** (`lastMonday = thisMonday - 7d`, `lastSunday = +6d`) and key the row by its `start` date converted to **Berlin-local** (`toLocaleDateString('sv-SE', Europe/Berlin)`).
- `collector/src/week.js` recomputes the identical `weekStart`/`weekEnd`/`week` from a single `now`; `findWeekRow` (teable.js) matches by `start`-date first, then falls back to the `week` string. The upsert PATCHes the matched row and only creates a row if none exists (defensive - the row normally already exists).
- **Worker cron: `0 5 * * 1` (Monday 05:00 UTC).** CF cron is UTC-only. Berlin is UTC+2 (summer) / UTC+1 (winter), so 05:00 UTC = 07:00 (summer) / 06:00 (winter) Berlin - always **after** the n8n 03:50/04:10 fetchers in **both** DST states, so the row exists when we upsert. If you ever change the cron, keep this "after n8n in both DST states" invariant.

**T1 map (`collector/`):** the two T1 surfaces are (1) the **Teable data-mutation write** (`upsertWeekMetrics`) and (2) the **DM-classification path** (`fetchInboundMessages` → `classifyHot`). Tests are hermetic vitest (`collector/test/`): IG, Anthropic, and Teable are all faked at the `globalThis.fetch` boundary by `test/helpers/mockFetch.js`, which **records + aborts any request to a non-allowlisted host** (allowlist: `graph.instagram.com`, `api.anthropic.com`, `app.teable.ai`) - every test asserts `railViolations` is empty. `now` is injected (never wall-clock). Fixtures are reverse-engineered from the consumer code, never a live call. Turn every collector bug into a regression test here.

**Deploy (push-to-deploy CI/CD):** `.github/workflows/deploy.yml` runs `npx wrangler deploy` from `collector/` on pushes to `master` that touch `collector/**` (or via `workflow_dispatch`). Auth = repo **secret** `CLOUDFLARE_API_TOKEN` (a least-privilege Workers-deploy token) + repo **variable** `CLOUDFLARE_ACCOUNT_ID`. The workflow deploys the **script + cron trigger only**. The Worker's **runtime secrets** (`INSTAGRAM_ADITOR_TOKEN`, `ANTHROPIC_API_KEY_ADITOR`, `TEABLE_CLOUD_GENERAL_ACCESS`) are set **on the Worker** via `wrangler secret put`, **never** in GitHub - per the credential registry, credential roots stay off GH. Non-secret config is in `collector/wrangler.jsonc` `vars`.

## Tests

E2E-first and hermetic. `.no-mistakes.yaml` `commands.test` runs **two** suites: the **collector** vitest suite first (fast, Node; IG/Teable/Anthropic faked at the fetch boundary - see **IG metrics collector** above) then the **dashboard** Playwright suite (Chromium sessions driving the **built** SPA served by `vite preview` at `http://localhost:4173`, the same bundle a real user loads).

Run the full gate suite (exactly what `.no-mistakes.yaml` `commands.test` runs):
```
(cd collector && npm ci && npm test) && (cd dashboard && npm ci && npx playwright install chromium && npm run build -- --mode test && npm run test:e2e)
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
- **Two independent deploys.** The dashboard (static SPA) publishes to the `gh-pages` branch via `npm run deploy` from `dashboard/`. The `collector/` Worker deploys via `.github/workflows/deploy.yml` (`wrangler deploy` on `master` pushes that touch `collector/**`). They live in one repo but never touch each other's pipeline.
- **`npm run lint` is currently broken and deliberately excluded from the baseline.** There is no `eslint.config.js` and ESLint 9 requires one (`eslint-plugin-react-hooks` / `eslint-plugin-react-refresh` are already in devDeps; a flat config was intended but is missing). Lint is not in `commands.test`. There is no TypeScript, so "typecheck" is the Vite build. Adding the flat config is optional cleanup, not gate-blocking.
- **Security note (not a test gate).** `VITE_TEABLE_TOKEN` is inlined into the client bundle (`useScorecard.js:3-4`, sent as Bearer at `:93`) and shipped to the public `score.aditor.ai`, so anyone can read it from the JS. No frontend test can cover this. If that token has write scope it is a live data-mutation risk; the team should confirm it is read-scoped and/or move the Teable read behind the backend.
