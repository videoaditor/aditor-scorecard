export default function TimeToggle({ selected, onChange }) {
  const options = [
    { key: 'W', label: 'W' },
    { key: 'M', label: 'M' },
    { key: 'Q', label: 'Q' },
    { key: 'Y', label: 'Y' },
  ]

  return (
    <div className="flex bg-white/5 rounded-lg p-1">
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`
            px-3 py-1 rounded-md text-sm font-medium transition-all
            ${selected === opt.key 
              ? 'bg-accent text-white shadow-lg shadow-accent/20' 
              : 'text-white/50 hover:text-white/80'
            }
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
