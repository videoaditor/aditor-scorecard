import { useState, useEffect } from 'react'

const API_URL = 'https://gen.aditor.ai/api/brand-health'

const ACTIONS = [
  {
    id: 'write_scripts',
    name: 'Scriptorium',
    icon: '📜',
    type: 'creative',
    pp: 15,
    desc: 'Write new ad scripts',
    longDesc: 'Generates fresh ad scripts based on brand context, frameworks, and proven angles.',
    getDefault: (brand) => {
      const gap = Math.max(2, (brand.weeklyTarget || 4) - (brand.metrics?.deliveryVsTarget?.delivered || 0))
      return { count: gap }
    },
  },
  {
    id: 'fill_queue',
    name: 'Queue Aikido',
    icon: '📋',
    type: 'management',
    pp: 10,
    desc: 'Pipeline → NextUp',
    longDesc: 'Moves approved scripts from Pipeline to NextUp. Rebalances the queue.',
    getDefault: (brand) => {
      const queueGap = Math.max(1, 3 - (brand.metrics?.queueDepth?.count || 0))
      return { count: queueGap }
    },
  },
  {
    id: 'dispatch',
    name: 'Call to Arms',
    icon: '🎯',
    type: 'assignment',
    pp: 8,
    desc: 'Assign editor to card',
    longDesc: 'Finds an available editor matching the brand language and dispatches them via Slack.',
    getDefault: () => ({}),
  },
  {
    id: 'iterate',
    name: 'Ad Forge',
    icon: '🔥',
    type: 'ultimate',
    pp: 12,
    desc: 'New iterations from winners',
    longDesc: 'Generates new ad combinations from winning components. Cross-pollinates hooks × bodies.',
    getDefault: () => ({ count: 10 }),
  },
  {
    id: 'diagnose',
    name: 'Health Scan',
    icon: '🔍',
    type: 'utility',
    pp: 5,
    desc: 'Diagnose & recommend',
    longDesc: 'Deep analysis of what\'s wrong. Identifies root cause and recommends which action to take.',
    getDefault: () => ({}),
  },
]

function suggestActions(brand) {
  const suggestions = new Set()
  const m = brand.metrics || {}

  // Low queue → write scripts
  if ((m.queueDepth?.count || 0) < 2) {
    suggestions.add('write_scripts')
  }

  // Nothing active but queue has cards → dispatch
  if ((m.activeWork?.count || 0) === 0 && (m.queueDepth?.count || 0) > 0) {
    suggestions.add('dispatch')
  }

  // Health critical → diagnose first
  if (brand.health < 30) {
    suggestions.add('diagnose')
  }

  // Behind on delivery → write + iterate
  if ((m.deliveryVsTarget?.delivered || 0) < (brand.weeklyTarget || 0) * 0.5) {
    suggestions.add('write_scripts')
    suggestions.add('iterate')
  }

  return suggestions
}

function ActionButton({ action, brand, suggested, onTrigger, running }) {
  const [hover, setHover] = useState(false)
  const params = action.getDefault(brand)
  const isRunning = running === action.id

  return (
    <button
      className={`action-btn action-${action.type}${suggested ? ' suggested' : ''}${isRunning ? ' running' : ''}`}
      onClick={() => !isRunning && onTrigger(action, params)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={isRunning}
    >
      <div className="action-btn-top">
        <span className="action-icon">{action.icon}</span>
        <span className="action-name">{action.name}</span>
        <span className="action-pp">PP {action.pp}</span>
      </div>
      <div className="action-desc">
        {hover ? action.longDesc : action.desc}
      </div>
      {params.count && (
        <div className="action-param">×{params.count}</div>
      )}
      {suggested && <div className="action-suggested">⚡</div>}
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
  const [lastResult, setLastResult] = useState(null)
  const suggestions = suggestActions(brand)

  const handleTrigger = async (action, params) => {
    const confirmed = window.confirm(
      `Use ${action.name} on ${brand.name}?\n\n${action.longDesc}${params.count ? `\n\nCount: ${params.count}` : ''}`
    )
    if (!confirmed) return

    setRunning(action.id)
    setLastResult(null)

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
        onToast?.(`${action.icon} ${action.name} activated for ${brand.name}!`, 'success')
        setLastResult(data)
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
      {lastResult?.message && (
        <div className="action-result">
          {lastResult.message}
        </div>
      )}
    </div>
  )
}

export default BrandActions
