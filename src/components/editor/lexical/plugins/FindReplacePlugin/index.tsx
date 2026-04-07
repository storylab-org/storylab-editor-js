import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getRoot,
  $getNodeByKey,
  $createRangeSelection,
  $setSelection,
  $isTextNode,
  LexicalNode,
  TextNode,
  ElementNode,
  COMMAND_PRIORITY_NORMAL,
} from 'lexical'
import { $isEntityMentionNode } from '../../nodes/EntityMentionNode'
import FindReplacePanel from './FindReplacePanel'

// Custom command to open Find & Replace
export const OPEN_FIND_REPLACE_COMMAND = 'OPEN_FIND_REPLACE_COMMAND'

interface Match {
  nodeKey: string
  startOffset: number
  endOffset: number
}

export default function FindReplacePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext()

  // Panel state
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [replaceQuery, setReplaceQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)

  // Match state
  const [matches, setMatches] = useState<Match[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Find all matches of a query in the current editor state
   * Searches all TextNodes except EntityMentionNodes (to avoid corruption)
   */
  const findMatches = useCallback(
    (query: string): Match[] => {
      if (!query) return []

      const foundMatches: Match[] = []
      const needle = caseSensitive ? query : query.toLowerCase()

      editor.read(() => {
        const root = $getRoot()
        const stack: LexicalNode[] = [...root.getChildren()]

        while (stack.length > 0) {
          const node = stack.pop()!

          if ($isTextNode(node) && !$isEntityMentionNode(node)) {
            const text = node.getTextContent()
            const haystack = caseSensitive ? text : text.toLowerCase()
            let pos = 0

            while (true) {
              const idx = haystack.indexOf(needle, pos)
              if (idx === -1) break
              foundMatches.push({
                nodeKey: node.getKey(),
                startOffset: idx,
                endOffset: idx + query.length,
              })
              pos = idx + 1 // advance by 1 to catch overlapping matches
            }
          } else if (
            'getChildren' in node &&
            typeof (node as any).getChildren === 'function'
          ) {
            // ElementNode — push children in reverse so left-to-right order is preserved
            const children = (node as ElementNode).getChildren()
            for (let i = children.length - 1; i >= 0; i--) {
              stack.push(children[i])
            }
          }
        }
      })

      return foundMatches
    },
    [editor, caseSensitive]
  )

  /**
   * Programmatically select a match via Lexical selection
   * and scroll it into view
   */
  const selectMatch = useCallback(
    (match: Match) => {
      editor.update(() => {
        const node = $getNodeByKey(match.nodeKey)
        if (!node || !$isTextNode(node)) return

        const selection = $createRangeSelection()
        selection.anchor.set(match.nodeKey, match.startOffset, 'text')
        selection.focus.set(match.nodeKey, match.endOffset, 'text')
        $setSelection(selection)
      })

      // Scroll the match into view
      editor.read(() => {
        const element = editor.getElementByKey(match.nodeKey)
        if (element && typeof element.scrollIntoView === 'function') {
          element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }
      })
    },
    [editor]
  )

  /**
   * Replace the current match and advance to the next match
   */
  const replaceCurrent = useCallback(() => {
    if (matches.length === 0) return
    const match = matches[currentMatchIndex]

    editor.update(() => {
      const node = $getNodeByKey(match.nodeKey)
      if (!node || !$isTextNode(node) || $isEntityMentionNode(node)) return

      const text = node.getTextContent()
      const newText =
        text.slice(0, match.startOffset) +
        replaceQuery +
        text.slice(match.endOffset)
      node.setTextContent(newText)
    })

    // Re-run search after mutation settles
    requestAnimationFrame(() => {
      const newMatches = findMatches(searchQuery)
      setMatches(newMatches)
      const nextIndex =
        newMatches.length > 0
          ? Math.min(currentMatchIndex, newMatches.length - 1)
          : 0
      setCurrentMatchIndex(nextIndex)
      if (newMatches.length > 0) {
        selectMatch(newMatches[nextIndex])
      }
    })
  }, [
    editor,
    matches,
    currentMatchIndex,
    replaceQuery,
    searchQuery,
    findMatches,
    selectMatch,
  ])

  /**
   * Replace all matches in one editor.update() call (single undo entry)
   * Process offsets in descending order within each TextNode to avoid corruption
   */
  const replaceAll = useCallback(() => {
    if (matches.length === 0) return

    // Group by nodeKey
    const byNode = new Map<string, Match[]>()
    for (const m of matches) {
      if (!byNode.has(m.nodeKey)) byNode.set(m.nodeKey, [])
      byNode.get(m.nodeKey)!.push(m)
    }

    editor.update(() => {
      for (const [nodeKey, nodeMatches] of byNode) {
        const node = $getNodeByKey(nodeKey)
        if (!node || !$isTextNode(node) || $isEntityMentionNode(node)) continue

        // Sort descending by startOffset — rightmost first
        nodeMatches.sort((a, b) => b.startOffset - a.startOffset)

        let text = node.getTextContent()
        for (const m of nodeMatches) {
          text =
            text.slice(0, m.startOffset) +
            replaceQuery +
            text.slice(m.endOffset)
        }
        node.setTextContent(text)
      }
    })

    // All replacements are one undo history entry
    setMatches([])
    setCurrentMatchIndex(0)
  }, [editor, matches, replaceQuery])

  /**
   * Close the find/replace panel
   */
  const closePanel = useCallback(() => {
    setIsOpen(false)
    setSearchQuery('')
    setReplaceQuery('')
    setMatches([])
    setCurrentMatchIndex(0)
  }, [])

  /**
   * Navigate forward through matches (wraps to start)
   */
  const goForward = useCallback(() => {
    if (matches.length === 0) return
    const nextIndex = (currentMatchIndex + 1) % matches.length
    setCurrentMatchIndex(nextIndex)
    selectMatch(matches[nextIndex])
  }, [matches, currentMatchIndex, selectMatch])

  /**
   * Navigate backward through matches (wraps to end)
   */
  const goBackward = useCallback(() => {
    if (matches.length === 0) return
    const prevIndex =
      currentMatchIndex === 0 ? matches.length - 1 : currentMatchIndex - 1
    setCurrentMatchIndex(prevIndex)
    selectMatch(matches[prevIndex])
  }, [matches, currentMatchIndex, selectMatch])

  /**
   * Handler for search input changes — debounced
   * NOTE: We do NOT automatically select matches to avoid moving the cursor
   * while the user is typing in the search input. Selection only happens
   * when user explicitly navigates (Next/Prev buttons or Enter key).
   */
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query)

      // Debounce find at 150ms
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
      searchDebounceRef.current = setTimeout(() => {
        const newMatches = findMatches(query)
        setMatches(newMatches)
        setCurrentMatchIndex(0)
        // Do NOT select the first match — let user navigate explicitly
      }, 150)
    },
    [findMatches]
  )

  /**
   * Register command to open Find & Replace
   */
  useEffect(() => {
    return editor.registerCommand(
      OPEN_FIND_REPLACE_COMMAND,
      () => {
        setIsOpen(true)
        return true
      },
      COMMAND_PRIORITY_NORMAL
    )
  }, [editor])

  /**
   * Global Cmd/Ctrl+F listener — works even when editor is not focused
   */
  useEffect(() => {
    const handleOpenShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        editor.dispatchCommand(OPEN_FIND_REPLACE_COMMAND)
      }
    }
    window.addEventListener('keydown', handleOpenShortcut)
    return () => window.removeEventListener('keydown', handleOpenShortcut)
  }, [editor])

  /**
   * Escape listener when panel is open
   */
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePanel()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, closePanel])

  if (!isOpen) return null

  return createPortal(
    <FindReplacePanel
      searchQuery={searchQuery}
      replaceQuery={replaceQuery}
      caseSensitive={caseSensitive}
      matchCount={matches.length}
      currentMatchIndex={currentMatchIndex}
      searchInputRef={searchInputRef}
      onSearchChange={handleSearchChange}
      onReplaceChange={setReplaceQuery}
      onToggleCase={() => setCaseSensitive(!caseSensitive)}
      onBackward={goBackward}
      onForward={goForward}
      onReplace={replaceCurrent}
      onReplaceAll={replaceAll}
      onClose={closePanel}
    />,
    document.body
  )
}
