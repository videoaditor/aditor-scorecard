import { useState, useEffect } from 'react'
import ScoreGrid from './components/ScoreGrid'
import TimeToggle from './components/TimeToggle'
import HealthSummary from './components/HealthSummary'

// Demo data - will be replaced with Google Sheets API
const DEMO_DATA = {
  weeks: ['Wk 4', 'Wk 5', 'Wk 6', 'Wk 7'],
  currentWeek: 'Wk 7',
  departments: [
    {
      name: 'MARKETING',
      metrics: [
        { id: 'M1', name: 'CPL (Qual.)', dri: 'AS', values: { 'Wk 4': 72, 'Wk 5': 95, 'Wk 6': 68, 'Wk 7': 160 }, unit: '€', direction: 'lower', thresholds: { red: 150, yellow: 80 }, mtd: 99, qtd: 88 },
        { id: 'M2', name: 'Sales Calls', dri: 'AS', values: { 'Wk 4': 5, 'Wk 5': 3, 'Wk 6': 6, 'Wk 7': 4 }, unit: '#', direction: 'higher', thresholds: { red: 2, yellow: 4 }, mtd: 18, qtd: 42 },
        { id: 'M3', name: 'SM Posts', dri: 'AS', values: { 'Wk 4': 8, 'Wk 5': 7, 'Wk 6': 4, 'Wk 7': 2 }, unit: '#', direction: 'higher', thresholds: { red: 3, yellow: 5 }, mtd: 21, qtd: 58 },
      ]
    },
    {
      name: 'SALES',
      metrics: [
        { id: 'S1', name: 'Close Rate', dri: 'AS', values: { 'Wk 4': 33, 'Wk 5': 20, 'Wk 6': 40, 'Wk 7': 25 }, unit: '%', direction: 'higher', thresholds: { red: 15, yellow: 30 }, mtd: 30, qtd: 28 },
        { id: 'S2', name: 'Revenue (MRR)', dri: 'AS', values: { 'Wk 4': 30, 'Wk 5': 31, 'Wk 6': 31, 'Wk 7': 33 }, unit: 'k€', direction: 'higher', thresholds: { red: 25, yellow: 35 }, mtd: 33, qtd: 33 },
        { id: 'S3', name: 'Profit Margin', dri: 'AS', values: { 'Wk 4': 45, 'Wk 5': 42, 'Wk 6': 52, 'Wk 7': 55 }, unit: '%', direction: 'higher', thresholds: { red: 30, yellow: 50 }, mtd: 48, qtd: 46 },
      ]
    },
    {
      name: 'CUST. SUCCESS',
      metrics: [
        { id: 'C1', name: 'Good Editors #', dri: 'T', values: { 'Wk 4': 4, 'Wk 5': 4, 'Wk 6': 3, 'Wk 7': 4 }, unit: '#', direction: 'higher', thresholds: { red: 3, yellow: 4 }, mtd: 4, qtd: 4 },
        { id: 'C2', name: 'Wins', dri: 'AS', values: { 'Wk 4': 3, 'Wk 5': 5, 'Wk 6': 6, 'Wk 7': 3 }, unit: '#', direction: 'higher', thresholds: { red: 2, yellow: 4 }, mtd: 17, qtd: 44 },
        { id: 'C3', name: 'Delivery Time', dri: 'T', values: { 'Wk 4': 42, 'Wk 5': 56, 'Wk 6': 44, 'Wk 7': 46 }, unit: 'h', direction: 'lower', thresholds: { red: 72, yellow: 48 }, mtd: 47, qtd: 48 },
      ]
    },
    {
      name: 'PEOPLE',
      metrics: [
        { id: 'P1', name: 'Applicants', dri: 'T', values: { 'Wk 4': 2, 'Wk 5': 0, 'Wk 6': 1, 'Wk 7': 4 }, unit: '#', direction: 'higher', thresholds: { red: 1, yellow: 2 }, mtd: 7, qtd: 12 },
        { id: 'P2', name: 'Interviews', dri: 'T', values: { 'Wk 4': 1, 'Wk 5': 0, 'Wk 6': 1, 'Wk 7': 2 }, unit: '#', direction: 'higher', thresholds: { red: 0, yellow: 1 }, mtd: 4, qtd: 8 },
        { id: 'P3', name: 'Hires', dri: 'T', values: { 'Wk 4': null, 'Wk 5': null, 'Wk 6': null, 'Wk 7': 1 }, unit: '#', direction: 'higher', thresholds: { red: 0, yellow: 0 }, mtd: 1, qtd: 2 },
      ]
    },
  ]
}

function App() {
  const [timeView, setTimeView] = useState('W')
  const [data, setData] = useState(DEMO_DATA)

  // Calculate health summary
  const allMetrics = data.departments.flatMap(d => d.metrics)
  const currentWeekValues = allMetrics.map(m => ({
    value: m.values[data.currentWeek],
    ...m
  }))

  const getStatus = (metric) => {
    const val = metric.values[data.currentWeek]
    if (val === null) return 'gray'
    const { red, yellow } = metric.thresholds
    if (metric.direction === 'higher') {
      if (val < red) return 'red'
      if (val < yellow) return 'yellow'
      return 'green'
    } else {
      if (val > red) return 'red'
      if (val > yellow) return 'yellow'
      return 'green'
    }
  }

  const statusCounts = {
    green: allMetrics.filter(m => getStatus(m) === 'green').length,
    yellow: allMetrics.filter(m => getStatus(m) === 'yellow').length,
    red: allMetrics.filter(m => getStatus(m) === 'red').length,
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-accent">▌</span>ADITOR SCORECARD
          </h1>
          <p className="text-white/60 text-sm mt-1">Week 7 · Feb 10–16, 2026</p>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <HealthSummary counts={statusCounts} />
          <TimeToggle selected={timeView} onChange={setTimeView} />
        </div>
      </header>

      {/* Scorecard Grid */}
      <main className="glass-panel p-4 md:p-6 overflow-x-auto">
        <ScoreGrid 
          data={data} 
          getStatus={getStatus}
        />
      </main>

      {/* Footer */}
      <footer className="mt-6 text-center text-white/30 text-xs">
        Last updated: {new Date().toLocaleString()} · Pull to refresh
      </footer>
    </div>
  )
}

export default App
