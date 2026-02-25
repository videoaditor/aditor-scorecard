const getMetricState = (score) => {
  if (score >= 70) return 'thriving'
  if (score >= 30) return 'neutral'
  return 'burning'
}

const METRIC_CONFIG = [
  { key: 'deliveryVsTarget', name: 'Delivery vs Target', icon: '📦' },
  { key: 'deliveryRhythm', name: 'Delivery Rhythm', icon: '🎵' },
  { key: 'queueDepth', name: 'NextUp Queue', icon: '📋' },
  { key: 'activeWork', name: 'Active Work', icon: '⚡' },
  { key: 'sentiment', name: 'Sentiment', icon: '💬' },
  { key: 'freshness', name: 'Freshness', icon: '🕐' },
]

function CastleDetail({ brand, onClose }) {
  const { metrics, health, recentActivity, weeklyTarget, state } = brand

  if (!metrics || Object.keys(metrics).length === 0) {
    return (
      <div className="castle-detail">
        <div className="detail-header">
          <div className="detail-title">
            <div className="detail-brand-name">{brand.name}</div>
            <div className="detail-health">Error loading metrics</div>
          </div>
          <button className="detail-close" onClick={onClose}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="castle-detail">
      <div className="detail-header">
        <div className="detail-title">
          <div className="detail-brand-name">{brand.name}</div>
          <div className="detail-health">
            Health: <strong className={`health-${state}`}>{health}%</strong>
            <span className="detail-target"> · {weeklyTarget}/wk target</span>
            {brand.subscription === 'passive' && <span className="detail-target"> · 💤 passive (no subscription)</span>}
          </div>
        </div>
        <button className="detail-close" onClick={onClose}>Close</button>
      </div>

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
      {recentActivity && recentActivity.length > 0 && (
        <div className="detail-activity">
          <div className="activity-header">Recent Activity</div>
          <div className="activity-list">
            {recentActivity.map((a, i) => (
              <div key={i} className="activity-item">
                <span className="activity-card">{a.card}</span>
                <span className="activity-arrow">{a.from} → {a.to}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!recentActivity || recentActivity.length === 0) && (
        <div className="detail-activity">
          <div className="activity-header">Recent Activity</div>
          <div className="activity-empty">No recent card movements</div>
        </div>
      )}

      <a
        href={`https://trello.com/b/${brand.boardId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="detail-trello-link"
      >
        <span>Open in Trello</span>
        <span>→</span>
      </a>
    </div>
  )
}

export default CastleDetail
