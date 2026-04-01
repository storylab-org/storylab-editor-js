import React, { useState, useCallback } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, Palette, Link2 } from 'lucide-react'
import type { BoardCard as BoardCardType } from '@/api/overview'
import './BoardCard.css'

const COLOUR_PRESETS = ['#fff9e6', '#f9e6ff', '#e6f9ff', '#e6fff9', '#ffe6e6', '#f0e6ff']

interface BoardCardProps {
  card: BoardCardType
  isConnecting: boolean
  isConnectionTarget: boolean
  onUpdate: (patch: Partial<BoardCardType>) => void
  onDelete: () => void
  onStartConnect: () => void
  onConnectTo: () => Promise<void>
  onLinkChapter: () => void
}

function RectangleFace({
  card,
  onUpdate,
}: {
  card: BoardCardType
  onUpdate: (patch: Partial<BoardCardType>) => void
}) {
  const [showColourPicker, setShowColourPicker] = useState(false)

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

      <div className="board-card-colour-picker-row">
        <button
          className="board-card-icon-btn"
          onClick={() => setShowColourPicker(!showColourPicker)}
          title="Change colour"
        >
          <Palette size={14} />
        </button>
        {showColourPicker && (
          <div className="board-card-colour-picker">
            {COLOUR_PRESETS.map(colour => (
              <button
                key={colour}
                className="board-card-colour-swatch"
                style={{ background: colour }}
                onClick={() => {
                  onUpdate({ color: colour })
                  setShowColourPicker(false)
                }}
                title={colour}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CompactFace({
  card,
  onUpdate,
}: {
  card: BoardCardType
  onUpdate: (patch: Partial<BoardCardType>) => void
}) {
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

function HoverBar({
  isDragging,
  listeners,
  attributes,
  onStartConnect,
  onLinkChapter,
  onDelete,
}: {
  isDragging: boolean
  listeners: any
  attributes: any
  onStartConnect: () => void
  onLinkChapter: () => void
  onDelete: () => void
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
        onClick={onStartConnect}
        title="Connect to another card"
      >
        <Link2 size={14} />
      </button>

      <button
        className="board-card-icon-btn"
        onClick={onLinkChapter}
        title="Link chapter"
      >
        📖
      </button>

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
      <span className="badge-text">📖 {chapterName || 'Untitled'}</span>
      <button
        className="badge-unlink"
        onClick={e => {
          e.stopPropagation()
          onUnlink()
        }}
        title="Unlink chapter"
      >
        ×
      </button>
    </div>
  )
}

export default function BoardCard({
  card,
  isConnecting,
  isConnectionTarget,
  onUpdate,
  onDelete,
  onStartConnect,
  onConnectTo,
  onLinkChapter,
}: BoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  })

  const handleUnlinkChapter = useCallback(() => {
    onUpdate({ chapterId: null, chapterName: undefined })
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
    if (isConnectionTarget && !isDragging) {
      e.stopPropagation()
      onConnectTo()
    }
  }

  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    left: card.x,
    top: card.y,
    zIndex: isDragging ? 50 : 1,
    transform: CSS.Translate.toString(transform),
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  const shapeStyle: React.CSSProperties = {
    background: card.color || '#fff9e6',
    border: isConnectionTarget ? '2px solid #0066cc' : '1px solid rgba(0, 0, 0, 0.1)',
    boxShadow: isDragging
      ? '0 8px 24px rgba(0, 0, 0, 0.15)'
      : isConnectionTarget
      ? '0 0 12px rgba(0, 102, 204, 0.4)'
      : '0 2px 4px rgba(0, 0, 0, 0.1)',
    padding: '12px',
    animation: isConnecting ? 'pulse 1.5s infinite' : isConnectionTarget ? 'targetPulse 1.5s infinite' : 'none',
  }

  // Apply shape-specific styles
  if (card.shape === 'rectangle') {
    shapeStyle.borderRadius = '6px'
    shapeStyle.width = '200px'
  } else if (card.shape === 'circle') {
    shapeStyle.borderRadius = '50%'
    shapeStyle.width = '120px'
    shapeStyle.height = '120px'
    shapeStyle.display = 'flex'
    shapeStyle.alignItems = 'center'
    shapeStyle.justifyContent = 'center'
  } else if (card.shape === 'diamond') {
    shapeStyle.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
    shapeStyle.width = '120px'
    shapeStyle.height = '120px'
    shapeStyle.display = 'flex'
    shapeStyle.alignItems = 'center'
    shapeStyle.justifyContent = 'center'
  } else if (card.shape === 'triangle') {
    shapeStyle.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)'
    shapeStyle.width = '120px'
    shapeStyle.height = '104px'
    shapeStyle.display = 'flex'
    shapeStyle.alignItems = 'center'
    shapeStyle.justifyContent = 'center'
  }

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      className="board-card-wrapper"
      onClick={handleContainerClick}
    >
      <HoverBar
        isDragging={isDragging}
        listeners={listeners}
        attributes={attributes}
        onStartConnect={onStartConnect}
        onLinkChapter={onLinkChapter}
        onDelete={onDelete}
      />

      <div style={shapeStyle}>
        {card.shape === 'rectangle' ? (
          <RectangleFace card={card} onUpdate={onUpdate} />
        ) : (
          <CompactFace card={card} onUpdate={onUpdate} />
        )}
      </div>

      {card.chapterId && (
        <ChapterBadge
          chapterName={card.chapterName}
          onUnlink={handleUnlinkChapter}
          onClick={handleChapterBadgeClick}
        />
      )}

      <style>
        {`
          @keyframes pulse {
            0%, 100% { outline-color: #0066cc; outline-offset: 4px; }
            50% { outline-color: #4a9eff; outline-offset: 6px; }
          }
          @keyframes targetPulse {
            0%, 100% { box-shadow: 0 0 12px rgba(0, 102, 204, 0.4); }
            50% { box-shadow: 0 0 20px rgba(0, 102, 204, 0.6); }
          }
        `}
      </style>
    </div>
  )
}
