import { useState } from 'react'

const getCastleState = (health) => {
  if (health >= 70) return 'thriving'
  if (health >= 30) return 'neutral'
  return 'burning'
}

const getCastleImage = (state) => {
  return `/castles/castle-${state}.png`
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

  const state = getCastleState(health)
  const imageUrl = getCastleImage(state)

  return (
    <div className={`castle-card ${state}`} onClick={onClick}>
      <div className="health-badge">{Math.round(health)}%</div>
      <div className="castle-image-wrapper">
        <img
          src={imageUrl}
          alt={`${brand.name} castle - ${state}`}
          className="castle-image"
        />
      </div>
      <div className="castle-name">{brand.name}</div>
    </div>
  )
}

export default CastleCard
