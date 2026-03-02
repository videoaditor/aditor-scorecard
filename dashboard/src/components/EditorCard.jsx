import { useState, useRef } from 'react'

function EditorCard({ editor, onClick, onDragStart }) {
  const [isDragging, setIsDragging] = useState(false)
  const cardRef = useRef(null)
  // trustScore is 0-100, map to 0-5 stars
  const stars = Math.max(0, Math.min(5, Math.round((editor.trustScore || 0) / 20)))
  const starDisplay = '★'.repeat(stars) + '☆'.repeat(5 - stars)
  const isAvailable = !editor.hasAssignment && editor.brands.length === 0

  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/json', JSON.stringify(editor))
    e.dataTransfer.effectAllowed = 'move'
    
    // Custom drag image — fixed 56x56 canvas to prevent browser blowup
    const canvas = document.createElement('canvas')
    canvas.width = 56
    canvas.height = 56
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.src = `/editors/editor-${editor.sprite}.png`
    img.onload = () => ctx.drawImage(img, 0, 0, 56, 56)
    // Draw sync attempt (may already be cached)
    try { ctx.drawImage(img, 0, 0, 56, 56) } catch(err) {}
    e.dataTransfer.setDragImage(canvas, 28, 28)
    
    setIsDragging(true)
    onDragStart && onDragStart(editor)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    onDragStart && onDragStart(null)
  }

  return (
    <div
      ref={cardRef}
      className={`editor-card ${editor.kappa === 'busy' ? 'busy' : 'open'} ${editor.brands.length > 0 ? 'assigned' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => !isDragging && onClick(editor)}
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="editor-card-sprite">
        <img
          src={`/editors/editor-${editor.sprite}.png`}
          alt={editor.name}
          className="editor-card-img"
        />
      </div>
      <div className="editor-card-info">
        <div className="editor-card-name">{editor.name.split(' ')[0]}</div>
        <div className="editor-card-stars" title={`Trust: ${editor.trustScore || 0}/100 (${editor.trelloCards || 0} completed cards)`}>{starDisplay}</div>
        <div className="editor-card-meta">
          <span className={`editor-kappa ${isAvailable ? 'open' : 'busy'}`}>
            {isAvailable ? '✦ available' : 'assigned'}
          </span>
          <span className="editor-rank">{editor.rank}</span>
        </div>
        {editor.brands.length > 0 ? (
          <div className="editor-card-brands">
            {editor.brands.slice(0, 2).map((b, i) => (
              <span key={i} className="editor-brand-tag">{b}</span>
            ))}
            {editor.brands.length > 2 && (
              <span className="editor-brand-more">+{editor.brands.length - 2}</span>
            )}
          </div>
        ) : (
          <div className="editor-card-brands">
            <span className="editor-brand-tag" style={{background:'rgba(16,185,129,0.15)',color:'#10b981',border:'1px solid rgba(16,185,129,0.3)'}}>ready to assign</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default EditorCard
