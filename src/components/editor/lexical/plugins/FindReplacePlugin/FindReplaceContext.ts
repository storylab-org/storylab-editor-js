import { createContext, useContext } from 'react'

interface Match {
  nodeKey: string
  startOffset: number
  endOffset: number
}

export interface FindReplaceContextType {
  isOpen: boolean
  searchQuery: string
  replaceQuery: string
  caseSensitive: boolean
  matches: Match[]
  currentMatchIndex: number
  searchInputRef: React.RefObject<HTMLInputElement | null>
  onOpen: () => void
  onClose: () => void
  onSearchChange: (val: string) => void
  onReplaceChange: (val: string) => void
  onToggleCaseSensitive: () => void
  onPreviousMatch: () => void
  onNextMatch: () => void
  onReplace: () => void
  onReplaceAll: () => void
}

export const FindReplaceContext = createContext<FindReplaceContextType | undefined>(undefined)

export function useFindReplace() {
  const context = useContext(FindReplaceContext)
  if (!context) {
    throw new Error('useFindReplace must be used within FindReplaceProvider')
  }
  return context
}
