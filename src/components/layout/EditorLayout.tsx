import { useState, useEffect, useRef, useMemo } from 'react'
import Sidebar from '@/components/sidebar/Sidebar'
import EditorArea from '@/components/editor/EditorArea'
import EditorToolbar from '@/components/editor/EditorToolbar'
import GenericModal from '@/components/shared/GenericModal'
import ChapterSettingsModal from '@/components/editor/ChapterSettingsModal'
import DraftBoard from '@/components/draftboard/DraftBoard'
import { ToastProvider } from '@/components/shared/ToastContext'
import ToastContainer from '@/components/shared/ToastContainer'
import { OVERVIEW_ID } from '@/constants'
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  reorderDocuments,
  type DocumentHead
} from '@/api/documents'
import { exportAndSave, type ExportFormat } from '@/api/export'

const isDevelopmentMode = import.meta.env.MODE === 'development'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface ChapterSettings {
  pageBackground: string
  showDragMenu?: boolean
  enableTreeViewPlugin?: boolean
}

export default function EditorLayout() {
  const [chapters, setChapters] = useState<DocumentHead[]>([])
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isLoading, setIsLoading] = useState(true) // Only for initial app load
  const [isLoadingContent, setIsLoadingContent] = useState(false) // For individual chapter loads
  const [loadedChapterId, setLoadedChapterId] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState(0)
  const [isDirty, setIsDirty] = useState(false)
  const [chapterSettings, setChapterSettings] = useState<Record<string, ChapterSettings>>({})
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [applyOrderHandler, setApplyOrderHandler] = useState<(() => void) | null>(null)
  const [canApplyOrder, setCanApplyOrder] = useState(false)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeChapter = chapters.find((c) => c.id === activeChapterId)

  // Memoize sorted chapters to prevent unnecessary re-renders in sidebar
  const sortedChapters = useMemo(() => {
    return [...chapters].sort((a, b) => a.order - b.order)
  }, [chapters])

  // Refetch chapters from server
  const refreshChapters = async () => {
    try {
      const docs = await listDocuments()
      setChapters(docs)
    } catch (error) {
      console.error('Failed to refresh chapters:', error)
    }
  }

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
        console.log(`[INIT] ✓ Setting active chapter to Overview`)
        setActiveChapterId(OVERVIEW_ID)
      } catch (error) {
        console.error('[INIT] ✗ Failed to load chapters:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadChapters()
  }, [])

  // Load document content when active chapter changes
  useEffect(() => {
    if (!activeChapterId) return

    // Skip document load for Overview
    if (activeChapterId === OVERVIEW_ID) {
      console.log('[LOAD] Loading Overview...')
      setLoadedChapterId(OVERVIEW_ID)
      setIsLoadingContent(false)
      return
    }

    const loadDocument = async () => {
      setIsLoadingContent(true)
      try {
        console.log(`[LOAD] Loading chapter "${activeChapterId}"...`)
        const doc = await getDocument(activeChapterId)
        console.log(`[LOAD] ✓ Loaded chapter "${activeChapterId}" (name: "${doc.name}", ${doc.content.length} bytes)`)
        setContent(doc.content)
        setLoadedChapterId(activeChapterId)

        // Load chapter settings from localStorage
        const savedSettings = localStorage.getItem(`chapter-settings-${activeChapterId}`)
        if (savedSettings) {
          try {
            setChapterSettings(prev => ({ ...prev, [activeChapterId]: JSON.parse(savedSettings) }))
          } catch (e) {
            console.warn(`[LOAD] Failed to parse chapter settings: ${e}`)
          }
        }
      } catch (error) {
        console.error(`[LOAD] ✗ Failed to load chapter "${activeChapterId}":`, error)
        setContent('')
        setLoadedChapterId(activeChapterId)
      } finally {
        setIsLoadingContent(false)
      }
    }

    loadDocument()
  }, [activeChapterId])

  // Reset save status to idle after 3 seconds
  useEffect(() => {
    if (saveStatus === 'saved') {
      // Reset to idle after 3 seconds
      const timer = setTimeout(() => setSaveStatus('idle'), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  // Autosave: trigger save after 5 seconds of inactivity if content is dirty
  useEffect(() => {
    if (!isDirty) return

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)

    autosaveTimerRef.current = setTimeout(() => {
      handleSave()
    }, 5000)

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    }
  }, [isDirty, content])

  const handleSelectChapter = async (id: string) => {
    console.log(`[SWITCH] Switching to chapter "${id}"`)
    // Cancel any pending autosave for the previous chapter
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)

    // Save before switching if dirty
    if (isDirty) {
      console.log(`[SWITCH] Saving dirty chapter before switching...`)
      await handleSave()
    } else {
      setIsDirty(false)
    }

    setActiveChapterId(id)
  }

  const handleCreateChapter = async () => {
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
  }

  const handleDeleteChapter = async (id: string) => {
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
  }

  const handleExport = async (format: 'markdown' | 'html' | 'epub' | 'pdf') => {
    if (format === 'pdf') {
      console.log('PDF export not yet implemented')
      return
    }

    try {
      console.log(`[EXPORT] Starting ${format.toUpperCase()} export...`)
      const filename = `book.${format}`
      await exportAndSave(format as ExportFormat, filename)
      console.log(`[EXPORT] ✓ ${format.toUpperCase()} export completed`)
    } catch (error) {
      console.error(`[EXPORT] ✗ Failed to export ${format}:`, error)
    }
  }

  const handleSave = async () => {
    if (!activeChapterId) return
    if (activeChapterId === OVERVIEW_ID) return

    setSaveStatus('saving')
    try {
      console.log(`[SAVE] Saving chapter "${activeChapterId}"`)
      console.log(`[SAVE] Content length: ${content.length} bytes`)
      console.log(`[SAVE] Content preview: ${content.substring(0, 100)}`)
      await updateDocument(activeChapterId, content)
      console.log(`[SAVE] ✓ Chapter "${activeChapterId}" saved successfully`)
      setSaveStatus('saved')
      setIsDirty(false)
      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error(`[SAVE] ✗ Failed to save chapter "${activeChapterId}":`, error)
      setSaveStatus('error')
    }
  }

  const handleSettingsChange = (key: string, value: string) => {
    if (!activeChapterId) return

    const updated = { ...(chapterSettings[activeChapterId] ?? { pageBackground: '#f9f9f9' }), [key]: value }
    setChapterSettings(prev => ({ ...prev, [activeChapterId]: updated }))
    localStorage.setItem(`chapter-settings-${activeChapterId}`, JSON.stringify(updated))
    console.log(`[SETTINGS] Updated chapter "${activeChapterId}" ${key} to ${value}`)
  }

  const handleShowDragMenuChange = (show: boolean) => {
    if (!activeChapterId) return

    const updated = { ...(chapterSettings[activeChapterId] ?? { pageBackground: '#f9f9f9' }), showDragMenu: show }
    setChapterSettings(prev => ({ ...prev, [activeChapterId]: updated }))
    localStorage.setItem(`chapter-settings-${activeChapterId}`, JSON.stringify(updated))
    console.log(`[SETTINGS] Updated chapter "${activeChapterId}" showDragMenu to ${show}`)
  }

  const handleEnableTreeViewPluginChange = (enabled: boolean) => {
    if (!activeChapterId) return

    const updated = { ...(chapterSettings[activeChapterId] ?? { pageBackground: '#f9f9f9' }), enableTreeViewPlugin: enabled }
    setChapterSettings(prev => ({ ...prev, [activeChapterId]: updated }))
    localStorage.setItem(`chapter-settings-${activeChapterId}`, JSON.stringify(updated))
    console.log(`[SETTINGS] Updated chapter "${activeChapterId}" enableTreeViewPlugin to ${enabled}`)
  }

  const handleReorder = async (reorderedChapters: DocumentHead[]) => {
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
  }

  return (
    <ToastProvider>
      <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#ffffff' }}>
        <Sidebar
          activeChapterId={activeChapterId || ''}
          onSelectChapter={handleSelectChapter}
          chapters={sortedChapters}
          isLoading={isLoading}
          onCreateChapter={handleCreateChapter}
          onDeleteChapter={handleDeleteChapter}
          onReorder={handleReorder}
          onExport={handleExport}
        />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <EditorToolbar
            chapterId={activeChapterId === OVERVIEW_ID ? undefined : activeChapterId || ''}
            chapterTitle={activeChapterId === OVERVIEW_ID ? 'Overview' : activeChapter?.name || 'Untitled'}
            saveStatus={saveStatus}
            onSave={handleSave}
            onSettings={activeChapterId === OVERVIEW_ID ? undefined : () => setIsSettingsOpen(true)}
            onApplyOrder={applyOrderHandler || undefined}
            canApplyOrder={canApplyOrder}
          />
          {loadedChapterId === OVERVIEW_ID ? (
            <DraftBoard
              chapters={[...chapters].sort((a, b) => a.order - b.order)}
              onNavigateToChapter={handleSelectChapter}
              onChaptersReordered={refreshChapters}
              onApplyOrderReady={(handler, canApply) => {
                setApplyOrderHandler(() => handler)
                setCanApplyOrder(canApply)
              }}
            />
          ) : (
            activeChapterId && loadedChapterId === activeChapterId && (
              <EditorArea
                key={activeChapterId}
                chapterId={activeChapterId}
                content={content}
                pageBackground={chapterSettings[activeChapterId]?.pageBackground ?? '#f9f9f9'}
                showDragMenu={chapterSettings[activeChapterId]?.showDragMenu ?? true}
                enableTreeViewPlugin={chapterSettings[activeChapterId]?.enableTreeViewPlugin ?? false}
                onChange={(newContent) => {
                  console.log(`[EDITOR] Content changed: ${newContent.length} bytes`)
                  setContent(newContent)
                  setIsDirty(true)
                }}
                onWordCountChange={setWordCount}
              />
            )
          )}
          {activeChapterId === OVERVIEW_ID ? (
            <div style={{ padding: '8px 16px', fontSize: '12px', color: '#999', borderTop: '1px solid #e5e5e5' }}>
              Overview
            </div>
          ) : (
            <div style={{ padding: '8px 16px', fontSize: '12px', color: '#999', borderTop: '1px solid #e5e5e5' }}>
              {wordCount} words
            </div>
          )}
        </div>

        <GenericModal
          isOpen={isSettingsOpen && !!activeChapterId}
          onClose={() => setIsSettingsOpen(false)}
          title="Chapter Settings"
          closeOnClickOutside={false}
        >
          {activeChapterId && (
            <ChapterSettingsModal
              chapterName={activeChapter?.name ?? ''}
              onNameChange={async (name) => {
                if (activeChapterId) {
                  try {
                    console.log(`[SETTINGS] Updating chapter name to "${name}"`)
                    await updateDocument(activeChapterId, content, name)
                    console.log(`[SETTINGS] ✓ Chapter name updated`)
                    // Update the chapters list with the new name
                    setChapters(chapters.map(c => c.id === activeChapterId ? { ...c, name } : c))
                  } catch (error) {
                    console.error(`[SETTINGS] ✗ Failed to update chapter name:`, error)
                  }
                }
              }}
              initialBackground={chapterSettings[activeChapterId]?.pageBackground ?? '#f9f9f9'}
              onChange={(bg) => handleSettingsChange('pageBackground', bg)}
              initialShowDragMenu={chapterSettings[activeChapterId]?.showDragMenu ?? true}
              onShowDragMenuChange={handleShowDragMenuChange}
              isDevelopment={isDevelopmentMode}
              initialEnableTreeViewPlugin={chapterSettings[activeChapterId]?.enableTreeViewPlugin ?? false}
              onEnableTreeViewPluginChange={handleEnableTreeViewPluginChange}
            />
          )}
        </GenericModal>
      </div>
      <ToastContainer />
    </ToastProvider>
  )
}
