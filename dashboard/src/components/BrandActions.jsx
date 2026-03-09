import { useState } from 'react'

const API_URL = 'https://gen.aditor.ai/api/brand-health'

const ACTIONS = [
  {
    id: 'push_propaganda',
    name: 'Push Propaganda',
    icon: '📜',
    type: 'creative',
    desc: 'Write new ad scripts for the masses',
    getDefault: (brand) => {
      const gap = Math.max(2, (brand.weeklyTarget || 4) - (brand.metrics?.deliveryVsTarget?.delivered || 0))
      return { count: gap }
    },
    isLocked: () => false,
    lockReason: '',
  },
  {
    id: 'declare_war',
    name: 'Declare War',
    icon: '⚔️',
    type: 'assignment',
    desc: 'Rally editors to battle',
    getDefault: () => ({}),
    isLocked: () => false,
    lockReason: '',
  },
  {
    id: 'breed_winners',
    name: 'Breed Winners',
    icon: '🔥',
    type: 'ultimate',
    desc: 'Forge iterations from champions',
    getDefault: () => ({ count: 10 }),
    isLocked: (brand) => !brand.hasWinningComponents,
    lockReason: 'Needs winning components',
  },
  {
    id: 'coming_soon',
    name: '???',
    icon: '🔒',
    type: 'locked',
    desc: 'Coming soon',
    getDefault: () => ({}),
    isLocked: () => true,
    lockReason: 'Coming soon',
  },
]

function suggestActions(brand) {
  const suggestions = new Set()
  const m = brand.metrics || {}

  if ((m.queueDepth?.count || 0) < 2) {
    suggestions.add('push_propaganda')
  }

  if ((m.activeWork?.count || 0) === 0 && (m.queueDepth?.count || 0) > 0) {
    suggestions.add('declare_war')
  }

  if ((m.deliveryVsTarget?.delivered || 0) < (brand.weeklyTarget || 0) * 0.5) {
    suggestions.add('push_propaganda')
  }

  if (brand.hasWinningComponents && brand.health < 50) {
    suggestions.add('breed_winners')
  }

  return suggestions
}

function ActionButton({ action, brand, suggested, onTrigger, running }) {
  const params = action.getDefault(brand)
  const isRunning = running === action.id
  const locked = action.isLocked(brand)

  return (
    <button
      className={`action-btn action-${action.type}${suggested ? ' suggested' : ''}${isRunning ? ' running' : ''}${locked ? ' locked' : ''}`}
      onClick={() => !isRunning && !locked && onTrigger(action, params)}
      disabled={isRunning || locked}
    >
      <div className="action-btn-top">
        <span className="action-icon">{action.icon}</span>
        <span className="action-name">{action.name}</span>
      </div>
      <div className="action-desc">
        {locked ? action.lockReason : action.desc}
      </div>
      {params.count && !locked && (
        <div className="action-param">×{params.count}</div>
      )}
      {suggested && !locked && <div className="action-suggested">⚡</div>}
      {isRunning && (
        <div className="action-running-overlay">
          <div className="action-spinner" />
        </div>
      )}
    </button>
  )
}

function BrandActions({ brand, onToast }) {
  const [running, setRunning] = useState(null)
  const suggestions = suggestActions(brand)

  const handleTrigger = async (action, params) => {
    const confirmed = window.confirm(
      `${action.name} — ${brand.name}?\n\n${action.desc}${params.count ? `\nCount: ${params.count}` : ''}`
    )
    if (!confirmed) return

    setRunning(action.id)

    try {
      const res = await fetch(`${API_URL}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action.id,
          brand: brand.name,
          brandBoard: brand.boardId,
          params,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        onToast?.(data.error || 'Action failed', 'error')
      } else {
        onToast?.(`${action.icon} ${action.name} — ${brand.name}`, 'success')
      }
    } catch (err) {
      onToast?.('Connection error', 'error')
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="brand-actions">
      <div className="brand-actions-header">
        <span className="brand-actions-icon">⚔️</span>
        <span className="brand-actions-title">ACTIONS</span>
      </div>
      <div className="brand-actions-grid">
        {ACTIONS.map(action => (
          <ActionButton
            key={action.id}
            action={action}
            brand={brand}
            suggested={suggestions.has(action.id)}
            onTrigger={handleTrigger}
            running={running}
          />
        ))}
      </div>
    </div>
  )
}

export default BrandActions
