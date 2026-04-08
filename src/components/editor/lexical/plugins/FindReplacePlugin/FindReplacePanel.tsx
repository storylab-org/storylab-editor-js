import React, { useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import './FindReplacePanel.css'

export interface FindReplacePanelProps {
  searchQuery: string
  replaceQuery: string
  caseSensitive: boolean
  matchCount: number
  currentMatchIndex: number
  searchInputRef: React.RefObject<HTMLInputElement>
  onSearchChange: (val: string) => void
  onReplaceChange: (val: string) => void
  onToggleCase: () => void
  onBackward: () => void
  onForward: () => void
  onReplace: () => void
  onReplaceAll: () => void
  onClose: () => void
}

export default function FindReplacePanel(props: FindReplacePanelProps): JSX.Element {
  const replaceInputRef = useRef<HTMLInputElement>(null)

  // Autofocus search input when panel is mounted/visible
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      props.searchInputRef.current?.focus()
    }, 0)
    return () => clearTimeout(timer)
  }, [props.searchInputRef])

  // Handle keyboard shortcuts in replace input
  useEffect(() => {
    const handleReplaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        if (e.shiftKey) {
          props.onReplaceAll()
        } else {
          props.onReplace()
        }
      }
    }
    const el = replaceInputRef.current
    if (el) {
      el.addEventListener('keydown', handleReplaceKeyDown as any)
      return () => el.removeEventListener('keydown', handleReplaceKeyDown as any)
    }
  }, [props])

  const matchCountLabel =
    props.matchCount === 0
      ? 'No results'
      : `${props.currentMatchIndex + 1} of ${props.matchCount}`

  return (
    <div
      className="find-replace-panel"
      role="dialog"
      aria-label="Find and Replace"
      onKeyDown={(e) => {
        // Prevent all keyboard events in the panel from bubbling to the editor
        e.stopPropagation()
      }}
    >
      {/* Header */}
      <div className="find-replace-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 className="find-replace-title">Find & Replace</h2>
          <div
            className="find-replace-match-count-header"
            aria-live="polite"
            aria-atomic="true"
          >
            {matchCountLabel}
          </div>
        </div>
        <button
          className="find-replace-close-button"
          onClick={props.onClose}
          aria-label="Close find and replace"
          title="Close (Escape)"
        >
          <X size={16} />
        </button>
      </div>

      {/* Find section */}
      <div className="find-replace-section">
        <div className="find-replace-input-group">
          <input
            ref={props.searchInputRef}
            type="text"
            className="find-replace-input"
            placeholder="Find..."
            value={props.searchQuery}
            onChange={(e) => props.onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              // Prevent keyboard events from bubbling to the editor
              e.stopPropagation()
              if (e.key === 'Enter') {
                if (e.shiftKey) {
                  props.onBackward()
                } else {
                  props.onForward()
                }
              }
            }}
            aria-label="Find text"
            autoFocus
          />
        </div>

        <div className="find-replace-controls">
          <button
            className={`find-replace-case-button ${
              props.caseSensitive ? 'find-replace-case-button--active' : ''
            }`}
            onClick={props.onToggleCase}
            aria-pressed={props.caseSensitive}
            title="Match case (Alt+C)"
          >
            Aa
          </button>
        </div>

        <div className="find-replace-nav-buttons">
          <button
            className="find-replace-button"
            onClick={props.onForward}
            title="Next match (Enter)"
            aria-label="Next match"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="find-replace-button"
            onClick={props.onBackward}
            title="Previous match (Shift+Enter)"
            aria-label="Previous match"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Replace section */}
      <div className="find-replace-divider" />

      <div className="find-replace-section">
        <div className="find-replace-input-group">
          <input
            ref={replaceInputRef}
            type="text"
            className="find-replace-input"
            placeholder="Replace with..."
            value={props.replaceQuery}
            onChange={(e) => props.onReplaceChange(e.target.value)}
            onKeyDown={(e) => {
              // Prevent keyboard events from bubbling to the editor
              e.stopPropagation()
              if (e.key === 'Enter') {
                if (e.shiftKey) {
                  props.onReplaceAll()
                } else {
                  props.onReplace()
                }
              }
            }}
            aria-label="Replace with text"
          />
        </div>

        <div className="find-replace-replace-buttons">
          <button
            className="find-replace-button find-replace-button--secondary"
            onClick={props.onReplace}
            disabled={props.matchCount === 0}
            title="Replace current match (Enter)"
          >
            Replace
          </button>
          <button
            className="find-replace-button find-replace-button--primary"
            onClick={props.onReplaceAll}
            disabled={props.matchCount === 0}
            title="Replace all matches (Shift+Enter)"
          >
            Replace All
          </button>
        </div>
      </div>
    </div>
  )
}
