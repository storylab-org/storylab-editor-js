import React, { useCallback, useEffect, useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import BoardCard from './BoardCard'
import ConnectionLayer from './ConnectionLayer'
import DraftBoardToolbar from './DraftBoardToolbar'
import ChapterPickerModal from './ChapterPickerModal'
import { useBoardState } from './useBoardState'
import type { DocumentHead } from '@/api/documents'
import type { CardShape } from '@/api/draftboard'
import './DraftBoardCanvas.css'

interface DraftBoardCanvasProps {
  chapters: DocumentHead[]
  onNavigateToChapter: (id: string) => void
}

interface PreviewCardProps {
  shape: CardShape
  mousePos: { x: number; y: number }
}

function PreviewCard({ shape, mousePos }: PreviewCardProps) {
  const width = shape === 'rectangle' ? '200px' : '160px'
  const height = shape === 'rectangle' ? 'auto' : shape === 'triangle' ? '140px' : '160px'
  const borderRadius = shape === 'rectangle' ? '6px' : shape === 'circle' ? '50%' : 'inherit'
  const clipPath =
    shape === 'diamond'
      ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
      : shape === 'triangle'
      ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
      : 'unset'

  return (
    <div
      style={{
        position: 'absolute',
        left: mousePos.x - 100,
        top: mousePos.y - 80,
        width,
        height,
        background: '#fff9e6',
        border: '2px dashed #0066cc',
        borderRadius,
        clipPath,
        opacity: 0.6,
        pointerEvents: 'none',
        padding: '12px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: '12px', color: '#0066cc', fontWeight: 500 }}>Drop here</span>
    </div>
  )
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
    previewShape,
    previewPosition,
    connectionModeActive,
    selectedCardId,
    handleDragEnd,
    handleAddCard,
    handlePlaceCard,
    handleCancelAddCard,
    handleDeleteCard,
    handleUpdateCard,
    handleDeletePath,
    handleStartConnect,
    handleConnectTo,
    handleToggleConnectionMode,
    handleCancelConnect,
    handleStartRewiringArrow,
    handleEndRewiringArrow,
    handleResetBoard,
    handleSelectCard,
  } = useBoardState()

  const canvasRef = React.useRef<HTMLDivElement>(null)
  const innerRef = React.useRef<HTMLDivElement>(null)
  const [chapterPickerCardId, setChapterPickerCardId] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null)

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

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewShape || !innerRef.current) return

    const rect = innerRef.current.getBoundingClientRect()
    const scrollTop = innerRef.current.parentElement?.scrollTop ?? 0
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top + scrollTop

    setMousePos({ x, y })
  }, [previewShape])

  const handleCanvasMouseLeave = useCallback(() => {
    setMousePos(null)
  }, [])

  const handleCanvasClick = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      // Deselect paths when clicking on empty canvas space
      const event = new CustomEvent('canvasBackgroundClick')
      document.dispatchEvent(event)

      if (!previewShape || !innerRef.current || !mousePos) return

      await handlePlaceCard(mousePos.x, mousePos.y)
    },
    [previewShape, mousePos, handlePlaceCard]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewShape) {
          handleCancelAddCard()
        } else if (connectionModeActive) {
          handleToggleConnectionMode()
        } else if (connectingFromCardId) {
          handleCancelConnect()
        }
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && selectedPathId) {
        e.preventDefault()
        handleDeletePath(selectedPathId)
        setSelectedPathId(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleCancelConnect, handleCancelAddCard, handleToggleConnectionMode, previewShape, connectionModeActive, connectingFromCardId, selectedPathId, handleDeletePath])

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
        onAddRectangle={() => handleAddCard('rectangle')}
        onAddCircle={() => handleAddCard('circle')}
        onAddDiamond={() => handleAddCard('diamond')}
        onAddTriangle={() => handleAddCard('triangle')}
        isConnecting={connectionModeActive}
        onToggleConnect={handleToggleConnectionMode}
        onReset={handleResetBoard}
      />

      <DndContext sensors={sensors} onDragEnd={handleCanvasDragEnd}>
        <div ref={canvasRef} className="draft-board-canvas">
          <div
            ref={innerRef}
            className="draft-board-inner"
            style={{ cursor: previewShape ? 'crosshair' : 'default' }}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
          >
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
              selectedPathId={selectedPathId}
              onPathSelected={setSelectedPathId}
            />

            {cards && cards.length === 0 && !previewShape ? (
              <div className="board-empty-hint">
                <div className="board-empty-hint-text">
                  No cards yet. Click a shape button to start.
                </div>
              </div>
            ) : null}

            {cards && cards.map(card => (
              <BoardCard
                key={card.id}
                card={card}
                isConnecting={connectingFromCardId === card.id}
                isConnectionTarget={
                  (connectingFromCardId !== null && connectingFromCardId !== card.id) ||
                  (connectionModeActive && connectingFromCardId !== card.id)
                }
                connectionModeActive={connectionModeActive}
                isSelected={selectedCardId === card.id}
                connectingFromCardId={connectingFromCardId}
                onUpdate={patch => handleUpdateCard(card.id, patch)}
                onDelete={() => handleDeleteCard(card.id)}
                onStartConnect={() => handleStartConnect(card.id)}
                onConnectTo={async () => {
                  await handleConnectTo(card.id)
                }}
                onLinkChapter={() => handleLinkChapter(card.id)}
                onSelect={() => handleSelectCard(card.id)}
              />
            ))}

            {/* Preview card while placing */}
            {previewShape && mousePos && <PreviewCard shape={previewShape} mousePos={mousePos} />}
          </div>
        </div>
      </DndContext>

      {/* Chapter picker modal */}
      {chapterPickerCardId && (
        <ChapterPickerModal
          chapters={chapters}
          onSelect={handleChapterSelected}
          onClose={() => setChapterPickerCardId(null)}
        />
      )}
    </div>
  )
}
