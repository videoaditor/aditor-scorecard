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

  // Use API-provided state, fallback to 'building' if isBuilding flag is set
  const state = brand.isBuilding ? 'building' : brand.state

  const isPassive = brand.subscription === 'passive'

  return (
    <div className={`castle-card ${state}${isPassive ? ' passive' : ''}`} onClick={onClick}>
      <div className="health-badge">
        {state === 'building' ? '🔨' : `${Math.round(health)}%`}
      </div>
      {isPassive && <div className="passive-badge">💤</div>}
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
