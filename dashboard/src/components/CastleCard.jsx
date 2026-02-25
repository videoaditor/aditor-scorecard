function CastleCard({ brand, health, onClick, loading, error, editors }) {
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

  const state = brand.isBuilding ? 'building' : brand.state
  const isPassive = brand.subscription === 'passive'

  return (
    <div className={`castle-card ${state}${isPassive ? ' passive' : ''}`} onClick={onClick}>
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
                <span className="editor-label">{editor.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="castle-name">{brand.name}</div>
    </div>
  )
}

export default CastleCard
