import { useEffect, useState } from "react"
import logo from "../assets/terraguard-logo.svg"
import { getAlerts } from "../services/api"

function AlertsPage({ onLogout }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState('latest')

  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    setLoading(true)
    const result = await getAlerts()
    if (result.success) {
      setAlerts(result.data || [])
    } else {
      setAlerts([])
    }
    setLoading(false)
  }

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (filterType === 'triggered') return alert.is_triggered === true
    if (filterType === 'pending') return alert.is_triggered === false
    if (filterType === 'change') return alert.alert_type === 'change'
    if (filterType === 'prediction') return alert.alert_type === 'prediction'
    return true
  })

  // Sort alerts
  filteredAlerts.sort((a, b) => {
    if (sortBy === 'latest') {
      return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
    } else if (sortBy === 'oldest') {
      return new Date(a.created_at) - new Date(b.created_at)
    } else if (sortBy === 'highest_threshold') {
      return b.alert_threshold - a.alert_threshold
    }
    return 0
  })

  // Get alert status badge
  const getAlertStatus = (alert) => {
    if (alert.is_triggered) {
      return { label: '🔴 TRIGGERED', color: '#ff5252', bg: 'rgba(255,82,82,0.1)' }
    }
    return { label: '🟢 ACTIVE', color: '#00e676', bg: 'rgba(0,230,118,0.1)' }
  }

  // Get next prediction date
  const getNextPredictionDate = (alert) => {
    if (!alert.last_prediction_at) return 'Pending'
    
    const lastDate = new Date(alert.last_prediction_at)
    let nextDate

    if (alert.prediction_interval === 'monthly') {
      nextDate = new Date(lastDate)
      nextDate.setMonth(nextDate.getMonth() + 1)
    } else if (alert.prediction_interval === 'custom' && alert.custom_days) {
      nextDate = new Date(lastDate.getTime() + alert.custom_days * 24 * 60 * 60 * 1000)
    } else if (alert.prediction_interval === 'after_new_data') {
      return 'Depends on new satellite data'
    }

    return nextDate?.toLocaleDateString() || 'Not scheduled'
  }

  return (
    <div style={styles.page}>
      <nav style={styles.navbar}>
        <div style={styles.navLeft}>
          <div style={styles.logoContainer}>
            <img src={logo} alt="TerraGuard logo" style={styles.logoImage} />
            <span style={styles.logoText}>TerraGuard Analytics</span>
          </div>
          <div style={styles.navLinks}>
            <a href="/" style={styles.navLink}>Dashboard</a>
            <a href="/aois" style={styles.navLink}>AOI Manager</a>
            <a href="/alerts" style={{ ...styles.navLink, ...styles.navLinkActive }}>Alerts</a>
            <a href="/history" style={styles.navLink}>History</a>
          </div>
        </div>
        <div style={styles.navRight}>
          <button style={styles.logoutBtn} onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <div style={styles.content}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Alerts</h1>
            <p style={styles.subtitle}>Monitor alerts and predictions for your Areas of Interest</p>
          </div>
          <button style={styles.refreshBtn} onClick={loadAlerts}>🔄 Refresh</button>
        </div>

        <div style={styles.controlPanel}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Status</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={styles.select}>
              <option value="all">All Alerts</option>
              <option value="triggered">Triggered Only</option>
              <option value="pending">Active/Pending</option>
              <option value="change">Change Detection</option>
              <option value="prediction">Prediction Based</option>
            </select>
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Sort By</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.select}>
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest_threshold">Highest Threshold</option>
            </select>
          </div>
        </div>

        <div style={styles.alertsContainer}>
          {loading ? (
            <p style={styles.placeholder}>Loading alerts…</p>
          ) : filteredAlerts.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📭</p>
              <p style={styles.emptyText}>No alerts found</p>
              <p style={styles.emptySubtext}>Configure alerts in AOI Manager to get started</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const status = getAlertStatus(alert)
              return (
                <div key={alert.id} style={styles.alertCard}>
                  <div style={styles.alertHeader}>
                    <div style={styles.alertTitleArea}>
                      <h3 style={styles.alertTitle}>{alert.aoi_name}</h3>
                      <div style={{ ...styles.statusBadge, background: status.bg, color: status.color }}>
                        {status.label}
                      </div>
                    </div>
                    <span style={styles.alertDate}>
                      {new Date(alert.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={styles.alertContent}>
                    {/* Alert Type & Threshold */}
                    <div style={styles.alertGrid}>
                      <div style={styles.alertItem}>
                        <div style={styles.alertItemLabel}>Alert Type</div>
                        <div style={styles.alertItemValue}>
                          {alert.alert_type === 'change' ? '📍 Change Detection' : '🔮 Prediction'}
                        </div>
                      </div>
                      <div style={styles.alertItem}>
                        <div style={styles.alertItemLabel}>Threshold</div>
                        <div style={styles.alertItemValue}>{alert.alert_threshold}%</div>
                      </div>
                      <div style={styles.alertItem}>
                        <div style={styles.alertItemLabel}>Last Detection</div>
                        <div style={styles.alertItemValue}>
                          {alert.last_triggered_at 
                            ? new Date(alert.last_triggered_at).toLocaleDateString() 
                            : 'Never'}
                        </div>
                      </div>
                    </div>

                    {/* Prediction Interval (if prediction type) */}
                    {alert.alert_type === 'prediction' && (
                      <div style={styles.predictionInfo}>
                        <div style={styles.predictionLabel}>📅 Prediction Interval</div>
                        <div style={styles.predictionDetail}>
                          <span style={styles.intervalBadge}>{alert.prediction_interval}</span>
                          <span style={styles.nextPredictionText}>
                            Next: {getNextPredictionDate(alert)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Alert Message */}
                    {alert.is_triggered && alert.last_triggered_message && (
                      <div style={styles.alertMessage}>
                        <div style={styles.messageIcon}>💬</div>
                        <div style={styles.messageText}>
                          {alert.last_triggered_message}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={styles.alertFooter}>
                    <span style={styles.footerText}>
                      Alert ID: {alert.id.slice(0, 8)}...
                    </span>
                    <button style={styles.viewDetailBtn}>View Details →</button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default AlertsPage

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: '#000000',
    color: '#ffffff',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
  },
  navbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    height: '72px',
    background: '#0a0a0a',
    borderBottom: '2px solid #00d4ff',
    marginBottom: '20px',
    boxShadow: '0 2px 20px rgba(0, 212, 255, 0.15)'
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '56px'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoImage: {
    width: '32px',
    height: '32px',
    objectFit: 'contain',
    borderRadius: '6px',
    background: 'rgba(255, 255, 255, 0.92)',
    padding: '2px'
  },
  logoText: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#00d4ff',
    letterSpacing: '-0.5px',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  navLink: {
    padding: '10px 20px',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#a0a0a0',
    textDecoration: 'none',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
  },
  navLinkActive: {
    color: '#00d4ff',
    background: 'rgba(0, 212, 255, 0.15)'
  },
  navRight: {
    display: 'flex',
    alignItems: 'center'
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 20px',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#e0e0e0',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
  },
  content: {
    flex: 1,
    padding: '0 32px 32px 32px',
    maxWidth: '100%',
    margin: '0 auto',
    width: '100%'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px'
  },
  title: {
    margin: '0 0 8px',
    fontSize: '26px',
    fontWeight: '700',
    color: '#ffffff'
  },
  subtitle: {
    margin: '0',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)'
  },
  refreshBtn: {
    padding: '8px 16px',
    background: 'rgba(0,212,255,0.15)',
    border: '1px solid rgba(0,212,255,0.3)',
    color: '#00d4ff',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  controlPanel: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '24px',
    maxWidth: '400px'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  filterLabel: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  select: {
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  alertsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))',
    gap: '16px'
  },
  placeholder: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '12px',
    padding: '12px',
    textAlign: 'center'
  },
  emptyState: {
    gridColumn: '1 / -1',
    padding: '60px 32px',
    textAlign: 'center',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    border: '1px dashed rgba(255,255,255,0.1)'
  },
  emptyIcon: {
    fontSize: '48px',
    margin: '0 0 12px'
  },
  emptyText: {
    margin: '0 0 6px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff'
  },
  emptySubtext: {
    margin: '0',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)'
  },
  alertCard: {
    padding: '16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  alertHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '12px'
  },
  alertTitleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  alertTitle: {
    margin: '0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff'
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  alertDate: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace'
  },
  alertContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  alertGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px'
  },
  alertItem: {
    padding: '10px',
    background: 'rgba(0,212,255,0.05)',
    border: '1px solid rgba(0,212,255,0.1)',
    borderRadius: '6px'
  },
  alertItemLabel: {
    fontSize: '9px',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    marginBottom: '4px'
  },
  alertItemValue: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#00d4ff'
  },
  predictionInfo: {
    padding: '10px',
    background: 'rgba(255,214,0,0.05)',
    border: '1px solid rgba(255,214,0,0.1)',
    borderRadius: '6px'
  },
  predictionLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    marginBottom: '6px'
  },
  predictionDetail: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  intervalBadge: {
    padding: '2px 8px',
    background: 'rgba(255,214,0,0.2)',
    color: '#ffd600',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  nextPredictionText: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.7)'
  },
  alertMessage: {
    padding: '10px',
    background: 'rgba(255,82,82,0.05)',
    border: '1px solid rgba(255,82,82,0.1)',
    borderRadius: '6px',
    display: 'flex',
    gap: '10px'
  },
  messageIcon: {
    fontSize: '14px',
    flexShrink: 0
  },
  messageText: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.4
  },
  alertFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.06)'
  },
  footerText: {
    fontSize: '9px',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace'
  },
  viewDetailBtn: {
    padding: '6px 12px',
    background: 'transparent',
    border: '1px solid rgba(0,212,255,0.3)',
    color: '#00d4ff',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
}
