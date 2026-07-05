import { test, expect } from '@playwright/test'
import { installMockBackend, gotoPinned } from './fixtures/mockBackend.js'

/**
 * smoke.spec.js - the build+smoke floor for the non-T1 display surface (report section 4, Test C).
 * Not gate-blocking behavior itself, but this is where the app is proven to boot from the built
 * bundle, render both tabs off the mocked boundaries, and stay free of console/page errors.
 * It is also where any §2 date/aggregation display bug gets pinned as a regression when found.
 */
test.describe('smoke - build + display floor (non-T1)', () => {
  test('Scorecard tab renders the KPI grid from mocked Teable', async ({ page }, testInfo) => {
    const consoleErrors = []
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
    const pageErrors = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    const transcript = await installMockBackend(page)
    await gotoPinned(page, '/')

    // Default tab is Scorecard: the four department cards render from the mocked Teable feed.
    await expect(page.locator('.dept-card')).toHaveCount(4)
    await expect(page.locator('.dept-name')).toHaveText(['Marketing', 'Sales', 'Customer Success', 'People'])

    // Data actually flowed through the mapping: at least one metric cell shows a numeric value.
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

  test('Brands tab renders castles + health summary from mocked backend', async ({ page }, testInfo) => {
    const consoleErrors = []
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
    const pageErrors = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    const transcript = await installMockBackend(page)
    await gotoPinned(page, '/')

    await page.getByRole('button', { name: 'Brands' }).click()

    // All four fixture brands render as castles; the health summary bar is present.
    await expect(page.locator('.castle-card')).toHaveCount(4)
    await expect(page.locator('.brand-summary-bar')).toBeVisible()
    await expect(page.locator('.castle-card').filter({ hasText: 'Ember Forge' })).toBeVisible()

    expect(transcript.healthFetches).toBeGreaterThan(0)
    expect(transcript.editorsFetches).toBeGreaterThan(0)
    expect(transcript.railViolations).toEqual([])

    await testInfo.attach('brands', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(pageErrors).toEqual([])
    expect(consoleErrors).toEqual([])
  })
})
