import { test, expect } from '@playwright/test'
import { installMockBackend, gotoPinned, editorsPayload } from './fixtures/mockBackend.js'

/**
 * T1-2 - PATCH gen.aditor.ai/api/brand-health/assign-editor  (CastleGrid.jsx:109-116).
 * The data mutation: dragging an editor card onto a castle writes an editor->brand
 * assignment (a Teable record patch on the backend). Gate-blocking.
 *
 * Drag "Alfredo Rossi" (recEditorAlfredo) onto "Ember Forge" (brdBurning001).
 * Expected payload (CastleGrid.jsx:112-115):
 *   { brandRecordId: brandRecordIds['brdBurning001'], editorRecordId: 'recEditorAlfredo' }
 *   = { brandRecordId: 'recBrandEmber', editorRecordId: 'recEditorAlfredo' }
 *
 * DnD mechanism (report Risk §2 - the flakiest part of the suite): we use Playwright's
 * locator.dragTo(), the most user-shaped driver. It performs the real mouse drag, which
 * fires EditorCard.handleDragStart (the actual dataTransfer.setData('application/json', ...)
 * serialization) through to CastleCard.handleDrop - so the whole user gesture is exercised,
 * not just the drop. It was verified reliable here (8/8 repeat-each runs, zero flakes) once
 * CSS animations are disabled (gotoPinned) so the editor/castle boxes are stable. If dragTo
 * ever proves flaky on another Chromium, the documented fallback is to dispatch a synthetic
 * `drop` DragEvent carrying a DataTransfer with the editor JSON on the castle locator, which
 * drives CastleCard.handleDrop -> onEditorDrop -> PATCH deterministically.
 */
const EDITOR = editorsPayload.allEditors[0] // Alfredo Rossi
const EDITOR_FIRST = EDITOR.name.split(' ')[0] // editor cards show first name only
const BRAND_NAME = 'Ember Forge'

async function openBrands(page) {
  await page.getByRole('button', { name: 'Brands' }).click()
  await expect(page.locator('.castle-card').filter({ hasText: BRAND_NAME })).toBeVisible()
  await expect(page.locator('.editor-card').filter({ hasText: EDITOR_FIRST })).toBeVisible()
}

async function dragEditorOntoCastle(page, editorFirstName, brandName) {
  const editor = page.locator('.editor-card').filter({ hasText: editorFirstName })
  const castle = page.locator('.castle-card').filter({ hasText: brandName })
  await editor.dragTo(castle)
}

test.describe('T1-2 PATCH /assign-editor (data mutation)', () => {
  test('accept: drop editor on castle sends the exact PATCH once + toast + editors re-fetch', async ({ page }, testInfo) => {
    const transcript = await installMockBackend(page)
    page.on('dialog', (d) => d.accept())

    await gotoPinned(page, '/')
    await openBrands(page)

    const editorsBefore = transcript.editorsFetches
    await dragEditorOntoCastle(page, EDITOR_FIRST, BRAND_NAME)

    // Success toast confirms the mocked PATCH resolved ok (CastleGrid.jsx:122).
    const toast = page.locator('.toast-success')
    await expect(toast).toBeVisible()
    await expect(toast).toContainText('Alfredo Rossi assigned to Ember Forge!')

    // Exactly one PATCH, carrying the exact payload the backend would receive.
    expect(transcript.assign).toHaveLength(1)
    expect(transcript.assign[0]).toEqual({
      brandRecordId: 'recBrandEmber',
      editorRecordId: 'recEditorAlfredo',
    })

    // A follow-up editors re-fetch fired (CastleGrid.jsx:123).
    await expect.poll(() => transcript.editorsFetches).toBe(editorsBefore + 1)

    // HARD RAIL: nothing escaped to a real external host.
    expect(transcript.railViolations).toEqual([])

    await testInfo.attach('assign-toast', { body: await page.screenshot(), contentType: 'image/png' })
  })

  test('cancel: dismissing the confirm sends zero PATCH requests', async ({ page }) => {
    const transcript = await installMockBackend(page)
    const dialogs = []
    page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss() })

    await gotoPinned(page, '/')
    await openBrands(page)

    await dragEditorOntoCastle(page, EDITOR_FIRST, BRAND_NAME)

    // The guard ran and the user cancelled (CastleGrid.jsx:106 returns before fetch).
    await expect.poll(() => dialogs.length).toBe(1)
    expect(dialogs[0]).toContain('Assign Alfredo Rossi to Ember Forge?')
    expect(transcript.assign).toHaveLength(0)
    await expect(page.locator('.toast-success')).toHaveCount(0)
    expect(transcript.railViolations).toEqual([])
  })
})
