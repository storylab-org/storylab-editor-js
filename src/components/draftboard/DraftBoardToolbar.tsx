import React from 'react'
import { ArrowRight, RotateCcw, User, MapPin, Package, Book } from 'lucide-react'
import { type EntityType } from '@/api/entities'
import type { DocumentHead } from '@/api/documents'
import DropDown, { DropDownItem } from '@/components/editor/lexical/ui/DropDown'
import './DraftBoardToolbar.css'

function ChapterItem({
  chapter,
  isSelected,
  onSelect
}: {
  chapter: DocumentHead
  isSelected?: boolean
  onSelect?: (chapterId: string) => void
}) {
  return (
    <div
      onClick={() => onSelect?.(chapter.id)}
      style={{
        opacity: isSelected ? 0.6 : 1,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        fontSize: '14px',
        color: '#333',
        borderRadius: '4px',
        backgroundColor: isSelected ? '#e8e8e8' : 'transparent',
        border: isSelected ? '1px solid #bbb' : 'none',
        width: '100%',
        textAlign: 'left',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = '#f0f0f0'
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'transparent'
        }
      }}
    >
      <Book size={14} />
      <span>{chapter.name}</span>
    </div>
  )
}

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
  selectedChapterId?: string | null
  onSelectChapter?: (chapterId: string | null) => void
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
  selectedChapterId,
  onSelectChapter,
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

      {chapters.length > 0 && (
        <>
          <div className="board-toolbar-separator" />

          <DropDown
            buttonLabel="Chapter"
            buttonIcon={<Book size={16} />}
            buttonClassName="board-tool-btn board-tool-btn-chapter"
            buttonAriaLabel="Select chapter to assign"
          >
            {chapters.map(chapter => (
              <ChapterItem
                key={chapter.id}
                chapter={chapter}
                isSelected={selectedChapterId === chapter.id}
                onSelect={onSelectChapter}
              />
            ))}
          </DropDown>
        </>
      )}

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
