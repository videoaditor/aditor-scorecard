import GridCell from './GridCell'

export default function ScoreGrid({ data, getStatus }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-white/40 text-xs uppercase tracking-wider">
            <th className="sticky left-0 bg-body text-left py-3 px-4 min-w-[140px]"></th>
            <th className="text-center py-3 px-2 w-12">DRI</th>
            {data.weeks.map((week, i) => (
              <th 
                key={week}
                className={`text-center py-3 px-3 min-w-[70px] ${
                  week === data.currentWeek ? 'column-active rounded-t-lg' : ''
                }`}
              >
                {week}
              </th>
            ))}
            <th className="text-center py-3 px-3 min-w-[60px] border-l border-white/10">MTD</th>
            <th className="text-center py-3 px-3 min-w-[60px]">QTD</th>
          </tr>
        </thead>
        <tbody>
          {data.departments.map((dept, deptIdx) => (
            <>
              {/* Department Header */}
              <tr key={`dept-${deptIdx}`} className="border-t border-white/5">
                <td 
                  colSpan={data.weeks.length + 4}
                  className="sticky left-0 bg-body py-2 px-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 bg-accent rounded-full"></span>
                    <span className="font-semibold text-white/80 text-xs tracking-wider">
                      {dept.name}
                    </span>
                  </div>
                </td>
              </tr>
              
              {/* Metric Rows */}
              {dept.metrics.map((metric, metricIdx) => {
                const status = getStatus(metric)
                return (
                  <tr 
                    key={metric.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="sticky left-0 bg-body py-2 px-4 text-white/70 font-medium">
                      {metric.name}
                    </td>
                    <td className="text-center py-2 px-2 text-white/40 text-xs">
                      {metric.dri}
                    </td>
                    {data.weeks.map((week) => {
                      const weekStatus = getWeekStatus(metric, week)
                      return (
                        <td 
                          key={`${metric.id}-${week}`}
                          className={`text-center py-2 px-3 ${
                            week === data.currentWeek ? 'column-active' : ''
                          }`}
                        >
                          <GridCell 
                            value={metric.values[week]}
                            unit={metric.unit}
                            status={weekStatus}
                          />
                        </td>
                      )
                    })}
                    <td className="text-center py-2 px-3 text-white/50 font-mono text-xs border-l border-white/5">
                      {formatValue(metric.mtd, metric.unit)}
                    </td>
                    <td className="text-center py-2 px-3 text-white/50 font-mono text-xs">
                      {formatValue(metric.qtd, metric.unit)}
                    </td>
                  </tr>
                )
              })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function getWeekStatus(metric, week) {
  const val = metric.values[week]
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

function formatValue(value, unit) {
  if (value === null || value === undefined) return '—'
  if (unit === '€') return `€${value}`
  if (unit === 'k€') return `${value}k`
  if (unit === '%') return `${value}%`
  if (unit === 'h') return `${value}h`
  return value
}
