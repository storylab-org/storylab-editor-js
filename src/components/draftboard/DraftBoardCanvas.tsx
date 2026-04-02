import React, { useCallback, useEffect, useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import BoardCard from './BoardCard'
import ConnectionLayer from './ConnectionLayer'
import DraftBoardToolbar from './DraftBoardToolbar'
import ChapterPickerModal from './ChapterPickerModal'
import ApplyOrderModal from './ApplyOrderModal'
import { useBoardState } from './useBoardState'
import { traceChapterPath } from './traceChapterPath'
import { reorderDocuments } from '@/api/documents'
import type { DocumentHead } from '@/api/documents'
import type { BoardCard as BoardCardType, CardShape } from '@/api/draftboard'
import './DraftBoardCanvas.css'

interface DraftBoardCanvasProps {
  chapters: DocumentHead[]
  onNavigateToChapter: (id: string) => void
  onChaptersReordered?: () => void
  onApplyOrderReady?: (handler: () => void, canApply: boolean) => void
}

interface PreviewCardProps {
  shape: CardShape
  mousePos: { x: number; y: number }
}

function PreviewCard({ shape, mousePos }: PreviewCardProps) {
  const width = shape === 'rectangle' ? '200px' : '160px'
  const height = shape === 'rectangle' ? '120px' : shape === 'triangle' ? '140px' : '160px'
  const borderRadius = shape === 'rectangle' ? '6px' : shape === 'circle' ? '50%' : 'inherit'
  const clipPath =
    shape === 'diamond'
      ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
      : shape === 'triangle'
      ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
      : 'unset'

  // Calculate offsets to center preview at cursor
  const offsetX = shape === 'rectangle' ? 100 : 80
  const offsetY = shape === 'rectangle' ? 60 : shape === 'triangle' ? 70 : 80

  return (
    <div
      style={{
        position: 'absolute',
        left: mousePos.x - offsetX,
        top: mousePos.y - offsetY,
        width,
        height,
        background: '#ffe6cc',
        border: '2px solid #ffd699',
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
      <span style={{ fontSize: '12px', color: 'white', fontWeight: 500 }}>Drop here</span>
    </div>
  )
}

export default function DraftBoardCanvas({
  chapters,
  onNavigateToChapter,
  onChaptersReordered,
  onApplyOrderReady,
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
  const [showApplyOrderModal, setShowApplyOrderModal] = useState(false)
  const [proposedOrder, setProposedOrder] = useState<BoardCardType[]>([])
  const [showResetConfirm, setShowResetConfirm] = useState(false)

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

  const calculateMousePos = useCallback((clientX: number, clientY: number) => {
    if (!innerRef.current) return null
    const rect = innerRef.current.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }, [])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewShape || !innerRef.current) return

    const pos = calculateMousePos(e.clientX, e.clientY)
    if (pos) setMousePos(pos)
  }, [previewShape, calculateMousePos])


  const handleCanvasMouseLeave = useCallback(() => {
    setMousePos(null)
  }, [])

  const handleCanvasClick = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      // Deselect paths when clicking on empty canvas space
      const event = new CustomEvent('canvasBackgroundClick')
      document.dispatchEvent(event)

      if (!previewShape || !innerRef.current) return

      // Calculate position at click time
      const rect = innerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      await handlePlaceCard(x, y)
    },
    [previewShape, handlePlaceCard]
  )

  const handleApplyOrder = useCallback(() => {
    const order = traceChapterPath(cards, paths)
    setProposedOrder(order)
    setShowApplyOrderModal(true)
  }, [cards, paths])

  const handleConfirmOrder = useCallback(async () => {
    const boardChapterIds = proposedOrder.map(c => c.chapterId).filter(Boolean) as string[]

    // Append chapters not on the board (to preserve them at the end)
    const boardChapterIdSet = new Set(boardChapterIds)
    const unlinkedChapterIds = chapters
      .filter(ch => !boardChapterIdSet.has(ch.id))
      .sort((a, b) => a.order - b.order)
      .map(ch => ch.id)

    const orderedIds = [...boardChapterIds, ...unlinkedChapterIds]

    try {
      await reorderDocuments(orderedIds)
      setShowApplyOrderModal(false)
      setProposedOrder([])
      onChaptersReordered?.()
    } catch (err) {
      console.error('Failed to reorder chapters:', err)
    }
  }, [proposedOrder, chapters, onChaptersReordered])

  // Notify parent about Apply Order capability
  useEffect(() => {
    const canApply = cards.some(c => c.chapterId)
    onApplyOrderReady?.(handleApplyOrder, canApply)
  }, [cards, handleApplyOrder, onApplyOrderReady])

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
        onReset={() => setShowResetConfirm(true)}
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

            {cards && (() => {
              const chapterIdCounts = new Map<string, number>()
              cards.forEach(c => {
                if (c.chapterId) {
                  chapterIdCounts.set(c.chapterId, (chapterIdCounts.get(c.chapterId) ?? 0) + 1)
                }
              })
              const duplicateChapterIds = new Set(
                [...chapterIdCounts.entries()].filter(([, n]) => n > 1).map(([id]) => id)
              )

              return cards.map(card => (
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
                  duplicateChapterIds={duplicateChapterIds}
                  onUpdate={patch => handleUpdateCard(card.id, patch)}
                  onDelete={() => handleDeleteCard(card.id)}
                  onStartConnect={() => handleStartConnect(card.id)}
                  onConnectTo={async () => {
                    await handleConnectTo(card.id)
                  }}
                  onLinkChapter={() => handleLinkChapter(card.id)}
                  onSelect={() => handleSelectCard(card.id)}
                />
              ))
            })()}

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

      {/* Apply order modal */}
      {showApplyOrderModal && (
        <ApplyOrderModal
          proposedOrder={proposedOrder}
          allChapters={chapters}
          onConfirm={handleConfirmOrder}
          onClose={() => {
            setShowApplyOrderModal(false)
            setProposedOrder([])
          }}
        />
      )}

      {/* Reset confirmation modal */}
      {showResetConfirm && (
        <>
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            minWidth: '320px',
            padding: '20px',
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}>
              Clear draft board?
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#666', lineHeight: '1.4' }}>
              This will delete all cards and connections. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  background: '#f5f5f5',
                  color: '#1a1a1a',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowResetConfirm(false)
                  await handleResetBoard()
                }}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  background: '#d32f2f',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                }}
              >
                Clear
              </button>
            </div>
          </div>
          <div
            onClick={() => setShowResetConfirm(false)}
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
