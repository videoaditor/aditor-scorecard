export default function HealthSummary({ counts }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-metric-green"></span>
        <span className="text-white/60">{counts.green}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-metric-yellow"></span>
        <span className="text-white/60">{counts.yellow}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-metric-red"></span>
        <span className="text-white/60">{counts.red}</span>
      </div>
    </div>
  )
}
