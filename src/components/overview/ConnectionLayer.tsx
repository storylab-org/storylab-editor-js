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

const CARD_WIDTH = 240
const CARD_HEIGHT = 140 // Estimated; can be more precise with refs

function getCardCenter(card: BoardCard) {
  return {
    x: card.x + CARD_WIDTH / 2,
    y: card.y + CARD_HEIGHT / 2,
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
        const left = card.x
        const top = card.y
        const right = card.x + CARD_WIDTH
        const bottom = card.y + CARD_HEIGHT

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
    const offset = 80
    const cx1 = x1 + offset
    const cy1 = y1
    const cx2 = x2 - offset
    const cy2 = y2
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

        const from = getCardCenter(fromCard)
        const to = getCardCenter(toCard)

        return (
          <g key={path.id}>
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
                <rect
                  x={(from.x + to.x) / 2 - 12}
                  y={(from.y + to.y) / 2 + 8}
                  width="24"
                  height="24"
                  rx="4"
                  fill="#ff6600"
                />
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 + 24}
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

            const from = getCardCenter(fromCard)
            const to = getCardCenter(toCard)
            const start = rewiringArrow.endpoint === 'from' ? mousePos : from
            const end = rewiringArrow.endpoint === 'to' ? mousePos : to

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
