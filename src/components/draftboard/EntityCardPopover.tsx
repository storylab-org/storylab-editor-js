import React, { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import type { Entity } from '@/api/entities'
import { BADGE_ICONS, ENTITY_LABELS } from './entityConstants'
import './EntityCardPopover.css'

interface EntityCardPopoverProps {
  entity: Entity
  anchorRect: DOMRect
  onClose: () => void
  onEdit: () => void
}

export default function EntityCardPopover({
  entity,
  anchorRect,
  onClose,
  onEdit,
}: EntityCardPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const chipElementRef = useRef<HTMLElement | null>(null)
  const [popoverPos, setPopoverPos] = useState({
    top: anchorRect.bottom + 8,
    left: anchorRect.left,
  })

  // Store reference to the chip DOM element for scroll tracking
  useEffect(() => {
    chipElementRef.current = document.querySelector(
      `[data-entity-card-id="${entity.id}"]`
    ) as HTMLElement
  }, [entity.id])

  // Re-position when the canvas scrolls
  useEffect(() => {
    const updatePosition = () => {
      if (chipElementRef.current) {
        const rect = chipElementRef.current.getBoundingClientRect()
        setPopoverPos({ top: rect.bottom + 8, left: rect.left })
      }
    }

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [entity.id])

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const IconComponent = BADGE_ICONS[entity.type]

  return (
    <div
      ref={popoverRef}
      className="entity-card-popover"
      style={{
        top: `${popoverPos.top}px`,
        left: `${popoverPos.left}px`,
      }}
    >
      {/* Header with badge + Edit button */}
      <div className="entity-card-popover__header">
        <span className={`entity-mention-popover__badge entity-mention-popover__badge--${entity.type}`}>
          <IconComponent size={14} />
          <span>{ENTITY_LABELS[entity.type]}</span>
        </span>
        <button
          className="entity-card-popover__edit-btn"
          onClick={onEdit}
          title="Edit entity"
        >
          <Pencil size={14} />
        </button>
      </div>

      {/* Name */}
      <div className="entity-mention-popover__name">{entity.name}</div>

      {/* Description */}
      {entity.description && (
        <div className="entity-mention-popover__description">{entity.description}</div>
      )}

      {/* Tags */}
      {entity.tags && entity.tags.length > 0 && (
        <div className="entity-card-popover__tags">
          <div className="entity-card-popover__tags-divider" />
          <div className="entity-card-popover__tags-list">
            {entity.tags.map((tag, index) => (
              <span key={index} className="entity-mention-popover__tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
