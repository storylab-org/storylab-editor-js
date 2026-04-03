import React from 'react'
import type { DocumentHead } from '@/api/documents'
import './ChapterPickerModal.css'

interface ChapterPickerModalProps {
  chapters: DocumentHead[]
  onSelect: (chapter: DocumentHead) => void
  onClose: () => void
}

export default function ChapterPickerModal({
  chapters,
  onSelect,
  onClose,
}: ChapterPickerModalProps): React.ReactElement {
  return (
    <>
      <div className="chapter-picker-panel">
        <div className="chapter-picker-header">Link Chapter</div>
        {chapters.length === 0 ? (
          <div className="chapter-picker-empty">No chapters available</div>
        ) : (
          chapters.map(chapter => (
            <button
              key={chapter.id}
              className="chapter-picker-item"
              onClick={() => onSelect(chapter)}
            >
              {chapter.name}
            </button>
          ))
        )}
      </div>
      <div className="chapter-picker-backdrop" onClick={onClose} />
    </>
  )
}
