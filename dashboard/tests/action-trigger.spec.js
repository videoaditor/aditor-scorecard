import { test, expect } from '@playwright/test'
import { installMockBackend, gotoPinned, brandHealth } from './fixtures/mockBackend.js'

/**
 * T1-1 - POST gen.aditor.ai/api/brand-health/action  (BrandActions.jsx:118-127).
 * The outbound trigger: clicking an action button fans out to real downstream work
 * (ad scripts / editor rallies) on the backend. Gate-blocking.
 *
 * Target: "Ember Forge" (burning). "Push Propaganda" is always unlocked (isLocked: () => false).
 * Expected params come straight from BrandActions.jsx:12-14:
 *   count = max(2, (weeklyTarget || 4) - (metrics.deliveryVsTarget.delivered || 0))
 *         = max(2, 8 - 3) = 5   (fixture: weeklyTarget 8, delivered 3)
 */
const TARGET = brandHealth.brands[0] // Ember Forge, boardId brdBurning001

async function openBrandActions(page) {
  await page.getByRole('button', { name: 'Brands' }).click()
  const card = page.locator('.castle-card').filter({ hasText: TARGET.name })
  await expect(card).toBeVisible()
  // Click the castle image to expand the brand (avoids the extinguish button at the card foot).
  await card.locator('.castle-image').click()
  await expect(page.locator('.brand-actions')).toBeVisible()
}

test.describe('T1-1 POST /action (outbound trigger)', () => {
  test('accept: Push Propaganda sends the exact payload once + shows a success toast', async ({ page }, testInfo) => {
    const transcript = await installMockBackend(page)
    const dialogs = []
    page.on('dialog', (d) => { dialogs.push(d.message()); d.accept() })

    await gotoPinned(page, '/')
    await openBrandActions(page)

    await page.locator('button.action-btn', { hasText: 'Push Propaganda' }).click()

    // The success toast only renders after the mocked POST resolves ok.
    const toast = page.locator('.toast-success')
    await expect(toast).toBeVisible()
    await expect(toast).toContainText('Push Propaganda')
    await expect(toast).toContainText(TARGET.name)

    // Exactly one POST reached the boundary, carrying the exact payload the backend would receive.
    expect(transcript.action).toHaveLength(1)
    expect(transcript.action[0]).toEqual({
      action: 'push_propaganda',
      brand: 'Ember Forge',
      brandBoard: 'brdBurning001',
      params: { count: 5 },
    })

    // The window.confirm guard (BrandActions.jsx:110) fired before the send.
    expect(dialogs).toHaveLength(1)
    expect(dialogs[0]).toContain('Push Propaganda')

    // HARD RAIL: nothing escaped to a real external host.
    expect(transcript.railViolations).toEqual([])

    await testInfo.attach('action-toast', { body: await page.screenshot(), contentType: 'image/png' })
  })

  test('cancel: dismissing the confirm sends zero requests to /action', async ({ page }) => {
    const transcript = await installMockBackend(page)
    const dialogs = []
    page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss() })

    await gotoPinned(page, '/')
    await openBrandActions(page)

    await page.locator('button.action-btn', { hasText: 'Push Propaganda' }).click()

    // The guard ran and the user cancelled (BrandActions.jsx:113 returns before fetch).
    await expect.poll(() => dialogs.length).toBe(1)
    expect(transcript.action).toHaveLength(0)
    await expect(page.locator('.toast-success')).toHaveCount(0)
    expect(transcript.railViolations).toEqual([])
  })
})
