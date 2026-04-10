import { useEffect, useRef, useState } from 'react'
import type { Entity } from '@/api/entities'
import { BADGE_ICONS, ENTITY_LABELS } from '@/api/entities'
import './EntityMentionPopover.css'

interface EntityMentionPopoverProps {
  entity: Entity
  position: { top: number; left: number }
  onClose: () => void
}

export default function EntityMentionPopover({
  entity,
  position,
  onClose,
}: EntityMentionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [popoverPos, setPopoverPos] = useState(position)
  const mentionElementRef = useRef<HTMLElement | null>(null)

  // Store reference to the mention element and track scroll
  useEffect(() => {
    mentionElementRef.current = document.querySelector(`[data-entity-id="${entity.id}"]`) as HTMLElement
  }, [entity.id])

  // Update position on scroll and when mention element moves
  useEffect(() => {
    const updatePosition = () => {
      if (mentionElementRef.current) {
        const rect = mentionElementRef.current.getBoundingClientRect()
        setPopoverPos({
          top: rect.bottom + 8,
          left: rect.left,
        })
      }
    }

    // Update on scroll
    window.addEventListener('scroll', updatePosition, true)
    // Also update on resize
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
      className="entity-mention-popover"
      style={{
        top: `${popoverPos.top}px`,
        left: `${popoverPos.left}px`,
      }}
    >
      <div className="entity-mention-popover__header">
        <span className={`entity-mention-popover__badge entity-mention-popover__badge--${entity.type}`}>
          <IconComponent size={14} />
          <span>{ENTITY_LABELS[entity.type]}</span>
        </span>
      </div>
      <div className="entity-mention-popover__name">{entity.name}</div>
      {entity.description && (
        <div className="entity-mention-popover__description">{entity.description}</div>
      )}
      {entity.tags && entity.tags.length > 0 && (
        <div className="entity-mention-popover__tags">
          {entity.tags.map((tag) => (
            <span key={tag} className="entity-mention-popover__tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}
