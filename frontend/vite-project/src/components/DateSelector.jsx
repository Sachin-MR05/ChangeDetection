function DateSelector({ dates, setDates }) {
  const handlePastDateChange = (e) => {
    setDates((prev) => ({
      ...prev,
      past: e.target.value
    }))
  }

  const handleCurrentDateChange = (e) => {
    setDates((prev) => ({
      ...prev,
      current: e.target.value
    }))
  }

  // Auto-set end date to 1 year after start date (or today if that's earlier)
  const setOneYearGap = () => {
    if (!dates.past) return;
    
    const startDate = new Date(dates.past);
    const oneYearLater = new Date(startDate);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    
    // Use the earlier of: 1 year later or today
    const today = new Date();
    const endDate = oneYearLater > today ? today : oneYearLater;
    
    const formattedDate = endDate.toISOString().split('T')[0];
    setDates((prev) => ({
      ...prev,
      current: formattedDate
    }));
  }

  const isInvalid = dates.past && dates.current && dates.past >= dates.current
  
  // Calculate date range if both dates are set
  const getDateRange = () => {
    if (!dates.past || !dates.current) return null;
    const d1 = new Date(dates.past);
    const d2 = new Date(dates.current);
    const days = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
    return days;
  }
  
  const dateRange = getDateRange();

  return (
    <div style={styles.container}>
      <div style={styles.field}>
        <label style={styles.label}>
          Start Date
        </label>
        <input
          type="date"
          value={dates.past || ""}
          onChange={handlePastDateChange}
          style={styles.input}
          max={dates.current || undefined}
        />
        {dates.past && (
          <span style={styles.datePreview}>
            {new Date(dates.past).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
      </div>

      <div style={styles.arrowContainer}>
        <div style={styles.arrow}>→</div>
        {dateRange !== null && !isInvalid && (
          <div style={styles.rangeInfo}>
            {dateRange} days
          </div>
        )}
      </div>

      <div style={styles.field}>
        <label style={styles.label}>
          End Date
        </label>
        <input
          type="date"
          value={dates.current || ""}
          onChange={handleCurrentDateChange}
          style={styles.input}
          min={dates.past || undefined}
        />
        {dates.current && (
          <span style={styles.datePreview}>
            {new Date(dates.current).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
        <button 
          onClick={setOneYearGap} 
          style={styles.autoDateBtn}
          disabled={!dates.past}
          title="Set end date to 1 year after start date"
        >
          +1 Year
        </button>
      </div>

      {/* Validation hint */}
      {isInvalid && (
        <div style={styles.warningBox}>
          <span style={styles.warningIcon}>⚠️</span>
          <span style={styles.warningText}>Start date must be before end date</span>
        </div>
      )}
    </div>
  )
}

export default DateSelector

// ---------- STYLES - DARK THEME ----------
const styles = {
  container: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    flex: "1",
    flexWrap: "wrap"
  },
  field: {
    display: "flex",
    flexDirection: "column",
    flex: "1",
    minWidth: "160px"
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.8rem",
    marginBottom: "6px",
    fontWeight: "500",
    color: "#ffffff"
  },
  labelIcon: {
    fontSize: "0.9rem"
  },
  input: {
    padding: "10px 32px 10px 12px",
    fontSize: "0.85rem",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "6px",
    outline: "none",
    transition: "all 0.2s ease",
    background: "#111111",
    color: "#ffffff",
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    colorScheme: "dark"
  },
  datePreview: {
    marginTop: "4px",
    fontSize: "0.7rem",
    color: "rgba(255, 255, 255, 0.5)"
  },
  autoDateBtn: {
    marginTop: "6px",
    padding: "6px 10px",
    fontSize: "0.7rem",
    fontWeight: "600",
    background: "rgba(0, 212, 255, 0.1)",
    border: "1px solid rgba(0, 212, 255, 0.3)",
    borderRadius: "4px",
    color: "#00d4ff",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "'Inter', sans-serif"
  },
  arrowContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: "24px"
  },
  arrow: {
    fontSize: "1.2rem",
    color: "#00d4ff",
    fontWeight: "bold"
  },
  rangeInfo: {
    marginTop: "4px",
    fontSize: "0.65rem",
    color: "#00d4ff",
    background: "rgba(0, 212, 255, 0.1)",
    padding: "2px 8px",
    borderRadius: "10px",
    border: "1px solid rgba(0, 212, 255, 0.2)"
  },
  warningBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: "8px 12px",
    background: "rgba(255, 171, 0, 0.1)",
    border: "1px solid rgba(255, 171, 0, 0.3)",
    borderRadius: "6px",
    marginTop: "8px"
  },
  warningIcon: {
    fontSize: "0.9rem"
  },
  warningText: {
    color: "#ffab00",
    fontSize: "0.8rem",
    fontWeight: "500"
  }
}
