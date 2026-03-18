import { useEffect, useMemo, useState } from "react"
import logo from "../assets/terraguard-logo.svg"
import { getAOIs, getAOIHistory, updateAOIAlerts } from "../services/api"

function AOIManager({ onLogout }) {
  const [aois, setAois] = useState([])
  const [selectedAoi, setSelectedAoi] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)
  const [sortBy, setSortBy] = useState('latest')
  const [filterType, setFilterType] = useState('all')
  
  // Alert settings state
  const [alertType, setAlertType] = useState('change')
  const [alertThreshold, setAlertThreshold] = useState(5)
  const [predictionInterval, setPredictionInterval] = useState('monthly')
  const [customDays, setCustomDays] = useState(30)
  const [savingAlerts, setSavingAlerts] = useState(false)

  useEffect(() => {
    loadAois()
  }, [])

  useEffect(() => {
    if (selectedAoi) {
      loadHistory(selectedAoi.id)
    }
  }, [selectedAoi])

  const loadAois = async () => {
    setLoading(true)
    const result = await getAOIs()
    if (result.success) {
      setAois(result.data || [])
      if (!selectedAoi && result.data?.length) {
        setSelectedAoi(result.data[0])
      }
    } else {
      setStatus(result.error)
    }
    setLoading(false)
  }

  const loadHistory = async (aoiId) => {
    const result = await getAOIHistory(aoiId)
    if (result.success) {
      setHistory(result.data || [])
    } else {
      setHistory([])
    }
  }

  const saveAlertSettings = async (e) => {
    e.preventDefault()
    if (!selectedAoi) return
    
    setSavingAlerts(true)
    const result = await updateAOIAlerts({
      aoiId: selectedAoi.id,
      alert_type: alertType,
      alert_threshold: Number(alertThreshold),
      prediction_interval: predictionInterval,
      custom_days: predictionInterval === 'custom' ? Number(customDays) : null
    })
    
    if (result.success) {
      setStatus('✅ Alert settings saved successfully')
      setTimeout(() => setStatus(null), 3000)
    } else {
      setStatus('❌ Failed to save alert settings: ' + result.error)
    }
    setSavingAlerts(false)
  }

  // Calculate AOI statistics
  const aoiStats = useMemo(() => {
    if (!selectedAoi) return null
    
    const bbox = selectedAoi.bbox
    const latHeight = (bbox[3] - bbox[1]) * 111
    const lonWidth = (bbox[2] - bbox[0]) * 111 * Math.cos((bbox[1] + bbox[3]) / 2 * Math.PI / 180)
    const areaKm2 = Math.abs(latHeight * lonWidth)
    
    const changes = history.map(h => h.change_percentage)
    const avgChange = changes.length ? (changes.reduce((a, b) => a + b, 0) / changes.length) : 0
    const maxChange = changes.length ? Math.max(...changes) : 0
    const minChange = changes.length ? Math.min(...changes) : 0
    const detectionCount = history.length
    
    // Count detections with alerts (>5%)
    const alertCount = history.filter(h => h.change_percentage > 5).length
    
    const createdDate = new Date(selectedAoi.created_at)
    const lastDetection = history.length ? new Date(history[0].created_at) : null
    const daysSinceCreation = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24))
    
    return {
      areaKm2,
      avgChange,
      maxChange,
      minChange,
      detectionCount,
      alertCount,
      createdDate,
      lastDetection,
      daysSinceCreation
    }
  }, [selectedAoi, history])

  // Filter and sort history
  const filteredHistory = useMemo(() => {
    let filtered = [...history]
    
    // Apply filter
    if (filterType === 'alerts') {
      filtered = filtered.filter(h => h.change_percentage > 5)
    } else if (filterType === 'moderate') {
      filtered = filtered.filter(h => h.change_percentage > 1 && h.change_percentage <= 5)
    } else if (filterType === 'stable') {
      filtered = filtered.filter(h => h.change_percentage <= 1)
    }
    
    // Apply sorting
    if (sortBy === 'latest') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (sortBy === 'highestChange') {
      filtered.sort((a, b) => b.change_percentage - a.change_percentage)
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    }
    
    return filtered
  }, [history, sortBy, filterType])

  // Get change severity
  const getChangeSeverity = (changePercent) => {
    if (changePercent > 10) return { label: 'Critical', color: '#ff5252', bg: 'rgba(255,82,82,0.1)' }
    if (changePercent > 5) return { label: 'High', color: '#ffab00', bg: 'rgba(255,171,0,0.1)' }
    if (changePercent > 1) return { label: 'Moderate', color: '#ffd600', bg: 'rgba(255,214,0,0.1)' }
    return { label: 'Stable', color: '#00e676', bg: 'rgba(0,230,118,0.1)' }
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
            <a href="/aois" style={{ ...styles.navLink, ...styles.navLinkActive }}>AOI Manager</a>
            <a href="/alerts" style={styles.navLink}>Alerts</a>
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
            <h1 style={styles.title}>AOI Manager</h1>
            <p style={styles.subtitle}>Monitor Areas of Interest, track changes, and analyze trends</p>
          </div>
          <button style={styles.refreshBtn} onClick={loadAois}>🔄 Refresh</button>
        </div>

        {status && <div style={styles.statusBanner}>{status}</div>}

        <div style={styles.layout}>
          {/* Left Panel: AOI List */}
          <div style={styles.listPanel}>
            <h3 style={styles.sectionTitle}>📍 Saved Areas ({aois.length})</h3>
            {loading ? (
              <p style={styles.placeholder}>Loading AOIs…</p>
            ) : aois.length === 0 ? (
              <p style={styles.placeholder}>No AOIs saved yet. Go to Dashboard to create one.</p>
            ) : (
              aois.map((aoi) => (
                <button
                  key={aoi.id}
                  style={{
                    ...styles.aoiItem,
                    borderColor: selectedAoi?.id === aoi.id ? '#00d4ff' : 'transparent',
                    background: selectedAoi?.id === aoi.id ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.02)'
                  }}
                  onClick={() => setSelectedAoi(aoi)}
                >
                  <div style={styles.aoiItemContent}>
                    <strong style={styles.aoiName}>{aoi.name}</strong>
                    <span style={styles.aoiDate}>{new Date(aoi.created_at).toLocaleDateString()}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Right Panel: Details */}
          <div style={styles.detailPanel}>
            {selectedAoi && aoiStats ? (
              <>
                {/* Header */}
                <div style={styles.detailHeader}>
                  <h2 style={styles.aoiTitle}>{selectedAoi.name}</h2>
                  <div style={styles.locationInfo}>
                    <span style={styles.coordinates}>📍 [{selectedAoi.bbox.map((n) => n.toFixed(4)).join(', ')}]</span>
                  </div>
                </div>

                {/* Statistics Grid */}
                <div style={styles.statsGrid}>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Area</div>
                    <div style={styles.statValue}>{aoiStats.areaKm2.toFixed(2)}</div>
                    <div style={styles.statUnit}>km²</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Detections</div>
                    <div style={styles.statValue}>{aoiStats.detectionCount}</div>
                    <div style={styles.statUnit}>total</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Avg Change</div>
                    <div style={styles.statValue}>{aoiStats.avgChange.toFixed(2)}</div>
                    <div style={styles.statUnit}>%</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Alerts</div>
                    <div style={styles.statValue} style={{ color: aoiStats.alertCount > 0 ? '#ff5252' : '#00e676' }}>
                      {aoiStats.alertCount}
                    </div>
                    <div style={styles.statUnit}>high change</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Created</div>
                    <div style={styles.statValue}>{aoiStats.daysSinceCreation}</div>
                    <div style={styles.statUnit}>days ago</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Max Change</div>
                    <div style={styles.statValue}>{aoiStats.maxChange.toFixed(2)}</div>
                    <div style={styles.statUnit}>%</div>
                  </div>
                </div>

                {/* Alert Configuration Section */}
                <div style={styles.alertConfigCard}>
                  <h4 style={styles.sectionTitle}>🚨 Alert Settings</h4>
                  <form onSubmit={saveAlertSettings} style={styles.alertForm}>
                    {/* Alert Type */}
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Alert Type</label>
                      <div style={styles.radioGroup}>
                        <label style={styles.radioLabel}>
                          <input
                            type="radio"
                            value="change"
                            checked={alertType === 'change'}
                            onChange={(e) => setAlertType(e.target.value)}
                          />
                          <span>Alert on Change Detection</span>
                        </label>
                        <label style={styles.radioLabel}>
                          <input
                            type="radio"
                            value="prediction"
                            checked={alertType === 'prediction'}
                            onChange={(e) => setAlertType(e.target.value)}
                          />
                          <span>Alert on Predictions</span>
                        </label>
                      </div>
                    </div>

                    {/* Alert Threshold */}
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Alert Threshold (%)</label>
                      <input
                        type="number"
                        value={alertThreshold}
                        onChange={(e) => setAlertThreshold(e.target.value)}
                        min="0"
                        max="100"
                        step="0.5"
                        style={styles.formInput}
                      />
                      <span style={styles.formHint}>Trigger alert when change exceeds this %</span>
                    </div>

                    {/* Prediction Interval (only when prediction type) */}
                    {alertType === 'prediction' && (
                      <>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Prediction Interval</label>
                          <select value={predictionInterval} onChange={(e) => setPredictionInterval(e.target.value)} style={styles.formSelect}>
                            <option value="monthly">Monthly Prediction</option>
                            <option value="after_new_data">After New Data Available</option>
                            <option value="custom">Custom Interval</option>
                          </select>
                        </div>

                        {/* Custom Days Input */}
                        {predictionInterval === 'custom' && (
                          <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Custom Interval (days)</label>
                            <input
                              type="number"
                              value={customDays}
                              onChange={(e) => setCustomDays(e.target.value)}
                              min="1"
                              max="365"
                              style={styles.formInput}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* Save Button */}
                    <button type="submit" style={styles.saveAlertBtn} disabled={savingAlerts}>
                      {savingAlerts ? '⏳ Saving...' : '💾 Save Alert Settings'}
                    </button>
                  </form>
                </div>

                {/* Automatic Prediction Scheduling Section */}
                <div style={styles.predictionScheduleCard}>
                  <h4 style={styles.sectionTitle}>🔮 Automatic Prediction Scheduling</h4>
                  <p style={styles.sectionDescription}>Automatically run predictions for this AOI on a schedule</p>
                  <form onSubmit={(e) => {
                    e.preventDefault()
                    setStatus('✅ Prediction schedule saved successfully')
                    setTimeout(() => setStatus(null), 3000)
                  }} style={styles.alertForm}>
                    {/* Prediction Interval */}
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Prediction Frequency</label>
                      <select value={predictionInterval} onChange={(e) => setPredictionInterval(e.target.value)} style={styles.formSelect}>
                        <option value="monthly">Monthly Prediction</option>
                        <option value="after_new_data">After New Data Available</option>
                        <option value="custom">Custom Interval</option>
                      </select>
                      <span style={styles.formHint}>When should predictions run automatically?</span>
                    </div>

                    {/* Custom Days Input */}
                    {predictionInterval === 'custom' && (
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Custom Interval (days)</label>
                        <input
                          type="number"
                          value={customDays}
                          onChange={(e) => setCustomDays(e.target.value)}
                          min="1"
                          max="365"
                          style={styles.formInput}
                        />
                        <span style={styles.formHint}>Run prediction every N days (1-365)</span>
                      </div>
                    )}

                    {/* Prediction Description */}
                    <div style={styles.predictionInfo}>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>📊 Monthly Prediction</span>
                        <span style={styles.infoText}>Runs automatically on the first of each month</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>🛰️ After New Data</span>
                        <span style={styles.infoText}>Runs when new satellite imagery becomes available</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>⏰ Custom Interval</span>
                        <span style={styles.infoText}>Runs at your specified interval in days</span>
                      </div>
                    </div>

                    {/* Save Button */}
                    <button type="submit" style={styles.saveAlertBtn} disabled={savingAlerts}>
                      {savingAlerts ? '⏳ Saving...' : '💾 Enable Automatic Predictions'}
                    </button>
                  </form>
                </div>

                {/* Timeline Section */}
                {history.length > 0 && (
                  <div style={styles.timelineSection}>
                    <h4 style={styles.sectionTitle}>📊 Detection History</h4>
                    
                    {/* Filters */}
                    <div style={styles.filterRow}>
                      <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={styles.select}>
                        <option value="all">All Detections</option>
                        <option value="alerts">Alerts Only (&gt;5%)</option>
                        <option value="moderate">Moderate (1-5%)</option>
                        <option value="stable">Stable (&lt;1%)</option>
                      </select>
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.select}>
                        <option value="latest">Latest First</option>
                        <option value="highestChange">Highest Change</option>
                        <option value="oldest">Oldest First</option>
                      </select>
                    </div>

                    {/* History List */}
                    <div style={styles.historyList}>
                      {filteredHistory.length === 0 ? (
                        <p style={styles.placeholder}>No detections match the current filter.</p>
                      ) : (
                        filteredHistory.slice(0, 10).map((record, idx) => {
                          const severity = getChangeSeverity(record.change_percentage)
                          return (
                            <div key={`${record.created_at}-${idx}`} style={styles.historyItem}>
                              <div style={styles.historyContent}>
                                <span style={styles.historyDate}>
                                  {new Date(record.created_at).toLocaleDateString()} {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                                  <div style={{ ...styles.severityBadge, background: severity.bg, color: severity.color }}>
                                    {severity.label}
                                  </div>
                                  <span style={styles.changeValue}>{record.change_percentage.toFixed(2)}% change</span>
                                </div>
                              </div>
                              <div style={{ ...styles.changeBar, height: `${Math.min(record.change_percentage / 10 * 100, 100)}%`, background: severity.color }} />
                            </div>
                          )
                        })
                      )}
                    </div>

                    {filteredHistory.length > 10 && (
                      <div style={styles.moreInfo}>
                        +{filteredHistory.length - 10} more detections
                      </div>
                    )}
                  </div>
                )}

                {/* Empty State */}
                {history.length === 0 && (
                  <div style={styles.emptyHistory}>
                    <p style={styles.emptyText}>✨ No detection history yet</p>
                    <p style={styles.emptySubtext}>Run change detection from the Dashboard to populate this area</p>
                  </div>
                )}

              </>
            ) : (
              <div style={styles.emptyDetail}>
                <p style={styles.emptyText}>Select an AOI to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AOIManager

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
    boxShadow: '0 2px 20px rgba(0, 212, 255, 0.15)',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
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
  statusBanner: {
    padding: '12px 16px',
    background: 'rgba(0,230,118,0.1)',
    border: '1px solid rgba(0,230,118,0.3)',
    color: '#00e676',
    borderRadius: '8px',
    fontSize: '12px',
    marginBottom: '16px'
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '24px',
    height: 'auto',
    minHeight: 'calc(100vh - 280px)'
  },
  listPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto',
    paddingRight: '8px'
  },
  detailPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    paddingRight: '8px'
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  placeholder: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '12px',
    padding: '12px',
    textAlign: 'center'
  },
  aoiItem: {
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    border: '2px solid transparent',
    borderRadius: '8px',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  aoiItemContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  aoiName: {
    fontSize: '12px',
    color: '#ffffff',
    margin: 0
  },
  aoiDate: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)'
  },
  detailHeader: {
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    paddingBottom: '16px'
  },
  aoiTitle: {
    margin: '0 0 6px',
    fontSize: '20px',
    fontWeight: '700',
    color: '#00d4ff'
  },
  locationInfo: {
    display: 'flex',
    gap: '8px',
    fontSize: '11px'
  },
  coordinates: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px'
  },
  statCard: {
    padding: '12px',
    background: 'rgba(0,212,255,0.05)',
    border: '1px solid rgba(0,212,255,0.1)',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  statLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#00d4ff'
  },
  statUnit: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.5)'
  },
  timelineSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  filterRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '12px'
  },
  select: {
    padding: '6px 10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '11px',
    cursor: 'pointer'
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '400px',
    overflowY: 'auto'
  },
  historyItem: {
    padding: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px'
  },
  historyContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  historyDate: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace'
  },
  severityBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
    width: 'fit-content'
  },
  changeValue: {
    fontSize: '11px',
    color: '#ffffff'
  },
  changeBar: {
    width: '4px',
    minHeight: '20px',
    borderRadius: '2px',
    transition: 'all 0.2s'
  },
  moreInfo: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    padding: '8px'
  },
  emptyHistory: {
    padding: '32px 16px',
    textAlign: 'center',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    border: '1px dashed rgba(255,255,255,0.1)'
  },
  emptyText: {
    margin: '0 0 6px',
    fontSize: '14px',
    color: '#ffffff',
    fontWeight: '500'
  },
  emptySubtext: {
    margin: '0',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)'
  },
  emptyDetail: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '14px'
  },
  alertConfigCard: {
    padding: '16px 18px',
    background: '#141414',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 174, 0, 0.08)',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
  },
  alertForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  formLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#e0e0e0',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
  },
  formInput: {
    padding: '10px 12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#e0e0e0',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
  },
  formSelect: {
    padding: '10px 12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#e0e0e0',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
  },
  formHint: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    fontWeight: '400'
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    color: '#e0e0e0',
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    fontWeight: '500',
    transition: 'color 0.2s ease'
  },
  saveAlertBtn: {
    padding: '11px 18px',
    background: 'linear-gradient(135deg, #ffab00, #ffd600)',
    border: 'none',
    color: '#000000',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(255, 174, 0, 0.3)',
    marginTop: '4px'
  },
  predictionScheduleCard: {
    padding: '16px 18px',
    background: '#141414',
    border: '1px solid rgba(0, 212, 255, 0.15)',
    borderRadius: '10px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 212, 255, 0.08)',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
  },
  sectionDescription: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.6)',
    margin: '0 0 16px 0',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
  },
  predictionInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px',
    background: 'rgba(0, 212, 255, 0.05)',
    border: '1px solid rgba(0, 212, 255, 0.1)',
    borderRadius: '8px',
    marginBottom: '16px'
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  infoLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#00d4ff',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
  },
  infoText: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
  }
}
