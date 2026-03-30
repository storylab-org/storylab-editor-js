import { useRef, useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey, CLICK_COMMAND, COMMAND_PRIORITY_LOW } from 'lexical'
import { $isImageNode } from '../nodes/ImageNode'

interface ImageRect {
  top: number
  left: number
  width: number
  height: number
}

export default function ImageResizePlugin() {
  const [editor] = useLexicalComposerContext()
  const [selectedImageKey, setSelectedImageKey] = useState<string | null>(null)
  const [imageRect, setImageRect] = useState<ImageRect | null>(null)
  const containerRef = useRef<HTMLElement | null>(null)
  const dragState = useRef<{
    startX: number
    startWidth: number
    handle: string
    imgElem: HTMLImageElement
  } | null>(null)

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

  // Compute image position relative to editor container
  const updateImageRect = (key: string) => {
    const editorSpan = editor.getElementByKey(key)
    const img = editorSpan?.querySelector('img') as HTMLImageElement
    const container = containerRef.current

    if (!img || !container) return

    const imgRect = img.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    setImageRect({
      top: imgRect.top - containerRect.top + container.scrollTop,
      left: imgRect.left - containerRect.left,
      width: imgRect.width,
      height: imgRect.height,
    })
  }

  // Detect image clicks via CLICK_COMMAND
  useEffect(() => {
    return editor.registerCommand(
      CLICK_COMMAND,
      (event: MouseEvent) => {
        const target = event.target as HTMLElement
        const imageKey = target.closest('[data-image-key]')?.getAttribute('data-image-key')

        if (imageKey) {
          setSelectedImageKey(imageKey)
          updateImageRect(imageKey)
          return true
        }

        // Click outside image — deselect
        if (selectedImageKey) {
          setSelectedImageKey(null)
          setImageRect(null)
        }
        return false
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor, selectedImageKey])

  // Update image rect on scroll and resize
  useEffect(() => {
    if (!selectedImageKey) return

    const updateRect = () => {
      updateImageRect(selectedImageKey)
    }

    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)

    return () => {
      window.removeEventListener('scroll', updateRect, true)
      window.removeEventListener('resize', updateRect)
    }
  }, [selectedImageKey])

  // Handle resize drag start
  const handleResizeStart = (handle: string, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!selectedImageKey) return

    const editorSpan = editor.getElementByKey(selectedImageKey)
    const imgElem = editorSpan?.querySelector('img') as HTMLImageElement

    if (!imgElem) return

    dragState.current = {
      startX: event.clientX,
      startWidth: imgElem.offsetWidth,
      handle,
      imgElem,
    }

    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
  }

  // Handle resize drag move
  const handleResizeMove = (event: MouseEvent) => {
    if (!dragState.current) return

    const delta = event.clientX - dragState.current.startX
    const handle = dragState.current.handle

    // Intuitive behavior: dragging toward the handle direction expands the image
    // For right-side handles: drag right (+delta) = expand
    // For left-side handles: drag left (-delta) = expand, so use -delta
    // For horizontal handles: always use horizontal movement
    let effectiveDelta = delta

    if (handle.includes('w')) {
      // Left-side handles: invert so dragging LEFT expands
      effectiveDelta = -delta
    }
    // Right-side handles and all others: use delta as-is (drag right = expand)

    const newWidth = Math.max(50, dragState.current.startWidth + effectiveDelta)

    // Live visual feedback on the image
    dragState.current.imgElem.style.width = `${newWidth}px`

    // Update overlay position
    if (selectedImageKey) {
      updateImageRect(selectedImageKey)
    }
  }

  // Handle resize drag end
  const handleResizeEnd = () => {
    document.removeEventListener('mousemove', handleResizeMove)
    document.removeEventListener('mouseup', handleResizeEnd)

    if (!dragState.current || !selectedImageKey) return

    const finalWidth = dragState.current.imgElem.offsetWidth

    // Commit width to Lexical node
    editor.update(() => {
      const node = $getNodeByKey(selectedImageKey)
      if ($isImageNode(node)) {
        node.setWidth(finalWidth)
      }
    })

    dragState.current = null
  }

  if (!selectedImageKey || !imageRect) {
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
        zIndex: 10,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: `${imageRect.top}px`,
          left: `${imageRect.left}px`,
          width: `${imageRect.width}px`,
          height: `${imageRect.height}px`,
          pointerEvents: 'none',
        }}
      >
        {/* Blue selection border */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            outline: '2px solid rgb(60, 132, 244)',
            pointerEvents: 'none',
          }}
        />

        {/* 8 resize handles */}
        {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((handle) => {
          const handleStyles: React.CSSProperties = {
            position: 'absolute',
            width: '7px',
            height: '7px',
            backgroundColor: 'rgb(60, 132, 244)',
            border: '1px solid #fff',
            pointerEvents: 'auto',
            cursor: 'pointer',
          }

          // Position each handle at corners/edges
          switch (handle) {
            case 'nw':
              handleStyles.top = '-6px'
              handleStyles.left = '-6px'
              handleStyles.cursor = 'nwse-resize'
              break
            case 'n':
              handleStyles.top = '-6px'
              handleStyles.left = '50%'
              handleStyles.transform = 'translateX(-50%)'
              handleStyles.cursor = 'ns-resize'
              break
            case 'ne':
              handleStyles.top = '-6px'
              handleStyles.right = '-6px'
              handleStyles.cursor = 'nesw-resize'
              break
            case 'e':
              handleStyles.right = '-6px'
              handleStyles.top = '50%'
              handleStyles.transform = 'translateY(-50%)'
              handleStyles.cursor = 'ew-resize'
              break
            case 'se':
              handleStyles.bottom = '-6px'
              handleStyles.right = '-6px'
              handleStyles.cursor = 'nwse-resize'
              break
            case 's':
              handleStyles.bottom = '-6px'
              handleStyles.left = '50%'
              handleStyles.transform = 'translateX(-50%)'
              handleStyles.cursor = 'ns-resize'
              break
            case 'sw':
              handleStyles.bottom = '-6px'
              handleStyles.left = '-6px'
              handleStyles.cursor = 'nesw-resize'
              break
            case 'w':
              handleStyles.left = '-6px'
              handleStyles.top = '50%'
              handleStyles.transform = 'translateY(-50%)'
              handleStyles.cursor = 'ew-resize'
              break
          }

          return (
            <div
              key={handle}
              style={handleStyles}
              onMouseDown={(e) => handleResizeStart(handle, e)}
            />
          )
        })}
      </div>
    </div>
  )
}
