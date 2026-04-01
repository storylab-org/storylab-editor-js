import React, { useRef, useState, useCallback, useEffect } from 'react'
import type { BoardCard, StoryPath } from '@/api/overview'

interface ConnectionLayerProps {
  cards: BoardCard[]
  paths: StoryPath[]
  connectingFromCardId: string | null
  rewiringArrow: { pathId: string; endpoint: 'from' | 'to' } | null
  onStartRewiringArrow: (pathId: string, endpoint: 'from' | 'to') => void
  onEndRewiringArrow: (toCardId: string | null) => Promise<void>
  onDeletePath: (id: string) => Promise<void>
  onConnectTo: (toCardId: string) => Promise<void>
}

function getCardDimensions(card: BoardCard) {
  switch (card.shape) {
    case 'rectangle':
      return { width: 200, height: 120 } // approximate with padding
    case 'circle':
      return { width: 120, height: 120 }
    case 'diamond':
      return { width: 120, height: 120 }
    case 'triangle':
      return { width: 120, height: 104 }
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


export default function ConnectionLayer({
  cards,
  paths,
  connectingFromCardId,
  rewiringArrow,
  onStartRewiringArrow,
  onEndRewiringArrow,
  onDeletePath,
}: ConnectionLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null)

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (rewiringArrow) {
      const rect = svgRef.current?.getBoundingClientRect()
      if (rect) {
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
    }
  }, [rewiringArrow])

  const handlePointerLeave = useCallback(() => {
    setMousePos(null)
  }, [])

  const handlePathClick = useCallback((pathId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedPathId(selectedPathId === pathId ? null : pathId)
  }, [selectedPathId])

  const handleCirclePointerDown = useCallback(
    (pathId: string, endpoint: 'from' | 'to') => {
      onStartRewiringArrow(pathId, endpoint)
    },
    [onStartRewiringArrow]
  )

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

      await onEndRewiringArrow(targetCardId)
    }

    window.addEventListener('pointerup', handlePointerUp)
    return () => window.removeEventListener('pointerup', handlePointerUp)
  }, [rewiringArrow, cards, onEndRewiringArrow])

  const cubicBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1
    const dy = y2 - y1

    // If nearly aligned (horizontal or vertical), use straight line
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (absDx < 20 || absDy < 20) {
      // Straight line for nearly aligned arrows
      return `M ${x1} ${y1} L ${x2} ${y2}`
    }

    // For diagonal arrows, use slight curve
    const distance = Math.sqrt(dx * dx + dy * dy)
    const isMoreHorizontal = absDx > absDy
    const offset = Math.min(40, distance * 0.15)

    let cx1, cy1, cx2, cy2

    if (isMoreHorizontal) {
      // Push control points perpendicular (vertical)
      cx1 = x1 + dx * 0.3
      cy1 = y1 + offset
      cx2 = x2 - dx * 0.3
      cy2 = y2 - offset
    } else {
      // Push control points perpendicular (horizontal)
      cx1 = x1 + offset
      cy1 = y1 + dy * 0.3
      cx2 = x2 - offset
      cy2 = y2 - dy * 0.3
    }

    return `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`
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
        onClick={() => setSelectedPathId(null)}
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
      {paths.map(path => {
        const fromCard = cards.find(c => c.id === path.fromCardId)
        const toCard = cards.find(c => c.id === path.toCardId)

        if (!fromCard || !toCard) return null

        const fromCenter = getCardCenter(fromCard)
        const toCenter = getCardCenter(toCard)
        const from = getCardEdgePoint(fromCard, toCenter.x, toCenter.y)
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
              d={cubicBezierPath(from.x, from.y, to.x, to.y)}
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

            {/* Delete button (when path is selected) */}
            {selectedPathId === path.id && (
              <g
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onClick={e => {
                  e.stopPropagation()
                  onDeletePath(path.id)
                  setSelectedPathId(null)
                }}
              >
                <circle
                  cx={(from.x + to.x) / 2}
                  cy={(from.y + to.y) / 2}
                  r="12"
                  fill="#ff6600"
                />
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 + 4}
                  textAnchor="middle"
                  fontSize="14"
                  fill="white"
                >
                  ✕
                </text>
              </g>
            )}

            {/* Click handler for path selection */}
            <path
              d={cubicBezierPath(from.x, from.y, to.x, to.y)}
              stroke="transparent"
              strokeWidth="12"
              fill="none"
              style={{ pointerEvents: 'auto' }}
              onClick={e => handlePathClick(path.id, e as unknown as React.MouseEvent)}
            />
          </g>
        )
      })}


      {/* Rewiring preview line */}
      {rewiringArrow && mousePos && (
        <>
          {(() => {
            const path = paths.find(p => p.id === rewiringArrow.pathId)
            if (!path) return null

            const fromCard = cards.find(c => c.id === path.fromCardId)
            const toCard = cards.find(c => c.id === path.toCardId)
            if (!fromCard || !toCard) return null

            const fromCenter = getCardCenter(fromCard)
            const toCenter = getCardCenter(toCard)
            const fromEdge = getCardEdgePoint(fromCard, toCenter.x, toCenter.y)
            const toEdge = getCardEdgePoint(toCard, fromCenter.x, fromCenter.y)

            const start = rewiringArrow.endpoint === 'from'
              ? getCardEdgePoint(fromCard, mousePos.x, mousePos.y)
              : fromEdge
            const end = rewiringArrow.endpoint === 'to'
              ? getCardEdgePoint(toCard, mousePos.x, mousePos.y)
              : toEdge

            return (
              <path
                d={cubicBezierPath(start.x, start.y, end.x, end.y)}
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
