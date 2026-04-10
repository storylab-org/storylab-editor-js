import { useState, useEffect, useRef, useMemo } from 'react'
import { listen } from '@tauri-apps/api/event'
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
import { exportAndSave, isRunningInTauri, type ExportFormat } from '@/api/export'
import { importAndRefresh, pickImportFile, type ImportFormat } from '@/api/import'
import { detectCommonShortcuts } from '@/utils/keyboardUtils'
import { AlertTriangle } from 'lucide-react'

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
  const [importPendingFormat, setImportPendingFormat] = useState<ImportFormat | null>(null)
  const [importPendingData, setImportPendingData] = useState<Uint8Array | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [exportModalState, setExportModalState] = useState<{ format: string; filename: string } | null>(null)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [typewriterMode, setTypewriterMode] = useState(false)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentCacheRef = useRef<Map<string, string>>(new Map())
  const handleExportRef = useRef<(format: ExportFormat) => Promise<void>>(() => Promise.resolve())
  const handleImportRef = useRef<(format: ImportFormat) => Promise<void>>(() => Promise.resolve())
  const handleCreateChapterRef = useRef<() => Promise<void>>(async () => {})

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

    // Check cache for previously loaded chapter content
    const cached = contentCacheRef.current.get(activeChapterId)
    if (cached !== undefined) {
      console.log(`[LOAD] ✓ Loading chapter "${activeChapterId}" from cache`)
      setContent(cached)
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
        contentCacheRef.current.set(activeChapterId, doc.content)

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

  // Persist active chapter ID to localStorage for restoration on reload
  useEffect(() => {
    if (!activeChapterId) return
    localStorage.setItem('active-chapter-id', activeChapterId)
  }, [activeChapterId])


  // Listen for menu events from Tauri
  useEffect(() => {
    let unlisten: (() => void) | null = null
    listen<string>('menu-event', (event) => {
      const action = event.payload
      if (action.startsWith('export:')) {
        const format = action.replace('export:', '') as ExportFormat
        handleExportRef.current(format)
      } else if (action.startsWith('import:')) {
        const format = action.replace('import:', '') as ImportFormat
        handleImportRef.current(format)
      } else if (action === 'action:new-chapter') {
        handleCreateChapterRef.current()
      } else if (action === 'action:undo') {
        // Lexical handles undo via keyboard shortcut, menu item is informational
        console.log('[MENU] Undo triggered (use Cmd+Z shortcut for editor undo)')
      } else if (action === 'action:redo') {
        // Lexical handles redo via keyboard shortcut, menu item is informational
        console.log('[MENU] Redo triggered (use Cmd+Shift+Z shortcut for editor redo)')
      } else if (action === 'action:find-replace') {
        // Open find and replace with Cmd+F equivalent
        const findReplaceEvent = new KeyboardEvent('keydown', {
          key: 'f',
          code: 'KeyF',
          ctrlKey: false,
          metaKey: true,
          bubbles: true,
        })
        document.dispatchEvent(findReplaceEvent)
      } else if (action === 'action:view-draft-board') {
        setActiveChapterId(OVERVIEW_ID)
      } else if (action === 'action:help') {
        setIsHelpOpen(true)
      }
    }).then(fn => {
      unlisten = fn
    }).catch(err => {
      // Silently ignore if we're not in Tauri (running in web)
      console.debug('Menu event listener not available:', err)
    })
    return () => {
      unlisten?.()
    }
  }, [])


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
      contentCacheRef.current.delete(id)

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

  const defaultExportFilename = (format: string): string => {
    switch (format) {
      case 'markdown':
        return 'book.md'
      case 'html':
        return 'book.html'
      case 'epub':
        return 'book.epub'
      case 'car':
        return '' // CAR filename is determined by the server (manifest CID)
      default:
        return `book.${format}`
    }
  }

  const handleExport = async (format: 'markdown' | 'html' | 'epub' | 'car' | 'pdf') => {
    if (format === 'pdf') {
      console.log('PDF export not yet implemented')
      return
    }

    try {
      const inTauri = await isRunningInTauri()

      if (inTauri) {
        // Tauri: native save dialog handles filename + path selection
        console.log(`[EXPORT] Starting ${format.toUpperCase()} export (Tauri)...`)
        const filename = defaultExportFilename(format)
        await exportAndSave(format as ExportFormat, filename)
        console.log(`[EXPORT] ✓ ${format.toUpperCase()} export completed`)
      } else {
        // Web: show filename modal before download
        console.log(`[EXPORT] Opening export dialog for ${format}...`)
        const filename = defaultExportFilename(format)
        setExportModalState({ format, filename })
      }
    } catch (error) {
      console.error(`[EXPORT] ✗ Failed to export ${format}:`, error)
    }
  }

  const handleExportConfirm = async (filename: string) => {
    if (!exportModalState) return

    try {
      console.log(`[EXPORT] Starting ${exportModalState.format.toUpperCase()} export...`)
      await exportAndSave(exportModalState.format as ExportFormat, filename)
      console.log(`[EXPORT] ✓ ${exportModalState.format.toUpperCase()} export completed`)
    } catch (error) {
      console.error(`[EXPORT] ✗ Failed to export:`, error)
    } finally {
      setExportModalState(null)
    }
  }

  const handleImport = async (format: ImportFormat) => {
    try {
      console.log(`[IMPORT] Opening file picker for ${format.toUpperCase()}...`)
      const data = await pickImportFile(format)
      if (!data) {
        console.log('[IMPORT] Import cancelled by user')
        return
      }

      console.log(`[IMPORT] File selected (${data.length} bytes). Showing confirmation modal...`)
      setImportPendingFormat(format)
      setImportPendingData(data)
    } catch (error) {
      console.error(`[IMPORT] ✗ Failed to pick file:`, error)
    }
  }

  const handleImportConfirm = async () => {
    if (!importPendingFormat || !importPendingData) return

    setIsImporting(true)
    try {
      console.log(`[IMPORT] Starting ${importPendingFormat.toUpperCase()} import (replace mode)...`)

      // Custom refresh that also navigates to first chapter
      const refreshAndNavigate = async () => {
        try {
          const docs = await listDocuments()
          setChapters(docs)

          // Clear content cache and editor state to force fresh load
          contentCacheRef.current.clear()
          setContent('')
          setLoadedChapterId(null)

          // Navigate to first chapter, or fallback to draft board
          if (docs.length > 0) {
            console.log(`[IMPORT] ✓ Navigating to first chapter: "${docs[0].name}" (${docs[0].id})`)
            setActiveChapterId(docs[0].id)
          } else {
            console.log('[IMPORT] ✓ No chapters imported, navigating to draft board')
            setActiveChapterId(OVERVIEW_ID)
          }
        } catch (error) {
          console.error('Failed to refresh chapters after import:', error)
        }
      }

      // Pass the already-picked file data to avoid picking again
      await importAndRefresh(importPendingFormat, refreshAndNavigate, { replace: true }, importPendingData)
      console.log(`[IMPORT] ✓ ${importPendingFormat.toUpperCase()} import completed`)
    } catch (error) {
      console.error(`[IMPORT] ✗ Failed to import ${importPendingFormat}:`, error)
    } finally {
      setIsImporting(false)
      setImportPendingFormat(null)
      setImportPendingData(null)
    }
  }

  const handleImportCancel = () => {
    console.log('[IMPORT] Import cancelled by user')
    setImportPendingFormat(null)
    setImportPendingData(null)
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
      contentCacheRef.current.set(activeChapterId, content)
      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error(`[SAVE] ✗ Failed to save chapter "${activeChapterId}":`, error)
      setSaveStatus('error')
    }
  }

  // Keyboard shortcuts handler (keyboard-agnostic)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcuts = detectCommonShortcuts(e)

      if (shortcuts.isTypewriterMode) {
        e.preventDefault()
        setTypewriterMode(prev => !prev)
      } else if (shortcuts.isSave) {
        e.preventDefault()
        handleSave()
      }
      // Note: Cmd+F is handled by the FindReplacePlugin
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

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

  // Keep refs in sync with handlers for menu event listener
  handleExportRef.current = handleExport
  handleImportRef.current = handleImport
  handleCreateChapterRef.current = handleCreateChapter

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
          onImport={handleImport}
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
            onHelp={() => setIsHelpOpen(true)}
            typewriterMode={typewriterMode}
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
                typewriterMode={typewriterMode}
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
                    contentCacheRef.current.set(activeChapterId, content)
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

        {/* Import confirmation modal */}
        <GenericModal
          isOpen={!!importPendingFormat}
          onClose={handleImportCancel}
          title={`Import ${importPendingFormat === 'epub' ? 'EPUB' : 'CAR'}`}
          closeOnClickOutside={false}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <AlertTriangle size={20} style={{ color: '#ef4444', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#0f0f0f' }}>
                  All current chapters will be replaced by the imported file.
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                  This action cannot be undone. Continue?
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleImportCancel}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e5e5e5',
                  background: 'white',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleImportConfirm}
                disabled={isImporting}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: isImporting ? '#d1d5db' : '#ef4444',
                  color: 'white',
                  cursor: isImporting ? 'not-allowed' : 'pointer',
                  borderRadius: '4px',
                  fontSize: '14px',
                  opacity: isImporting ? 0.7 : 1,
                }}
              >
                {isImporting ? 'Importing...' : 'Replace & Import'}
              </button>
            </div>
          </div>
        </GenericModal>

        {/* Export filename modal (web only) */}
        <GenericModal
          isOpen={!!exportModalState}
          onClose={() => setExportModalState(null)}
          title={`Export ${
            exportModalState?.format === 'markdown'
              ? 'Markdown'
              : exportModalState?.format === 'html'
                ? 'HTML'
                : exportModalState?.format === 'epub'
                  ? 'EPUB'
                  : 'CID'
          }`}
          closeOnClickOutside={true}
        >
          {exportModalState && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', color: '#0f0f0f' }}>
                  Filename
                </label>
                <input
                  type="text"
                  value={exportModalState.filename}
                  onChange={(e) =>
                    setExportModalState({ ...exportModalState, filename: e.target.value })
                  }
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                File will be downloaded to your browser's default downloads folder.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setExportModalState(null)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e5e5e5',
                    background: 'white',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleExportConfirm(exportModalState.filename)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    background: '#0f0f0f',
                    color: 'white',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                >
                  Download
                </button>
              </div>
            </div>
          )}
        </GenericModal>

        {/* Help modal */}
        <GenericModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          title="Keyboard Shortcuts & Help"
          closeOnClickOutside={true}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '500px', overflowY: 'auto' }}>
            {/* Keyboard Shortcuts */}
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: '#0f0f0f' }}>
                Keyboard Shortcuts
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <tbody>
                  {/* Writing */}
                  <tr>
                    <td colSpan={2} style={{ padding: '6px 0 4px 0', fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase' }}>Writing</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#666' }}>Cmd+b</td>
                    <td style={{ padding: '4px 0 4px 8px', color: '#0f0f0f' }}>Bold</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#666' }}>Cmd+i</td>
                    <td style={{ padding: '4px 0 4px 8px', color: '#0f0f0f' }}>Italic</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#666' }}>Cmd+u</td>
                    <td style={{ padding: '4px 0 4px 8px', color: '#0f0f0f' }}>Underline</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#666' }}>Cmd+z</td>
                    <td style={{ padding: '4px 0 4px 8px', color: '#0f0f0f' }}>Undo</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0 6px 0', color: '#666' }}>Cmd+Shift+z</td>
                    <td style={{ padding: '4px 0 6px 8px', color: '#0f0f0f' }}>Redo</td>
                  </tr>

                  {/* Navigation */}
                  <tr>
                    <td colSpan={2} style={{ padding: '6px 0 4px 0', fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase' }}>Navigation & Commands</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#666' }}>Cmd+f</td>
                    <td style={{ padding: '4px 0 4px 8px', color: '#0f0f0f' }}>Find & Replace</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0 6px 0', color: '#666' }}>Cmd+t</td>
                    <td style={{ padding: '4px 0 6px 8px', color: '#0f0f0f' }}>Toggle Typewriter Mode</td>
                  </tr>

                  {/* File */}
                  <tr>
                    <td colSpan={2} style={{ padding: '6px 0 4px 0', fontSize: '11px', fontWeight: '600', color: '#999', textTransform: 'uppercase' }}>File</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#666' }}>Cmd+s</td>
                    <td style={{ padding: '4px 0 4px 8px', color: '#0f0f0f' }}>Save chapter</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Export Formats */}
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: '#0f0f0f' }}>
                Export Formats
              </h3>
              <ul style={{ margin: '0', paddingLeft: '16px', fontSize: '12px' }}>
                <li style={{ color: '#0f0f0f', marginBottom: '4px' }}>
                  <strong>Markdown</strong> — Plain text with formatting, ideal for version control
                </li>
                <li style={{ color: '#0f0f0f', marginBottom: '4px' }}>
                  <strong>HTML</strong> — Web-ready formatted document
                </li>
                <li style={{ color: '#0f0f0f', marginBottom: '4px' }}>
                  <strong>EPUB</strong> — E-book format for digital readers
                </li>
                <li style={{ color: '#0f0f0f' }}>
                  <strong>CAR</strong> — Content-addressed archive for backup & sharing
                </li>
              </ul>
            </div>

            {/* Import */}
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: '#0f0f0f' }}>
                Import
              </h3>
              <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
                Import EPUB or CAR files to replace all chapters. This action cannot be undone.
              </p>
            </div>

            {/* About */}
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: '#0f0f0f' }}>
                About
              </h3>
              <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
                Storylab v0.2.51 — A powerful writing and story planning application for authors
              </p>
            </div>
          </div>
        </GenericModal>
      </div>
      <ToastContainer />
    </ToastProvider>
  )
}
