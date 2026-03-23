import { useRef, useEffect, useState } from 'react'
import { GripVertical } from 'lucide-react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot, $getNodeByKey } from 'lexical'
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import './DragDropBlockPlugin.css'

interface DragHandleProps {
  blockKey: string
  isDragging: boolean
}

function DragHandle({ blockKey, isDragging }: DragHandleProps) {
  const { attributes, listeners, setNodeRef, transform } = useSortable({ id: blockKey })

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 0.75,
  }

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="draggable-block-menu"
      style={style}
      title="Drag to move block"
      aria-label="Drag to move block"
    >
      <GripVertical size={16} />
    </button>
  )
}

interface BlockDimensions {
  blockKey: string
  top: number
  height: number
}

export default function DragDropBlockPlugin({
  showDragMenu = true,
}: {
  showDragMenu?: boolean
}) {
  const [editor] = useLexicalComposerContext()
  const [blockKeys, setBlockKeys] = useState<string[]>([])
  const [blockDimensions, setBlockDimensions] = useState<BlockDimensions[]>([])
  const [hoveredBlockKey, setHoveredBlockKey] = useState<string | null>(null)
  const [dropIndicatorPos, setDropIndicatorPos] = useState<{ top: number } | null>(null)
  const [activeDragKey, setActiveDragKey] = useState<string | null>(null)
  const containerRef = useRef<HTMLElement | null>(null)

  // Get reference to the editor container
  useEffect(() => {
    const editorRoot = editor.getRootElement()
    if (editorRoot) {
      const container = editorRoot.closest('.editor-container')
      if (container) {
        containerRef.current = container as HTMLElement
      }
    }
  }, [editor])

  // Extract top-level block keys from the editor
  useEffect(() => {
    const unsubscribe = editor.registerUpdateListener(() => {
      editor.read(() => {
        const root = $getRoot()
        const children = root.getChildrenKeys()
        setBlockKeys(children)
      })
    })

    return unsubscribe
  }, [editor])

  // Update block dimensions
  useEffect(() => {
    if (!containerRef.current || blockKeys.length === 0) return

    const updateDimensions = () => {
      const containerRect = containerRef.current!.getBoundingClientRect()
      const dims: BlockDimensions[] = []

      editor.read(() => {
        blockKeys.forEach((blockKey) => {
          const elem = editor.getElementByKey(blockKey)
          if (elem) {
            const rect = elem.getBoundingClientRect()
            dims.push({
              blockKey,
              top: rect.top - containerRect.top,
              height: rect.height,
            })
          }
        })
      })

      setBlockDimensions(dims)
    }

    updateDimensions()

    // Update on scroll and resize
    window.addEventListener('scroll', updateDimensions, true)
    window.addEventListener('resize', updateDimensions)

    return () => {
      window.removeEventListener('scroll', updateDimensions, true)
      window.removeEventListener('resize', updateDimensions)
    }
  }, [blockKeys, editor])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragKey(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setDropIndicatorPos(null)
    setActiveDragKey(null)

    if (!over || active.id === over.id) return

    const oldIndex = blockKeys.indexOf(active.id as string)
    const newIndex = blockKeys.indexOf(over.id as string)

    if (oldIndex === -1 || newIndex === -1) return

    editor.update(() => {
      const movedNode = $getNodeByKey(active.id as string)
      const targetNode = $getNodeByKey(over.id as string)

      if (movedNode && targetNode) {
        if (newIndex < oldIndex) {
          targetNode.insertBefore(movedNode)
        } else {
          targetNode.insertAfter(movedNode)
        }
      }
    })
  }

  if (!showDragMenu || blockKeys.length === 0) {
    return null
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <SortableContext
          items={blockKeys}
          strategy={verticalListSortingStrategy}
        >
          {blockDimensions.map((dims) => (
            <div
              key={dims.blockKey}
              style={{
                position: 'absolute',
                pointerEvents: 'none',
                top: `${dims.top}px`,
                left: '0',
                width: '100%',
                height: `${dims.height}px`,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'auto',
                }}
                onMouseEnter={() => {
                  setHoveredBlockKey(dims.blockKey)
                  if (activeDragKey) {
                    setDropIndicatorPos({ top: dims.top })
                  }
                }}
                onMouseLeave={() => {
                  setHoveredBlockKey(null)
                  setDropIndicatorPos(null)
                }}
              >
                {hoveredBlockKey === dims.blockKey && (
                  <DragHandle
                    blockKey={dims.blockKey}
                    isDragging={activeDragKey === dims.blockKey}
                  />
                )}
              </div>
            </div>
          ))}
        </SortableContext>

        {/* Drop indicator line */}
        {dropIndicatorPos && (
          <div
            className="draggable-block-target-line"
            style={{
              position: 'absolute',
              top: `${dropIndicatorPos.top}px`,
              left: '40px',
              width: '200px',
              opacity: 1,
            }}
          />
        )}
      </div>

    </DndContext>
  )
}
