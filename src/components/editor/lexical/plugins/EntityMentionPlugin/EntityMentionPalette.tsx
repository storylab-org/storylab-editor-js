import React, { useEffect, useRef } from 'react'
import type { Entity } from '@/api/entities'
import { BADGE_ICONS, ENTITY_LABELS, ENTITY_CHIP_COLORS } from '@/api/entities'
import './EntityMentionPalette.css'

interface EntityMentionPaletteProps {
  entities: Entity[]
  selectedIndex: number
  position: { top: number; left: number }
  onSelect: (entity: Entity) => void
  onHover: (index: number) => void
  paletteRef: React.RefObject<HTMLDivElement>
  triggerChar?: string
}

export default function EntityMentionPalette({
  entities,
  selectedIndex,
  position,
  onSelect,
  onHover,
  paletteRef,
  triggerChar = '@',
}: EntityMentionPaletteProps) {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Auto-scroll active item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (entities.length === 0) {
    return null
  }

  return (
    <div
      ref={paletteRef}
      className="entity-mention-palette"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {entities.map((entity, index) => {
        const IconComponent = BADGE_ICONS[entity.type]
        return (
          <div
            key={entity.id}
            ref={(el) => {
              itemRefs.current[index] = el
            }}
            className={`entity-mention-palette-item ${index === selectedIndex ? 'active' : ''}`}
            onClick={() => onSelect(entity)}
            onMouseEnter={() => onHover(index)}
          >
            <div className="entity-mention-palette-item-header">
              <IconComponent size={14} color={ENTITY_CHIP_COLORS[entity.type]} />
              <span className="entity-mention-palette-item-name">{entity.name}</span>
              <span className="entity-mention-palette-item-type">{ENTITY_LABELS[entity.type]}</span>
              <span className="entity-mention-palette-item-trigger">{triggerChar}</span>
            </div>
            {entity.description && (
              <div className="entity-mention-palette-item-description">{entity.description}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
