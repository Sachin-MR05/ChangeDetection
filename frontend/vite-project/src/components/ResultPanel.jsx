function ResultPanel({ result, loading, error }) {
  // 1️⃣ Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContent}>
          <div style={styles.satelliteIcon}>🛰️</div>
          <h3 style={styles.loadingTitle}>Analyzing Satellite Images</h3>
          <p style={styles.loadingSubtext}>
            Fetching imagery, running ML model, generating change map...
          </p>
          <div style={styles.loadingSteps}>
            <div style={styles.step}>
              <div style={{...styles.stepDot, ...styles.stepActive}}></div>
              <span>Fetching</span>
            </div>
            <div style={styles.stepLine}></div>
            <div style={styles.step}>
              <div style={styles.stepDot}></div>
              <span>Processing</span>
            </div>
            <div style={styles.stepLine}></div>
            <div style={styles.step}>
              <div style={styles.stepDot}></div>
              <span>Analyzing</span>
            </div>
          </div>
        </div>
        <div style={styles.progressBar}>
          <div style={styles.progressFill}></div>
        </div>
      </div>
    )
  }

  // 2️⃣ Error state
  if (error) {
    return (
      <div style={{...styles.container, ...styles.errorContainer}}>
        <div style={styles.errorIcon}>❌</div>
        <h3 style={styles.errorTitle}>{error.message || error}</h3>
        {error.retryable && (
          <p style={styles.retryHint}>
            💡 This error may be temporary. Please try again.
          </p>
        )}
      </div>
    )
  }

  // 3️⃣ No result yet
  if (!result) {
    return (
      <div style={{...styles.container, ...styles.emptyContainer}}>
        <div style={styles.emptyIcon}>📊</div>
        <p style={styles.emptyText}>
          Select an AOI and dates, then run change detection.
        </p>
      </div>
    )
  }

  // 4️⃣ Success state - Real backend data
  return (
    <div style={{...styles.container, ...styles.successContainer}}>
      {/* Header */}
      <div style={styles.successHeader}>
        <h3 style={styles.successTitle}>
          <span style={styles.checkIcon}>✅</span>
          Detection Complete
        </h3>
        <span style={styles.requestId}>
          ID: <code style={styles.code}>{result.request_id?.slice(0, 8)}...</code>
        </span>
      </div>

      {/* Satellite Images Comparison */}
      {(result.past_image_url || result.current_image_url) && (
        <div style={styles.imagesSection}>
          <h4 style={styles.sectionTitle}>🛰️ Satellite Imagery</h4>
          <div style={styles.imagesGrid}>
            {result.past_image_url && (
              <div style={styles.imageCard}>
                <h5 style={styles.imageLabel}>Past Image (T1)</h5>
                <img
                  src={result.past_image_url}
                  alt="Past satellite image"
                  style={styles.satelliteImage}
                />
                {result.dates_used?.past_date && (
                  <span style={styles.imageDate}>
                    {new Date(result.dates_used.past_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
            {result.current_image_url && (
              <div style={styles.imageCard}>
                <h5 style={styles.imageLabel}>Current Image (T2)</h5>
                <img
                  src={result.current_image_url}
                  alt="Current satellite image"
                  style={styles.satelliteImage}
                />
                {result.dates_used?.current_date && (
                  <span style={styles.imageDate}>
                    {new Date(result.dates_used.current_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div style={styles.resultGrid}>
        {/* Metrics Card */}
        <div style={styles.metricsCard}>
          <h4 style={styles.metricsLabel}>Change Detected</h4>
          <div style={styles.metricsValue}>
            {result.change_percentage?.toFixed(1)}
            <span style={styles.metricsUnit}>%</span>
          </div>
          <p style={styles.metricsDetail}>
            {result.changed_pixels?.toLocaleString()} of {result.total_pixels?.toLocaleString()} pixels
          </p>
        </div>

        {/* Change Map */}
        {result.change_map_url && (
          <div style={styles.mapCard}>
            <h4 style={styles.mapLabel}>Change Map</h4>
            <img
              src={result.change_map_url}
              alt="Change Detection Result"
              style={styles.mapImage}
            />
          </div>
        )}
      </div>

      {/* Dates Info */}
      {result.dates_used && (
        <div style={styles.datesRow}>
          <div style={styles.dateItem}>
            <label style={styles.dateLabel}>Past Date</label>
            <span style={styles.dateValue}>
              {result.dates_used.past_date}
              {result.dates_used.resolution_type === 'fallback' && (
                <span style={styles.fallbackBadge}>fallback</span>
              )}
            </span>
          </div>
          <div style={styles.dateItem}>
            <label style={styles.dateLabel}>Current Date</label>
            <span style={styles.dateValue}>
              {result.dates_used.current_date}
            </span>
          </div>
        </div>
      )}

      {/* Metadata */}
      {result.metadata && (
        <details style={styles.details}>
          <summary style={styles.summary}>View Technical Details</summary>
          <div style={styles.detailsContent}>
            <p><strong>Source:</strong> {result.metadata.satellite_source}</p>
            <p><strong>Model:</strong> {result.metadata.model_version}</p>
            {result.metadata.demo_mode && (
              <p style={styles.demoWarning}>⚠️ Demo mode - using synthetic imagery</p>
            )}
          </div>
        </details>
      )}
    </div>
  )
}

export default ResultPanel

// ---------- STYLES - DARK THEME ----------
const styles = {
  container: {
    background: "#141414",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
    overflow: "hidden",
    animation: "fadeInUp 0.5s ease 0.4s backwards"
  },
  
  // Loading styles
  loadingContent: {
    padding: "36px 20px 20px",
    textAlign: "center"
  },
  satelliteIcon: {
    fontSize: "3rem",
    display: "block",
    marginBottom: "12px",
    animation: "float 2s ease-in-out infinite"
  },
  loadingTitle: {
    margin: "0 0 6px",
    color: "#ffffff",
    fontSize: "1.1rem"
  },
  loadingSubtext: {
    margin: "0 0 20px",
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: "0.8rem"
  },
  loadingSteps: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontSize: "0.7rem",
    color: "rgba(255, 255, 255, 0.5)"
  },
  step: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px"
  },
  stepDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.1)"
  },
  stepActive: {
    background: "#00d4ff",
    boxShadow: "0 0 10px rgba(0, 212, 255, 0.5)",
    animation: "pulse 1s ease-in-out infinite"
  },
  stepLine: {
    width: "30px",
    height: "2px",
    background: "rgba(255, 255, 255, 0.1)"
  },
  progressBar: {
    height: "3px",
    background: "rgba(255, 255, 255, 0.05)"
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #00d4ff, #00e676)",
    animation: "progressBar 2s ease-in-out infinite"
  },
  
  // Error styles
  errorContainer: {
    padding: "36px",
    textAlign: "center",
    background: "rgba(255, 82, 82, 0.08)"
  },
  errorIcon: {
    fontSize: "2.5rem",
    marginBottom: "12px"
  },
  errorTitle: {
    color: "#ff5252",
    margin: "0 0 8px",
    fontSize: "0.95rem"
  },
  retryHint: {
    color: "#00d4ff",
    fontSize: "0.8rem",
    margin: "12px 0 0",
    padding: "8px 12px",
    background: "rgba(0, 212, 255, 0.1)",
    borderRadius: "6px",
    display: "inline-block",
    border: "1px solid rgba(0, 212, 255, 0.2)"
  },
  
  // Empty styles
  emptyContainer: {
    padding: "36px",
    textAlign: "center"
  },
  emptyIcon: {
    fontSize: "2.5rem",
    opacity: "0.3",
    marginBottom: "12px"
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.4)",
    margin: "0",
    fontSize: "0.85rem"
  },
  
  // Success styles
  successContainer: {
    padding: "16px"
  },
  successHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: "12px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
    marginBottom: "16px"
  },
  successTitle: {
    margin: "0",
    color: "#00e676",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "1rem"
  },
  checkIcon: {
    fontSize: "1.2rem"
  },
  requestId: {
    fontSize: "0.7rem",
    color: "rgba(255, 255, 255, 0.4)"
  },
  code: {
    background: "rgba(255, 255, 255, 0.05)",
    padding: "2px 6px",
    borderRadius: "4px",
    fontFamily: "'JetBrains Mono', monospace",
    color: "#00d4ff"
  },
  
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginBottom: "16px"
  },
  
  // Satellite images section
  imagesSection: {
    marginBottom: "16px",
    paddingBottom: "16px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)"
  },
  sectionTitle: {
    margin: "0 0 12px",
    fontSize: "0.9rem",
    color: "#ffffff",
    fontWeight: "500"
  },
  imagesGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px"
  },
  imageCard: {
    background: "#0a0a0a",
    borderRadius: "8px",
    padding: "10px",
    textAlign: "center",
    border: "1px solid rgba(255, 255, 255, 0.06)"
  },
  imageLabel: {
    margin: "0 0 10px",
    fontSize: "0.8rem",
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500"
  },
  satelliteImage: {
    width: "100%",
    borderRadius: "6px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    cursor: "pointer"
  },
  imageDate: {
    display: "block",
    marginTop: "8px",
    fontSize: "0.7rem",
    color: "rgba(255, 255, 255, 0.4)",
    fontWeight: "500"
  },
  
  // Metrics card
  metricsCard: {
    background: "transparent",
    padding: "32px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "200px"
  },
  metricsLabel: {
    margin: "0 0 16px",
    fontSize: "1.4rem",
    color: "#00d4ff",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "2px"
  },
  metricsValue: {
    fontSize: "5.5rem",
    fontWeight: "700",
    lineHeight: "1",
    color: "#ffffff"
  },
  metricsUnit: {
    fontSize: "2.8rem",
    fontWeight: "500",
    color: "#ffffff"
  },
  metricsDetail: {
    margin: "20px 0 0",
    fontSize: "1.3rem",
    color: "rgba(255, 255, 255, 0.7)"
  },
  
  // Map card
  mapCard: {
    background: "#0a0a0a",
    borderRadius: "10px",
    padding: "12px",
    border: "1px solid rgba(255, 255, 255, 0.06)"
  },
  mapLabel: {
    margin: "0 0 10px",
    fontSize: "0.8rem",
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500"
  },
  mapImage: {
    width: "100%",
    borderRadius: "6px",
    border: "1px solid rgba(255, 255, 255, 0.1)"
  },
  
  // Dates row
  datesRow: {
    display: "flex",
    gap: "16px",
    padding: "12px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "8px",
    marginBottom: "12px",
    border: "1px solid rgba(255, 255, 255, 0.04)"
  },
  dateItem: {
    flex: "1"
  },
  dateLabel: {
    display: "block",
    fontSize: "0.7rem",
    color: "rgba(255, 255, 255, 0.4)",
    marginBottom: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  dateValue: {
    fontWeight: "500",
    color: "#ffffff",
    fontSize: "0.85rem"
  },
  fallbackBadge: {
    fontSize: "0.6rem",
    padding: "2px 6px",
    background: "#ffab00",
    color: "#000000",
    borderRadius: "4px",
    marginLeft: "8px",
    verticalAlign: "middle",
    fontWeight: "600"
  },
  
  // Details
  details: {
    marginTop: "8px"
  },
  summary: {
    cursor: "pointer",
    fontSize: "0.8rem",
    color: "#00d4ff",
    padding: "8px 0"
  },
  detailsContent: {
    padding: "12px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "6px",
    fontSize: "0.75rem",
    color: "rgba(255, 255, 255, 0.6)",
    border: "1px solid rgba(255, 255, 255, 0.04)"
  },
  demoWarning: {
    color: "#ffab00",
    fontWeight: "500"
  }
}
