function EditorDetail({ editor, onClose }) {
  const stars = Math.max(0, Math.min(5, Math.round(editor.trustScore || 0)))
  const starDisplay = '★'.repeat(stars) + '☆'.repeat(5 - stars)

  return (
    <div className="editor-detail">
      <div className="editor-detail-header">
        <div className="editor-detail-profile">
          <img
            src={`/editors/editor-${editor.sprite}.png`}
            alt={editor.name}
            className="editor-detail-avatar"
          />
          <div className="editor-detail-title">
            <div className="editor-detail-name">{editor.name}</div>
            <div className="editor-detail-stars">{starDisplay}</div>
            <div className="editor-detail-badges">
              <span className={`editor-kappa-badge ${editor.kappa}`}>{editor.kappa}</span>
              <span className="editor-rank-badge">{editor.rank}</span>
            </div>
          </div>
        </div>
        <button className="detail-close" onClick={onClose}>Close</button>
      </div>

      <div className="editor-detail-stats">
        <div className="editor-stat">
          <div className="editor-stat-value">{editor.trustScore || 0}</div>
          <div className="editor-stat-label">Trust Score</div>
        </div>
        <div className="editor-stat">
          <div className="editor-stat-value">{editor.totalProjects || 0}</div>
          <div className="editor-stat-label">Total Projects</div>
        </div>
        <div className="editor-stat">
          <div className="editor-stat-value">{editor.gold || 0}</div>
          <div className="editor-stat-label">Gold Earned</div>
        </div>
        <div className="editor-stat">
          <div className="editor-stat-value">{editor.projectCount || 0}</div>
          <div className="editor-stat-label">Active Tasks</div>
        </div>
      </div>

      {editor.brands.length > 0 && (
        <div className="editor-detail-brands">
          <div className="editor-section-title">Assigned Brands</div>
          <div className="editor-brand-list">
            {editor.brands.map((b, i) => (
              <div key={i} className="editor-brand-item">
                <img src="/castles/castle-neutral.png" alt="" className="editor-brand-castle" />
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {editor.brands.length === 0 && (
        <div className="editor-detail-empty">
          <span>⚔️</span> No brands assigned yet — drag this editor onto a castle!
        </div>
      )}
    </div>
  )
}

export default EditorDetail
