import { useState, useEffect, useCallback, useMemo } from 'react'
import { OVERVIEW_ID } from '@/constants'
import {
  listDocuments,
  createDocument,
  deleteDocument,
  reorderDocuments,
  type DocumentHead
} from '@/api/documents'

interface UseChaptersReturn {
  chapters: DocumentHead[]
  activeChapterId: string | null
  isLoading: boolean
  sortedChapters: DocumentHead[]
  handleSelectChapter: (id: string) => void
  handleCreateChapter: () => Promise<void>
  handleDeleteChapter: (id: string) => Promise<void>
  handleReorder: (reorderedChapters: DocumentHead[]) => Promise<void>
  refreshChapters: () => Promise<void>
}

/**
 * Manages chapter list, active chapter selection, and chapter operations (CRUD, reorder).
 * Restores active chapter from localStorage on mount.
 */
export function useChapters(): UseChaptersReturn {
  const [chapters, setChapters] = useState<DocumentHead[]>([])
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Memoize sorted chapters to prevent unnecessary re-renders
  const sortedChapters = useMemo(() => {
    return [...chapters].sort((a, b) => a.order - b.order)
  }, [chapters])

  // Load documents on mount
  useEffect(() => {
    const loadChapters = async () => {
      setIsLoading(true)
      try {
        console.log('[INIT] Loading chapters on app startup...')
        let docs = await listDocuments()
        console.log(`[INIT] Found ${docs.length} chapters`)

        // Create default chapter if none exist
        if (docs.length === 0) {
          console.log('[INIT] No chapters found, creating default "Untitled" chapter...')
          const defaultChapter = await createDocument('Untitled', '')
          docs = [defaultChapter]
          console.log(`[INIT] ✓ Created default chapter with ID "${defaultChapter.id}"`)
        }

        console.log(`[INIT] ✓ Setting chapters list: ${docs.map(d => d.id).join(', ')}`)
        setChapters(docs)

        // Restore last active chapter from localStorage, or default to Overview
        const savedChapterId = localStorage.getItem('active-chapter-id')
        const chapterExists = docs.some(d => d.id === savedChapterId)
        const initialChapterId = (savedChapterId && chapterExists) ? savedChapterId : OVERVIEW_ID

        console.log(`[INIT] ✓ Setting active chapter to ${initialChapterId === OVERVIEW_ID ? 'Overview (Draft Board)' : initialChapterId}`)
        setActiveChapterId(initialChapterId)
      } catch (error) {
        console.error('[INIT] ✗ Failed to load chapters:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadChapters()
  }, [])

  // Persist active chapter ID to localStorage
  useEffect(() => {
    if (!activeChapterId) return
    localStorage.setItem('active-chapter-id', activeChapterId)
  }, [activeChapterId])

  // Refetch chapters from server
  const refreshChapters = useCallback(async () => {
    try {
      const docs = await listDocuments()
      setChapters(docs)
    } catch (error) {
      console.error('Failed to refresh chapters:', error)
    }
  }, [])

  const handleSelectChapter = useCallback((id: string) => {
    console.log(`[SWITCH] Switching to chapter "${id}"`)
    setActiveChapterId(id)
  }, [])

  const handleCreateChapter = useCallback(async () => {
    try {
      console.log('[CREATE] Creating new chapter...')
      const newChapter = await createDocument('New Chapter', '')
      console.log(`[CREATE] ✓ New chapter created with ID "${newChapter.id}"`)

      // Refresh chapter list from server to ensure consistency
      console.log('[CREATE] Refreshing chapter list...')
      const docs = await listDocuments()
      console.log(`[CREATE] ✓ Got ${docs.length} chapters, selecting new chapter: "${newChapter.id}"`)

      setChapters(docs)
      setActiveChapterId(newChapter.id)
    } catch (error) {
      console.error('[CREATE] ✗ Failed to create chapter:', error)
    }
  }, [])

  const handleDeleteChapter = useCallback(async (id: string) => {
    try {
      console.log(`[DELETE] Deleting chapter "${id}"...`)
      await deleteDocument(id)
      console.log(`[DELETE] ✓ Chapter "${id}" deleted`)

      // Remove from chapters list
      const updatedChapters = chapters.filter(c => c.id !== id)
      setChapters(updatedChapters)

      // If deleted chapter was active, select an adjacent chapter
      if (activeChapterId === id) {
        if (updatedChapters.length > 0) {
          // Find the deleted chapter's index in the original list
          const deletedIndex = chapters.findIndex(c => c.id === id)
          // Prefer next chapter, otherwise fall back to previous
          let nextChapterId: string
          if (deletedIndex < updatedChapters.length) {
            nextChapterId = updatedChapters[deletedIndex].id
          } else {
            nextChapterId = updatedChapters[updatedChapters.length - 1].id
          }
          console.log(`[DELETE] Active chapter deleted, switching to "${nextChapterId}"`)
          setActiveChapterId(nextChapterId)
        } else {
          // No chapters remain, create a default "Untitled" chapter
          console.log('[DELETE] No chapters remain, creating default "Untitled" chapter...')
          const defaultChapter = await createDocument('Untitled', '')
          console.log(`[DELETE] ✓ Created default chapter "${defaultChapter.id}"`)
          setChapters([defaultChapter])
          setActiveChapterId(defaultChapter.id)
        }
      }
    } catch (error) {
      console.error(`[DELETE] ✗ Failed to delete chapter "${id}":`, error)
    }
  }, [chapters, activeChapterId])

  const handleReorder = useCallback(async (reorderedChapters: DocumentHead[]) => {
    console.log('[REORDER] Reordering chapters...')
    // Optimistic update with updated order indices
    const chaptersWithNewOrder = reorderedChapters.map((chapter, index) => ({
      ...chapter,
      order: index
    }))
    setChapters(chaptersWithNewOrder)

    // Persist to server
    try {
      const orderedIds = reorderedChapters.map(c => c.id)
      await reorderDocuments(orderedIds)
      console.log('[REORDER] ✓ Chapters reordered successfully')
    } catch (error) {
      console.error('[REORDER] ✗ Failed to reorder chapters:', error)
      // Refresh from server on error
      try {
        const docs = await listDocuments()
        setChapters(docs)
      } catch (e) {
        console.error('[REORDER] ✗ Failed to refresh chapters after reorder error:', e)
      }
    }
  }, [])

  return {
    chapters,
    activeChapterId,
    isLoading,
    sortedChapters,
    handleSelectChapter,
    handleCreateChapter,
    handleDeleteChapter,
    handleReorder,
    refreshChapters,
  }
}
