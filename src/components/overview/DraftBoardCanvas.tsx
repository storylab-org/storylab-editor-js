import React, { useCallback, useEffect, useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import BoardCard from './BoardCard'
import ConnectionLayer from './ConnectionLayer'
import DraftBoardToolbar from './DraftBoardToolbar'
import { useBoardState } from './useBoardState'
import type { DocumentHead } from '@/api/documents'
import './DraftBoardCanvas.css'

interface DraftBoardCanvasProps {
  chapters: DocumentHead[]
  onNavigateToChapter: (id: string) => void
}

export default function DraftBoardCanvas({
  chapters,
  onNavigateToChapter,
}: DraftBoardCanvasProps) {
  const {
    cards,
    paths,
    isLoading,
    error,
    connectingFromCardId,
    rewiringArrow,
    handleDragEnd,
    handleAddCard,
    handleDeleteCard,
    handleUpdateCard,
    handleDeletePath,
    handleStartConnect,
    handleConnectTo,
    handleCancelConnect,
    handleStartRewiringArrow,
    handleEndRewiringArrow,
  } = useBoardState()

  const canvasRef = React.useRef<HTMLDivElement>(null)
  const [chapterPickerCardId, setChapterPickerCardId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const handleLinkChapter = useCallback((cardId: string) => {
    setChapterPickerCardId(cardId)
  }, [])

  const handleChapterSelected = useCallback(
    (chapter: DocumentHead) => {
      if (chapterPickerCardId) {
        handleUpdateCard(chapterPickerCardId, {
          chapterId: chapter.id,
          chapterName: chapter.name,
        })
        setChapterPickerCardId(null)
      }
    },
    [chapterPickerCardId, handleUpdateCard]
  )

  const handleCanvasDragEnd = useCallback(
    (event: DragEndEvent) => {
      handleDragEnd(event)
    },
    [handleDragEnd]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelConnect()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleCancelConnect])

  const handleAddRectangle = useCallback(() => {
    handleAddCard('rectangle')
  }, [handleAddCard])

  const handleAddCircle = useCallback(() => {
    handleAddCard('circle')
  }, [handleAddCard])

  const handleAddDiamond = useCallback(() => {
    handleAddCard('diamond')
  }, [handleAddCard])

  const handleAddTriangle = useCallback(() => {
    handleAddCard('triangle')
  }, [handleAddCard])

  if (isLoading) {
    return (
      <div className="draft-board-loading">
        <div className="draft-board-loading-text">Loading draft board...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="draft-board-error">
        <div className="draft-board-error-text">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="draft-board-container">
      <DraftBoardToolbar
        onAddRectangle={handleAddRectangle}
        onAddCircle={handleAddCircle}
        onAddDiamond={handleAddDiamond}
        onAddTriangle={handleAddTriangle}
      />

      <DndContext sensors={sensors} onDragEnd={handleCanvasDragEnd}>
        <div ref={canvasRef} className="draft-board-canvas">
          <div className="draft-board-inner" style={{ width: '100%', height: '6000px', position: 'relative' }}>
            <ConnectionLayer
              cards={cards}
              paths={paths}
              connectingFromCardId={connectingFromCardId}
              rewiringArrow={rewiringArrow}
              onStartRewiringArrow={handleStartRewiringArrow}
              onEndRewiringArrow={handleEndRewiringArrow}
              onDeletePath={handleDeletePath}
              onConnectTo={async (toCardId) => {
                await handleConnectTo(toCardId)
                handleCancelConnect()
              }}
            />

            {cards.length === 0 ? (
              <div className="board-empty-hint">
                <div className="board-empty-hint-text">
                  No cards yet. Click a shape button to start.
                </div>
              </div>
            ) : (
              cards.map(card => (
                <BoardCard
                  key={card.id}
                  card={card}
                  isConnecting={connectingFromCardId === card.id}
                  isConnectionTarget={
                    connectingFromCardId !== null && connectingFromCardId !== card.id
                  }
                  onUpdate={patch => handleUpdateCard(card.id, patch)}
                  onDelete={() => handleDeleteCard(card.id)}
                  onStartConnect={() => handleStartConnect(card.id)}
                  onConnectTo={async () => {
                    await handleConnectTo(card.id)
                  }}
                  onLinkChapter={() => handleLinkChapter(card.id)}
                />
              ))
            )}
          </div>
        </div>
      </DndContext>

      {/* Chapter picker modal */}
      {chapterPickerCardId && (
        <>
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              maxHeight: '300px',
              overflowY: 'auto',
              minWidth: '250px',
            }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e5e5', fontWeight: 500 }}>
              Link Chapter
            </div>
            {chapters.length === 0 ? (
              <div style={{ padding: '16px', color: '#999' }}>No chapters available</div>
            ) : (
              chapters.map(chapter => (
                <button
                  key={chapter.id}
                  onClick={() => handleChapterSelected(chapter)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    background: 'white',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderBottom: '1px solid #e5e5e5',
                    fontSize: '14px',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#f5f5f5'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'white'
                  }}
                >
                  {chapter.name}
                </button>
              ))
            )}
          </div>
          <div
            onClick={() => setChapterPickerCardId(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          />
        </>
      )}
    </div>
  )
}
