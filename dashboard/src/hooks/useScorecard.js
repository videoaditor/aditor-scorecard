import { useState, useEffect, useCallback } from 'react'

// The scorecard data is read through a same-origin proxy (a Cloudflare Pages
// Function) that holds the data-source token server-side, so no token ships in
// this bundle. The request carries the gate's session cookie, so only a signed-in
// internal viewer receives data; an expired session returns 401 and the dashboard
// surfaces the error until the page is reloaded to sign in again.
const SCORECARD_ENDPOINT = '/api/scorecard/records'

// Direct field mappings: Teable field name === internal key.
// Fields absent in Teable map to null (toNum), so the dashboard renders them as a
// neutral placeholder instead of crashing. The Automation `auto*` metrics are wired via
// RENAMED_FIELDS below.
// See AGENTS.md > Teable schema fields status.
const DIRECT_FIELDS = [
  'start', 'end',
  'calls', 'posts', 'followers', 'avgReelViews', 'reelsPublished', 'hotDms',
  'callBookRate', 'costPerCall', 'closeRate', 'mrr',
  'cardsDone', 'delivery', 'wins', 'newHires', 'testStarts', 'newSubs',
  'applicants', 'goodEditors', 'activeEditors', 'cardsPerEditor', 'editorChurn',
  // Tech card, Maintenance domain (Allan): tasks from #to-do-tech-department, done = his ✅
  'techRequests', 'techRequestsDone', 'techResolveTime',
  // Tech card, Projects domain (Shawn): non-maintenance cards on the vault board, written
  // locally by automations/task-scan/tech-metrics.py. ResolveTime is in DAYS; InProgress is
  // a live snapshot written only to the current week.
  'techProjectRequests', 'techProjectRequestsDone', 'techProjectResolveTime', 'techProjectInProgress',
  // CX / Review Index components (Teable fields; render once collectors write them)
  'reviewIndex', 'craftScore', 'clientRevisionRate', 'autoReviewRevisionRate', 'reliability',
  // Production card (2026-09-24)
  'assetIndex', 'assetsCreated', 'assetsKept', 'costPerCard', 'firstPassRate',
  'cutterVideos',
]

// Renamed mappings: Teable field → internal key.
const RENAMED_FIELDS = {
  clientCpl: 'cpl',
  // The feedback-agent writes the review count to `totalReviews` (there is no `videosReviewed`
  // column), so the "Videos Reviewed" row reads that. Mapped here rather than in DIRECT_FIELDS
  // so it overrides cleanly.
  totalReviews: 'videosReviewed',
}

// Teable stores these as 0-1 ratios; frontend expects 0-100 percentages
// (editorChurn is written by the "Fetch Editor Churn" n8n workflow as a fraction, like closeRate)
const RATIO_TO_PCT = new Set(['callBookRate', 'closeRate', 'editorChurn'])

const DATE_FIELDS = new Set(['start', 'end'])

// Teable returns dates as ISO timestamps in UTC (e.g. "2026-02-02T23:00:00.000Z")
// Convert to YYYY-MM-DD in Europe/Berlin timezone to match the original date
function toLocalDate(isoString) {
  if (!isoString) return null
  const d = new Date(isoString)
  return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }) // "YYYY-MM-DD"
}

// Extract week number from "KW13" or plain number
function parseWeek(val) {
  if (val == null) return null
  if (typeof val === 'number') return val
  const m = String(val).match(/(\d+)/)
  return m ? Number(m[1]) : null
}

function toNum(val) {
  if (val === null || val === undefined) return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

function mapRecord(record) {
  const f = record.fields
  const obj = {}

  obj.week = parseWeek(f.week)

  // Map direct fields
  for (const key of DIRECT_FIELDS) {
    let val = f[key] ?? null
    if (DATE_FIELDS.has(key)) {
      val = toLocalDate(val)
    } else {
      val = toNum(val)
      if (val !== null && RATIO_TO_PCT.has(key)) {
        val = Math.round(val * 10000) / 100 // 0.0455 → 4.55
      }
    }
    obj[key] = val
  }

  // Map renamed fields
  for (const [teableKey, internalKey] of Object.entries(RENAMED_FIELDS)) {
    obj[internalKey] = toNum(f[teableKey])
  }

  return obj
}

function postProcess(rows) {
  return rows.map(r => {
    // Treat goodEditors = 0 as null (not tracked that week)
    if (r.goodEditors === 0) r.goodEditors = null
    // Derive acquisitionRate as "newSubs/testStarts" fraction string
    const ns = r.newSubs ?? 0
    const ts = r.testStarts ?? 0
    r.acquisitionRate = `${ns}/${ts}`
    // Derivation for the Tech card's Maintenance "Tasks Done".
    const techDone = r.techRequestsDone
    const techIn = r.techRequests
    r.techRequests = (techDone == null && techIn == null) ? null : `${techDone ?? 0}/${techIn ?? 0}`
    // And the Tech card's Projects "Tasks Done".
    const projDone = r.techProjectRequestsDone
    const projIn = r.techProjectRequests
    r.techProjectRequests = (projDone == null && projIn == null) ? null : `${projDone ?? 0}/${projIn ?? 0}`
    return r
  })
}

async function fetchScorecard() {
  const res = await fetch(SCORECARD_ENDPOINT, {
    headers: { 'Accept': 'application/json' },
    credentials: 'same-origin',
  })

  if (!res.ok) {
    throw new Error(`Scorecard API error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  const records = data.records || []

  const rows = records
    .map(mapRecord)
    .filter(r => r.week && r.start && /^\d{4}-\d{2}-\d{2}/.test(r.start))

  // Sort by week number ascending
  rows.sort((a, b) => a.week - b.week)

  return postProcess(rows)
}

export default function useScorecard() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async (isManual = false) => {
    if (isManual) setSyncing(true)
    try {
      const weeks = await fetchScorecard()
      setData(weeks)
      setLastSynced(new Date())
      setError(null)
      setLoading(false)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    } finally {
      if (isManual) setSyncing(false)
    }
  }, [])

  useEffect(() => {
    load()
    const iv = setInterval(() => load(), 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [load])

  return { data, loading, syncing, lastSynced, error, refresh: () => load(true) }
}
