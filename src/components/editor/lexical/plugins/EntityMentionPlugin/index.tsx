import { useCallback, useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  mergeRegister,
  RangeSelection,
  TextNode,
} from 'lexical'
import { $createEntityMentionNode } from '../../nodes/EntityMentionNode'
import type { Entity } from '@/api/entities'
import { listEntities, getEntity } from '@/api/entities'
import EntityMentionPalette from './EntityMentionPalette'
import EntityMentionPopover from './EntityMentionPopover'
import './EntityMentionPalette.css'

const TRIGGER_CHARS = { '@': 'character', '#': 'location', '!': 'item' } as const

interface TriggerContext {
  trigger: string
  type: 'character' | 'location' | 'item'
  query: string
  position: { top: number; left: number }
  selection: RangeSelection | null
  offset: number
  anchorRectTop: number
}

export default function EntityMentionPlugin() {
  const [editor] = useLexicalComposerContext()
  const [active, setActive] = useState(false)
  const [entities, setEntities] = useState<Entity[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [triggerContext, setTriggerContext] = useState<TriggerContext | null>(null)
  const [popoverEntity, setPopoverEntity] = useState<Entity | null>(null)
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null)
  const paletteRef = useRef<HTMLDivElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Backwards scan for trigger character
  const scanForTrigger = useCallback(
    (selection: RangeSelection): TriggerContext | null => {
      const anchorNode = selection.anchor.getNode()
      if (!(anchorNode instanceof TextNode)) return null

      const textContent = anchorNode.getTextContent()
      const offset = selection.anchor.offset

      // Scan backwards from cursor to find @, #, or !
      let triggerPos = -1
      let triggerChar = ''

      for (let i = offset - 1; i >= 0 && i >= offset - 30; i--) {
        const char = textContent[i]
        if (char === '@' || char === '#' || char === '!') {
          triggerPos = i
          triggerChar = char
          break
        }
        // Stop if we hit whitespace (trigger must be directly before or with text)
        if (char === ' ' || char === '\n') {
          break
        }
      }

      if (triggerPos === -1) return null

      const query = textContent.slice(triggerPos + 1, offset).trim()
      const type = TRIGGER_CHARS[triggerChar as keyof typeof TRIGGER_CHARS]

      // Calculate position for palette
      const rect = window.getSelection()?.getRangeAt(0).getBoundingClientRect()
      if (!rect) return null

      let left = rect.left
      let top = rect.bottom + 8

      // Clamp to window bounds
      if (left + 320 > window.innerWidth) {
        left = window.innerWidth - 320 - 16
      }

      return {
        trigger: triggerChar,
        type,
        query,
        position: { top, left },
        selection,
        offset: triggerPos,
        anchorRectTop: rect.top,
      }
    },
    []
  )

  // Load entities when trigger is detected
  const loadEntities = useCallback(async (ctx: TriggerContext) => {
    try {
      const all = await listEntities(ctx.type)
      const filtered = all.filter((e) =>
        e.name.toLowerCase().includes(ctx.query.toLowerCase())
      )
      setEntities(filtered)
      setSelectedIndex(0)
    } catch (error) {
      console.error('Failed to load entities:', error)
      setEntities([])
    }
  }, [])

  // Main update listener for trigger detection
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()

        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          setActive(false)
          setTriggerContext(null)
          return
        }

        const ctx = scanForTrigger(selection)

        if (ctx) {
          setActive(true)
          setTriggerContext(ctx)
          setSelectedIndex(0)

          // Debounce entity loading
          if (debounceTimer.current) clearTimeout(debounceTimer.current)
          debounceTimer.current = setTimeout(() => loadEntities(ctx), 100)
        } else {
          setActive(false)
          setTriggerContext(null)
        }
      })
    })
  }, [editor, scanForTrigger, loadEntities])

  // Handle entity selection
  const handleSelectEntity = useCallback(
    (entity: Entity) => {
      if (!triggerContext) return

      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return

        const anchorNode = selection.anchor.getNode()
        if (!(anchorNode instanceof TextNode)) return

        // Calculate positions for deletion and insertion
        const startOffset = triggerContext.offset
        const endOffset = selection.anchor.offset

        // Delete trigger text
        selection.setTextNodeRange(anchorNode, startOffset, anchorNode, endOffset)
        selection.removeText()

        // Insert mention node
        const mentionNode = $createEntityMentionNode(entity.id, entity.type, entity.name)
        selection.insertNodes([mentionNode])
      })

      setActive(false)
      setTriggerContext(null)
    },
    [editor, triggerContext]
  )

  // Handle entity mention clicks
  const handleEntityMentionClick = useCallback(
    async (element: HTMLElement) => {
      const entityId = element.getAttribute('data-entity-id')
      const entityType = element.getAttribute('data-entity-type')

      if (!entityId || !entityType) return

      try {
        const entity = await getEntity(entityId)
        const rect = element.getBoundingClientRect()
        setPopoverEntity(entity)
        setPopoverPosition({
          top: rect.bottom + 8,
          left: rect.left,
        })
      } catch (error) {
        console.error('Failed to load entity:', error)
      }
    },
    []
  )

  // Register root listener for entity mention clicks
  useEffect(() => {
    return editor.registerRootListener((rootElement) => {
      if (!rootElement) return

      const handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement
        const mentionElement = target.closest('.entity-mention')

        if (mentionElement) {
          handleEntityMentionClick(mentionElement as HTMLElement)
        }
      }

      rootElement.addEventListener('click', handleClick)
      return () => rootElement.removeEventListener('click', handleClick)
    })
  }, [editor, handleEntityMentionClick])

  // Adjust position for bottom overflow (runs after paint)
  useEffect(() => {
    if (!active || !paletteRef.current || !triggerContext) return

    const adjustPosition = () => {
      const paletteHeight = paletteRef.current?.offsetHeight || 200
      const bottomSpace = window.innerHeight - triggerContext.position.top

      if (bottomSpace < paletteHeight + 16) {
        setTriggerContext((prev) =>
          prev
            ? {
                ...prev,
                position: {
                  ...prev.position,
                  top: Math.max(8, prev.anchorRectTop - paletteHeight - 8),
                },
              }
            : prev
        )
      }
    }

    const id = setTimeout(adjustPosition, 0)
    return () => clearTimeout(id)
  }, [active, triggerContext?.position.top])

  // Register keyboard commands
  useEffect(() => {
    if (!active) return

    return mergeRegister(
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        () => {
          if (!active) return false
          setSelectedIndex((i) => (i + 1) % entities.length)
          return true
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        () => {
          if (!active) return false
          setSelectedIndex((i) => (i === 0 ? entities.length - 1 : i - 1))
          return true
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        () => {
          if (!active || entities.length === 0) return false
          handleSelectEntity(entities[selectedIndex])
          return true
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (!active) return false
          setActive(false)
          setTriggerContext(null)
          return true
        },
        COMMAND_PRIORITY_HIGH
      )
    )
  }, [editor, active, entities, selectedIndex, handleSelectEntity])

  return (
    <>
      {active && triggerContext && entities.length > 0 && (
        <EntityMentionPalette
          entities={entities}
          selectedIndex={selectedIndex}
          position={triggerContext.position}
          onSelect={handleSelectEntity}
          onHover={setSelectedIndex}
          paletteRef={paletteRef}
          triggerChar={triggerContext.trigger}
        />
      )}
      {popoverEntity && popoverPosition && (
        <EntityMentionPopover
          entity={popoverEntity}
          position={popoverPosition}
          onClose={() => setPopoverEntity(null)}
        />
      )}
    </>
  )
}
