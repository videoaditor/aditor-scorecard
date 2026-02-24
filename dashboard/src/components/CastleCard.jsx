const getCastleState = (health, brand) => {
  // New brands / trial week = building state
  if (brand.isBuilding) return 'building'
  if (health >= 70) return 'thriving'
  if (health >= 30) return 'neutral'
  return 'burning'
}

function CastleCard({ brand, health, onClick, loading, error }) {
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
          <img
            src="/castles/castle-neutral.png"
            alt={brand.name}
            className="castle-image"
          />
        </div>
        <div className="castle-name">{brand.name}</div>
      </div>
    )
  }

  const state = getCastleState(health, brand)

  return (
    <div className={`castle-card ${state}`} onClick={onClick}>
      <div className="health-badge">
        {state === 'building' ? '🔨' : `${Math.round(health)}%`}
      </div>
      <div className="castle-image-wrapper">
        <img
          src={`/castles/castle-${state}.png`}
          alt={`${brand.name} castle - ${state}`}
          className="castle-image"
        />
      </div>
      <div className="castle-name">{brand.name}</div>
    </div>
  )
}

export default CastleCard
