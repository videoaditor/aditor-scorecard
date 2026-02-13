import { useState, useEffect, useCallback } from 'react'

const SHEET_ID = '1_kVI6NZx36g5Mgj-u5eJWauyALfeqTIt8C6ATJ5tUgs'
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || ''

// For now, use the published sheet as JSON (no auth needed if sheet is shared)
// Later: use service account for authenticated access
const SHEETS_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values`

export default function useSheetData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      if (!API_KEY) {
        console.warn('No Google API key configured. Using demo data.')
        setError('No API key — showing demo data')
        setLoading(false)
        return null
      }

      // Fetch targets
      const targetsRes = await fetch(
        `${SHEETS_URL}/Sheet1!A1:F17?key=${API_KEY}`
      )
      const targets = await targetsRes.json()

      // Fetch weekly input
      const weeklyRes = await fetch(
        `${SHEETS_URL}/Sheet1!A21:R45?key=${API_KEY}`
      )
      const weekly = await weeklyRes.json()

      // Parse targets into threshold map
      const thresholds = {}
      if (targets.values) {
        for (let i = 1; i < targets.values.length; i++) {
          const row = targets.values[i]
          if (row[0]) {
            thresholds[row[0]] = {
              red: parseFloat(row[1]) || 0,
              yellow: parseFloat(row[2]) || 0,
              green: parseFloat(row[3]) || 0,
              direction: row[4] || 'higher_better',
              unit: row[5] || '#',
            }
          }
        }
      }

      // Parse weekly data into departments
      // TODO: Transform sheet data into the app's data format

      setLastUpdated(new Date())
      setLoading(false)
      return { thresholds, weekly: weekly.values }
    } catch (err) {
      setError(err.message)
      setLoading(false)
      return null
    }
  }, [])

  useEffect(() => {
    fetchData()
    // Poll every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  return { data, loading, error, lastUpdated, refresh: fetchData }
}
