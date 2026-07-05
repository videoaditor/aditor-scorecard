/**
 * Shared network-boundary fake + HARD RAIL for the aditor-scorecard E2E suite.
 *
 * The real app talks to exactly five external boundaries (see AGENTS.md > Test surface):
 *   1. Teable read     GET   {TEABLE_URL}/api/table/{id}/record   (useScorecard.js:91)
 *   2. Backend health  GET   gen.aditor.ai/api/brand-health       (CastleGrid.jsx:28)
 *   3. Backend editors GET   gen.aditor.ai/api/brand-health/editors (CastleGrid.jsx:60)
 *   4. Backend action  POST  gen.aditor.ai/api/brand-health/action  (BrandActions.jsx:118)  [T1-1]
 *   5. Backend assign  PATCH gen.aditor.ai/api/brand-health/assign-editor (CastleGrid.jsx:109) [T1-2]
 *
 * installMockBackend(page) fakes all five at the network layer and installs a
 * catch-all that ABORTS + records any request to a non-localhost host that is not
 * one of those five. That is the HARD RAIL: the suite physically cannot reach real
 * Teable or real gen.aditor.ai, so a forgotten mock fails closed instead of hitting
 * production. Every test asserts `transcript.railViolations` is empty.
 *
 * The two mutating boundaries (action, assign) additionally CAPTURE the exact request
 * body the app would have sent and write it to test-results/*.json as evidence - proving
 * the payload without ever sending it.
 */
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadFixture(name) {
  return JSON.parse(readFileSync(join(__dirname, name), 'utf-8'))
}

// Seeded, deterministic fixtures (single source of truth for specs' expected values).
export const teableRecords = loadFixture('teable-records.json')
export const brandHealth = loadFixture('brand-health.json')
export const editorsPayload = loadFixture('editors.json')

// Backend base host - hardcoded in app source (BrandActions.jsx:3, CastleGrid.jsx:9).
const BACKEND_HOST = 'gen.aditor.ai'

// gen.aditor.ai is cross-origin from the localhost app, so the browser sends CORS
// preflights for the non-simple requests (Teable's Authorization header, the JSON-body
// POST/PATCH). The real backend returns these headers; the fake must too or the fetch
// is blocked before our handler ever sees the real request.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function isLocalhost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify(body),
  })
}

/** Answer a CORS preflight. Returns true if it handled an OPTIONS request. */
async function handledPreflight(route) {
  if (route.request().method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' })
    return true
  }
  return false
}

/** Persist a captured T1 request body as an evidence artifact under test-results/. */
function writeArtifact(filename, data) {
  const dir = join(process.cwd(), 'test-results')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, filename), JSON.stringify(data, null, 2))
}

/**
 * Install all boundary fakes + the hard rail on `page`. Call once per test, BEFORE
 * navigation. Returns a live transcript the test asserts against.
 */
export async function installMockBackend(page) {
  const transcript = {
    teableFetches: 0,
    healthFetches: 0,
    editorsFetches: 0,
    action: [], // postDataJSON of each POST /action (T1-1)
    assign: [], // postDataJSON of each PATCH /assign-editor (T1-2)
    railViolations: [], // {method, url} for any non-localhost request that escaped the mocks
  }

  // (1) HARD RAIL - registered FIRST so it has the LOWEST priority: Playwright checks
  // route handlers in reverse registration order, so the five specific mocks below
  // (registered afterwards) win for the real boundaries. This matcher only fires for
  // NON-localhost hosts, so localhost app assets are never intercepted. Anything that
  // reaches here is a leak toward a real external host: record it and abort.
  await page.route(
    (url) => !isLocalhost(url.hostname),
    (route) => {
      const req = route.request()
      transcript.railViolations.push({ method: req.method(), url: req.url() })
      return route.abort('blockedbyclient')
    }
  )

  // (1b) Benign third-party static assets: Google Fonts (index.html + CSS @imports load
  // fonts.googleapis.com; it would pull fonts.gstatic.com). Registered AFTER the hard rail so
  // it wins: fake both with empty stubs so the suite stays hermetic (no real Google call)
  // without tripping the rail. Purely cosmetic - the app falls back to system fonts.
  await page.route(
    (url) => url.hostname === 'fonts.googleapis.com',
    (route) => route.fulfill({ status: 200, headers: { 'Content-Type': 'text/css', ...CORS_HEADERS }, body: '' })
  )
  await page.route(
    (url) => url.hostname === 'fonts.gstatic.com',
    (route) => route.fulfill({ status: 200, headers: { 'Content-Type': 'font/woff2', ...CORS_HEADERS }, body: '' })
  )

  // (2) Teable read (also serves the dead-port .env.test placeholder host).
  await page.route(
    (url) => url.pathname.includes('/api/table/') && url.pathname.endsWith('/record'),
    async (route) => {
      if (await handledPreflight(route)) return
      transcript.teableFetches += 1
      await fulfillJson(route, teableRecords)
    }
  )

  // (3) Backend health (matches both /api/brand-health and ?refresh=true).
  await page.route(
    (url) => url.hostname === BACKEND_HOST && url.pathname === '/api/brand-health',
    async (route) => {
      if (await handledPreflight(route)) return
      transcript.healthFetches += 1
      await fulfillJson(route, brandHealth)
    }
  )

  // (4) Backend editors.
  await page.route(
    (url) => url.hostname === BACKEND_HOST && url.pathname === '/api/brand-health/editors',
    async (route) => {
      if (await handledPreflight(route)) return
      transcript.editorsFetches += 1
      await fulfillJson(route, editorsPayload)
    }
  )

  // (5) T1-1 - action trigger. Capture the exact outbound payload, then fake success.
  await page.route(
    (url) => url.hostname === BACKEND_HOST && url.pathname === '/api/brand-health/action',
    async (route) => {
      if (await handledPreflight(route)) return
      const req = route.request()
      const body = req.postDataJSON()
      transcript.action.push(body)
      writeArtifact('action-request.json', { method: req.method(), url: req.url(), body })
      await fulfillJson(route, { ok: true })
    }
  )

  // (6) T1-2 - assign-editor. Capture the exact outbound payload, then fake success.
  await page.route(
    (url) => url.hostname === BACKEND_HOST && url.pathname === '/api/brand-health/assign-editor',
    async (route) => {
      if (await handledPreflight(route)) return
      const req = route.request()
      const body = req.postDataJSON()
      transcript.assign.push(body)
      writeArtifact('assign-request.json', { method: req.method(), url: req.url(), body })
      await fulfillJson(route, { ok: true })
    }
  )

  return transcript
}

/** Fixed instant every spec pins page.clock to. Berlin noon, ISO week 7 (Feb 9-15 2026), */
/** which is the "current week" the Feb-2026 Teable fixture is aligned to. */
export const FIXED_TIME = '2026-02-15T12:00:00+01:00'

/**
 * Pin the page clock, then navigate. Pinning BEFORE goto is what makes the app's many
 * wall-clock reads (current-week highlight, month/quarter defaults, the 5-min refresh
 * interval, midnight-expiry) deterministic. See report section 3 > Determinism.
 */
export async function gotoPinned(page, path = '/') {
  await page.clock.install({ time: FIXED_TIME })
  await page.goto(path)
  // Neutralize CSS animation/transition. Several castle states animate infinitely (e.g. the
  // burning-castle `burning-shake` transform loop, castle-grid.css), which keeps the element
  // perpetually "unstable" and un-clickable for Playwright. Disabling animations makes the UI
  // deterministic and screenshots crisp; it has no effect on app logic, and toasts stay visible
  // (their base style is opacity:1). The rule applies to current and future-rendered nodes.
  await page.addStyleTag({
    content: '*, *::before, *::after { animation: none !important; transition: none !important; }',
  })
}
