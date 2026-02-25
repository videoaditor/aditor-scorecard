import { useState, useRef } from 'react'

function EditorCard({ editor, onClick, onDragStart }) {
  const [isDragging, setIsDragging] = useState(false)
  const cardRef = useRef(null)
  const stars = Math.max(0, Math.min(5, Math.round(editor.trustScore || 0)))
  const starDisplay = '★'.repeat(stars) + '☆'.repeat(5 - stars)

  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/json', JSON.stringify(editor))
    e.dataTransfer.effectAllowed = 'move'
    
    // Custom drag image — use the sprite directly
    const img = new Image()
    img.src = `/editors/editor-${editor.sprite}.png`
    e.dataTransfer.setDragImage(img, 28, 28)
    
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
        <div className="editor-card-stars">{starDisplay}</div>
        <div className="editor-card-meta">
          <span className={`editor-kappa ${editor.kappa}`}>{editor.kappa}</span>
          <span className="editor-rank">{editor.rank}</span>
        </div>
        {editor.brands.length > 0 && (
          <div className="editor-card-brands">
            {editor.brands.slice(0, 2).map((b, i) => (
              <span key={i} className="editor-brand-tag">{b}</span>
            ))}
            {editor.brands.length > 2 && (
              <span className="editor-brand-more">+{editor.brands.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default EditorCard
