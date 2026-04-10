import React, { useRef, useState, useCallback, useEffect } from 'react'
import type { BoardCard, StoryPath } from '@/api/draftboard'

interface ConnectionLayerProps {
  cards: BoardCard[]
  paths: StoryPath[]
  connectingFromCardId: string | null
  rewiringArrow: { pathId: string; endpoint: 'from' | 'to' } | null
  onStartRewiringArrow: (pathId: string, endpoint: 'from' | 'to') => void
  onEndRewiringArrow: (toCardId: string | null) => Promise<void>
  onDeletePath: (id: string) => Promise<void>
  onConnectTo: (toCardId: string) => Promise<void>
  selectedPathId: string | null
  onPathSelected: (pathId: string | null) => void
}

function getCardDimensions(card: BoardCard) {
  switch (card.shape) {
    case 'rectangle':
      return { width: 200, height: 120 }
    case 'circle':
      return { width: 160, height: 160 }
    case 'diamond':
      return { width: 160, height: 160 }
    case 'triangle':
      return { width: 160, height: 140 }
    default:
      return { width: 200, height: 120 }
  }
}

function getCardCenter(card: BoardCard) {
  const dims = getCardDimensions(card)
  return {
    x: card.x + dims.width / 2,
    y: card.y + dims.height / 2,
  }
}

function getCardEdgePoint(card: BoardCard, targetX: number, targetY: number) {
  const dims = getCardDimensions(card)
  const center = getCardCenter(card)
  const dx = targetX - center.x
  const dy = targetY - center.y
  const angle = Math.atan2(dy, dx)

  if (card.shape === 'circle') {
    const radius = dims.width / 2
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    }
  }

  // For rectangle, diamond, triangle: use bounding box approach
  const halfWidth = dims.width / 2
  const halfHeight = dims.height / 2

  // Find which edge to use based on angle
  const absAngle = Math.abs(angle)
  const isMoreHorizontal = absAngle < Math.PI / 4 || absAngle > (3 * Math.PI) / 4

  if (isMoreHorizontal) {
    // Use left or right edge
    const edgeX = dx > 0 ? center.x + halfWidth : center.x - halfWidth
    const edgeY = center.y + Math.tan(angle) * halfWidth
    return {
      x: edgeX,
      y: Math.max(center.y - halfHeight, Math.min(center.y + halfHeight, edgeY)),
    }
  } else {
    // Use top or bottom edge
    const offset = dy > 0 ? halfHeight : -halfHeight
    const edgeY = center.y + offset
    const edgeX = center.x + offset / Math.tan(angle)
    return {
      x: Math.max(center.x - halfWidth, Math.min(center.x + halfWidth, edgeX)),
      y: edgeY,
    }
  }
}

// Get a point inset from the edge towards the center for smoother arrow starts
function getCardInsetPoint(card: BoardCard, targetX: number, targetY: number, insetRatio: number = 0.35) {
  const center = getCardCenter(card)
  const edge = getCardEdgePoint(card, targetX, targetY)

  return {
    x: center.x + (edge.x - center.x) * (1 - insetRatio),
    y: center.y + (edge.y - center.y) * (1 - insetRatio),
  }
}


export default function ConnectionLayer({
  cards,
  paths,
  connectingFromCardId,
  rewiringArrow,
  onStartRewiringArrow,
  onEndRewiringArrow,
  onDeletePath,
  selectedPathId,
  onPathSelected,
}: ConnectionLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (rewiringArrow || connectingFromCardId) {
      const rect = svgRef.current?.getBoundingClientRect()
      if (rect) {
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
    }
  }, [rewiringArrow, connectingFromCardId])

  const handlePointerLeave = useCallback(() => {
    if (!connectingFromCardId) {
      setMousePos(null)
    }
  }, [connectingFromCardId])

  // Global mouse tracking for connection preview
  useEffect(() => {
    if (!connectingFromCardId || !svgRef.current) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (rect) {
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [connectingFromCardId])

  // Deselect paths when clicking on canvas background
  useEffect(() => {
    const handleCanvasClick = () => {
      onPathSelected(null)
    }

    document.addEventListener('canvasBackgroundClick', handleCanvasClick)
    return () => document.removeEventListener('canvasBackgroundClick', handleCanvasClick)
  }, [onPathSelected])

  const handlePathClick = useCallback((pathId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onPathSelected(selectedPathId === pathId ? null : pathId)
  }, [selectedPathId, onPathSelected])

  useEffect(() => {
    if (!rewiringArrow || !mousePos) return

    const handlePointerUp = async (e: PointerEvent) => {
      // Find card under cursor
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return

      const clientX = e.clientX
      const clientY = e.clientY

      // Check which card is under the cursor
      let targetCardId: string | null = null
      if (cards) {
        for (const card of cards) {
          const dims = getCardDimensions(card)
          const left = card.x
          const top = card.y
          const right = card.x + dims.width
          const bottom = card.y + dims.height

          if (clientX >= rect.left + left && clientX <= rect.left + right &&
              clientY >= rect.top + top && clientY <= rect.top + bottom) {
            targetCardId = card.id
            break
          }
        }
      }

      await onEndRewiringArrow(targetCardId)
    }

    window.addEventListener('pointerup', handlePointerUp)
    return () => window.removeEventListener('pointerup', handlePointerUp)
  }, [rewiringArrow, cards, onEndRewiringArrow])

  const straightPath = (x1: number, y1: number, x2: number, y2: number) => {
    return `M ${x1} ${y1} L ${x2} ${y2}`
  }

  return (
    <svg
        ref={svgRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '6000px',
          zIndex: 0,
          pointerEvents: 'none',
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#0066cc" />
          </marker>
        </defs>

      {/* Existing paths */}
      {cards && paths && paths.map(path => {
        const fromCard = cards.find(c => c.id === path.fromCardId)
        const toCard = cards.find(c => c.id === path.toCardId)

        if (!fromCard || !toCard) return null

        const fromCenter = getCardCenter(fromCard)
        const toCenter = getCardCenter(toCard)
        const from = getCardInsetPoint(fromCard, toCenter.x, toCenter.y)
        const to = getCardEdgePoint(toCard, fromCenter.x, fromCenter.y)

        return (
          <g key={path.id}>
            {/* Starting dot */}
            <circle
              cx={from.x}
              cy={from.y}
              r="4"
              fill="#0066cc"
              style={{ pointerEvents: 'none' }}
            />

            <path
              d={straightPath(from.x, from.y, to.x, to.y)}
              stroke="#0066cc"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#arrowhead)"
              style={{
                pointerEvents: 'none',
                opacity: selectedPathId === path.id ? 1 : 0.6,
              }}
            />


            {/* Path label if present */}
            {path.label && (
              <text
                x={(from.x + to.x) / 2}
                y={(from.y + to.y) / 2 - 8}
                textAnchor="middle"
                fontSize="12"
                fill="#666"
                style={{ pointerEvents: 'none' }}
              >
                {path.label}
              </text>
            )}

            {/* Larger invisible clickable area for path selection — rendered before delete button so delete is on top */}
            <path
              d={straightPath(from.x, from.y, to.x, to.y)}
              stroke="transparent"
              strokeWidth="24"
              fill="none"
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              onClick={e => handlePathClick(path.id, e as unknown as React.MouseEvent)}
            />

            {/* Delete button (when path is selected) */}
            {selectedPathId === path.id && (
              <g key={`delete-${path.id}`}>
                {/* Large transparent hit area to cover entire button and X */}
                <circle
                  cx={(from.x + to.x) / 2}
                  cy={(from.y + to.y) / 2}
                  r="16"
                  fill="#ff6600"
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onClick={e => {
                    e.stopPropagation()
                    onDeletePath(path.id)
                  }}
                />
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 + 5}
                  textAnchor="middle"
                  fontSize="20"
                  fill="white"
                  fontWeight="bold"
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onClick={e => {
                    e.stopPropagation()
                    onDeletePath(path.id)
                  }}
                >
                  ✕
                </text>
              </g>
            )}
          </g>
        )
      })}


      {/* Connection preview line — shows while dragging to connect */}
      {connectingFromCardId && mousePos && cards && (
        (() => {
          const fromCard = cards.find(c => c.id === connectingFromCardId)
          if (!fromCard) return null

          const start = getCardInsetPoint(fromCard, mousePos.x, mousePos.y)

          return (
            <path
              d={straightPath(start.x, start.y, mousePos.x, mousePos.y)}
              stroke="#0066cc"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
              style={{ pointerEvents: 'none' }}
            />
          )
        })()
      )}

      {/* Rewiring preview line */}
      {rewiringArrow && mousePos && cards && paths && (
        <>
          {(() => {
            const path = paths.find(p => p.id === rewiringArrow.pathId)
            if (!path) return null

            const fromCard = cards.find(c => c.id === path.fromCardId)
            const toCard = cards.find(c => c.id === path.toCardId)
            if (!fromCard || !toCard) return null

            const fromCenter = getCardCenter(fromCard)
            const toCenter = getCardCenter(toCard)
            const fromEdge = getCardInsetPoint(fromCard, toCenter.x, toCenter.y)
            const toEdge = getCardEdgePoint(toCard, fromCenter.x, fromCenter.y)

            const start = rewiringArrow.endpoint === 'from'
              ? getCardInsetPoint(fromCard, mousePos.x, mousePos.y)
              : fromEdge
            const end = rewiringArrow.endpoint === 'to'
              ? getCardEdgePoint(toCard, mousePos.x, mousePos.y)
              : toEdge

            return (
              <path
                d={straightPath(start.x, start.y, end.x, end.y)}
                stroke="#ff9900"
                strokeWidth="2"
                fill="none"
                strokeDasharray="5,5"
                style={{ pointerEvents: 'none' }}
              />
            )
          })()}
        </>
      )}
    </svg>
  )
}
