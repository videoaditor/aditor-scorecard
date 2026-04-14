import { useState, useRef, useMemo } from 'react'
import CastleGrid from './components/CastleGrid'
import useScorecard from './hooks/useScorecard'

const METRICS = {
  cpl:            { name: 'CPL (Qualified)',   icon: '💰', unit: '€',  dir: 'lower',  green: 80,  yellow: 150, agg: 'avg', desc: 'Cost per qualified lead from Meta Ads' },
  calls:          { name: 'Calls',             icon: '📞', unit: '',   dir: 'higher', green: 5,   yellow: 3, agg: 'sum', desc: 'Sales calls booked via Calendly' },
  posts:          { name: 'IG Posts',           icon: '📱', unit: '',   dir: 'higher', green: 6,   yellow: 4, agg: 'sum', desc: 'Instagram posts from Meta API' },
  closeRate:      { name: 'Close Rate',        icon: '🎯', unit: '%',  dir: 'higher', green: 35,  yellow: 20, agg: 'avg', desc: '% of calls that convert to paying clients' },
  mrr:            { name: 'MRR',               icon: '📈', unit: '€',  dir: 'higher', green: 45000, yellow: 35000, agg: 'last', desc: 'Monthly recurring revenue from Stripe' },
  cardsDone:      { name: 'Cards Done',        icon: '✅', unit: '',   dir: 'higher', green: 40,  yellow: 20, agg: 'sum', desc: 'Total cards completed derived from Trello' },
  cardsPerEditor: { name: 'Cards/Editor',        icon: '⚡', unit: '',   dir: 'higher', green: 10,  yellow: 5, agg: 'avg', desc: 'Average cards completed per editor' },
  delivery:       { name: 'Delivery Time',      icon: '⏱️', unit: 'h',  dir: 'lower',  green: 48,  yellow: 72, agg: 'avg', desc: 'Avg. delivery time active \u2192 completed in hours' },
  wins:           { name: 'Client Wins',       icon: '🏆', unit: '',   dir: 'higher', green: 5,   yellow: 3, agg: 'sum', desc: 'Client wins from Slack #wins channel' },
  applicants:     { name: 'Applicants',        icon: '📋', unit: '',   dir: 'higher', green: 50,  yellow: 20, agg: 'sum', desc: 'Editor applicants from email' },
  newHires:       { name: 'New Hires',           icon: '🎯', unit: '',   dir: 'higher', green: 3,   yellow: 1, agg: 'sum', desc: 'New editors hired this week' },
  activeEditors:  { name: 'Active Editors',     icon: '👥', unit: '',   dir: 'higher', green: 15,  yellow: 10, agg: 'last', desc: 'Editors that completed at least 1 card last week' },
  goodEditors:    { name: 'Good Editors',      icon: '🌟', unit: '',   dir: 'higher', green: 6,   yellow: 4, agg: 'last', desc: 'Editors that completed at least 3 cards last week' },
  followers:      { name: 'Followers \u00b1',       icon: '📊', unit: '',   dir: 'higher', green: 100, yellow: 20, agg: 'sum', desc: 'Instagram follower change from Meta API' },
  callBookRate:   { name: 'Call Book Rate',   icon: '📅', unit: '%',  dir: 'higher', green: 20,  yellow: 10, agg: 'avg', desc: '% of leads that book a call' },
  costPerCall:    { name: 'Cost Per Call',    icon: '💵', unit: '€',  dir: 'lower',  green: 200, yellow: 400, agg: 'avg', desc: 'Ad spend per booked call' },
  acquisitionRate:{ name: 'Acquisition Rate', icon: '🎯', unit: 'frac', dir: 'higher', green: 60, yellow: 30, agg: 'frac', desc: 'New subscribers / test starts' },
}

const DRI = {
  marketing: [{ name: 'Alan', initials: 'AS', color: '#F97316', img: './avatars/alan.jpg' }],
  sales:     [{ name: 'Alan', initials: 'AS', color: '#F97316', img: './avatars/alan.jpg' }],
  cs:        [{ name: 'Baran', initials: 'BA', color: '#F97316', img: './avatars/baran.jpg' }, { name: 'Saskia', initials: 'SA', color: '#F97316', img: './avatars/saskia.jpg' }],
  people:    [{ name: 'Tim', initials: 'TI', color: '#22C55E', img: './avatars/tim.jpg' }],
}

const DEPARTMENTS = [
  { id: 'marketing', name: 'Marketing',         icon: '📣', color: '#8B5CF6', metrics: ['cpl', 'calls', 'posts', 'followers'] },
  { id: 'sales',     name: 'Sales',             icon: '💰', color: '#F97316', metrics: ['callBookRate', 'costPerCall', 'closeRate', 'mrr'] },
  { id: 'cs',        name: 'Customer Success',  icon: '⭐', color: '#F59E0B', metrics: ['cardsDone', 'delivery', 'wins', 'acquisitionRate'] },
  { id: 'people',    name: 'People',            icon: '👥', color: '#22C55E', metrics: ['applicants', 'newHires', 'activeEditors', 'goodEditors', 'cardsPerEditor'] },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']


// Get month (0-11) and year from a week's start date
const getMonthYear = (week) => {
  if (!week.start) return { month: -1, year: -1 }
  const d = new Date(week.start)
  return { month: d.getMonth(), year: d.getFullYear() }
}

// Filter weeks that overlap with the given month (start ≤ month-end AND end ≥ month-start)
const filterByMonth = (weeks, month, year) => {
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0) // last day of month
  return weeks.filter(w => {
    if (!w.start || !w.end) return false
    const wStart = new Date(w.start)
    const wEnd = new Date(w.end)
    return wStart <= monthEnd && wEnd >= monthStart
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
        if (m.agg === 'frac') {
          // Sum numerator/denominator parts across weeks
          let num = 0, den = 0
          vals.forEach(v => { const [n, d] = String(v).split('/').map(Number); num += (n||0); den += (d||0) })
          agg[key] = `${num}/${den}`
        } else if (vals.length === 0) {
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

// Add a Total/Summary column to an array of columns
const addTotalColumn = (columns) => {
  const filled = columns.filter(w => !w.empty)

  const total = { label: 'Total', empty: false, isTotal: true, isCurrent: false }
  Object.keys(METRICS).forEach(key => {
    const m = METRICS[key]
    if (m.agg === 'frac') {
      const vals = filled.map(w => w[key]).filter(v => v !== null && v !== undefined)
      let num = 0, den = 0
      vals.forEach(v => { const [n, d] = String(v).split('/').map(Number); num += (n||0); den += (d||0) })
      total[key] = vals.length === 0 ? null : `${num}/${den}`
    } else {
      const vals = filled.map(w => w[key]).filter(v => v !== null && v !== undefined && !isNaN(Number(v)))
      if (vals.length === 0) {
        total[key] = null
      } else if (m.agg === 'sum') {
        total[key] = vals.reduce((a, b) => Number(a) + Number(b), 0)
      } else if (m.agg === 'avg') {
        total[key] = Math.round(vals.reduce((a, b) => Number(a) + Number(b), 0) / vals.length * 10) / 10
      } else if (m.agg === 'last') {
        total[key] = vals[vals.length - 1]
      }
    }
  })

  return [...columns, total]
}

// weekCount: how many weeks contributed to this value (for scaling sum thresholds)
const getStatus = (value, key, weekCount = 1) => {
  if (value === null || value === undefined) return 'neutral'
  const m = METRICS[key]
  if (!m) return 'neutral'
  // For fraction metrics, derive percentage from "num/den"
  if (m.agg === 'frac') {
    const [n, d] = String(value).split('/').map(Number)
    if (!d) return 'neutral'
    const pct = (n / d) * 100
    return pct >= m.green ? 'green' : pct >= m.yellow ? 'yellow' : 'red'
  }
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
  if (m.unit === 'frac') return String(val)
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
      <div className="metric-label" data-tooltip={m.desc}>
        <span className="metric-icon">{m.icon}</span>
        <span className="metric-name">{m.name}</span>
      </div>
      <div className="metric-values">
        {columns.map((col, i) => {
          if (col.empty) {
            return (
              <div key={i} className="metric-cell empty-cell">
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
          const tintClass = (!isCurrent && !isTotal && status !== 'neutral') ? `cell-tint-${status}` : ''
          
          return (
            <div key={i} className={`metric-cell ${tintClass} ${isCurrent ? 'current-week' : ''} ${isTotal ? 'total-cell' : ''}`}>
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
            <div key={i} className={`time-label ${col.empty ? 'empty' : ''} ${col.isTotal ? 'total-label' : ''}`}>
              {col.isTotal ? 'Total' : col.label}
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
      <div className="health-item green"><span className="health-dot"></span><span>{g}</span><span className="health-label">on track</span></div>
      <div className="health-item yellow"><span className="health-dot"></span><span>{y}</span><span className="health-label">at risk</span></div>
      <div className="health-item red"><span className="health-dot"></span><span>{r}</span><span className="health-label">off track</span></div>
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
  const { data: allWeeks, loading, syncing, lastSynced, error, refresh } = useScorecard()
  const [view, setView] = useState('month') // 'month' or 'quarter'
  const [activeTab, setActiveTab] = useState('scorecard') // 'scorecard' or 'kingdom'

  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [quarter, setQuarter] = useState(Math.floor(today.getMonth() / 3))
  const [year, setYear] = useState(today.getFullYear())

  // Auto-jump to the most recent month that has data (once)
  const hasAutoJumped = useRef(false)
  if (!hasAutoJumped.current && allWeeks.length > 0) {
    const last = allWeeks[allWeeks.length - 1]
    const { month: lm, year: ly } = getMonthYear(last)
    if (lm >= 0) {
      setMonth(lm)
      setYear(ly)
      setQuarter(Math.floor(lm / 3))
    }
    hasAutoJumped.current = true
  }

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

      // Process each week: add labels + current-week detection
      const processed = filtered.map((w) => {
        const startDate = w.start ? new Date(w.start) : null
        const endDate = w.end ? new Date(w.end) : null
        if (startDate) startDate.setHours(0, 0, 0, 0)
        if (endDate) endDate.setHours(23, 59, 59, 999)
        const todayNoon = new Date(today); todayNoon.setHours(12, 0, 0, 0)
        const isCurrent = startDate && endDate && todayNoon >= startDate && todayNoon <= endDate
        return { ...w, label: w.week ? `KW${w.week}` : '—', isCurrent }
      })

      // Place weeks by their week number relative to the first week of the month
      const firstWeek = processed.length > 0
        ? Math.min(...processed.map(w => w.week))
        : null
      // Figure out how many ISO weeks overlap this month
      const getISOWeek = (d) => {
        const date = new Date(d); date.setHours(0, 0, 0, 0)
        date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
        const week1 = new Date(date.getFullYear(), 0, 4)
        return 1 + Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
      }
      const monthFirstWeek = getISOWeek(new Date(year, month, 1))
      const monthLastWeek = getISOWeek(new Date(year, month + 1, 0))
      const totalSlots = monthLastWeek >= monthFirstWeek
        ? monthLastWeek - monthFirstWeek + 1
        : monthLastWeek + 52 - monthFirstWeek + 1 // year boundary
      const baseWeek = firstWeek != null ? Math.min(firstWeek, monthFirstWeek) : monthFirstWeek
      const slotCount = Math.max(totalSlots, processed.length > 0 ? Math.max(...processed.map(w => w.week)) - baseWeek + 1 : 0)
      const slots = Array.from({ length: slotCount }, () => ({ label: '—', empty: true }))

      processed.forEach(w => {
        const pos = w.week - baseWeek
        if (pos >= 0 && pos < slots.length) slots[pos] = w
      })

      // Only show 5th+ slot if it has data
      while (slots.length > 4 && slots[slots.length - 1].empty) slots.pop()

      return addTotalColumn(slots)
    } else {
      return addTotalColumn(aggregateToMonths(allWeeks, quarter, year))
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
            onClick={refresh}
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
        Sourced from Teable
        <br />
        <a href="https://app.teable.ai/base/bsedpj9rQtsQFsPC3xm/table/tbl7295480347s6oVaI/viwjRZfQ2vqmYKy3tnE" target="_blank" rel="noopener noreferrer">Open in Teable</a>
      </footer>
    </div>
  )
}

export default App
