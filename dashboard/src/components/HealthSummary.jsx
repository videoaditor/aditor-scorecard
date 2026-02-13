export default function HealthSummary({ counts }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22C55E' }}></span>
        <span className="text-white/60">{counts.green}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FACC15' }}></span>
        <span className="text-white/60">{counts.yellow}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }}></span>
        <span className="text-white/60">{counts.red}</span>
      </div>
    </div>
  )
}
