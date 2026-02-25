const getMetricState = (score) => {
  if (score >= 70) return 'thriving'
  if (score >= 30) return 'neutral'
  return 'burning'
}

const METRIC_CONFIG = [
  { key: 'deliveryVsTarget', name: 'Delivery', icon: '📦' },
  { key: 'deliveryRhythm', name: 'Rhythm', icon: '🎵' },
  { key: 'queueDepth', name: 'Queue', icon: '📋' },
  { key: 'activeWork', name: 'Active', icon: '⚡' },
  { key: 'sentiment', name: 'Sentiment', icon: '💬' },
  { key: 'freshness', name: 'Fresh', icon: '🕐' },
]

function CastleDetail({ brand, onClose, editors = [] }) {
  const { metrics, health, recentActivity, weeklyTarget, state } = brand

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="castle-detail-overlay" onClick={handleOverlayClick} onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="castle-detail">
        <div className="detail-header">
          <div className="detail-title">
            <div className="detail-brand-name">{brand.name}</div>
            <div className="detail-health">
              Health: <strong className={`health-${state}`}>{health}%</strong>
              <span className="detail-target"> · {weeklyTarget}/wk target</span>
              {brand.subscription === 'passive' && <span className="detail-target"> · 💤 passive</span>}
            </div>
          </div>
          <button className="detail-close" onClick={onClose}>✕</button>
        </div>

        {/* Assigned Editors */}
        {editors.length > 0 && (
          <div className="detail-editors">
            <div className="detail-editors-label">Assigned Editors</div>
            <div className="detail-editors-list">
              {editors.map((editor, i) => (
                <div key={i} className="detail-editor-chip">
                  <img src={`/editors/editor-${editor.sprite}.png`} alt={editor.name} className="detail-editor-img" />
                  <span>{editor.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="detail-links">
          <a
            href={`https://trello.com/b/${brand.boardId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="detail-link-btn"
          >
            📋 Trello
          </a>
        </div>

        {/* Metrics */}
        {metrics && Object.keys(metrics).length > 0 && (
          <div className="detail-metrics">
            {METRIC_CONFIG.map(({ key, name, icon }) => {
              const m = metrics[key]
              if (!m) return null
              const mState = getMetricState(m.score)

              return (
                <div key={key} className={`metric-item ${mState}`}>
                  <div className="metric-item-header">
                    <div className="metric-item-name">{icon} {name}</div>
                    <div className="metric-weight">{m.weight}</div>
                  </div>
                  <div className="metric-item-value">{m.score}%</div>
                  <div className="metric-progress-bar">
                    <div
                      className="metric-progress-fill"
                      style={{ width: `${Math.min(m.score, 100)}%` }}
                    />
                  </div>
                  <div className="metric-label">{m.label}</div>
                </div>
              )
            })}
          </div>
        )}

        {(!metrics || Object.keys(metrics).length === 0) && (
          <div className="detail-metrics">
            <div className="activity-empty">Error loading metrics</div>
          </div>
        )}

        {/* Alerts */}
        {brand.alerts && brand.alerts.length > 0 && (
          <div className="detail-alerts">
            {brand.alerts.map((alert, i) => (
              <div key={i} className={`alert-item alert-${alert.severity}`}>
                {alert.severity === 'critical' ? '🚨' : '⚠️'} {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Recent Activity */}
        <div className="detail-activity">
          <div className="activity-header">Recent Activity</div>
          {recentActivity && recentActivity.length > 0 ? (
            <div className="activity-list">
              {recentActivity.map((a, i) => (
                <div key={i} className="activity-item">
                  <span className="activity-card">{a.card}</span>
                  <span className="activity-arrow">{a.from} → {a.to}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="activity-empty">No recent card movements</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CastleDetail
