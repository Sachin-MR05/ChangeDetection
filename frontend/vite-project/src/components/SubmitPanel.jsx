function SubmitPanel({ canRun, loading, onRun }) {
  return (
    <div className="submit-panel">
      <button
        className={`submit-btn ${canRun ? 'active' : 'disabled'} ${loading ? 'loading' : ''}`}
        disabled={!canRun}
        onClick={onRun}
      >
        {loading ? (
          <span className="btn-content">
            <span className="spinner"></span>
            Processing...
          </span>
        ) : (
          <span className="btn-content">
            <span className="rocket">🚀</span>
            Run Change Detection
          </span>
        )}
      </button>
    </div>
  )
}

export default SubmitPanel