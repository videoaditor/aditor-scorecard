const STATUS_STYLES = {
  green: { background: 'rgba(34, 197, 94, 0.12)', color: '#22C55E' },
  yellow: { background: 'rgba(250, 204, 21, 0.10)', color: '#FACC15' },
  red: { background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' },
  gray: { background: 'transparent', color: 'rgba(255,255,255,0.3)' },
}

export default function GridCell({ value, unit, status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.gray

  const formatValue = () => {
    if (value === null || value === undefined) return '—'
    if (unit === '€') return `€${value}`
    if (unit === 'k€') return `${value}k`
    if (unit === '%') return `${value}%`
    if (unit === 'h') return `${value}h`
    return value
  }

  return (
    <div 
      className="py-1 px-2 rounded-md text-sm font-medium"
      style={{ 
        background: style.background, 
        color: style.color,
        fontFamily: "'JetBrains Mono', monospace"
      }}
    >
      {formatValue()}
    </div>
  )
}
