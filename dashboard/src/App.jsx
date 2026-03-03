import { useState, useEffect, useMemo } from 'react'
import CastleGrid from './components/CastleGrid'

const SHEET_ID = '1_kVI6NZx36g5Mgj-u5eJWauyALfeqTIt8C6ATJ5tUgs'
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`

const COLS = ['week','start','end','cpl','calls','posts','closeRate','mrr','margin','cardsDone','cardsPerEditor','delivery','wins','applicants','testCuts','testPassed','goodEditors','editorsCount','callBookRate','costPerCall','followers','acquisitionRate']

const METRICS = {
  cpl:            { name: 'CPL (Qualified)',   icon: '💰', unit: '€',  dir: 'lower',  green: 80,  yellow: 150, agg: 'avg' },
  calls:          { name: 'Calls',             icon: '📞', unit: '',   dir: 'higher', green: 5,   yellow: 3, agg: 'sum' },
  posts:          { name: 'IG Posts',           icon: '📱', unit: '',   dir: 'higher', green: 6,   yellow: 4, agg: 'sum' },
  closeRate:      { name: 'Close Rate',        icon: '🎯', unit: '%',  dir: 'higher', green: 35,  yellow: 20, agg: 'avg' },
  mrrDelta:       { name: 'MRR Δ',              icon: '📈', unit: '€±', dir: 'higher', green: 3000, yellow: 1, agg: 'sum', weekOnly: true },
  mrr:            { name: 'MRR',               icon: '💰', unit: '€',  dir: 'higher', green: 45000, yellow: 35000, agg: 'last', quarterOnly: true },
  margin:         { name: 'Profit Margin',     icon: '✨', unit: '%',  dir: 'higher', green: 50,  yellow: 35, agg: 'avg', quarterOnly: true },
  cardsDone:      { name: 'Cards Done',        icon: '✅', unit: '',   dir: 'higher', green: 40,  yellow: 20, agg: 'sum' },
  cardsPerEditor: { name: 'Cards / Editor',    icon: '⚡', unit: '',   dir: 'higher', green: 10,  yellow: 5, agg: 'avg' },
  delivery:       { name: 'Delivery Time',     icon: '⏱️', unit: 'h',  dir: 'lower',  green: 48,  yellow: 72, agg: 'avg' },
  wins:           { name: 'Client Wins',       icon: '🏆', unit: '',   dir: 'higher', green: 5,   yellow: 3, agg: 'sum' },
  applicants:     { name: 'Applicants',        icon: '📋', unit: '',   dir: 'higher', green: 50,  yellow: 20, agg: 'sum' },
  testCutRate:    { name: 'Cut Rate',          icon: '🎬', unit: '%',  dir: 'higher', green: 15,  yellow: 5, agg: 'avg' },
  clearanceRate:  { name: 'Clearance',         icon: '✅', unit: '%',  dir: 'higher', green: 50,  yellow: 25, agg: 'avg' },
  goodEditors:    { name: 'Good Editors',      icon: '🌟', unit: '',   dir: 'higher', green: 6,   yellow: 4, agg: 'last' },
  followers:      { name: 'Followers ±',       icon: '📊', unit: '',   dir: 'higher', green: 100, yellow: 20, agg: 'sum' },
  callBookRate:   { name: 'Call Book Rate',   icon: '📅', unit: '%',  dir: 'higher', green: 20,  yellow: 10, agg: 'avg' },
  costPerCall:    { name: 'Cost Per Call',    icon: '💵', unit: '€',  dir: 'lower',  green: 200, yellow: 400, agg: 'avg' },
  acquisitionRate:{ name: 'Acquisition',       icon: '🎯', unit: '%',  dir: 'higher', green: 60,  yellow: 30, agg: 'avg' },
}

const DRI = {
  marketing: [{ name: 'Alan', initials: 'AS', color: '#F97316', img: './avatars/alan.jpg' }],
  sales:     [{ name: 'Alan', initials: 'AS', color: '#F97316', img: './avatars/alan.jpg' }],
  cs:        [{ name: 'Baran', initials: 'BA', color: '#F97316', img: './avatars/baran.jpg' }, { name: 'Saskia', initials: 'SA', color: '#F97316', img: './avatars/saskia.jpg' }],
  people:    [{ name: 'Tim', initials: 'TI', color: '#22C55E', img: './avatars/tim.jpg' }],
}

const DEPARTMENTS = [
  { id: 'marketing', name: 'Marketing',         icon: '📣', color: '#8B5CF6', metrics: ['cpl', 'calls', 'posts', 'followers'] },
  { id: 'sales',     name: 'Sales',             icon: '💰', color: '#F97316', metrics: ['callBookRate', 'costPerCall', 'closeRate', 'mrrDelta', 'mrr', 'margin'] },
  { id: 'cs',        name: 'Customer Success',  icon: '⭐', color: '#F97316', metrics: ['cardsDone', 'cardsPerEditor', 'delivery', 'wins', 'acquisitionRate'] },
  { id: 'people',    name: 'People',            icon: '👥', color: '#22C55E', metrics: ['applicants', 'testCutRate', 'clearanceRate', 'goodEditors'] },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

// Columns that must be numeric (may come as strings from Sheets)
const NUMERIC_COLS = new Set(['cpl','calls','posts','closeRate','mrr','margin','cardsDone','cardsPerEditor','delivery','wins','applicants','testCuts','testPassed','goodEditors','editorsCount','callBookRate','costPerCall','followers','acquisitionRate'])

function parseSheetData(text) {
  const json = text.replace(/^[^(]+\(/, '').replace(/\);?$/, '')
  const data = JSON.parse(json)
  return data.table.rows.map(row => {
    const obj = {}
    COLS.forEach((col, i) => {
      const cell = row.c?.[i]
      let val = cell?.v ?? null
      if (col === 'start' || col === 'end') {
        val = cell?.f || cell?.v || null
      } else if (NUMERIC_COLS.has(col) && val !== null) {
        // Coerce strings like '3' to numbers
        const n = Number(val)
        val = isNaN(n) ? null : n
      }
      obj[col] = val
    })
    return obj
  }).filter(r => r.week && r.start).map((r, i, arr) => {
    // Computed metrics
    // Test Cut Rate = testCuts / applicants * 100 (% of applicants who make it to test cut)
    if (r.testCuts != null && r.applicants != null && r.applicants > 0) {
      r.testCutRate = Math.round(r.testCuts / r.applicants * 1000) / 10
    }
    // Clearance Rate = testPassed / testCuts this week * 100 (% of test cuts who pass)
    if (r.testPassed != null && r.testCuts != null && r.testCuts > 0) {
      r.clearanceRate = Math.round(r.testPassed / r.testCuts * 1000) / 10
    }
    // Good Editors = treat 0 as null (not tracked that week)
    if (r.goodEditors === 0) r.goodEditors = null
    return r
  })
}

// Get month (0-11) and year from a week's start date
const getMonthYear = (week) => {
  if (!week.start) return { month: -1, year: -1 }
  const d = new Date(week.start)
  return { month: d.getMonth(), year: d.getFullYear() }
}

// Filter weeks by month
const filterByMonth = (weeks, month, year) => {
  return weeks.filter(w => {
    const my = getMonthYear(w)
    return my.month === month && my.year === year
  })
}

// Filter weeks by quarter
const filterByQuarter = (weeks, quarter, year) => {
  const startMonth = quarter * 3
  return weeks.filter(w => {
    const my = getMonthYear(w)
    return my.year === year && my.month >= startMonth && my.month < startMonth + 3
  })
}

// Aggregate weeks into monthly data for quarter view
const aggregateToMonths = (weeks, quarter, year) => {
  const startMonth = quarter * 3
  const monthlyData = []
  
  for (let m = startMonth; m < startMonth + 3; m++) {
    const monthWeeks = weeks.filter(w => {
      const my = getMonthYear(w)
      return my.month === m && my.year === year
    })
    
    if (monthWeeks.length === 0) {
      monthlyData.push({ label: MONTHS[m], empty: true })
    } else {
      const agg = { label: MONTHS[m], empty: false }
      Object.keys(METRICS).forEach(key => {
        const m = METRICS[key]
        const vals = monthWeeks.map(w => w[key]).filter(v => v !== null && v !== undefined)
        if (vals.length === 0) {
          agg[key] = null
        } else if (m.agg === 'sum') {
          agg[key] = vals.reduce((a, b) => a + b, 0)
        } else if (m.agg === 'avg') {
          agg[key] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        } else if (m.agg === 'last') {
          agg[key] = vals[vals.length - 1]
        }
      })
      // Check if this month is current (in progress)
      const today = new Date()
      agg.isCurrent = today.getMonth() === m && today.getFullYear() === year
      monthlyData.push(agg)
    }
  }
  return monthlyData
}

// Pad weeks to 4 + optionally add monthly total column
const padToFour = (items, includeTotal = true) => {
  const weeks = [...items]
  while (weeks.length < 4) {
    weeks.push({ label: `W${weeks.length + 1}`, empty: true })
  }
  
  if (!includeTotal) {
    return weeks.slice(0, 4)
  }
  
  const filled = weeks.filter(w => !w.empty).slice(0, 4)
  
  // Calculate monthly total/average
  const total = { label: 'Total', empty: false, isTotal: true, isCurrent: false }
  Object.keys(METRICS).forEach(key => {
    const m = METRICS[key]
    const vals = filled.map(w => w[key]).filter(v => v !== null && v !== undefined && !isNaN(Number(v)))
    if (vals.length === 0) {
      total[key] = null
    } else if (m.agg === 'sum' || m.unit === '€±' || m.unit === '±') {
      total[key] = vals.reduce((a, b) => Number(a) + Number(b), 0)
    } else if (m.agg === 'avg') {
      total[key] = Math.round(vals.reduce((a, b) => Number(a) + Number(b), 0) / vals.length * 10) / 10
    } else if (m.agg === 'last') {
      total[key] = vals[vals.length - 1]
    }
  })
  
  return [...weeks.slice(0, 4), total]
}

// weekCount: how many weeks contributed to this value (for scaling sum thresholds)
const getStatus = (value, key, weekCount = 1) => {
  if (value === null || value === undefined) return 'neutral'
  const m = METRICS[key]
  if (!m) return 'neutral'
  // Scale thresholds for sum metrics when showing totals across multiple weeks
  const scale = (m.agg === 'sum') ? weekCount : 1
  if (m.dir === 'higher') {
    if (value >= m.green * scale) return 'green'
    if (value >= m.yellow * scale) return 'yellow'
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
  if (m.unit === '±') {
    const sign = val >= 0 ? '+' : ''
    return `${sign}${val}`
  }
  if (m.unit === '€±') {
    const sign = val >= 0 ? '+' : ''
    const abs = Math.abs(val)
    return abs >= 1000 ? `${sign}€${(val/1000).toFixed(1)}k` : `${sign}€${val}`
  }
  if (m.unit === '€') return val >= 1000 ? `€${(val/1000).toFixed(1)}k` : `€${val}`
  if (m.unit === 'h') return `${val}h`
  return String(val)
}

const StatusDot = ({ status }) => <span className={`status-dot status-${status}`} />

const Avatar = ({ person }) => (
  <div className="dri-person" title={person.name}>
    <div className="dri-avatar">
      {person.img ? (
        <img src={person.img} alt={person.name} className="dri-img" />
      ) : (
        <span style={{ background: `linear-gradient(135deg, ${person.color}, ${person.color}88)` }}>
          {person.initials}
        </span>
      )}
    </div>
    <span className="dri-name">{person.name}</span>
  </div>
)

const MetricRow = ({ metricKey, columns, view }) => {
  const m = METRICS[metricKey]
  if (!m) return null
  
  return (
    <div className="metric-row">
      <div className="metric-label">
        <span className="metric-icon">{m.icon}</span>
        <span className="metric-name">{m.name}</span>
      </div>
      <div className="metric-values">
        {columns.map((col, i) => {
          if (col.empty) {
            return (
              <div key={col.label || i} className="metric-cell empty-cell">
                <span className="metric-value status-text-neutral">—</span>
              </div>
            )
          }
          const val = col[metricKey]
          const isCurrent = col.isCurrent
          const isTotal = col.isTotal
          // For total column, scale sum thresholds by number of filled weeks
          const filledWeeks = isTotal
            ? columns.filter(c => !c.empty && !c.isCurrent && !c.isTotal).length
            : 1
          const status = isCurrent ? 'current' : getStatus(val, metricKey, filledWeeks)
          
          return (
            <div key={col.label || i} className={`metric-cell ${isCurrent ? 'current-week' : ''} ${isTotal ? 'total-cell' : ''}`}>
              {!isCurrent && <StatusDot status={status} />}
              <span className={`metric-value ${isTotal ? `total-value status-text-${status}` : `status-text-${status}`}`}>{fmt(val, metricKey)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const DeptCard = ({ dept, columns, view }) => (
  <div className="dept-card" style={{ '--accent': dept.color }}>
    <div className="dept-header">
      <span className="dept-icon">{dept.icon}</span>
      <span className="dept-name">{dept.name}</span>
      <div className="dri-avatars">
        {(DRI[dept.id] || []).map(p => <Avatar key={p.initials} person={p} />)}
      </div>
    </div>
    <div className="dept-table">
      <div className="time-headers">
        <div className="time-label-spacer"></div>
        <div className="time-labels">
          {columns.map((col, i) => (
            <div key={col.label || i} className={`time-label ${col.empty ? 'empty' : ''} ${col.isTotal ? 'total-label' : ''}`}>
              {col.isTotal ? 'Total' : (view === 'month' ? `W${i + 1}` : col.label)}
            </div>
          ))}
        </div>
      </div>
      <div className="dept-metrics">
        {dept.metrics
          .filter(k => {
            const m = METRICS[k]
            if (view === 'month' && m?.quarterOnly) return false
            if (view === 'quarter' && m?.weekOnly) return false
            return true
          })
          .map(k => <MetricRow key={k} metricKey={k} columns={columns} view={view} />)}
      </div>
    </div>
  </div>
)

const HealthSummary = ({ columns }) => {
  let g = 0, y = 0, r = 0
  const finalized = columns.filter(c => !c.empty && !c.isCurrent)
  
  if (finalized.length > 0) {
    const latest = finalized[finalized.length - 1]
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

const ViewToggle = ({ view, setView }) => (
  <div className="view-toggle">
    <button className={`toggle-btn ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Month</button>
    <button className={`toggle-btn ${view === 'quarter' ? 'active' : ''}`} onClick={() => setView('quarter')}>Quarter</button>
  </div>
)

const PeriodSelector = ({ view, month, setMonth, quarter, setQuarter, year, setYear, availableYears }) => {
  if (view === 'month') {
    return (
      <div className="period-selector">
        <select value={month} onChange={e => setMonth(Number(e.target.value))} className="period-select">
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className="period-select">
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    )
  }
  return (
    <div className="period-selector">
      <select value={quarter} onChange={e => setQuarter(Number(e.target.value))} className="period-select">
        {QUARTERS.map((q, i) => <option key={q} value={i}>{q}</option>)}
      </select>
      <select value={year} onChange={e => setYear(Number(e.target.value))} className="period-select">
        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}

function App() {
  const [allWeeks, setAllWeeks] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)
  const [error, setError] = useState(null)
  const [view, setView] = useState('month') // 'month' or 'quarter'
  const [activeTab, setActiveTab] = useState('scorecard') // 'scorecard' or 'kingdom'
  
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [quarter, setQuarter] = useState(Math.floor(today.getMonth() / 3))
  const [year, setYear] = useState(today.getFullYear())

  const load = async (isManual = false) => {
    if (isManual) setSyncing(true)
    try {
      const res = await fetch(SHEET_URL + '&t=' + Date.now())
      const text = await res.text()
      const weeks = parseSheetData(text)
      setAllWeeks(weeks)
      // Auto-jump to the most recent month that has data
      if (weeks.length > 0) {
        const last = weeks[weeks.length - 1]
        const { month: lm, year: ly } = getMonthYear(last)
        if (lm >= 0) {
          setMonth(lm)
          setYear(ly)
          setQuarter(Math.floor(lm / 3))
        }
      }
      setLastSynced(new Date())
      setLoading(false)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    } finally {
      if (isManual) setSyncing(false)
    }
  }

  useEffect(() => {
    load()
    const iv = setInterval(() => load(), 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  // Get available years from data
  const availableYears = useMemo(() => {
    const years = new Set(allWeeks.map(w => getMonthYear(w).year).filter(y => y > 0))
    if (years.size === 0) years.add(today.getFullYear())
    return Array.from(years).sort()
  }, [allWeeks])

  // Compute columns based on view
  const columns = useMemo(() => {
    if (view === 'month') {
      const filtered = filterByMonth(allWeeks, month, year)
      // Calculate MRR delta for each week
      const withDelta = filtered.map((w, i) => {
        let mrrDelta = 0
        if (w.mrr !== null && w.mrr !== undefined) {
          if (i > 0 && filtered[i-1].mrr !== null) {
            mrrDelta = w.mrr - filtered[i-1].mrr
          } else {
            // First week of month: check previous month's last week
            const prevWeeks = allWeeks.filter(pw => {
              const d = new Date(pw.start)
              return d < new Date(w.start) && pw.mrr !== null
            })
            if (prevWeeks.length > 0) {
              mrrDelta = w.mrr - prevWeeks[prevWeeks.length - 1].mrr
            }
          }
        }
        const endDate = w.end ? new Date(w.end) : null
        if (endDate) endDate.setHours(23, 59, 59)
        const isCurrent = endDate && today <= endDate
        return { ...w, mrrDelta, label: `W${i + 1}`, isCurrent }
      })
      return padToFour(withDelta)
    } else {
      return aggregateToMonths(allWeeks, quarter, year)
    }
  }, [allWeeks, view, month, quarter, year])

  const periodLabel = view === 'month'
    ? `${MONTHS[month]} ${year}`
    : `${QUARTERS[quarter]} ${year}`

  // Brands tab doesn't need loading
  if (activeTab === 'kingdom') {
    return (
      <div className="app">
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'scorecard' ? 'active' : ''}`}
            onClick={() => setActiveTab('scorecard')}
          >
            Scorecard
          </button>
          <button
            className={`tab-btn ${activeTab === 'kingdom' ? 'active' : ''}`}
            onClick={() => setActiveTab('kingdom')}
          >
            Brands
          </button>
        </div>
        <CastleGrid />
      </div>
    )
  }

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
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'scorecard' ? 'active' : ''}`}
          onClick={() => setActiveTab('scorecard')}
        >
          Scorecard
        </button>
        <button
          className={`tab-btn ${activeTab === 'kingdom' ? 'active' : ''}`}
          onClick={() => setActiveTab('kingdom')}
        >
          Brands
        </button>
      </div>

      <header className="header">
        <div className="header-left">
          <h1 className="title">
            <span className="title-accent">ADITOR</span>
            <span className="title-text">Scorecard</span>
          </h1>
          <p className="subtitle">{periodLabel} · 10x output, same team</p>
        </div>
        <div className="header-right">
          <PeriodSelector 
            view={view} 
            month={month} setMonth={setMonth}
            quarter={quarter} setQuarter={setQuarter}
            year={year} setYear={setYear}
            availableYears={availableYears}
          />
          <ViewToggle view={view} setView={setView} />
          <HealthSummary columns={columns} />
          <button
            className={`sync-btn ${syncing ? 'syncing' : ''}`}
            onClick={() => load(true)}
            title={lastSynced ? `Last synced: ${lastSynced.toLocaleTimeString()}` : 'Sync now'}
          >
            {syncing ? '⟳' : '↻'}
          </button>
        </div>
      </header>

      <main className="cards-grid">
        {DEPARTMENTS.map(d => <DeptCard key={d.id} dept={d} columns={columns} view={view} />)}
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
