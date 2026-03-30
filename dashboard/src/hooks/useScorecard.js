import { useState, useEffect, useCallback } from 'react'

const TEABLE_URL = import.meta.env.VITE_TEABLE_URL || ''
const TEABLE_TOKEN = import.meta.env.VITE_TEABLE_TOKEN || ''
const TABLE_ID = import.meta.env.VITE_TEABLE_TABLE_ID || ''

// Direct field mappings: Teable field name === internal key
const DIRECT_FIELDS = [
  'start', 'end',
  'calls', 'posts', 'followers',
  'callBookRate', 'costPerCall', 'closeRate', 'mrr',
  'cardsDone', 'delivery', 'wins', 'hireRate',
  'applicants', 'goodEditors', 'activeEditors', 'cardsPerEditor',
]

// Renamed mappings: Teable field → internal key
const RENAMED_FIELDS = { clientCpl: 'cpl' }

// Teable stores these as 0-1 ratios; frontend expects 0-100 percentages
const RATIO_TO_PCT = new Set(['callBookRate', 'closeRate', 'hireRate'])

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
    return r
  })
}

async function fetchFromTeable() {
  if (!TEABLE_URL || !TEABLE_TOKEN || !TABLE_ID) {
    throw new Error('Teable not configured — set VITE_TEABLE_URL, VITE_TEABLE_TOKEN, VITE_TEABLE_TABLE_ID in .env')
  }

  const url = `${TEABLE_URL}/api/table/${TABLE_ID}/record`
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${TEABLE_TOKEN}` },
  })

  if (!res.ok) {
    throw new Error(`Teable API error: ${res.status} ${res.statusText}`)
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
      const weeks = await fetchFromTeable()
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
