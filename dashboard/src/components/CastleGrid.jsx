import { useState, useEffect, useRef } from 'react'
import CastleCard from './CastleCard'
import CastleDetail from './CastleDetail'
import EditorSection from './EditorSection'
import BrandActions from './BrandActions'
import '../castle-grid.css'

const API_URL = 'https://gen.aditor.ai/api/brand-health'

function CastleGrid() {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBrand, setSelectedBrand] = useState(null)
  const [cacheInfo, setCacheInfo] = useState(null)
  const [editorMap, setEditorMap] = useState({})
  const [allEditors, setAllEditors] = useState([])
  const [brandRecordIds, setBrandRecordIds] = useState({})
  const [toast, setToast] = useState(null)
  const [draggingEditor, setDraggingEditor] = useState(null)
  const expandRef = useRef(null)

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchHealth = async (forceRefresh = false) => {
    try {
      const url = forceRefresh ? `${API_URL}?refresh=true` : API_URL
      const res = await fetch(url)
      if (!res.ok) throw new Error('API error')
      const data = await res.json()

      const sortedBrands = (data.brands || []).sort((a, b) => {
        const aPassive = a.subscription === 'passive' || a.subscription === 'none'
        const bPassive = b.subscription === 'passive' || b.subscription === 'none'
        if (aPassive !== bPassive) return aPassive ? 1 : -1
        const stateOrder = { burning: 0, neutral: 1, thriving: 2 }
        const stateA = a.isBuilding ? 'neutral' : a.state
        const stateB = b.isBuilding ? 'neutral' : b.state
        return stateOrder[stateA] - stateOrder[stateB]
      })

      setBrands(sortedBrands)
      setCacheInfo({
        cached: data.cached,
        cacheAge: data.cacheAge,
        computeMs: data.computeMs,
      })
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch brand health:', err)
      setLoading(false)
    }
  }

  const fetchEditors = async () => {
    try {
      const res = await fetch(`${API_URL}/editors`)
      if (!res.ok) return
      const data = await res.json()
      setEditorMap(data.editors || {})
      setAllEditors(data.allEditors || [])
      setBrandRecordIds(data.brandRecordIds || {})
    } catch (err) {
      console.error('Failed to fetch editors:', err)
    }
  }

  useEffect(() => {
    fetchHealth()
    fetchEditors()
    const interval = setInterval(() => fetchHealth(), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Close on ESC
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && selectedBrand) {
        setSelectedBrand(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedBrand])

  // Scroll expanded view into view
  useEffect(() => {
    if (selectedBrand && expandRef.current) {
      setTimeout(() => {
        expandRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [selectedBrand])

  const handleCastleClick = (brand) => {
    setSelectedBrand(
      selectedBrand?.boardId === brand.boardId ? null : brand
    )
  }

  const handleEditorDrop = async (editor, brand) => {
    const confirmed = window.confirm(`Assign ${editor.name} to ${brand.name}?`)
    if (!confirmed) return

    try {
      const res = await fetch(`${API_URL}/assign-editor`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandRecordId: brandRecordIds[brand.name],
          editorRecordId: editor.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Assignment failed', 'error')
        return
      }
      showToast(`${editor.name} assigned to ${brand.name}!`, 'success')
      fetchEditors()
    } catch (err) {
      showToast('Read-only mode — contact admin to enable assignments', 'error')
    }
  }

  const isExpanded = selectedBrand !== null

  return (
    <div className="castle-grid-container">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'error' ? '⚠️' : '✅'} {toast.msg}
        </div>
      )}

      <div className="castle-grid-header">
        <div className="castle-grid-title">KINGDOMS</div>
        <div className="castle-grid-controls">
          <button
            className="refresh-btn"
            onClick={() => { fetchHealth(true); fetchEditors(); }}
            title="Force refresh (bypass cache)"
          >
            ↻
          </button>
          {cacheInfo && (
            <span className="cache-info">
              {cacheInfo.cached
                ? `cached ${cacheInfo.cacheAge}s ago`
                : `live (${cacheInfo.computeMs}ms)`}
            </span>
          )}
        </div>
      </div>

      <div className={`castle-grid${draggingEditor ? ' drop-mode' : ''}${isExpanded ? ' has-expanded' : ''}`}>
        {brands.map(brand => {
          const isSelected = selectedBrand?.boardId === brand.boardId
          return (
            <CastleCard
              key={brand.boardId}
              brand={brand}
              health={brand.health}
              onClick={() => handleCastleClick(brand)}
              loading={loading}
              error={brand.error}
              editors={editorMap[brand.name] || []}
              onEditorDrop={handleEditorDrop}
              isExpanded={isSelected}
              isDimmed={isExpanded && !isSelected}
            />
          )
        })}
        {loading && brands.length === 0 && (
          Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="castle-card castle-loading">
              <div className="castle-skeleton"></div>
              <div className="castle-name" style={{ width: 60, height: 12 }}></div>
            </div>
          ))
        )}
      </div>

      {/* Inline expanded brand view */}
      {selectedBrand && (
        <div className="brand-expanded" ref={expandRef}>
          <div className="brand-expanded-inner">
            {/* Floating castle */}
            <div className="brand-expanded-hero">
              <div className="brand-expanded-castle">
                <img
                  src={`/castles/castle-${selectedBrand.isBuilding ? 'building' : selectedBrand.state}.png`}
                  alt={selectedBrand.name}
                  className="brand-expanded-castle-img"
                />
                <div className="brand-expanded-glow" data-state={selectedBrand.state} />
              </div>
              <div className="brand-expanded-title-area">
                <h2 className="brand-expanded-name">{selectedBrand.name}</h2>
                <div className="brand-expanded-health">
                  <span className={`health-${selectedBrand.state}`}>{selectedBrand.health}%</span>
                  <span className="brand-expanded-target">{selectedBrand.weeklyTarget}/wk target</span>
                  {selectedBrand.subscription === 'passive' && <span className="brand-expanded-passive">💤 passive</span>}
                </div>
                {/* Assigned editors */}
                {(editorMap[selectedBrand.name] || []).length > 0 && (
                  <div className="brand-expanded-editors">
                    {(editorMap[selectedBrand.name] || []).map((editor, i) => (
                      <div key={i} className="brand-expanded-editor-chip">
                        <img src={`/editors/editor-${editor.sprite}.png`} alt={editor.name} className="brand-expanded-editor-img" />
                        <span>{editor.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className="brand-expanded-close" onClick={() => setSelectedBrand(null)}>✕</button>
            </div>

            {/* Quick links */}
            <div className="brand-expanded-links">
              <a
                href={`https://trello.com/b/${selectedBrand.boardId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="brand-expanded-link"
              >
                📋 Trello
              </a>
            </div>

            {/* Two columns: metrics left, actions right */}
            <div className="brand-expanded-body">
              <div className="brand-expanded-metrics">
                <CastleDetail brand={selectedBrand} inline={true} />
              </div>
              <div className="brand-expanded-actions-col">
                <BrandActions brand={selectedBrand} onToast={showToast} />
              </div>
            </div>

            {/* Recent activity at bottom */}
            {selectedBrand.recentActivity && selectedBrand.recentActivity.length > 0 && (
              <div className="brand-expanded-activity">
                <div className="brand-expanded-activity-header">Recent Activity</div>
                <div className="brand-expanded-activity-list">
                  {selectedBrand.recentActivity.slice(0, 5).map((a, i) => (
                    <div key={i} className="brand-expanded-activity-item">
                      <span className="activity-arrow-icon">→</span>
                      <span className="activity-card-name">{a.card}</span>
                      <span className="activity-move">{a.from} → {a.to}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="castle-legend">
        <span className="legend-item">🔥 &lt;30%</span>
        <span className="legend-separator">|</span>
        <span className="legend-item">🏰 30-69%</span>
        <span className="legend-separator">|</span>
        <span className="legend-item">✨ ≥70%</span>
        <span className="legend-separator">|</span>
        <span className="legend-item">💤 passive</span>
      </div>

      <EditorSection
        allEditors={allEditors}
        onDragStart={(editor) => setDraggingEditor(editor)}
      />
    </div>
  )
}

export default CastleGrid
