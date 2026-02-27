import { useState } from 'react'

// localStorage key for extinguished brands
const EXTINGUISH_KEY = 'extinguished_brands'

function getExtinguished() {
  try {
    const data = JSON.parse(localStorage.getItem(EXTINGUISH_KEY) || '{}')
    const now = Date.now()
    // Expire at midnight local time
    const midnight = new Date()
    midnight.setHours(24, 0, 0, 0)
    // Clean up any expired entries
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, expiry]) => expiry > now)
    )
    if (Object.keys(cleaned).length !== Object.keys(data).length) {
      localStorage.setItem(EXTINGUISH_KEY, JSON.stringify(cleaned))
    }
    return cleaned
  } catch { return {} }
}

function setExtinguished(boardId) {
  const data = getExtinguished()
  const midnight = new Date()
  midnight.setHours(24, 0, 0, 0)
  data[boardId] = midnight.getTime()
  localStorage.setItem(EXTINGUISH_KEY, JSON.stringify(data))
}

function CastleCard({ brand, health, onClick, loading, error, editors, onEditorDrop, isExpanded, isDimmed }) {
  const [dragOver, setDragOver] = useState(false)
  const [extinguished, setExtinguishedState] = useState(() => !!getExtinguished()[brand?.boardId])

  const handleExtinguish = (e) => {
    e.stopPropagation()
    setExtinguished(brand.boardId)
    setExtinguishedState(true)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    try {
      const editor = JSON.parse(e.dataTransfer.getData('application/json'))
      if (editor && onEditorDrop) {
        onEditorDrop(editor, brand)
      }
    } catch (err) {
      console.error('Drop error:', err)
    }
  }

  if (loading) {
    return (
      <div className="castle-card castle-loading">
        <div className="castle-skeleton"></div>
        <div className="castle-name">{brand.name}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="castle-card castle-error neutral" onClick={onClick}>
        <div className="castle-image-wrapper">
          <img src="/castles/castle-neutral.png" alt={brand.name} className="castle-image" />
        </div>
        <div className="castle-name">{brand.name}</div>
      </div>
    )
  }

  const isPassive = brand.subscription === 'passive' || brand.subscription === 'none'
  const rawState = brand.isBuilding ? 'building' : (isPassive ? 'passive' : brand.state)
  // If manually extinguished, downgrade burning → embers until midnight
  const state = (rawState === 'burning' && extinguished) ? 'embers' : rawState

  return (
    <div
      className={`castle-card ${state}${isPassive ? ' passive' : ''}${dragOver ? ' drag-over' : ''}${isExpanded ? ' expanded' : ''}${isDimmed ? ' dimmed' : ''}`}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="health-badge">
        {state === 'building' ? '🔨' : `${Math.round(health)}%`}
      </div>
      {isPassive && <div className="passive-badge">💤</div>}
      <div className="castle-scene">
        <div className="castle-image-wrapper">
          <img
            src={`/castles/castle-${state}.png`}
            alt={`${brand.name} castle - ${state}`}
            className="castle-image"
          />
        </div>
        {editors && editors.length > 0 && (
          <div className="editor-sprites">
            {editors.slice(0, 2).map((editor, i) => (
              <div key={i} className="editor-sprite" title={editor.name}>
                <img
                  src={`/editors/editor-${editor.sprite}.png`}
                  alt={editor.name}
                  className="editor-image"
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="castle-name">{brand.name}</div>
      {rawState === 'burning' && !extinguished && (
        <button className="extinguish-btn" onClick={handleExtinguish} title="Mark as handled — suppresses fire until tomorrow">
          🪣 extinguish
        </button>
      )}
      {state === 'embers' && (
        <div className="embers-badge" title="Manually extinguished — resets at midnight">🪵 handled</div>
      )}
      {dragOver && <div className="drop-indicator">Drop to assign</div>}
    </div>
  )
}

export default CastleCard
