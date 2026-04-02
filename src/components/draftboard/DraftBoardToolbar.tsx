import React from 'react'
import { ArrowRight, RotateCcw } from 'lucide-react'
import './DraftBoardToolbar.css'

interface DraftBoardToolbarProps {
  onAddRectangle: () => void
  onAddCircle: () => void
  onAddDiamond: () => void
  onAddTriangle: () => void
  isConnecting: boolean
  onToggleConnect: () => void
  onReset: () => Promise<void>
}

export default function DraftBoardToolbar({
  onAddRectangle,
  onAddCircle,
  onAddDiamond,
  onAddTriangle,
  isConnecting,
  onToggleConnect,
  onReset,
}: DraftBoardToolbarProps): React.ReactElement {
  return (
    <div className="draft-board-toolbar">
      <button
        className="board-tool-btn"
        onClick={onAddRectangle}
        title="Add Rectangle"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="4" width="12" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      <button
        className="board-tool-btn"
        onClick={onAddCircle}
        title="Add Circle"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      <button
        className="board-tool-btn"
        onClick={onAddDiamond}
        title="Add Diamond"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <polygon points="8,2 14,8 8,14 2,8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      <button
        className="board-tool-btn"
        onClick={onAddTriangle}
        title="Add Triangle"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <polygon points="8,2 14,13 2,13" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      <div className="board-toolbar-separator" />

      <button
        className={`board-tool-btn${isConnecting ? ' active' : ''}`}
        onClick={onToggleConnect}
        title="Connect cards"
      >
        <ArrowRight size={16} />
      </button>

      <div className="board-toolbar-separator" />

      <button
        className="board-tool-btn"
        onClick={onReset}
        title="Reset board"
      >
        <RotateCcw size={16} />
      </button>
    </div>
  )
}
