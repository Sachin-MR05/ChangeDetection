import { useState, useRef } from "react"
import WorldMap from "../components/WorldMap"
import AOISelector from "../components/AOISelector"
import DateSelector from "../components/DateSelector"
import SubmitPanel from "../components/SubmitPanel"
import ResultPanel from "../components/ResultPanel"
import DrawingToolbar from "../components/DrawingToolbar"
import logo from "../assets/terraguard-logo.svg"
import { changeDetection, saveHistory } from "../services/api"
import { validateDetectionRequest } from "../utils/validation"
import { getErrorMessage, isRetryableError } from "../utils/errorMessages"

function Dashboard({
  aoi,
  setAoi,
  dates,
  setDates,
  result,
  loading,
  error,
  setResult,
  setLoading,
  setError,
  onLogout
}) {
  // Validation errors
  const [validationErrors, setValidationErrors] = useState([]);
  // Drawing mode state
  const [activeDrawMode, setActiveDrawMode] = useState(null);
  // Ref to WorldMap for triggering draw actions
  const mapRef = useRef(null);

  // ✅ Check if user can run detection
  const canRun =
    aoi !== null &&
    dates.past !== null &&
    dates.current !== null &&
    !loading

  // Drawing toolbar handlers
  const handleDraw = () => {
    setActiveDrawMode('draw');
    if (mapRef.current?.startDrawing) {
      mapRef.current.startDrawing();
    }
  };

  const handleEdit = () => {
    setActiveDrawMode('edit');
    if (mapRef.current?.startEditing) {
      mapRef.current.startEditing();
    }
  };

  const handleClear = () => {
    setActiveDrawMode(null);
    if (mapRef.current?.clearDrawing) {
      mapRef.current.clearDrawing();
    }
    setAoi(null);
  };

  // ✅ Real API call to backend with client-side validation
  const handleRunDetection = async () => {
    // Clear previous errors
    setError(null)
    setValidationErrors([])

    // Client-side validation
    const validation = validateDetectionRequest({
      aoi,
      t1: dates.past,
      t2: dates.current
    });

    if (!validation.valid) {
      // Show validation errors
      const errorMessages = validation.errors.map(code => getErrorMessage(code));
      setValidationErrors(errorMessages);
      return; // Don't make API call
    }

    setLoading(true)
    setResult(null)

    try {
      // Call backend API
      const response = await changeDetection({
        aoi: {
          type: "Feature",
          bbox: aoi.bbox, // [minLon, minLat, maxLon, maxLat]
          geometry: aoi.geometry
        },
        t1: dates.past,
        t2: dates.current,
        cloudThreshold: 20
      });

      if (response.success) {
        // Transform backend response to UI format
        const { data } = response;
        setResult({
          request_id: data.request_id,
          status: data.status,
          change_percentage: data.metrics?.change_percentage || 0,
          changed_pixels: data.metrics?.changed_pixels || 0,
          total_pixels: data.metrics?.total_pixels || 0,
          change_map_url: data.outputs?.change_map || null,
          // Use high-res images if available, otherwise fall back to standard resolution
          past_image_url: data.outputs?.past_image_hires || data.outputs?.past_image || null,
          current_image_url: data.outputs?.current_image_hires || data.outputs?.current_image || null,
          dates_used: data.dates,
          metadata: data.metadata
        });

        // Newer backends persist history during detection; older ones still need a fallback save.
        if (!data.metadata?.history_saved) {
          saveHistory({
            change_percentage: data.metrics?.change_percentage || 0,
            start_date: dates.past,
            end_date: dates.current,
            bounding_box: aoi?.bbox || null
          }).catch(err => console.error('Failed to save history:', err));
        }
      } else {
        // Handle API error with user-friendly message
        const errorMessage = getErrorMessage(response.errorCode, response.error);
        setError({
          message: errorMessage,
          code: response.errorCode,
          retryable: isRetryableError(response.errorCode)
        });
      }
    } catch (err) {
      // Handle unexpected errors
      setError({
        message: err.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        retryable: false
      });
    } finally {
      setLoading(false)
    }
  }

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
            <a href="/" style={{ ...styles.navLink, ...styles.navLinkActive }}>Dashboard</a>
            <a href="/aois" style={styles.navLink}>AOI Manager</a>
            <a href="/alerts" style={styles.navLink}>Alerts</a>
            <a href="/history" style={styles.navLink}>History</a>
          </div>
        </div>
        <div style={styles.navRight}>
          <button style={styles.profileBtn} onClick={onLogout}>
            <svg style={styles.profileIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* DRAWING TOOLBAR */}
      <div style={styles.toolbarContainer}>
        <DrawingToolbar
          onDraw={handleDraw}
          onEdit={handleEdit}
          onClear={handleClear}
          activeMode={activeDrawMode}
          hasDrawing={aoi !== null}
        />
      </div>

      {/* MAP SECTION */}
      <div style={styles.mapSection}>
        <div style={styles.mapContainer}>
          <WorldMap
            ref={mapRef}
            setAoi={setAoi}
            onDrawStart={() => setActiveDrawMode('draw')}
            onDrawEnd={() => setActiveDrawMode(null)}
          />
        </div>
        <div style={styles.aoiPanel}>
          <AOISelector aoi={aoi} setAoi={setAoi} />
        </div>
      </div>

      {/* CONTROL SECTION */}
      <div style={styles.controlSection}>
        <DateSelector dates={dates} setDates={setDates} />
        <SubmitPanel
          canRun={canRun}
          loading={loading}
          onRun={handleRunDetection}
        />
      </div>

      {/* VALIDATION ERRORS */}
      {validationErrors.length > 0 && (
        <div style={{ ...styles.validationErrors, marginLeft: "16px", marginRight: "16px" }}>
          {validationErrors.map((err, idx) => (
            <p key={idx} style={styles.validationError}>⚠️ {err}</p>
          ))}
        </div>
      )}

      {/* RESULT SECTION */}
      <div style={styles.resultWrapper}>
        <ResultPanel
          result={result}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  )
}

export default Dashboard

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
  profileBtn: {
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
  profileIcon: {
    width: "20px",
    height: "20px"
  },
  mainContent: {
    padding: "0 16px 16px"
  },
  toolbarContainer: {
    marginBottom: "12px",
    padding: "0 16px",
    animation: "fadeInUp 0.4s ease"
  },
  mapSection: {
    display: "grid",
    gridTemplateColumns: "1fr 280px",
    gap: "12px",
    marginBottom: "12px",
    padding: "0 16px",
    animation: "fadeInUp 0.5s ease 0.1s backwards"
  },
  mapContainer: {
    background: "#141414",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 212, 255, 0.05)",
    overflow: "hidden",
    minHeight: "600px",
    position: "relative"
  },
  aoiPanel: {
    background: "#141414",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
    padding: "14px",
    animation: "slideInRight 0.5s ease 0.2s backwards"
  },
  controlSection: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-end",
    marginBottom: "12px",
    marginLeft: "16px",
    marginRight: "16px",
    padding: "14px",
    background: "#141414",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
    animation: "fadeInUp 0.5s ease 0.3s backwards"
  },
  validationErrors: {
    marginBottom: "12px",
    padding: "12px",
    background: "rgba(255, 171, 0, 0.1)",
    border: "1px solid rgba(255, 171, 0, 0.3)",
    borderRadius: "8px",
    animation: "scaleIn 0.3s ease"
  },
  validationError: {
    margin: "4px 0",
    color: "#ffab00",
    fontSize: "13px",
    fontWeight: "500"
  },
  resultWrapper: {
    padding: "0 16px 16px"
  }
}

