/**
 * Shared network-boundary fake + HARD RAIL for the aditor-scorecard E2E suite.
 *
 * Since the Brands/Kingdom tab was removed (2026-07), the app talks to exactly ONE
 * external boundary (see AGENTS.md > Test surface):
 *   1. Teable read   GET   {TEABLE_URL}/api/table/{id}/record   (useScorecard.js:96)
 * There is no longer any money/auth/mutation/outbound surface in the app - it is a
 * fully read-only display of the Teable feed.
 *
 * installMockBackend(page) fakes that read at the network layer and installs a
 * catch-all that ABORTS + records any request to a non-localhost host. That is the
 * HARD RAIL: the suite physically cannot reach real Teable or any other real host,
 * so a forgotten mock fails closed instead of hitting production. Every test asserts
 * `transcript.railViolations` is empty.
 */
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadFixture(name) {
  return JSON.parse(readFileSync(join(__dirname, name), 'utf-8'))
}

// Seeded, deterministic fixture (single source of truth for specs' expected values).
export const teableRecords = loadFixture('teable-records.json')

// The Teable read is cross-origin from the localhost app (the .env.test host is a
// different port), so the browser sends a CORS preflight for the Authorization header.
// The real endpoint returns these headers; the fake must too or the fetch is blocked
// before our handler ever sees the request.
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

/**
 * Install the boundary fake + the hard rail on `page`. Call once per test, BEFORE
 * navigation. Returns a live transcript the test asserts against.
 */
export async function installMockBackend(page) {
  const transcript = {
    teableFetches: 0,
    railViolations: [], // {method, url} for any non-localhost request that escaped the mocks
  }

  // (1) HARD RAIL - registered FIRST so it has the LOWEST priority: Playwright checks
  // route handlers in reverse registration order, so the specific mocks below (registered
  // afterwards) win for the real boundaries. This matcher only fires for NON-localhost
  // hosts, so localhost app assets are never intercepted. Anything that reaches here is a
  // leak toward a real external host: record it and abort.
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

  return transcript
}

/** Fixed instant every spec pins page.clock to. Berlin noon, ISO week 7 (Feb 9-15 2026), */
/** which is the "current week" the Feb-2026 Teable fixture is aligned to. */
export const FIXED_TIME = '2026-02-15T12:00:00+01:00'

/**
 * Pin the page clock, then navigate. Pinning BEFORE goto is what makes the app's many
 * wall-clock reads (current-week highlight, month/quarter defaults, the 5-min refresh
 * interval) deterministic. See AGENTS.md > Determinism.
 */
export async function gotoPinned(page, path = '/') {
  await page.clock.install({ time: FIXED_TIME })
  await page.goto(path)
  // Neutralize CSS animation/transition so the UI is deterministic for Playwright and
  // screenshots are crisp. It has no effect on app logic. The rule applies to current and
  // future-rendered nodes.
  await page.addStyleTag({
    content: '*, *::before, *::after { animation: none !important; transition: none !important; }',
  })
}
