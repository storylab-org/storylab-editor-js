import { useState, useEffect, memo, useCallback } from 'react'
import { Trash2, GripVertical } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { arrayMove } from '@dnd-kit/sortable'
import { OVERVIEW_ID } from '@/constants'
import type { DocumentHead } from '@/api/documents'

interface ChapterListProps {
  chapters: DocumentHead[]
  activeChapterId: string
  isLoading: boolean
  onSelectChapter: (id: string) => void | Promise<void>
  onCreateChapter: () => void
  onDeleteChapter?: (id: string) => void
  onReorder?: (chapters: DocumentHead[]) => void
}

interface SortableChapterItemProps {
  chapter: DocumentHead
  activeChapterId: string
  onSelectChapter: (id: string) => void | Promise<void>
  onDeleteChapter?: (id: string) => void
  hoveredChapterId: string | null
  onHoverChange: (id: string | null) => void
}

const SortableChapterItem = memo(function SortableChapterItem({
  chapter,
  activeChapterId,
  onSelectChapter,
  onDeleteChapter,
  hoveredChapterId,
  onHoverChange
}: SortableChapterItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id })

  // Restrict transform to Y-axis only (vertical dragging)
  const restrictedTransform = transform
    ? {
        ...transform,
        x: 0, // Lock X-axis movement
      }
    : null

  const style = {
    transform: CSS.Transform.toString(restrictedTransform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: 'relative',
        overflow: 'hidden',
        background: activeChapterId === chapter.id ? '#0f0f0f' : 'transparent',
        color: activeChapterId === chapter.id ? '#ffffff' : '#0f0f0f',
      }}
      onMouseEnter={() => onHoverChange(chapter.id)}
      onMouseLeave={() => onHoverChange(null)}
    >
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <button
          onClick={() => onSelectChapter(chapter.id)}
          aria-label={chapter.name}
          style={{
            flex: 1,
            padding: '8px 16px',
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: '14px',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {chapter.name}
        </button>
        {hoveredChapterId === chapter.id && (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
            <button
              {...attributes}
              {...listeners}
              aria-label={`Drag to reorder ${chapter.name}`}
              style={{
                padding: '4px',
                border: 'none',
                background: 'transparent',
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
              }}
              title={`Drag to reorder ${chapter.name}`}
            >
              <GripVertical size={16} />
            </button>
            {onDeleteChapter && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteChapter(chapter.id)
                }}
                aria-label={`Delete ${chapter.name}`}
                style={{
                  padding: '4px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                }}
                title={`Delete ${chapter.name}`}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

function ChapterListComponent({
  chapters,
  activeChapterId,
  isLoading,
  onSelectChapter,
  onCreateChapter,
  onDeleteChapter,
  onReorder
}: ChapterListProps) {
  const [hoveredChapterId, setHoveredChapterId] = useState<string | null>(null)

  // Reset hover state when switching chapters to prevent flicker
  useEffect(() => {
    setHoveredChapterId(null)
  }, [activeChapterId])

  const handleHoverChange = useCallback((id: string | null) => {
    setHoveredChapterId(id)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = chapters.findIndex(c => c.id === active.id)
    const newIndex = chapters.findIndex(c => c.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const newChapters = arrayMove(chapters, oldIndex, newIndex)
    onReorder?.(newChapters)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          {/* Draft Board button - pinned at top */}
          <button
            onClick={() => onSelectChapter(OVERVIEW_ID)}
            style={{
              width: '100%',
              padding: '8px 16px',
              border: 'none',
              background: activeChapterId === OVERVIEW_ID ? '#0f0f0f' : 'transparent',
              color: activeChapterId === OVERVIEW_ID ? '#ffffff' : '#0f0f0f',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px'
            }}
          >
            Draft Board
          </button>

          {isLoading && <div style={{ padding: '16px', color: '#999', fontSize: '12px' }}>Loading…</div>}
          {!isLoading && chapters.length === 0 && (
            <div style={{ padding: '16px', color: '#999', fontSize: '12px' }}>No chapters yet</div>
          )}
          <SortableContext items={chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {chapters.map((chapter) => (
              <SortableChapterItem
                key={chapter.id}
                chapter={chapter}
                activeChapterId={activeChapterId}
                onSelectChapter={onSelectChapter}
                onDeleteChapter={onDeleteChapter}
                hoveredChapterId={hoveredChapterId}
                onHoverChange={handleHoverChange}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>
      <div style={{ padding: '16px', borderTop: '1px solid #e5e5e5' }}>
        <button
          onClick={onCreateChapter}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '8px 16px',
            border: '1px solid #e5e5e5',
            background: 'white',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          + New Chapter
        </button>
      </div>
    </div>
  )
}

export default memo(ChapterListComponent)
