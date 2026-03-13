import { useState } from 'react'

// Professional SVG Icons
const Icons = {
  Draw: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeDasharray="4 2"/>
      <path d="M9 9h6v6H9z" fill="currentColor" fillOpacity="0.2"/>
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Clear: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <line x1="10" y1="11" x2="10" y2="17"/>
      <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
  )
}

function DrawingToolbar({ onDraw, onEdit, onClear, activeMode, hasDrawing }) {
  return (
    <div className="drawing-toolbar">
      <button 
        className={`drawing-toolbar-btn ${activeMode === 'draw' ? 'active' : ''}`}
        onClick={onDraw}
        title="Draw Rectangle"
      >
        <Icons.Draw />
        <span>Draw Area</span>
      </button>
      
      <button 
        className={`drawing-toolbar-btn ${activeMode === 'edit' ? 'active' : ''}`}
        onClick={onEdit}
        disabled={!hasDrawing}
        style={{ opacity: hasDrawing ? 1 : 0.5 }}
        title="Edit Selection"
      >
        <Icons.Edit />
        <span>Edit</span>
      </button>
      
      <button 
        className="drawing-toolbar-btn danger"
        onClick={onClear}
        disabled={!hasDrawing}
        style={{ opacity: hasDrawing ? 1 : 0.5 }}
        title="Clear Selection"
      >
        <Icons.Clear />
        <span>Clear</span>
      </button>
    </div>
  )
}

export default DrawingToolbar
