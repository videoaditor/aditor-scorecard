import { test, expect } from '@playwright/test'
import { installMockBackend, gotoPinned } from './fixtures/mockBackend.js'

/**
 * smoke.spec.js - the build + display floor for the read-only dashboard.
 *
 * Since the Brands/Kingdom tab was removed (2026-07), the app has no money/auth/mutation/
 * outbound surface: it is entirely a read-only render of the mocked Teable feed. This spec
 * is therefore the whole gate. It proves the app boots from the BUILT bundle, renders the
 * five department cards off the single mocked boundary, stays free of console/page errors,
 * and encodes the milestone structure (moved CPL/Calls, Tobias's Marketing metrics, the new
 * centered Automation department with green/yellow/red threshold coloring, no Brands tab).
 * It is also where any date/aggregation display bug gets pinned as a regression when found.
 */

// A department card located by its visible name (department names are all distinct).
const deptCard = (page, name) =>
  page.locator('.dept-card').filter({ has: page.locator('.dept-name', { hasText: name }) })

// The metric-name labels rendered inside one department card.
const metricNames = (page, dept) => deptCard(page, dept).locator('.metric-name')

test.describe('smoke - build + display floor', () => {
  test('Scorecard renders the five department cards from mocked Teable', async ({ page }, testInfo) => {
    const consoleErrors = []
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
    const pageErrors = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    const transcript = await installMockBackend(page)
    await gotoPinned(page, '/')

    // Five department cards render, in order, from the mocked Teable feed.
    await expect(page.locator('.dept-card')).toHaveCount(5)
    await expect(page.locator('.dept-name')).toHaveText(
      ['Marketing', 'Sales', 'Customer Success', 'People', 'Automation']
    )

    // Data actually flowed through the mapping: at least one metric cell shows a number.
    const numericValues = await page.locator('.metric-value').filter({ hasText: /\d/ }).count()
    expect(numericValues).toBeGreaterThan(0)

    // Determinism check: the pinned clock (Feb 15 2026) put the default period in Feb 2026.
    await expect(page.locator('.subtitle')).toContainText('Feb 2026')

    // The read went through the mock and nothing leaked past the hard rail.
    expect(transcript.teableFetches).toBeGreaterThan(0)
    expect(transcript.railViolations).toEqual([])

    await testInfo.attach('scorecard', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(pageErrors).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('Brands tab is fully removed', async ({ page }) => {
    const transcript = await installMockBackend(page)
    await gotoPinned(page, '/')

    await expect(page.locator('.dept-card').first()).toBeVisible()
    // No tab navigation, no Brands button, and none of the castle-tab DOM survive.
    await expect(page.locator('.tab-navigation')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Brands' })).toHaveCount(0)
    await expect(page.locator('.castle-card')).toHaveCount(0)
    await expect(page.locator('.castle-grid-container')).toHaveCount(0)
    expect(transcript.railViolations).toEqual([])
  })

  test('CPL + Calls moved to Sales; Marketing shows Tobias metrics + owner', async ({ page }) => {
    await installMockBackend(page)
    await gotoPinned(page, '/')

    // CPL and Calls now live under Sales, not Marketing.
    await expect(metricNames(page, 'Sales')).toContainText(['CPL (Qualified)', 'Calls'])
    await expect(metricNames(page, 'Marketing')).not.toContainText(['CPL (Qualified)'])
    await expect(metricNames(page, 'Marketing')).not.toContainText(['Calls'])

    // Marketing carries Tobias's metrics: followers + the IG-collector metrics (Reach,
    // Hot DMs). Reach replaced the old paid-ads "Impressions" slot (sc "impressions" is a
    // different, n8n-owned field the dashboard no longer reads).
    const mkt = metricNames(page, 'Marketing')
    await expect(mkt).toContainText(['Followers'])
    await expect(mkt).toContainText(['Reach'])
    await expect(mkt).toContainText(['Hot DMs'])
    await expect(mkt).not.toContainText(['Impressions'])

    // Owners: Marketing = Tobias, Automation = Shawn; Baran no longer appears anywhere.
    await expect(deptCard(page, 'Marketing').locator('.dri-name')).toHaveText('Tobias')
    await expect(deptCard(page, 'Automation').locator('.dri-name')).toHaveText('Shawn')
    await expect(deptCard(page, 'Customer Success').locator('.dri-name')).toHaveText('Saskia')
    await expect(page.getByText('Baran')).toHaveCount(0)
  })

  test('Marketing metrics are color-banded (Fix 2) and reach shows k-notation (Fix 3)', async ({ page }) => {
    await installMockBackend(page)
    await gotoPinned(page, '/')

    const mkt = deptCard(page, 'Marketing')
    const row = (name) => mkt.locator('.metric-row').filter({ has: page.locator('.metric-name', { hasText: name }) })

    // Fix 2: reach / hotDms / followers now band like IG Posts (they were `neutral` before),
    // so each shows a threshold-tinted (green/yellow/red) cell rather than plain neutral.
    for (const name of ['Reach', 'Hot DMs', 'Followers']) {
      await expect(row(name).locator('.metric-cell[class*="cell-tint-"]').first()).toBeVisible()
    }

    // Fix 3: large values render in compact k-notation (fixture reach 12000 -> "12.0k").
    await expect(row('Reach').locator('.metric-value', { hasText: /^\d[\d.]*k$/ }).first()).toBeVisible()
  })

  test('Automation department is centered and colors its metrics by threshold', async ({ page }, testInfo) => {
    await installMockBackend(page)
    await gotoPinned(page, '/')

    const auto = deptCard(page, 'Automation')
    await expect(auto).toBeVisible()

    // It is the one centered card (5th, under Customer Success).
    await expect(page.locator('.dept-card.dept-centered')).toHaveCount(1)
    await expect(page.locator('.dept-card.dept-centered .dept-name')).toHaveText('Automation')

    // Its three finalized metrics render.
    await expect(auto.locator('.metric-name')).toContainText(
      ['Turnaround', 'Incident Resolve', 'Error Rate']
    )

    // Threshold coloring is live: the fixture spans green/yellow/red bands, so all three
    // tints appear among the (non-current, non-total) cells of the Automation card.
    await expect(auto.locator('.metric-cell.cell-tint-green').first()).toBeVisible()
    await expect(auto.locator('.metric-cell.cell-tint-yellow').first()).toBeVisible()
    await expect(auto.locator('.metric-cell.cell-tint-red').first()).toBeVisible()

    await testInfo.attach('automation', { body: await auto.screenshot(), contentType: 'image/png' })
  })
})
