import React, { useState } from 'react'
import { ArrowRight, RotateCcw, User, MapPin, Package, Book } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { type EntityType } from '@/api/entities'
import type { DocumentHead } from '@/api/documents'
import DropDown, { DropDownItem } from '@/components/editor/lexical/ui/DropDown'
import './DraftBoardToolbar.css'

interface DraftBoardToolbarProps {
  onAddRectangle: () => void
  onAddCircle: () => void
  onAddDiamond: () => void
  onAddTriangle: () => void
  onAddEntity: (entityType: EntityType) => void
  isConnecting: boolean
  onToggleConnect: () => void
  onReset: () => Promise<void>
  chapters: DocumentHead[]
  assignedChapterIds: Set<string>
}

function DraggableChapterChip({
  chapter,
  isAssigned,
}: {
  chapter: DocumentHead
  isAssigned: boolean
}): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `chapter:${chapter.id}`,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`toolbar-chapter-chip${isAssigned ? ' toolbar-chapter-chip--assigned' : ''}${isDragging ? ' is-dragging' : ''}`}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? 'none' : undefined,
      }}
      title={chapter.name}
    >
      <Book size={12} />
      <span>{chapter.name}</span>
    </div>
  )
}

export default function DraftBoardToolbar({
  onAddRectangle,
  onAddCircle,
  onAddDiamond,
  onAddTriangle,
  onAddEntity,
  isConnecting,
  onToggleConnect,
  onReset,
  chapters,
  assignedChapterIds,
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

      <DropDown
        buttonLabel="Entity"
        buttonIcon={<User size={16} />}
        buttonClassName="board-tool-btn board-tool-btn-entity"
        buttonAriaLabel="Add entity card"
      >
        <DropDownItem className="item" onClick={() => onAddEntity('character')}>
          <User size={14} /><span className="text">Person</span>
        </DropDownItem>
        <DropDownItem className="item" onClick={() => onAddEntity('location')}>
          <MapPin size={14} /><span className="text">Location</span>
        </DropDownItem>
        <DropDownItem className="item" onClick={() => onAddEntity('item')}>
          <Package size={14} /><span className="text">Item</span>
        </DropDownItem>
      </DropDown>

      <div className="board-toolbar-separator" />

      {chapters.length > 0 && (
        <>
          <div className="toolbar-chapters-strip">
            {chapters.map(chapter => (
              <DraggableChapterChip
                key={chapter.id}
                chapter={chapter}
                isAssigned={assignedChapterIds.has(chapter.id)}
              />
            ))}
          </div>

          <div className="board-toolbar-separator" />
        </>
      )}

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
