import React, { useState, useCallback } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, Palette, ArrowRight, Book, User, MapPin, Package } from 'lucide-react'
import type { BoardCard as BoardCardType } from '@/api/draftboard'
import { BADGE_ICONS, ENTITY_LABELS } from './entityConstants'
import './BoardCard.css'

const COLOUR_PRESETS = ['#ffd699', '#f0ccff', '#cce5ff', '#ccf0e6', '#ffcccc', '#e6ccff']

interface BoardCardProps {
  card: BoardCardType
  isConnecting: boolean
  isConnectionTarget: boolean
  connectionModeActive?: boolean
  isSelected?: boolean
  connectingFromCardId: string | null
  duplicateChapterIds: Set<string>
  onUpdate: (patch: Partial<BoardCardType>) => void
  onDelete: () => void
  onStartConnect: () => void
  onConnectTo: () => Promise<void>
  onLinkChapter: () => void
  onSelect: () => void
  onEntityCardClick?: (entityId: string, rect: DOMRect) => void
  onUnlinkEntity?: (cardId: string, entityId?: string) => void
}

function CardContent({
  card,
  onUpdate,
  isCompact,
}: {
  card: BoardCardType
  onUpdate: (patch: Partial<BoardCardType>) => void
  isCompact: boolean
}) {
  if (isCompact) {
    return (
      <input
        type="text"
        className="board-card-title-compact"
        value={card.title || ''}
        onChange={e => onUpdate({ title: e.target.value })}
        placeholder="Title..."
        autoComplete="off"
      />
    )
  }

  return (
    <div className="board-card-content">
      <input
        type="text"
        className="board-card-title"
        value={card.title || ''}
        onChange={e => onUpdate({ title: e.target.value })}
        placeholder="Title..."
        autoComplete="off"
      />

      <textarea
        className="board-card-body"
        value={card.body || ''}
        onChange={e => onUpdate({ body: e.target.value })}
        placeholder="Content..."
      />
    </div>
  )
}

function HoverBar({
  isDragging,
  listeners,
  attributes,
  onStartConnect,
  onLinkChapter,
  onDelete,
  onToggleColourPicker,
  showColourPicker,
  colourPresets,
  onSelectColour,
}: {
  isDragging: boolean
  listeners: any
  attributes: any
  onStartConnect: () => void
  onLinkChapter: () => void
  onDelete: () => void
  onToggleColourPicker: () => void
  showColourPicker: boolean
  colourPresets: string[]
  onSelectColour: (colour: string) => void
}) {
  return (
    <div className="board-card-hover-bar">
      <div
        className="board-card-handle"
        title="Drag to move"
        {...listeners}
        {...attributes}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <GripVertical size={14} />
      </div>

      <button
        className="board-card-icon-btn"
        onMouseDown={(e) => {
          e.preventDefault()
          onStartConnect()
        }}
        title="Drag to connect to another card"
        style={{ cursor: 'grab' }}
      >
        <ArrowRight size={14} />
      </button>

      <button
        className="board-card-icon-btn"
        onClick={onLinkChapter}
        title="Link chapter"
      >
        <Book size={14} />
      </button>

      <button
        className="board-card-icon-btn"
        onClick={onToggleColourPicker}
        title="Change colour"
      >
        <Palette size={14} />
      </button>

      <button
        className="board-card-icon-btn board-card-delete-btn"
        onClick={onDelete}
        title="Delete"
      >
        <X size={14} />
      </button>

      {showColourPicker && (
        <div className="board-card-colour-picker" style={{ position: 'absolute', top: '-50px', left: '0', zIndex: 10 }}>
          {colourPresets.map(colour => (
            <button
              key={colour}
              className="board-card-colour-swatch"
              style={{ background: colour }}
              onClick={() => onSelectColour(colour)}
              title={colour}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EntityHoverBar({
  isDragging,
  listeners,
  attributes,
  onDelete,
}: {
  isDragging: boolean
  listeners: any
  attributes: any
  onDelete: () => void
}) {
  return (
    <div className="board-card-hover-bar board-card-hover-bar--compact">
      <div
        className="board-card-handle"
        title="Drag to move"
        {...listeners}
        {...attributes}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <GripVertical size={14} />
      </div>

      <button
        className="board-card-icon-btn board-card-delete-btn"
        onClick={onDelete}
        title="Delete"
      >
        <X size={14} />
      </button>
    </div>
  )
}

function EntityTypeIcon({ type }: { type: 'character' | 'location' | 'item' }) {
  const Icon = BADGE_ICONS[type]
  return <Icon size={14} style={{ flexShrink: 0 }} />
}

function ChapterBadge({
  chapterName,
  onUnlink,
  onClick,
}: {
  chapterName?: string
  onUnlink: () => void
  onClick: () => void
}) {
  return (
    <div className="board-card-chapter-badge" onClick={onClick}>
      <Book size={14} style={{ flexShrink: 0 }} />
      <span className="badge-text">{chapterName || 'Untitled'}</span>
      <button
        className="badge-unlink"
        onClick={e => {
          e.stopPropagation()
          onUnlink()
        }}
        title="Unlink chapter"
      >
        <X size={14} />
      </button>
    </div>
  )
}

function EntityBadge({
  entityName,
  entityType,
  entityId,
  onUnlink,
  onClick,
}: {
  entityName?: string
  entityType?: 'character' | 'location' | 'item'
  entityId?: string
  onUnlink: () => void
  onClick: () => void
}) {
  const IconComponent = entityType ? BADGE_ICONS[entityType] : null
  return (
    <div className="board-card-entity-badge" data-linked-entity-id={entityId} data-entity-type={entityType} onClick={onClick}>
      {IconComponent && <IconComponent size={14} style={{ flexShrink: 0 }} />}
      <span className="badge-text">{entityName || 'Unnamed'}</span>
      <button
        className="badge-unlink"
        onClick={e => {
          e.stopPropagation()
          onUnlink()
        }}
        title="Unlink entity"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default function BoardCard({
  card,
  isConnecting,
  isConnectionTarget,
  connectionModeActive,
  isSelected,
  connectingFromCardId,
  duplicateChapterIds,
  onUpdate,
  onDelete,
  onStartConnect,
  onConnectTo,
  onLinkChapter,
  onSelect,
  onEntityCardClick,
  onUnlinkEntity,
}: BoardCardProps) {
  const [showColourPicker, setShowColourPicker] = useState(false)
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
    id: card.id,
  })
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: card.id,
    disabled: !!card.entityId, // Entity cards are not drop targets
  })

  // Merge both refs
  const setNodeRef = useCallback((el: HTMLDivElement | null) => {
    setDraggableRef(el)
    setDroppableRef(el)
  }, [setDraggableRef, setDroppableRef])

  const handleUnlinkChapter = useCallback(() => {
    onUpdate({ chapterId: null, chapterName: undefined })
  }, [onUpdate])

  const handleSelectColour = useCallback((colour: string) => {
    onUpdate({ color: colour })
    setShowColourPicker(false)
  }, [onUpdate])

  const handleChapterBadgeClick = useCallback(() => {
    // Dispatch openChapter event for navigation
    document.dispatchEvent(
      new CustomEvent('openChapter', {
        detail: { chapterId: card.chapterId },
      })
    )
  }, [card.chapterId])

  const handleContainerClick = (e: React.MouseEvent) => {
    if (isDragging) return

    e.stopPropagation()
    onSelect()

    // If there's already a connection source and this isn't it, complete the connection
    if (connectingFromCardId && connectingFromCardId !== card.id) {
      onConnectTo()
    } else if (isConnecting) {
      // This card is the source but user clicked it again, complete connection
      onConnectTo()
    } else if (connectionModeActive || connectingFromCardId === card.id) {
      // Start or toggle connection from this card
      onStartConnect()
    }
  }

  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    left: card.x,
    top: card.y,
    zIndex: isDragging ? 50 : isSelected ? 30 : 1,
    transform: CSS.Translate.toString(transform),
    cursor: connectionModeActive ? 'pointer' : isDragging ? 'grabbing' : 'grab',
  }

  const shapeStyle: React.CSSProperties = {
    background: card.color || '#fff9e6',
  }

  const shapeClassName = [
    'board-card-shape',
    isDragging ? 'is-dragging' : '',
    isConnecting ? 'is-connecting-source' : '',
    (isConnectionTarget || connectionModeActive) ? 'is-connection-target' : '',
    card.entityType ? `entity-${card.entityType}` : '',
  ].filter(Boolean).join(' ')

  // Entity cards use a special layout, not geometric shapes
  if (card.entityId && card.entityType) {
    return (
      <div
        ref={setNodeRef}
        style={cardStyle}
        className={`board-card-wrapper board-entity-card-wrapper${isSelected ? ' is-selected' : ''}`}
        onClick={handleContainerClick}
      >
        <EntityHoverBar
          isDragging={isDragging}
          listeners={listeners}
          attributes={attributes}
          onDelete={onDelete}
        />

        <div
          className={`board-entity-chip entity-chip--${card.entityType}`}
          data-entity-card-id={card.entityId}
          onClick={e => {
            e.stopPropagation()
            onSelect()
            if (onEntityCardClick && card.entityId) {
              onEntityCardClick(card.entityId, e.currentTarget.getBoundingClientRect())
            }
          }}
        >
          <EntityTypeIcon type={card.entityType} />
          <span className="board-entity-chip__name">{card.title || 'Unnamed'}</span>
        </div>

        {card.chapterId && (
          <>
            <ChapterBadge
              chapterName={card.chapterName}
              onUnlink={handleUnlinkChapter}
              onClick={handleChapterBadgeClick}
            />
            {duplicateChapterIds.has(card.chapterId) && (
              <div className="board-card-duplicate-warning">
                ⚠ Linked to {[...duplicateChapterIds].filter(id => id === card.chapterId).length > 1 ? 'multiple cards' : 'multiple cards'}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // Regular shape cards
  if (card.shape === 'rectangle') {
    shapeStyle.borderRadius = '6px'
    shapeStyle.width = '200px'
    shapeStyle.height = '120px'
    shapeStyle.display = 'flex'
    shapeStyle.alignItems = 'center'
    shapeStyle.justifyContent = 'center'
  } else if (card.shape === 'circle') {
    shapeStyle.borderRadius = '50%'
    shapeStyle.width = '160px'
    shapeStyle.height = '160px'
    shapeStyle.display = 'flex'
    shapeStyle.alignItems = 'center'
    shapeStyle.justifyContent = 'center'
  } else if (card.shape === 'diamond') {
    shapeStyle.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
    shapeStyle.width = '160px'
    shapeStyle.height = '160px'
    shapeStyle.display = 'flex'
    shapeStyle.alignItems = 'center'
    shapeStyle.justifyContent = 'center'
  } else if (card.shape === 'triangle') {
    shapeStyle.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)'
    shapeStyle.width = '160px'
    shapeStyle.height = '140px'
    shapeStyle.display = 'flex'
    shapeStyle.alignItems = 'center'
    shapeStyle.justifyContent = 'center'
  }

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      className={`board-card-wrapper${isSelected ? ' is-selected' : ''}${isOver ? ' is-droppable-over' : ''}`}
      onClick={handleContainerClick}
    >
      <HoverBar
        isDragging={isDragging}
        listeners={listeners}
        attributes={attributes}
        onStartConnect={onStartConnect}
        onLinkChapter={onLinkChapter}
        onDelete={onDelete}
        onToggleColourPicker={() => setShowColourPicker(!showColourPicker)}
        showColourPicker={showColourPicker}
        colourPresets={COLOUR_PRESETS}
        onSelectColour={handleSelectColour}
      />

      <div style={shapeStyle} className={shapeClassName}>
        <CardContent
          card={card}
          onUpdate={onUpdate}
          isCompact={true}
        />
      </div>

      {card.chapterId && (
        <>
          <ChapterBadge
            chapterName={card.chapterName}
            onUnlink={handleUnlinkChapter}
            onClick={handleChapterBadgeClick}
          />
          {duplicateChapterIds.has(card.chapterId) && (
            <div className="board-card-duplicate-warning">
              ⚠ Linked to {[...duplicateChapterIds].filter(id => id === card.chapterId).length > 1 ? 'multiple cards' : 'multiple cards'}
            </div>
          )}
        </>
      )}

      {card.linkedEntities && card.linkedEntities.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
          {card.linkedEntities.map(entity => (
            <EntityBadge
              key={entity.id}
              entityId={entity.id}
              entityName={entity.name}
              entityType={entity.type}
              onUnlink={() => onUnlinkEntity?.(card.id, entity.id)}
              onClick={() => {
                // Just unlink on click, don't show popover
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
