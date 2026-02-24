const getMetricState = (score) => {
  if (score >= 70) return 'thriving'
  if (score >= 30) return 'neutral'
  return 'burning'
}

function CastleDetail({ brand, metrics, onClose }) {
  const { cadence, queue, active, health } = metrics

  const cadenceState = getMetricState(cadence.score)
  const queueState = getMetricState(queue.score)
  const activeState = getMetricState(active.score)

  return (
    <div className="castle-detail">
      <div className="detail-header">
        <div className="detail-title">
          <div className="detail-brand-name">{brand.name}</div>
          <div className="detail-health">
            Overall Health: <strong>{Math.round(health)}%</strong>
          </div>
        </div>
        <button className="detail-close" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="detail-metrics">
        {/* Card Cadence */}
        <div className={`metric-item ${cadenceState}`}>
          <div className="metric-item-header">
            <div className="metric-item-name">Card Cadence</div>
          </div>
          <div className="metric-item-value">
            {cadence.current} / {brand.weeklyTarget}
          </div>
          <div className="metric-progress-bar">
            <div
              className="metric-progress-fill"
              style={{ width: `${Math.min(cadence.score, 100)}%` }}
            />
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Cards moved this week
          </div>
        </div>

        {/* NextUp Queue */}
        <div className={`metric-item ${queueState}`}>
          <div className="metric-item-header">
            <div className="metric-item-name">NextUp Queue</div>
          </div>
          <div className="metric-item-value">{queue.current}</div>
          <div className="metric-progress-bar">
            <div
              className="metric-progress-fill"
              style={{ width: `${Math.min(queue.score, 100)}%` }}
            />
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Scripts ready to go
          </div>
        </div>

        {/* Active Work */}
        <div className={`metric-item ${activeState}`}>
          <div className="metric-item-header">
            <div className="metric-item-name">Active Work</div>
          </div>
          <div className="metric-item-value">{active.current}</div>
          <div className="metric-progress-bar">
            <div
              className="metric-progress-fill"
              style={{ width: `${Math.min(active.score, 100)}%` }}
            />
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Cards being worked now
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {metrics.recentActivity && metrics.recentActivity.length > 0 && (
        <div className="detail-activity">
          <div className="activity-header">Recent Activity</div>
          <div className="activity-list">
            {metrics.recentActivity.map((activity, i) => (
              <div key={i} className="activity-item">
                {activity}
              </div>
            ))}
          </div>
        </div>
      )}

      {(!metrics.recentActivity || metrics.recentActivity.length === 0) && (
        <div className="detail-activity">
          <div className="activity-header">Recent Activity</div>
          <div className="activity-empty">No recent card movements</div>
        </div>
      )}

      {/* Trello Link */}
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
