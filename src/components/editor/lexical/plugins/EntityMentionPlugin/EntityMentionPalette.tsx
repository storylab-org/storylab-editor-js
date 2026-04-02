import React, { useEffect, useRef } from 'react'
import { User, MapPin, Package } from 'lucide-react'
import type { Entity } from '@/api/entities'
import './EntityMentionPalette.css'

interface EntityMentionPaletteProps {
  entities: Entity[]
  selectedIndex: number
  position: { top: number; left: number }
  onSelect: (entity: Entity) => void
  onHover: (index: number) => void
  paletteRef: React.RefObject<HTMLDivElement>
}

const BADGE_ICONS = {
  character: User,
  location: MapPin,
  item: Package,
}

export default function EntityMentionPalette({
  entities,
  selectedIndex,
  position,
  onSelect,
  onHover,
  paletteRef,
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

  const typeColours: Record<string, string> = {
    character: '#7c3aed',
    location: '#0d9488',
    item: '#b45309',
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
              <span
                className="entity-mention-palette-type-badge"
                style={{ borderColor: typeColours[entity.type] }}
              >
                <IconComponent size={14} />
                <span>{entity.type}</span>
              </span>
              <span className="entity-mention-palette-item-name">{entity.name}</span>
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
