import { useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { Annotation, AnnotationCategory } from '@/api/annotations'
import './AnnotationGutterBars.css'

interface BarDimensions {
  markId: string
  top: number
  height: number
}

interface AnnotationGutterBarsProps {
  annotations: Annotation[]
  onOpenDetail: (annotation: Annotation) => void
}

const CATEGORY_COLOURS: Record<AnnotationCategory, string> = {
  'draft-note': 'rgb(202, 138, 4)',
  'needs-revision': 'rgb(194, 65, 12)',
  'author-note': 'rgb(37, 99, 235)',
}

const CATEGORY_LABELS: Record<AnnotationCategory, string> = {
  'draft-note': 'Draft Note',
  'needs-revision': 'Needs Revision',
  'author-note': 'Author Note',
}

export function AnnotationGutterBars({
  annotations,
  onOpenDetail,
}: AnnotationGutterBarsProps) {
  const [editor] = useLexicalComposerContext()
  const [barDimensions, setBarDimensions] = useState<Map<string, BarDimensions>>(new Map())
  const containerRef = useRef<HTMLElement | null>(null)

  // Get reference to editor container
  useEffect(() => {
    const root = editor.getRootElement()
    if (root) {
      containerRef.current = root.closest('.editor-container') as HTMLElement
    }
  }, [editor])

  // Update bar dimensions
  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      if (!containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const dims = new Map<string, BarDimensions>()

      editor.read(() => {
        annotations.forEach((annotation) => {
          if (!annotation.blockKey) return

          try {
            // Get both block elements
            const blockElement1 = editor.getElementByKey(annotation.blockKey)
            const blockElement2 = annotation.focusBlockKey ? editor.getElementByKey(annotation.focusBlockKey) : blockElement1

            if (!blockElement1 || !blockElement2) {
              // Silently skip — blocks not in current view
              return
            }

            // Get rects for both blocks
            const rect1 = blockElement1.getBoundingClientRect()
            const rect2 = blockElement2.getBoundingClientRect()

            // Ensure we span from topmost to bottommost block (handles both selection directions)
            const topmost = Math.min(rect1.top, rect2.top)
            const bottommost = Math.max(rect1.bottom, rect2.bottom)

            const top = topmost - containerRect.top
            const height = bottommost - topmost

            dims.set(annotation.markId, {
              markId: annotation.markId,
              top,
              height,
            })
          } catch (error) {
            console.error(`[AnnotationGutterBars] Error getting dimensions for ${annotation.markId}:`, error)
          }
        })
      })

      setBarDimensions(dims)
    }

    // Update immediately
    updateDimensions()

    // Register update listener
    const unsubscribe = editor.registerUpdateListener(() => {
      updateDimensions()
    })

    // Update on scroll and resize
    const handleScrollResize = () => updateDimensions()
    window.addEventListener('scroll', handleScrollResize, true)
    window.addEventListener('resize', handleScrollResize)

    return () => {
      unsubscribe()
      window.removeEventListener('scroll', handleScrollResize, true)
      window.removeEventListener('resize', handleScrollResize)
    }
  }, [editor, annotations])

  const handleBarClick = (annotation: Annotation) => {
    onOpenDetail(annotation)
  }

  if (annotations.length === 0) {
    return null
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      {/* Render bars */}
      {Array.from(barDimensions.values()).map((dims) => {
        const annotation = annotations.find((a) => a.markId === dims.markId)
        if (!annotation) return null

        return (
          <div
            key={dims.markId}
            style={{
              position: 'absolute',
              left: 0,
              top: `${dims.top}px`,
              width: '4px',
              height: `${dims.height}px`,
              background: CATEGORY_COLOURS[annotation.category],
              pointerEvents: 'auto',
              cursor: 'pointer',
              borderRadius: '2px',
              transition: 'opacity 150ms ease',
              opacity: 0.8,
            }}
            onClick={() => handleBarClick(annotation)}
            title={annotation.comment || CATEGORY_LABELS[annotation.category]}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.opacity = '0.8'
            }}
          />
        )
      })}
    </div>
  )
}
