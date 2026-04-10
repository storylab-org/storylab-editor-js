import { useState, useEffect, useRef, useCallback } from 'react'
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
import { OPEN_FIND_REPLACE_COMMAND } from './index'
import { setStateInstance } from './findReplaceStore'
import { detectCommonShortcuts } from '@/utils/keyboardUtils'

interface Match {
  nodeKey: string
  startOffset: number
  endOffset: number
}

/**
 * Custom hook that manages Find & Replace state and logic
 * To be used with EditorArea to provide context to FindReplaceBar
 */
export function useFindReplaceState() {
  const [editor] = useLexicalComposerContext()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [replaceQuery, setReplaceQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
              pos = idx + 1
            }
          } else if (
            'getChildren' in node &&
            typeof (node as any).getChildren === 'function'
          ) {
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
      editor.read(() => {
        const element = editor.getElementByKey(match.nodeKey)
        if (element && typeof element.scrollIntoView === 'function') {
          element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }
      })
    },
    [editor]
  )

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
  }, [editor, matches, currentMatchIndex, replaceQuery, searchQuery, findMatches, selectMatch])

  const replaceAll = useCallback(() => {
    if (matches.length === 0) return
    const byNode = new Map<string, Match[]>()
    for (const m of matches) {
      if (!byNode.has(m.nodeKey)) byNode.set(m.nodeKey, [])
      byNode.get(m.nodeKey)!.push(m)
    }
    editor.update(() => {
      for (const [nodeKey, nodeMatches] of byNode) {
        const node = $getNodeByKey(nodeKey)
        if (!node || !$isTextNode(node) || $isEntityMentionNode(node)) continue
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
    setMatches([])
    setCurrentMatchIndex(0)
  }, [editor, matches, replaceQuery])

  const closePanel = useCallback(() => {
    setIsOpen(false)
    setSearchQuery('')
    setReplaceQuery('')
    setMatches([])
    setCurrentMatchIndex(0)
  }, [])

  const goForward = useCallback(() => {
    if (matches.length === 0) return
    const nextIndex = (currentMatchIndex + 1) % matches.length
    setCurrentMatchIndex(nextIndex)
    selectMatch(matches[nextIndex])
  }, [matches, currentMatchIndex, selectMatch])

  const goBackward = useCallback(() => {
    if (matches.length === 0) return
    const prevIndex =
      currentMatchIndex === 0 ? matches.length - 1 : currentMatchIndex - 1
    setCurrentMatchIndex(prevIndex)
    selectMatch(matches[prevIndex])
  }, [matches, currentMatchIndex, selectMatch])

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query)
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
      searchDebounceRef.current = setTimeout(() => {
        const newMatches = findMatches(query)
        setMatches(newMatches)
        setCurrentMatchIndex(0)
      }, 150)
    },
    [findMatches]
  )

  // Register command to open Find & Replace
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

  // Global Cmd/Ctrl+F listener (keyboard-agnostic)
  useEffect(() => {
    const handleOpenShortcut = (e: KeyboardEvent) => {
      const shortcuts = detectCommonShortcuts(e)
      if (shortcuts.isFind) {
        e.preventDefault()
        editor.dispatchCommand(OPEN_FIND_REPLACE_COMMAND)
      }
    }
    window.addEventListener('keydown', handleOpenShortcut)
    return () => window.removeEventListener('keydown', handleOpenShortcut)
  }, [editor])

  // Escape listener when panel is open
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

  const stateValue = {
    isOpen,
    searchQuery,
    replaceQuery,
    caseSensitive,
    matches,
    currentMatchIndex,
    searchInputRef,
    onOpen: () => setIsOpen(true),
    onClose: closePanel,
    onSearchChange: handleSearchChange,
    onReplaceChange: setReplaceQuery,
    onToggleCaseSensitive: () => setCaseSensitive(!caseSensitive),
    onPreviousMatch: goBackward,
    onNextMatch: goForward,
    onReplace: replaceCurrent,
    onReplaceAll: replaceAll,
  }

  // Store the state instance globally so the plugin can access it
  useEffect(() => {
    setStateInstance(stateValue)
  }, [stateValue])

  return stateValue
}
