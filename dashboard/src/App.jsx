import { useState, useEffect } from 'react'

const SHEET_ID = '1_kVI6NZx36g5Mgj-u5eJWauyALfeqTIt8C6ATJ5tUgs'
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&range=Sheet1!A30:R100`

const COLS = ['week','start','end','cpl','calls','posts','closeRate','mrr','margin','cardsDone','cardsPerEditor','delivery','wins','applicants','testCuts','testPassed','goodEditors','editorsCount']

const METRICS = {
  cpl:            { name: 'CPL (Qualified)',   icon: '💰', unit: '€',  dir: 'lower',  green: 80,  yellow: 150 },
  calls:          { name: 'Sales Calls',       icon: '📞', unit: '',   dir: 'higher', green: 5,   yellow: 3 },
  posts:          { name: 'Social Posts',      icon: '📱', unit: '',   dir: 'higher', green: 6,   yellow: 4 },
  closeRate:      { name: 'Close Rate',        icon: '🎯', unit: '%',  dir: 'higher', green: 35,  yellow: 20 },
  mrr:            { name: 'MRR',               icon: '📈', unit: '€',  dir: 'higher', green: 45000, yellow: 35000 },
  margin:         { name: 'Profit Margin',     icon: '✨', unit: '%',  dir: 'higher', green: 50,  yellow: 35 },
  cardsDone:      { name: 'Cards Done',        icon: '✅', unit: '',   dir: 'higher', green: 40,  yellow: 20 },
  cardsPerEditor: { name: 'Cards / Editor',    icon: '⚡', unit: '',   dir: 'higher', green: 10,  yellow: 5 },
  delivery:       { name: 'Delivery Time',     icon: '⏱️', unit: 'h',  dir: 'lower',  green: 48,  yellow: 72 },
  wins:           { name: 'Client Wins',       icon: '🏆', unit: '',   dir: 'higher', green: 5,   yellow: 3 },
  applicants:     { name: 'Applicants',        icon: '📋', unit: '',   dir: 'higher', green: 10,  yellow: 5 },
  testCuts:       { name: 'Test Cuts',         icon: '🎬', unit: '',   dir: 'higher', green: 5,   yellow: 2 },
  testPassed:     { name: 'Tests Passed',      icon: '✅', unit: '',   dir: 'higher', green: 3,   yellow: 1 },
  goodEditors:    { name: 'Good Editors',      icon: '🌟', unit: '',   dir: 'higher', green: 6,   yellow: 4 },
}

// DRI assignments with initials and colors
const DRI = {
  marketing: [{ name: 'Alan', initials: 'AS', color: '#8B5CF6' }],
  sales:     [{ name: 'Shawn', initials: 'SH', color: '#EC4899' }, { name: 'Alan', initials: 'AS', color: '#8B5CF6' }],
  cs:        [{ name: 'Baran', initials: 'BA', color: '#F97316' }],
  people:    [{ name: 'Tim', initials: 'TI', color: '#22C55E' }],
}

const DEPARTMENTS = [
  { id: 'marketing', name: 'Marketing',         icon: '📣', color: '#8B5CF6', metrics: ['cpl', 'calls', 'posts'] },
  { id: 'sales',     name: 'Sales',             icon: '💰', color: '#EC4899', metrics: ['closeRate', 'mrr', 'margin'] },
  { id: 'cs',        name: 'Customer Success',  icon: '⭐', color: '#F97316', metrics: ['cardsDone', 'cardsPerEditor', 'delivery', 'wins'] },
  { id: 'people',    name: 'People',            icon: '👥', color: '#22C55E', metrics: ['applicants', 'testCuts', 'testPassed', 'goodEditors'] },
]

const TOTAL_WEEK_COLS = 6

function parseSheetData(text) {
  const json = text.replace(/^[^(]+\(/, '').replace(/\);?$/, '')
  const data = JSON.parse(json)
  return data.table.rows.map(row => {
    const obj = {}
    COLS.forEach((col, i) => {
      const cell = row.c?.[i]
      obj[col] = cell?.v ?? null
      if (col === 'start' || col === 'end') obj[col] = cell?.f || cell?.v || null
    })
    return obj
  }).filter(r => r.week)
}

// Pad weeks array: filled weeks + empty placeholders
function padWeeks(filledWeeks) {
  const result = [...filledWeeks]
  const lastFilled = filledWeeks[filledWeeks.length - 1]
  
  while (result.length < TOTAL_WEEK_COLS) {
    // Generate next week label
    const prev = result[result.length - 1]
    let nextStart = null
    if (prev?.start) {
      const d = new Date(prev.start)
      d.setDate(d.getDate() + 7)
      nextStart = d.toISOString().split('T')[0]
    }
    result.push({
      week: `empty-${result.length}`,
      start: nextStart,
      end: null,
      empty: true,
    })
  }
  return result
}

const getStatus = (value, key) => {
  if (value === null || value === undefined) return 'neutral'
  const m = METRICS[key]
  if (!m) return 'neutral'
  if (m.dir === 'higher') {
    if (value >= m.green) return 'green'
    if (value >= m.yellow) return 'yellow'
    return 'red'
  } else {
    if (value <= m.green) return 'green'
    if (value <= m.yellow) return 'yellow'
    return 'red'
  }
}

const fmt = (val, key) => {
  if (val === null || val === undefined) return '—'
  const m = METRICS[key]
  if (!m) return String(val)
  if (m.unit === '%') return `${val}%`
  if (m.unit === '€') return val >= 1000 ? `€${(val/1000).toFixed(1)}k` : `€${val}`
  if (m.unit === 'h') return `${val}h`
  return String(val)
}

const weekLabel = (row) => {
  if (row.empty && row.start) {
    const s = row.start.split('-')
    return `${s[1]}/${s[2]}`
  }
  if (!row.start) return ''
  const s = row.start.split('-')
  return `${s[1]}/${s[2]}`
}

const StatusDot = ({ status }) => <span className={`status-dot status-${status}`} />

const Avatar = ({ person }) => (
  <div
    className="dri-avatar"
    title={person.name}
    style={{
      background: `linear-gradient(135deg, ${person.color}, ${person.color}88)`,
    }}
  >
    {person.initials}
  </div>
)

const MetricRow = ({ metricKey, weeks, currentWeekIdx }) => {
  const m = METRICS[metricKey]
  if (!m) return null
  return (
    <div className="metric-row">
      <div className="metric-label">
        <span className="metric-icon">{m.icon}</span>
        <span className="metric-name">{m.name}</span>
      </div>
      <div className="metric-values">
        {weeks.map((w, i) => {
          if (w.empty) {
            return (
              <div key={w.week} className="metric-cell empty-cell">
                <span className="metric-value status-text-neutral">—</span>
              </div>
            )
          }
          const val = w[metricKey]
          const isCurrent = i === currentWeekIdx
          // Current week = gray (not judged yet), past weeks = colored
          const status = isCurrent ? 'current' : getStatus(val, metricKey)
          return (
            <div key={w.week} className={`metric-cell ${isCurrent ? 'current-week' : ''}`}>
              {!isCurrent && <StatusDot status={status} />}
              <span className={`metric-value status-text-${status}`}>{fmt(val, metricKey)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Find the current (in-progress) week index
const getCurrentWeekIdx = (weeks) => {
  const today = new Date()
  const filledWeeks = weeks.filter(w => !w.empty)
  if (filledWeeks.length === 0) return -1
  
  // Check if last filled week contains today or is in the future
  const lastFilled = filledWeeks[filledWeeks.length - 1]
  if (lastFilled.end) {
    const endDate = new Date(lastFilled.end)
    endDate.setHours(23, 59, 59)
    if (today <= endDate) {
      // Find this week's index in the full array
      return weeks.findIndex(w => w.week === lastFilled.week)
    }
  }
  return -1 // All weeks are finalized
}

const DeptCard = ({ dept, weeks, currentWeekIdx }) => (
  <div className="dept-card" style={{ '--accent': dept.color }}>
    <div className="dept-header">
      <span className="dept-icon">{dept.icon}</span>
      <span className="dept-name">{dept.name}</span>
      <div className="dri-avatars">
        {(DRI[dept.id] || []).map(p => <Avatar key={p.initials} person={p} />)}
      </div>
    </div>
    <div className="time-headers">
      <div className="time-label-spacer"></div>
      <div className="time-labels">
        {weeks.map((w) => (
          <div key={w.week} className={`time-label ${w.empty ? 'empty' : ''}`}>
            {weekLabel(w)}
          </div>
        ))}
      </div>
    </div>
    <div className="dept-metrics">
      {dept.metrics.map(k => <MetricRow key={k} metricKey={k} weeks={weeks} currentWeekIdx={currentWeekIdx} />)}
    </div>
  </div>
)

const HealthSummary = ({ weeks }) => {
  let g = 0, y = 0, r = 0
  const filledWeeks = weeks.filter(w => !w.empty)
  const currentIdx = getCurrentWeekIdx(weeks)
  
  // Only count metrics from the last FINALIZED week (not current)
  const finalizedWeeks = filledWeeks.filter((w, i) => {
    const actualIdx = weeks.findIndex(wk => wk.week === w.week)
    return actualIdx !== currentIdx
  })
  
  if (finalizedWeeks.length > 0) {
    const latest = finalizedWeeks[finalizedWeeks.length - 1]
    DEPARTMENTS.flatMap(d => d.metrics).forEach(k => {
      const s = getStatus(latest[k], k)
      if (s === 'green') g++; else if (s === 'yellow') y++; else if (s === 'red') r++
    })
  }
  return (
    <div className="health-summary">
      <div className="health-item green"><span className="health-dot"></span><span>{g}</span></div>
      <div className="health-item yellow"><span className="health-dot"></span><span>{y}</span></div>
      <div className="health-item red"><span className="health-dot"></span><span>{r}</span></div>
    </div>
  )
}

function App() {
  const [weeks, setWeeks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(SHEET_URL)
        const text = await res.text()
        const filled = parseSheetData(text)
        setWeeks(padWeeks(filled))
        setLoading(false)
      } catch (e) {
        setError(e.message)
        setLoading(false)
      }
    }
    load()
    const iv = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  const filledWeeks = weeks.filter(w => !w.empty)
  const period = filledWeeks.length > 0 && filledWeeks[filledWeeks.length-1].start
    ? new Date(filledWeeks[filledWeeks.length-1].start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '...'

  if (loading) return (
    <div className="app loading-screen">
      <div className="loading-spinner"></div>
      <p style={{color:'rgba(255,255,255,0.4)'}}>Loading scorecard...</p>
    </div>
  )

  if (error) return (
    <div className="app error-screen">
      <p>Failed to load: {error}</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  )

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="title">
            <span className="title-accent">ADITOR</span>
            <span className="title-text">Scorecard</span>
          </h1>
          <p className="subtitle">{period} · 10x output, same team</p>
        </div>
        <div className="header-right">
          <HealthSummary weeks={weeks} />
        </div>
      </header>

      <main className="cards-grid">
        {DEPARTMENTS.map(d => <DeptCard key={d.id} dept={d} weeks={weeks} currentWeekIdx={getCurrentWeekIdx(weeks)} />)}
      </main>

      <footer className="footer">
        Live from Google Sheets · Auto-refreshes every 5 min
        <br />
        <a href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`} target="_blank" rel="noopener noreferrer">Edit Sheet →</a>
      </footer>
    </div>
  )
}

export default App
