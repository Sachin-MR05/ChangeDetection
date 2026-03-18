import { useEffect, useState } from "react"
import { saveAOI } from "../services/api"

function AOISelector({ aoi, setAoi }) {
  // Manual AOI for quick testing
  const setSampleAOI = () => {
    const bbox = [78.10, 10.20, 78.30, 10.40]
    const latHeight = (bbox[3] - bbox[1]) * 111
    const lonWidth = (bbox[2] - bbox[0]) * 111 * Math.cos((bbox[1] + bbox[3]) / 2 * Math.PI / 180)
    const areaKm2 = Math.abs(latHeight * lonWidth)
    
    console.log('📌 Sample AOI Set - Area:', areaKm2.toFixed(2), 'km²')
    
    setAoi({
      bbox,
      geometry: {
        type: "Polygon",
        coordinates: [[[
          [78.10, 10.20],
          [78.30, 10.20],
          [78.30, 10.40],
          [78.10, 10.40],
          [78.10, 10.20]
        ]]]
      },
      area: areaKm2
    })
  }

  const clearAOI = () => {
    console.log('🗑️ Clearing AOI')
    setAoi(null)
  }

  const [isSaving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  // Get area from aoi object or calculate it
  const getArea = () => {
    if (!aoi || !aoi.bbox) return 0
    if (aoi.area) return aoi.area
    return calculateArea(aoi.bbox)
  }

  // Log when AOI changes
  useEffect(() => {
    if (aoi) {
      console.log('🔄 AOI Updated in AOISelector:', {
        bbox: aoi.bbox,
        area: getArea(),
        hasGeometry: !!aoi.geometry
      })
    }
  }, [aoi])

  const handleAddAoi = async () => {
    if (!aoi || !aoi.bbox) return
    const name = window.prompt('Name this AOI before saving', `AOI ${new Date().toLocaleDateString()}`)
    if (!name) return
    setSaving(true)
    setFeedback(null)
    const payload = await saveAOI({ name, bbox: aoi.bbox })
    if (payload.success) {
      setFeedback('Saved to AOI Manager')
    } else {
      setFeedback(payload.error || 'Unable to save AOI')
    }
    setSaving(false)
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        <span style={styles.icon}>📍</span>
        Area of Interest
      </h3>

      {aoi ? (
        <>
          <div style={styles.successState}>
            <div style={styles.successBox}>
              <div style={styles.successHeader}>
                <span style={styles.checkmark}>✅</span>
                <span style={styles.successText}>AOI Selected</span>
              </div>
              <div style={styles.bboxContainer}>
                <label style={styles.bboxLabel}>Bounding Box</label>
                <div style={styles.bboxValue}>
                  [{aoi.bbox.map((n) => n.toFixed(4)).join(", ")}]
                </div>
              </div>
              <div style={styles.areaInfo}>
                <span style={styles.areaLabel}>Approx Area:</span>
                <span style={styles.areaValue}>
                  {getArea().toFixed(1)} km²
                </span>
              </div>
            </div>
            <div style={styles.buttonRow}>
              <button onClick={clearAOI} style={styles.clearButton}>
                <span>🗑️</span> Clear Selection
              </button>
              <button onClick={handleAddAoi} style={styles.addButton} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Add to AOI'}
              </button>
            </div>
          </div>
          {feedback && <p style={styles.feedback}>{feedback}</p>}
        </>
      ) : (
        <div style={styles.emptyState}>
          <div style={styles.drawPrompt}>
            <div style={styles.drawIcon}>🖱️</div>
            <p style={styles.drawText}>Draw a rectangle on the map</p>
            <p style={styles.drawHint}>
              Click <strong>Draw Area</strong> in the toolbar above,<br/>
              then click and drag on the map
            </p>
          </div>
          <div style={styles.divider}>
            <span>or</span>
          </div>
          <button onClick={setSampleAOI} style={styles.sampleButton}>
            <span>📌</span> Use Sample Area (Tamil Nadu)
          </button>
        </div>
      )}
    </div>
  )
}

// Helper to calculate approximate area
function calculateArea(bbox) {
  if (!bbox || bbox.length !== 4) return 0
  const [minLon, minLat, maxLon, maxLat] = bbox
  const latHeight = (maxLat - minLat) * 111
  const lonWidth = (maxLon - minLon) * 111 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180)
  return Math.abs(latHeight * lonWidth)
}

export default AOISelector

// ---------- STYLES - DARK THEME ----------
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    minHeight: "320px",
    maxHeight: "430px"
  },
  title: {
    margin: "0 0 12px 0",
    fontSize: "0.95rem",
    fontWeight: "600",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    letterSpacing: "0.3px"
  },
  icon: {
    fontSize: "1rem"
  },
  
  // Success state
  successState: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    flex: 1
  },
  successBox: {
    padding: "12px",
    background: "rgba(0, 230, 118, 0.08)",
    borderRadius: "8px",
    border: "1px solid rgba(0, 230, 118, 0.25)"
  },
  successHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px"
  },
  checkmark: {
    fontSize: "1rem"
  },
  successText: {
    fontWeight: "600",
    color: "#00e676",
    fontSize: "0.85rem"
  },
  bboxContainer: {
    marginBottom: "10px"
  },
  bboxLabel: {
    display: "block",
    fontSize: "0.65rem",
    color: "rgba(0, 230, 118, 0.7)",
    fontWeight: "600",
    marginBottom: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.8px"
  },
  bboxValue: {
    fontFamily: "'JetBrains Mono', 'Monaco', monospace",
    fontSize: "0.7rem",
    color: "#00e676",
    background: "rgba(0, 0, 0, 0.3)",
    padding: "8px",
    borderRadius: "6px",
    wordBreak: "break-all",
    border: "1px solid rgba(0, 230, 118, 0.15)"
  },
  areaInfo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "10px",
    borderTop: "1px solid rgba(255, 255, 255, 0.06)"
  },
  areaLabel: {
    fontSize: "0.7rem",
    color: "rgba(255, 255, 255, 0.5)"
  },
  areaValue: {
    fontWeight: "600",
    color: "#00e676",
    fontSize: "0.85rem"
  },
  buttonRow: {
    display: "flex",
    gap: "10px"
  },
  clearButton: {
    width: "100%",
    padding: "10px",
    background: "rgba(255, 82, 82, 0.15)",
    color: "#ff5252",
    border: "1px solid rgba(255, 82, 82, 0.3)",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    transition: "all 0.2s ease",
    fontFamily: "'Inter', sans-serif"
  },
  addButton: {
    flex: 1,
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid rgba(0, 212, 255, 0.4)",
    background: "rgba(0, 212, 255, 0.15)",
    color: "#00d4ff",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.8rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontFamily: "'Inter', sans-serif"
  },
  feedback: {
    marginTop: "8px",
    color: "#00d4ff",
    fontSize: "0.75rem"
  },
  
  // Empty state
  emptyState: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    flex: 1
  },
  drawPrompt: {
    padding: "16px 12px",
    background: "rgba(0, 212, 255, 0.06)",
    border: "1px dashed rgba(0, 212, 255, 0.3)",
    borderRadius: "8px",
    textAlign: "center"
  },
  drawIcon: {
    fontSize: "1.5rem",
    marginBottom: "6px"
  },
  drawText: {
    margin: "0 0 4px",
    fontSize: "0.85rem",
    fontWeight: "500",
    color: "#00d4ff"
  },
  drawHint: {
    margin: 0,
    fontSize: "0.7rem",
    color: "rgba(255, 255, 255, 0.5)",
    lineHeight: 1.5
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: "0.7rem"
  },
  sampleButton: {
    width: "100%",
    padding: "10px",
    background: "linear-gradient(135deg, #00d4ff, #00b4d8)",
    color: "#000000",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    transition: "all 0.2s ease",
    boxShadow: "0 0 20px rgba(0, 212, 255, 0.2)",
    fontFamily: "'Inter', sans-serif"
  }
}
