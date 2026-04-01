import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { SlashCommand } from './commands'
import './SlashPalette.css'

interface SlashPaletteProps {
  commands: SlashCommand[]
  selectedIndex: number
  position: { top: number; left: number }
  onSelect: (cmd: SlashCommand) => void
  onHover: (index: number) => void
  paletteRef: React.RefObject<HTMLDivElement | null>
}

export const SlashPalette: React.FC<SlashPaletteProps> = ({
  commands,
  selectedIndex,
  position,
  onSelect,
  onHover,
  paletteRef,
}) => {
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])

  // Auto-scroll selected item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
      })
    }
  }, [selectedIndex])

  const palette = (
    <div
      className="typeahead-popover slash-command-palette"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      ref={paletteRef}
    >
      <div className="slash-palette-header">
        <span className="slash-palette-trigger">/</span>
        <span className="slash-palette-label">Insert block</span>
      </div>

      <ul>
        {commands.length > 0 ? (
          commands.map((cmd, i) => (
            <li
              key={cmd.id}
              ref={(el) => {
                itemRefs.current[i] = el
              }}
              className={i === selectedIndex ? 'selected' : ''}
              onClick={() => onSelect(cmd)}
              onMouseEnter={() => onHover(i)}
            >
              <span className="icon">{cmd.icon}</span>
              <span className="text">
                <span className="slash-cmd-label">{cmd.label}</span>
                <span className="slash-cmd-description">{cmd.description}</span>
              </span>
            </li>
          ))
        ) : (
          <li className="slash-palette-empty">No commands found</li>
        )}
      </ul>

      <div className="slash-palette-footer">
        ↑↓ to navigate · Enter to select · Esc to close
      </div>
    </div>
  )

  return createPortal(palette, document.body)
}
