import React, { useState } from 'react'
import type { BoardCard } from '@/api/draftboard'
import type { DocumentHead } from '@/api/documents'
import './ApplyOrderModal.css'

interface ApplyOrderModalProps {
  proposedOrder: BoardCard[]
  allChapters: DocumentHead[]
  onConfirm: () => Promise<void>
  onClose: () => void
}

export default function ApplyOrderModal({
  proposedOrder,
  allChapters,
  onConfirm,
  onClose,
}: ApplyOrderModalProps): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
    } finally {
      setIsLoading(false)
    }
  }

  // Count chapters on the board
  const boardChapterIds = new Set(proposedOrder.map(c => c.chapterId).filter(Boolean))
  const unlinkedCount = allChapters.length - boardChapterIds.size

  return (
    <>
      <div className="apply-order-panel">
        <div className="apply-order-header">Apply chapter order?</div>

        <div className="apply-order-content">
          <div className="apply-order-list">
            {proposedOrder.map((card, index) => (
              <div key={card.id} className="apply-order-item">
                <span className="apply-order-number">{index + 1}.</span>
                <span className="apply-order-title">{card.chapterName || card.title}</span>
              </div>
            ))}
          </div>

          {unlinkedCount > 0 && (
            <div className="apply-order-note">
              ℹ {unlinkedCount} {unlinkedCount === 1 ? 'chapter' : 'chapters'} not linked to the board — will keep current position
            </div>
          )}
        </div>

        <div className="apply-order-buttons">
          <button
            className="apply-order-btn apply-order-btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="apply-order-btn apply-order-btn-confirm"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Applying...' : 'Apply'}
          </button>
        </div>
      </div>
      <div className="apply-order-backdrop" onClick={onClose} />
    </>
  )
}
