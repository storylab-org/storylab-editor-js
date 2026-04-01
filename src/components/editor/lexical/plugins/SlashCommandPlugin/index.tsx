import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  $isParagraphNode,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  COMMAND_PRIORITY_HIGH,
} from 'lexical'
import { mergeRegister } from '@lexical/utils'
import type { SlashCommand } from './commands'
import { buildSlashCommands } from './commands'
import { SlashPalette } from './SlashPalette'
import InsertTableDialog from '../../../InsertTableDialog'

export default function SlashCommandPlugin(): React.JSX.Element | null {
  const [editor] = useLexicalComposerContext()

  // Palette state
  const [active, setActive] = useState(false)
  const [filter, setFilter] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [showTableDialog, setShowTableDialog] = useState(false)

  const paletteRef = useRef<HTMLDivElement | null>(null)
  const anchorKeyRef = useRef<string | null>(null)

  // Build command list (memoized — stable reference)
  const allCommands = useMemo(
    () =>
      buildSlashCommands(editor, {
        onTableInsert: () => setShowTableDialog(true),
        onImagePicker: (onSuccess) => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'image/png,image/jpeg,image/gif,image/webp'
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return

            try {
              const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
              if (file.size > MAX_IMAGE_SIZE_BYTES) {
                const fileSizeMB = (file.size / 1024 / 1024).toFixed(2)
                console.error(
                  `File is too large (${fileSizeMB}MB). Maximum size: 5MB`
                )
                return
              }

              const bytes = await file.arrayBuffer()
              const response = await fetch('http://localhost:3000/images', {
                method: 'POST',
                headers: { 'Content-Type': file.type },
                body: bytes,
              })

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                const errorMessage =
                  errorData.message || `Upload failed (${response.status})`
                console.error(`Failed to upload image: ${errorMessage}`)
                return
              }

              const { cid } = await response.json()
              onSuccess(cid, file.name, file.type)
            } catch (error) {
              console.error('Error uploading image:', error)
            }
          }
          input.click()
        },
      }),
    [editor]
  )

  // Filter commands based on user input
  const filteredCommands = useMemo(() => {
    if (!filter) return allCommands
    const lowerFilter = filter.toLowerCase()
    return allCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lowerFilter) ||
        cmd.triggers.some((t) => t.toLowerCase().includes(lowerFilter))
    )
  }, [filter, allCommands])

  // Reset selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredCommands])

  // Detect slash trigger in editor state
  useEffect(() => {
    const closePalette = () => {
      setActive(false)
      setFilter('')
      anchorKeyRef.current = null
    }

    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()

        // Guard: must be a range selection and collapsed
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          closePalette()
          return
        }

        // Guard: anchor must be a text node
        if (selection.anchor.type !== 'text') {
          closePalette()
          return
        }

        const anchorNode = selection.anchor.getNode()
        const parent = anchorNode.getParent()

        // Guard: parent must be a paragraph
        if (!$isParagraphNode(parent)) {
          closePalette()
          return
        }

        // Guard: paragraph must have exactly 1 child (simple text node only)
        if (parent.getChildrenSize() !== 1) {
          closePalette()
          return
        }

        // Guard: cursor must be at end of text
        const textLength = anchorNode.getTextContent().length
        if (selection.anchor.offset !== textLength) {
          closePalette()
          return
        }

        const text = anchorNode.getTextContent()

        // Guard: text must start with /
        if (!text.startsWith('/')) {
          closePalette()
          return
        }

        // Trigger is active: extract filter and set state
        const newFilter = text.slice(1).toLowerCase()
        setActive(true)
        setFilter(newFilter)
        anchorKeyRef.current = selection.anchor.key
      })
    })
  }, [editor])

  // Compute palette position
  useEffect(() => {
    if (!active) return

    const computePosition = () => {
      try {
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return

        const range = selection.getRangeAt(0)
        let rect = range.getBoundingClientRect()

        // Fallback if rect is zeroed
        if (rect.width === 0 && rect.height === 0 && anchorKeyRef.current) {
          const anchorElement = editor.getElementByKey(anchorKeyRef.current)
          if (anchorElement) {
            rect = anchorElement.getBoundingClientRect()
          }
        }

        let top = rect.bottom + 8
        let left = rect.left

        // Clamp right edge
        if (left + 280 > window.innerWidth - 16) {
          left = Math.max(16, window.innerWidth - 280 - 16)
        }

        setPosition({ top, left })
      } catch (e) {
        console.error('[SlashCommandPlugin] Position computation error:', e)
      }
    }

    computePosition()
  }, [active, editor])

  // Adjust position for bottom overflow (runs after paint)
  useEffect(() => {
    if (!active || !paletteRef.current) return

    const adjustPosition = () => {
      const paletteHeight = paletteRef.current?.offsetHeight || 200
      const bottomSpace = window.innerHeight - position.top

      if (bottomSpace < paletteHeight + 16) {
        // Flip above cursor
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          setPosition((prev) => ({
            ...prev,
            top: Math.max(8, rect.top - paletteHeight - 8),
          }))
        }
      }
    }

    const timeoutId = setTimeout(adjustPosition, 0)
    return () => clearTimeout(timeoutId)
  }, [active, position.top])

  // Outside-click dismissal
  useEffect(() => {
    if (!active) return

    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setActive(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [active])

  // Execute command
  const executeCommand = useCallback(
    (cmd: SlashCommand) => {
      setActive(false)
      setFilter('')

      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return

        const anchorNode = selection.anchor.getNode()
        const textLength = anchorNode.getTextContent().length

        // Select the full /filter text
        selection.anchor.set(anchorNode.getKey(), 0, 'text')
        selection.focus.set(anchorNode.getKey(), textLength, 'text')

        // Delete the /filter text
        selection.removeText()
      })

      // Execute the command (some need a separate update tick)
      cmd.execute(editor)
    },
    [editor]
  )

  // Keyboard navigation (only active when palette is open)
  useEffect(() => {
    if (!active || filteredCommands.length === 0) return

    return mergeRegister(
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        (payload) => {
          payload?.preventDefault()
          setSelectedIndex(
            (prev) => (prev + 1) % filteredCommands.length
          )
          return true
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        (payload) => {
          payload?.preventDefault()
          setSelectedIndex(
            (prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length
          )
          return true
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (payload) => {
          payload?.preventDefault()
          if (filteredCommands.length > 0) {
            executeCommand(filteredCommands[selectedIndex])
          }
          return true
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          setActive(false)
          return true
        },
        COMMAND_PRIORITY_HIGH
      )
    )
  }, [active, filteredCommands, selectedIndex, editor, executeCommand])

  return (
    <>
      {active && (
        <SlashPalette
          commands={filteredCommands}
          selectedIndex={selectedIndex}
          position={position}
          onSelect={executeCommand}
          onHover={setSelectedIndex}
          paletteRef={paletteRef}
        />
      )}
      {showTableDialog && (
        <InsertTableDialog onClose={() => setShowTableDialog(false)} />
      )}
    </>
  )
}
