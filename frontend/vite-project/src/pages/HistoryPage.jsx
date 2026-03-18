import { useState, useEffect } from "react"
import logo from "../assets/terraguard-logo.svg"
import { getHistory } from "../services/api"

function HistoryPage({ onLogout }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    const result = await getHistory();
    if (result.success) {
      setHistory(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric"
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const formatBBox = (bbox) => {
    if (!bbox) return "—";
    try {
      const b = typeof bbox === "string" ? JSON.parse(bbox) : bbox;
      if (Array.isArray(b) && b.length === 4) {
        return `${b[0].toFixed(2)}, ${b[1].toFixed(2)} → ${b[2].toFixed(2)}, ${b[3].toFixed(2)}`;
      }
      return "—";
    } catch {
      return "—";
    }
  };

  const getChangeColor = (pct) => {
    if (pct >= 50) return "#ff5252";
    if (pct >= 25) return "#ffab00";
    if (pct >= 10) return "#00d4ff";
    return "#00e676";
  };

  return (
    <div style={styles.container}>
      {/* NAVBAR */}
      <nav style={styles.navbar}>
        <div style={styles.navLeft}>
          <div style={styles.logo}>
            <img src={logo} alt="TerraGuard logo" style={styles.logoImage} />
            <span style={styles.logoText}>TerraGuard Analytics</span>
          </div>
          <div style={styles.navLinks}>
            <a href="/" style={styles.navLink}>Dashboard</a>
            <a href="/aois" style={styles.navLink}>AOI Manager</a>
            <a href="/alerts" style={styles.navLink}>Alerts</a>
            <a href="/history" style={{ ...styles.navLink, ...styles.navLinkActive }}>History</a>
          </div>
        </div>
        <div style={styles.navRight}>
          <button style={styles.logoutBtn} onClick={onLogout}>
            <svg style={styles.logoutIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* PAGE CONTENT */}
      <div style={styles.content}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.pageTitle}>Detection History</h1>
            <p style={styles.pageSubtitle}>View all your past change detection analyses</p>
          </div>
          <button style={styles.refreshBtn} onClick={fetchHistory} disabled={loading}>
            <svg style={{ width: 16, height: 16, animation: loading ? "spin 1s linear infinite" : "none" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* STATS ROW */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{history.length}</span>
            <span style={styles.statLabel}>Total Runs</span>
          </div>
          <div style={styles.statCard}>
            <span style={{ ...styles.statValue, color: "#00d4ff" }}>
              {history.length > 0
                ? (history.reduce((sum, h) => sum + parseFloat(h.change_percentage || 0), 0) / history.length).toFixed(1) + "%"
                : "—"}
            </span>
            <span style={styles.statLabel}>Avg Change</span>
          </div>
          <div style={styles.statCard}>
            <span style={{ ...styles.statValue, color: "#00e676" }}>
              {history.length > 0 ? formatDate(history[0].created_at) : "—"}
            </span>
            <span style={styles.statLabel}>Latest Run</span>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div style={styles.errorBanner}>
            ⚠️ {error}
          </div>
        )}

        {/* TABLE */}
        <div style={styles.tableWrapper}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <p style={{ color: "#a0a0a0", marginTop: 12 }}>Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div style={styles.emptyState}>
              <svg style={{ width: 48, height: 48, color: "#333", marginBottom: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p style={{ color: "#666", fontSize: "1rem", margin: 0 }}>No detection history yet</p>
              <p style={{ color: "#444", fontSize: "0.85rem", marginTop: 4 }}>Run a change detection from the <a href="/" style={{ color: "#00d4ff" }}>Dashboard</a> to get started</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Change %</th>
                  <th style={styles.th}>Start Date</th>
                  <th style={styles.th}>End Date</th>
                  <th style={styles.th}>Bounding Box</th>
                  <th style={styles.th}>Detected At</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, idx) => (
                  <tr key={entry.id} style={styles.tr}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.changeBadge,
                        background: `${getChangeColor(parseFloat(entry.change_percentage))}20`,
                        color: getChangeColor(parseFloat(entry.change_percentage)),
                        borderColor: `${getChangeColor(parseFloat(entry.change_percentage))}40`
                      }}>
                        {parseFloat(entry.change_percentage).toFixed(2)}%
                      </span>
                    </td>
                    <td style={styles.td}>{formatDate(entry.start_date)}</td>
                    <td style={styles.td}>{formatDate(entry.end_date)}</td>
                    <td style={{ ...styles.td, fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem" }}>{formatBBox(entry.bounding_box)}</td>
                    <td style={styles.td}>{formatDateTime(entry.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default HistoryPage

// ---------- STYLES ----------
const styles = {
  container: {
    padding: "0",
    maxWidth: "100%",
    margin: "0",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    minHeight: "100vh",
    animation: "fadeIn 0.5s ease",
    background: "#000000"
  },
  navbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    height: "72px",
    background: "#0a0a0a",
    borderBottom: "2px solid #00d4ff",
    marginBottom: "20px",
    boxShadow: "0 2px 20px rgba(0, 212, 255, 0.15)"
  },
  navLeft: {
    display: "flex",
    alignItems: "center",
    gap: "56px"
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  logoImage: {
    width: "32px",
    height: "32px",
    objectFit: "contain",
    borderRadius: "6px",
    background: "rgba(255, 255, 255, 0.92)",
    padding: "2px"
  },
  logoText: {
    fontSize: "1.4rem",
    fontWeight: "700",
    color: "#00d4ff",
    letterSpacing: "-0.5px"
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  navLink: {
    padding: "10px 20px",
    fontSize: "1rem",
    fontWeight: "500",
    color: "#a0a0a0",
    textDecoration: "none",
    borderRadius: "6px",
    transition: "all 0.2s ease",
    cursor: "pointer"
  },
  navLinkActive: {
    color: "#00d4ff",
    background: "rgba(0, 212, 255, 0.15)"
  },
  navRight: {
    display: "flex",
    alignItems: "center"
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 20px",
    fontSize: "1rem",
    fontWeight: "500",
    color: "#e0e0e0",
    background: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "'Inter', sans-serif"
  },
  logoutIcon: {
    width: "18px",
    height: "18px"
  },
  content: {
    padding: "32px",
    animation: "fadeInUp 0.5s ease 0.1s backwards"
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px"
  },
  pageTitle: {
    fontSize: "1.8rem",
    fontWeight: "700",
    color: "#ffffff",
    margin: "0 0 4px 0",
    letterSpacing: "-0.5px"
  },
  pageSubtitle: {
    fontSize: "0.95rem",
    color: "#a0a0a0",
    margin: 0
  },
  refreshBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    background: "rgba(0, 212, 255, 0.1)",
    border: "1px solid rgba(0, 212, 255, 0.25)",
    borderRadius: "8px",
    color: "#00d4ff",
    fontSize: "0.9rem",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "'Inter', sans-serif"
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginBottom: "24px"
  },
  statCard: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "20px 24px",
    background: "#141414",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)"
  },
  statValue: {
    fontSize: "1.6rem",
    fontWeight: "700",
    color: "#ffffff"
  },
  statLabel: {
    fontSize: "0.85rem",
    color: "#a0a0a0",
    fontWeight: "500"
  },
  errorBanner: {
    padding: "12px 16px",
    background: "rgba(255, 82, 82, 0.1)",
    border: "1px solid rgba(255, 82, 82, 0.3)",
    borderRadius: "8px",
    color: "#ff5252",
    fontSize: "0.9rem",
    marginBottom: "16px"
  },
  tableWrapper: {
    background: "#141414",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 212, 255, 0.05)",
    overflow: "hidden"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  th: {
    padding: "14px 20px",
    textAlign: "left",
    fontSize: "0.8rem",
    fontWeight: "600",
    color: "#00d4ff",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    background: "#0a0a0a",
    borderBottom: "1px solid rgba(0, 212, 255, 0.2)"
  },
  tr: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
    transition: "background 0.15s ease"
  },
  td: {
    padding: "14px 20px",
    fontSize: "0.9rem",
    color: "#e0e0e0",
    verticalAlign: "middle"
  },
  changeBadge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "0.85rem",
    fontWeight: "600",
    border: "1px solid"
  },
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px"
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid rgba(0, 212, 255, 0.15)",
    borderTop: "3px solid #00d4ff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite"
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 20px",
    textAlign: "center"
  }
}
