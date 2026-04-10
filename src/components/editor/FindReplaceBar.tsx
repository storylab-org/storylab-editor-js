import { useFindReplace } from '@/components/editor/lexical/plugins/FindReplacePlugin/FindReplaceContext'
import FindReplacePanel from '@/components/editor/lexical/plugins/FindReplacePlugin/FindReplacePanel'

/**
 * Renders the Find & Replace bottom bar when it's open.
 * Must be rendered inside the Lexical editor context (inside LexicalComposer).
 */
export default function FindReplaceBar() {
  const context = useFindReplace() as any
  const {
    isOpen,
    searchQuery,
    replaceQuery,
    caseSensitive,
    matches,
    currentMatchIndex,
    searchInputRef,
    onSearchChange,
    onReplaceChange,
    onToggleCaseSensitive,
    onPreviousMatch,
    onNextMatch,
    onReplace,
    onReplaceAll,
    onClose,
  } = context

  if (!isOpen) return null

  return (
    <FindReplacePanel
      searchQuery={searchQuery}
      replaceQuery={replaceQuery}
      caseSensitive={caseSensitive}
      matchCount={matches.length}
      currentMatchIndex={currentMatchIndex}
      searchInputRef={searchInputRef}
      onSearchChange={onSearchChange}
      onReplaceChange={onReplaceChange}
      onToggleCase={onToggleCaseSensitive}
      onBackward={onPreviousMatch}
      onForward={onNextMatch}
      onReplace={onReplace}
      onReplaceAll={onReplaceAll}
      onClose={onClose}
    />
  )
}
