import { useState, useEffect } from 'react'
import CastleCard from './CastleCard'
import CastleDetail from './CastleDetail'
import '../castle-grid.css'

const API_URL = 'https://gen.aditor.ai/api/brand-health'

function CastleGrid() {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBrand, setSelectedBrand] = useState(null)
  const [cacheInfo, setCacheInfo] = useState(null)
  const [editorMap, setEditorMap] = useState({})

  const fetchHealth = async (forceRefresh = false) => {
    try {
      const url = forceRefresh ? `${API_URL}?refresh=true` : API_URL
      const res = await fetch(url)
      if (!res.ok) throw new Error('API error')
      const data = await res.json()

      const sortedBrands = (data.brands || []).sort((a, b) => {
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

  const handleCastleClick = (brand) => {
    setSelectedBrand(
      selectedBrand?.boardId === brand.boardId ? null : brand
    )
  }

  return (
    <div className="castle-grid-container">
      <div className="castle-grid-header">
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

      <div className="castle-grid">
        {brands.map(brand => (
          <CastleCard
            key={brand.boardId}
            brand={brand}
            health={brand.health}
            onClick={() => handleCastleClick(brand)}
            loading={loading}
            error={brand.error}
            editors={editorMap[brand.name] || []}
          />
        ))}
        {loading && brands.length === 0 && (
          Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="castle-card castle-loading">
              <div className="castle-skeleton"></div>
              <div className="castle-name" style={{ width: 60, height: 12 }}></div>
            </div>
          ))
        )}
      </div>

      <div className="castle-legend">
        <span className="legend-item">🔥 &lt;30%</span>
        <span className="legend-separator">|</span>
        <span className="legend-item">🏰 30-69%</span>
        <span className="legend-separator">|</span>
        <span className="legend-item">✨ ≥70%</span>
        <span className="legend-separator">|</span>
        <span className="legend-item">💤 passive</span>
        <span className="legend-separator">|</span>
        <span className="legend-item">⚔️ editor assigned</span>
      </div>

      {selectedBrand && (
        <CastleDetail
          brand={selectedBrand}
          onClose={() => setSelectedBrand(null)}
          editors={editorMap[selectedBrand.name] || []}
        />
      )}
    </div>
  )
}

export default CastleGrid
