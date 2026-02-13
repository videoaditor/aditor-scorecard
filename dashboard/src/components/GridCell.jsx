export default function GridCell({ value, unit, status }) {
  const statusClasses = {
    green: 'cell-green text-metric-green',
    yellow: 'cell-yellow text-metric-yellow',
    red: 'cell-red text-metric-red',
    gray: 'text-white/30',
  }

  const formatValue = () => {
    if (value === null || value === undefined) return '—'
    if (unit === '€') return `€${value}`
    if (unit === 'k€') return `${value}k`
    if (unit === '%') return `${value}%`
    if (unit === 'h') return `${value}h`
    return value
  }

  return (
    <div className={`
      py-1 px-2 rounded-md font-mono text-sm font-medium
      ${statusClasses[status] || statusClasses.gray}
    `}>
      {formatValue()}
    </div>
  )
}
