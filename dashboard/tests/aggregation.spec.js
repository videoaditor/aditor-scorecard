import { test, expect } from '@playwright/test'
import { installMockBackend, gotoPinned } from './fixtures/mockBackend.js'

/**
 * aggregation.spec.js - regression pins for the Total-column rollup bugs found on
 * 2026-08-10, when the live Automation card showed "1.5" critical errors for August.
 *
 * The feed below is the real shape of that month, so each assertion here is a number that
 * was wrong on score.aditor.ai:
 *   - Critical Errors is a COUNT and was declared `agg: 'avg'`, so the Total averaged it
 *     (0 and 8 -> "1.5" in month view, and a differently-wrong "2" in quarter view, which
 *     rounded averages to whole numbers).
 *   - Turnaround / Resolve Time are per-week averages and were rolled up as an unweighted
 *     mean of weekly means, ignoring how many deliveries each week's average covered.
 *   - getStatus only scaled multi-week thresholds for `dir: 'higher'`, so a summed 'lower'
 *     metric would go red against a per-week threshold.
 *   - A month with weeks but no request data rendered "0/0" instead of "—".
 *
 * The clock is pinned to Mon 2026-08-10 (ISO week 33), so neither fixture week is the
 * "current" one and every cell carries a real, comparable value.
 */

const AUG_2026 = '2026-08-10T12:00:00+02:00'

// Aug 2026 as Teable held it: two weeks of Automation data, plus a July week that predates
// the request metrics entirely (its Automation fields are absent, exactly like Teable).
const FEED = {
  records: [
    {
      id: 'recJul',
      fields: {
        week: 'KW28', start: '2026-07-06T12:00:00.000Z', end: '2026-07-12T12:00:00.000Z',
        calls: 3,
      },
    },
    {
      id: 'recKW31',
      fields: {
        week: 'KW31', start: '2026-07-27T12:00:00.000Z', end: '2026-08-02T12:00:00.000Z',
        automationRequests: 5, automationRequestsDone: 4,
        turnaroundTime: 3.1, criticalErrors: 0,
      },
    },
    {
      id: 'recKW32',
      fields: {
        week: 'KW32', start: '2026-08-03T12:00:00.000Z', end: '2026-08-09T12:00:00.000Z',
        automationRequests: 2, automationRequestsDone: 2,
        turnaroundTime: 4.4, criticalErrors: 8, incidentResolution: 28,
      },
    },
    {
      id: 'recSep',
      fields: {
        week: 'KW38', start: '2026-09-14T12:00:00.000Z', end: '2026-09-20T12:00:00.000Z',
        calls: 2,
      },
    },
  ],
}

// The app auto-jumps to the month of the LAST week in the feed (September here), so the
// month-view specs select August explicitly rather than leaning on that default.
const selectAugust = (page) => page.locator('.period-select').first().selectOption('7')

const deptCard = (page, name) =>
  page.locator('.dept-card').filter({ has: page.locator('.dept-name', { hasText: name }) })

// Every rendered cell of one metric row, left to right: the week columns then Total.
const rowValues = (page, dept, metric) =>
  deptCard(page, dept)
    .locator('.metric-row')
    .filter({ has: page.locator('.metric-name', { hasText: metric }) })
    .locator('.metric-value')

test.describe('Total column rollups (regressions from 2026-08-10)', () => {
  test('month view rolls each Automation metric up by its own rule', async ({ page }) => {
    const transcript = await installMockBackend(page, FEED)
    await gotoPinned(page, '/', AUG_2026)
    await selectAugust(page)

    await expect(page.locator('.subtitle')).toContainText('Aug 2026')
    // KW31, KW32, two empty slots, Total - the August layout the bug was reported on.
    await expect(deptCard(page, 'Automation').locator('.time-label')).toHaveText(
      ['KW31', 'KW32', '—', '—', 'Total']
    )

    // A count sums: 0 + 8 = 8. It read "1.5" (the mean) before this fix.
    await expect(rowValues(page, 'Automation', 'Critical Errors')).toHaveText(
      ['0', '8', '—', '—', '8']
    )

    // Averages roll up weighted by their cohort: (3.1x4 + 4.4x2) / 6 = 3.5, not the
    // unweighted (3.1 + 4.4) / 2 = 3.8.
    await expect(rowValues(page, 'Automation', 'Turnaround Time')).toHaveText(
      ['3.1d', '4.4d', '—', '—', '3.5d']
    )

    // Only one week carries a resolve time, so the total is that week's value, and the
    // week without one stays a dash rather than counting as a zero.
    await expect(rowValues(page, 'Automation', 'Resolve Time')).toHaveText(
      ['—', '28h', '—', '—', '28h']
    )

    // Fractions still sum both parts: 4/5 and 2/2 -> 6/7.
    await expect(rowValues(page, 'Automation', 'Requests Done')).toHaveText(
      ['4/5', '2/2', '—', '—', '6/7']
    )

    expect(transcript.railViolations).toEqual([])
  })

  test('summed lower-is-better totals band against a scaled threshold', async ({ page }) => {
    await installMockBackend(page, FEED)
    await gotoPinned(page, '/', AUG_2026)
    await selectAugust(page)

    const errors = deptCard(page, 'Automation')
      .locator('.metric-row')
      .filter({ has: page.locator('.metric-name', { hasText: 'Critical Errors' }) })

    // 8 incidents over 2 weeks is 4/week against a green<=1 / yellow<=3 per-week band, so
    // the Total is red - but red because 8 > 3x2, not because 8 > 3.
    await expect(errors.locator('.total-cell .total-value')).toHaveClass(/status-text-red/)
    // The quiet week still bands on the per-week threshold.
    await expect(errors.locator('.metric-cell').first()).toHaveClass(/cell-tint-green/)
  })

  test('quarter view keeps decimals and dashes months with no data', async ({ page }) => {
    await installMockBackend(page, FEED)
    await gotoPinned(page, '/', AUG_2026)
    await page.getByRole('button', { name: 'Quarter' }).click()

    await expect(page.locator('.subtitle')).toContainText('Q3 2026')
    await expect(deptCard(page, 'Automation').locator('.time-label')).toHaveText(
      ['Jul', 'Aug', 'Sep', 'Total']
    )

    // Quarter view buckets a week by the month it STARTS in (month view instead counts any
    // week overlapping the month), so KW31 (Mon Jul 27 - Sun Aug 2) rolls into July here.
    // September has a week but no Automation data at all, so its cells must be dashes:
    // that column rendered "0/0" before the fix, which reads as "nothing was delivered".
    await expect(rowValues(page, 'Automation', 'Requests Done')).toHaveText(
      ['4/5', '2/2', '—', '6/7']
    )

    // Month rollups keep one decimal; a bare Math.round showed these as "3d" / "4d".
    await expect(rowValues(page, 'Automation', 'Turnaround Time')).toHaveText(
      ['3.1d', '4.4d', '—', '3.5d']
    )
    await expect(rowValues(page, 'Automation', 'Critical Errors')).toHaveText(
      ['0', '8', '—', '8']
    )
    await expect(rowValues(page, 'Automation', 'Resolve Time')).toHaveText(
      ['—', '28h', '—', '28h']
    )
  })
})
